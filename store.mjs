import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { products } from './catalog.mjs';

function initial(demo) {
  return {
    users: {}, sessions: {}, oauth: {}, patches: {},
    referrals: {}, redemptions: {}, entries: [], signatures: {}, creatorPoints: {},
    inventory: Object.fromEntries(products.map(product => [product.id, product.stock])),
    remainingBudget: demo ? 25000 : Math.max(0, Number.parseInt(process.env.CAMPAIGN_BUDGET_CENTS || '0', 10) || 0)
  };
}

export async function openStore(demo) {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patchline_state (
        id integer PRIMARY KEY CHECK (id = 1), body jsonb NOT NULL
      );
      CREATE EXTENSION IF NOT EXISTS timescaledb;
      CREATE TABLE IF NOT EXISTS patchline_rank_events (
        observed_at timestamptz NOT NULL, patch_id text NOT NULL, game text NOT NULL,
        phase text NOT NULL, rankings jsonb NOT NULL
      );
      SELECT create_hypertable('patchline_rank_events', 'observed_at', if_not_exists => TRUE);
      CREATE TABLE IF NOT EXISTS patchline_activity (
        observed_at timestamptz NOT NULL, kind text NOT NULL, subject text NOT NULL,
        amount integer NOT NULL, sample boolean NOT NULL
      );
      SELECT create_hypertable('patchline_activity', 'observed_at', if_not_exists => TRUE);
      CREATE INDEX IF NOT EXISTS patchline_activity_kind_time ON patchline_activity (sample, kind, observed_at DESC);
    `);
    await pool.query('INSERT INTO patchline_state VALUES (1, $1) ON CONFLICT DO NOTHING', [initial(demo)]);
    return {
      name: 'Tiger Data',
      async read() {
        return (await pool.query('SELECT body FROM patchline_state WHERE id = 1')).rows[0].body;
      },
      async write(update) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { body } = (await client.query('SELECT body FROM patchline_state WHERE id = 1 FOR UPDATE')).rows[0];
          const events = [];
          const activity = [];
          const result = update(body, event => events.push(event), event => activity.push(event));
          await client.query('UPDATE patchline_state SET body = $1 WHERE id = 1', [body]);
          for (const { patch, phase } of events) {
            await client.query('INSERT INTO patchline_rank_events VALUES (now(), $1, $2, $3, $4)', [patch.id, patch.game, phase, JSON.stringify(patch.rankings)]);
          }
          if (activity.length) {
            await client.query(`INSERT INTO patchline_activity
              SELECT time, kind, subject, amount, sample
              FROM jsonb_to_recordset($1::jsonb) AS activity(time timestamptz, kind text, subject text, amount integer, sample boolean)`,
            [JSON.stringify(activity)]);
          }
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      async history(patchId) {
        const { rows } = await pool.query('SELECT observed_at, phase, rankings FROM patchline_rank_events WHERE patch_id = $1 ORDER BY observed_at DESC LIMIT 30', [patchId]);
        return rows;
      },
      async analytics(sample, cutoff) {
        const clips = await pool.query(`SELECT subject, count(*)::int AS total,
          count(*) FILTER (WHERE observed_at >= $2)::int AS week
          FROM patchline_activity WHERE sample = $1 AND kind = 'clip' GROUP BY subject`, [sample, cutoff]);
        const days = await pool.query(`SELECT to_char(time_bucket('1 day', observed_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
          count(*) FILTER (WHERE kind = 'clip')::int AS opens,
          COALESCE(sum(amount) FILTER (WHERE kind = 'points'), 0)::int AS earned,
          -COALESCE(sum(amount) FILTER (WHERE kind = 'redeem'), 0)::int AS spent
          FROM patchline_activity WHERE sample = $1 AND observed_at >= $2
          GROUP BY 1 ORDER BY 1`, [sample, cutoff]);
        return { clips: clips.rows, days: days.rows };
      }
    };
  }

  const path = process.env.SQLITE_PATH || 'data/patchline.sqlite';
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS state (id integer PRIMARY KEY, body text NOT NULL);
    CREATE TABLE IF NOT EXISTS rank_events (
      id integer PRIMARY KEY, observed_at text NOT NULL, patch_id text NOT NULL,
      phase text NOT NULL, rankings text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity (
      observed_at text NOT NULL, kind text NOT NULL, subject text NOT NULL,
      amount integer NOT NULL, sample integer NOT NULL
    );
    CREATE INDEX IF NOT EXISTS activity_kind_time ON activity (sample, kind, observed_at);
  `);
  db.prepare('INSERT OR IGNORE INTO state VALUES (1, ?)').run(JSON.stringify(initial(demo)));
  const load = () => JSON.parse(db.prepare('SELECT body FROM state WHERE id = 1').get().body);
  return {
    name: 'SQLite',
    read: load,
    write(update) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const data = load();
        const result = update(data, ({ patch, phase }) => {
          db.prepare('INSERT INTO rank_events (observed_at, patch_id, phase, rankings) VALUES (?, ?, ?, ?)')
            .run(new Date().toISOString(), patch.id, phase, JSON.stringify(patch.rankings));
        }, ({ time, kind, subject, amount, sample }) => {
          db.prepare('INSERT INTO activity VALUES (?, ?, ?, ?, ?)').run(time, kind, subject, amount, Number(sample));
        });
        db.prepare('UPDATE state SET body = ? WHERE id = 1').run(JSON.stringify(data));
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    history(patchId) {
      return db.prepare('SELECT observed_at, phase, rankings FROM rank_events WHERE patch_id = ? ORDER BY id DESC LIMIT 30')
        .all(patchId).map(row => ({ ...row, rankings: JSON.parse(row.rankings) }));
    },
    analytics(sample, cutoff) {
      const clips = db.prepare(`SELECT subject, count(*) AS total, sum(observed_at >= ?) AS week
        FROM activity WHERE sample = ? AND kind = 'clip' GROUP BY subject`).all(cutoff, Number(sample));
      const days = db.prepare(`SELECT substr(observed_at, 1, 10) AS day,
        sum(kind = 'clip') AS opens,
        sum(CASE WHEN kind = 'points' THEN amount ELSE 0 END) AS earned,
        sum(CASE WHEN kind = 'redeem' THEN -amount ELSE 0 END) AS spent
        FROM activity WHERE sample = ? AND observed_at >= ? GROUP BY day ORDER BY day`).all(Number(sample), cutoff);
      return { clips, days };
    }
  };
}

const fresh = () => ({ threads: [], anonymous: [] });
const value = body => typeof body === 'string' ? JSON.parse(body) : body || fresh();

export function sqliteChatStore(db) {
  db.exec('CREATE TABLE IF NOT EXISTS ask_faze_history (owner TEXT PRIMARY KEY, body TEXT NOT NULL, expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS ask_faze_expires ON ask_faze_history (expires_at)');
  const row = db.prepare('SELECT body FROM ask_faze_history WHERE owner = ? AND expires_at > ?');
  const save = db.prepare('INSERT INTO ask_faze_history VALUES (?, ?, ?) ON CONFLICT(owner) DO UPDATE SET body=excluded.body, expires_at=excluded.expires_at');
  const remove = db.prepare('DELETE FROM ask_faze_history WHERE owner = ?');
  const history = {
    read(owner) { return value(row.get(owner,Date.now())?.body); },
    change(owner, update) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const state=value(row.get(owner,Date.now())?.body);
        const {result, expires}=update(state);
        if(expires > Date.now()) save.run(owner,JSON.stringify(state),expires);
        else remove.run(owner);
        db.exec('COMMIT');
        return result;
      } catch(error){db.exec('ROLLBACK'); throw error;}
    },
    feedback() { return db.prepare('SELECT body FROM ask_faze_history WHERE expires_at > ? ORDER BY expires_at DESC LIMIT 100').all(Date.now()).map(item=>value(item.body)); },
    prune(cutoff, clean) {
      const now=Date.now();
      db.prepare('DELETE FROM ask_faze_history WHERE expires_at <= ?').run(now);
      const owners=db.prepare(`SELECT owner FROM ask_faze_history WHERE
        EXISTS(SELECT 1 FROM json_each(body,'$.threads') AS thread WHERE json_extract(thread.value,'$.updated') <= ?) OR
        EXISTS(SELECT 1 FROM json_each(body,'$.anonymous') AS reaction WHERE json_extract(reaction.value,'$.at') <= ?)`).all(cutoff,cutoff);
      for(const {owner} of owners)history.change(owner,clean);
    }
  };
  return history;
}

export async function pgChatStore(pool) {
  await pool.query('CREATE TABLE IF NOT EXISTS ask_faze_history (owner text PRIMARY KEY, body jsonb NOT NULL, expires_at bigint NOT NULL); CREATE INDEX IF NOT EXISTS ask_faze_expires ON ask_faze_history (expires_at)');
  const get = 'SELECT body FROM ask_faze_history WHERE owner = $1 AND expires_at > $2';
  const history = {
    async read(owner) { return value((await pool.query(get,[owner,Date.now()])).rows[0]?.body); },
    async change(owner, update) {
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[owner]);
        const state=value((await client.query(get,[owner,Date.now()])).rows[0]?.body);
        const {result, expires}=update(state);
        if(expires > Date.now()) await client.query('INSERT INTO ask_faze_history VALUES ($1, $2, $3) ON CONFLICT(owner) DO UPDATE SET body=excluded.body, expires_at=excluded.expires_at',[owner,state,expires]);
        else await client.query('DELETE FROM ask_faze_history WHERE owner = $1',[owner]);
        await client.query('COMMIT');
        return result;
      } catch(error){await client.query('ROLLBACK');throw error;}
      finally {client.release();}
    },
    async feedback() {return (await pool.query('SELECT body FROM ask_faze_history WHERE expires_at > $1 ORDER BY expires_at DESC LIMIT 100',[Date.now()])).rows.map(item=>value(item.body));},
    async prune(cutoff,clean){
      await pool.query('DELETE FROM ask_faze_history WHERE expires_at <= $1',[Date.now()]);
      const {rows}=await pool.query(`SELECT owner FROM ask_faze_history WHERE
        EXISTS(SELECT 1 FROM jsonb_array_elements(body->'threads') AS thread WHERE (thread->>'updated')::bigint <= $1) OR
        EXISTS(SELECT 1 FROM jsonb_array_elements(body->'anonymous') AS reaction WHERE (reaction->>'at')::bigint <= $1)`,[cutoff]);
      for(const {owner} of rows)await history.change(owner,clean);
    }
  };
  return history;
}

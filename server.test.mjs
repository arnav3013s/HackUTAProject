import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { test } from 'node:test';
import { answerFan } from './assistant.mjs';
import { samplePatch } from './catalog.mjs';
import { dailyQuiz, deliverNotices } from './engagement.mjs';
import { day } from './fans.mjs';

async function fixture(t, demoMode) {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), PUBLIC_ORIGIN: origin, DEMO_MODE: demoMode, DATABASE_URL: '', SQLITE_PATH: ':memory:', PATCH_FEED_URL: '', CONTENT_FILE: '', GEMINI_API_KEY: '', MATCH_INGEST_TOKEN: 'test-only-import-token' },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  t.after(() => { child.kill(); });
  await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(([code]) => { throw new Error(`Server exited with code ${code}.`); })
  ]);
  function client() {
    const cookies = new Map();
    const cookie = () => [...cookies.values()].join('; ');
    async function get(path) {
      return fetch(origin + path, { headers: { Cookie: cookie() } });
    }
    async function post(action, body = {}, requestOrigin = origin) {
      const response = await fetch(`${origin}/api/${action}`, {
        method: 'POST', headers: { Origin: requestOrigin, Cookie: cookie(), 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const newCookie = response.headers.get('set-cookie');
      if (newCookie) cookies.set(newCookie.split('=')[0], newCookie.split(';')[0]);
      return [response.status, await response.json()];
    }
    return { get, post, state: async () => (await get('/api/state')).json() };
  }
  return { ...client(), client };
}

test('demo review, daily points, redemption retries, and rank history stay consistent', async t => {
  const { get, post, state } = await fixture(t, '1');
  assert.equal((await get('/')).status, 200);
  assert.equal((await get('/brand/logo.png')).status, 200);
  assert.equal((await get('/brand/timeline.pdf')).headers.get('content-type'), 'application/pdf');
  const official = (await state()).faze;
  assert.equal(official.videos[0].url, 'https://www.youtube.com/watch?v=3o65zAETqPQ');
  assert.ok(official.merch.every(item => item.url.startsWith('https://fazeclan.com/products/')));
  assert.equal((await post('demo', {}, 'https://different.example'))[0], 403);
  assert.equal((await post('demo'))[0], 200);
  const patch = (await state()).patches[0].id;
  const daily = { patch, weapon: 'AK-47' };
  const claims = await Promise.all([post('daily', daily), post('daily', daily)]);
  assert.deepEqual(claims.map(([status]) => status).sort(), [200, 409]);
  assert.equal((await post('game-link', { game: 'Counter-Strike 2', handle: 'Test#TAG' }))[0], 200);
  assert.equal((await post('creator', { code: 'VANTA' }))[0], 200);
  assert.equal((await post('creator', { code: 'NOVA' }))[0], 409);
  assert.equal((await post('review', { patch, weapon: 'MP9', tier: 'A', reason: 'Practice showed better accuracy from a stationary angle.' }))[0], 200);
  const review = (await state()).patches[0].reviews[0];
  assert.equal((await post('approve-review', { patch, id: review.id, approve: true }))[0], 200);
  assert.equal((await post('approve-review', { patch, id: review.id, approve: true }))[0], 400);
  const receipt = { product: 'sample-cap', attempt: randomUUID() };
  const retries = await Promise.all([post('redeem', receipt), post('redeem', receipt)]);
  assert.deepEqual(retries.map(([status]) => status), [200, 200]);
  const result = await state();
  assert.equal(result.user.balance, 60);
  assert.equal(result.user.earned, 240);
  assert.equal(result.user.spent, 180);
  assert.equal(result.user.sponsoredOrders.length, 1);
  assert.equal(result.user.links['Counter-Strike 2'].verified, false);
  assert.equal(result.products.find(item => item.id === 'sample-cap').stock, 6);
  assert.equal((await post('redeem', { ...receipt, product: 'sample-jersey' }))[0], 409);
  assert.deepEqual(result.user.entries, ['VANTA']);
  assert.equal(result.patches[0].rankings.find(row => row.name === 'MP9').tier, 'A');
  assert.equal((await (await get(`/api/history?patch=${patch}`)).json())[0].phase, 'creator-reviewed');
  assert.equal((await post('logout'))[0], 200);
  assert.equal((await state()).user, undefined);
  assert.deepEqual(await (await get(`/api/history?patch=${patch}`)).json(), []);
  assert.equal((await post('demo'))[0], 200);
  assert.equal((await state()).patches[0].rankings.find(row => row.name === 'MP9').tier, 'B');
});

test('the fan lab, assistant, and activity read distinct stored histories', async t => {
  const { get, post, state } = await fixture(t, '1');
  assert.equal((await get('/api/fans')).status, 403);
  await post('demo');
  const { fans, groups } = await (await get('/api/fans')).json();
  assert.equal(fans.length, 56);
  assert.equal(new Set(fans.map(fan => fan.id)).size, 56);
  for (const group of groups) assert.equal(fans.filter(fan => fan.category === group).length, 8);
  const collector = fans.find(fan => fan.category === 'Collector');
  const record = await (await get(`/api/fans?id=${collector.id}`)).json();
  assert.equal(record.ledger.reduce((sum, item) => sum + item.points, 0), record.balance);
  assert.equal(record.spent, 80);
  assert.equal((await get(`/api/fans?id=${(await state()).user.id}`)).status, 404);

  const clip = (await state()).faze.videos[0].id;
  const counts = async () => (await (await get('/api/activity')).json()).clips.find(row => row.subject === clip);
  const before = await counts();
  assert.equal((await post('watch', { clip }))[0], 200);
  assert.equal((await post('watch', { clip }))[0], 200);
  const after = await counts();
  assert.equal(after.week, before.week + 1);
  assert.equal(after.total, before.total + 1);
  assert.equal((await post('archive-quiz', { year: '2015' }))[0], 400);
  assert.equal((await post('archive-quiz', { year: '2010' }))[0], 200);
  assert.equal((await post('archive-quiz', { year: '2010' }))[0], 409);
  const [status, answer] = await post('ask', { question: 'What is my wallet balance?' });
  assert.equal(status, 200);
  assert.equal(answer.mode, 'Replay guide');
  assert.match(answer.answer, /220 available points/);
});

test('live mode rejects demo privileges and requires Google verification for rewards', async t => {
  const { post, state } = await fixture(t, '0');
  assert.equal((await post('demo'))[0], 403);
  assert.deepEqual((await state()).patches, []);
  assert.deepEqual((await state()).products.map(item => item.id), ['pass']);
  const account = { email: 'test@example.com', password: 'long-demo-password', name: 'Test Player' };
  assert.equal((await post('signup', account))[0], 200);
  assert.equal((await post('redeem', { product: 'pass', attempt: randomUUID() }))[0], 403);
  assert.equal((await post('analyze', {}))[0], 403);
  assert.equal((await post('logout'))[0], 200);
  assert.equal((await post('login', account))[0], 200);
  assert.equal((await state()).user.balance, 0);
});

test('match placement and time change a profile without double-crediting retries', async t => {
  const { get, post, state } = await fixture(t, '1');
  await post('demo');
  const game = 'Counter-Strike 2';
  const first = { matchId: 'match-one', game, minutes: '35', placement: '3', fieldSize: '20' };
  const retry = await Promise.all([post('demo-match', first), post('demo-match', first)]);
  assert.deepEqual(retry.map(([status]) => status), [200, 200]);
  assert.equal((await post('demo-match', { ...first, placement: '4' }))[0], 409);
  assert.equal((await post('demo-match', { ...first, minutes: true, matchId: 'bad' }))[0], 400);
  assert.equal((await post('demo-match', { ...first, minutes: '30', placement: '1', matchId: 'match-two' }))[0], 200);
  assert.equal((await post('demo-match', { ...first, minutes: '60', placement: '1', matchId: 'match-three' }))[0], 200);
  const player = (await state()).user;
  assert.equal(player.balance, 260);
  assert.equal(player.category.name, 'Esports fan');
  assert.equal(player.performance.games[0].minutes, 125);
  assert.equal(player.performance.games[0].performance, 96);
  assert.equal(player.performance.games[0].rank, 1);
  assert.deepEqual(player.performance.recent.map(match => match.credit.awarded).sort((a, b) => a - b), [9, 25, 26]);

  const [, result] = await post('ask', { question: 'How good am I in CS2?' });
  assert.match(result.answer, /125 minutes.*best result was 1 of 20.*96\/100/);
  const [, estimate] = await post('ask', { question: 'How many points for 35 minutes and 3rd of 20?' });
  assert.match(estimate.answer, /0 points.*7 for time and 18 for placement/);
  const list = await (await get('/api/fans')).json();
  const chosen = list.fans.find(fan => fan.category === 'Creator reviewer');
  assert.equal((await post('preview-fan', { id: chosen.id }))[0], 200);
  const preview = (await state()).user;
  assert.notEqual(preview.id, chosen.id);
  assert.equal(preview.name, chosen.name);
  assert.equal(preview.reviewer, true);
  assert.equal((await post('preview-fan', { id: chosen.id }))[0], 200);
  assert.equal((await state()).user.id, preview.id);
  assert.equal((await post('matches/import', {}))[0], 401);
});

test('Gemini failures keep the requested patch evidence and do not pollute exact answers', async t => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  t.after(() => {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  });
  const provider = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 429 }));
  const context = { patches: [samplePatch], analytics: { clips: [] } };
  const result = await answerFan('Why?', { ...context, previous: 'What tier is MP9?' });
  assert.equal(result.mode, 'Replay guide');
  assert.match(result.answer, /MP9 is B tier/);
  assert.match(result.status, /request limit/);
  assert.equal(result.sources[0].url, '#patches');
  const rules = await answerFan('How are points awarded for match placement?', context);
  assert.match(rules.answer, /daily match cap is 60/);
  assert.equal(provider.mock.callCount(), 1);
});

test('walkthrough, daily missions, and referral points persist across two fan sessions', async t => {
  const { get, post, state, client } = await fixture(t, '1');
  assert.equal((await get('/art/stage.jpg')).headers.get('content-type'), 'image/jpeg');
  assert.equal((await get('/experience.js')).status, 200);
  assert.equal((await post('demo', { name: 'First Fan', walkthrough: '1' }))[0], 200);
  const newbie = (await state()).user;
  assert.equal(newbie.journey.stage, 'new');
  assert.equal(newbie.balance, 0);
  assert.equal((await post('favorite-games', { games: ['Counter-Strike 2', 'Fortnite'] }))[0], 200);
  assert.equal((await post('archive-quiz', { year: '2010' }))[0], 200);
  assert.equal((await post('onboarding-done'))[0], 200);
  assert.equal((await state()).user.journey.primaryGame, 'Counter-Strike 2');
  const [, next] = await post('ask', { question: 'What should I do today?' });
  assert.equal(next.action, 'check-in');
  assert.equal((await post('check-in', { date: '2000-01-01' }))[0], 409);
  assert.deepEqual((await Promise.all([post('check-in'), post('check-in')])).map(([status]) => status).sort(), [200, 409]);
  assert.equal((await post('trivia', { answer: 'Wrong answer' }))[0], 400);
  const quiz = dailyQuiz();
  assert.equal((await post('trivia', { answer: quiz.correct, date: quiz.date }))[0], 200);
  assert.equal((await state()).user.journey.streak, 1);
  assert.equal((await state()).user.balance, 35);

  const invitee = client();
  assert.equal((await invitee.post('demo', { name: 'Invited Fan', invite: newbie.invite, walkthrough: '1' }))[0], 200);
  assert.equal((await invitee.state()).user.referred, true);
  const pending = (await state()).user;
  assert.equal(pending.referrals[0].status, 'pending');
  assert.equal(pending.balance, 35);
  assert.equal((await invitee.post('check-in'))[0], 200);
  assert.equal((await invitee.post('archive-quiz', { year: '2010' }))[0], 200);
  const approved = (await state()).user;
  assert.equal(approved.balance, 75);
  assert.equal(approved.referrals[0].status, 'approved');
  assert.equal(approved.ledger.filter(row => row.id.startsWith('referral:')).length, 1);
  const notice = approved.inbox.items.find(item => item.id.startsWith('invite-approved-'));
  assert.equal((await post('read-notice', { id: notice.id }))[0], 200);
  assert.equal((await state()).user.inbox.unread, approved.inbox.unread - 1);
  assert.equal((await post('email-preference', { enabled: true }))[0], 403);
  assert.equal((await post('demo', { invite: newbie.invite }))[0], 200);
  assert.equal((await state()).user.referred, false);
});

test('returning fans keep an earned comeback while they replay a daily mission', async t => {
  const { get, post, state } = await fixture(t, '1');
  await post('demo');
  const original = (await state()).user;
  const { fans } = await (await get('/api/fans')).json();
  const sample = fans.find(fan => fan.category === 'Returning fan');
  assert.equal((await post('preview-fan', { id: sample.id }))[0], 200);
  const before = (await state()).user;
  assert.equal(before.journey.stage, 'returning');
  assert.ok(before.journey.daysAway >= 7);
  assert.match(before.journey.rewind, /best finish/);
  assert.equal(before.journey.comeback, 30);
  const [, answer] = await post('ask', { question: 'Why am I a returning fan?' });
  assert.equal(answer.action, 'comeback');
  assert.equal((await post('check-in'))[0], 200);
  assert.equal((await state()).user.journey.stage, 'active');
  assert.equal((await post('comeback'))[0], 200);
  assert.equal((await post('comeback'))[0], 409);
  const after = (await state()).user;
  assert.equal(after.balance, before.balance + 35);
  assert.equal(after.inbox.items.filter(item => item.id.startsWith('return-')).length, 1);
  assert.equal((await post('exit-preview'))[0], 200);
  const restored = (await state()).user;
  assert.equal(restored.id, original.id);
  assert.equal(restored.balance, original.balance);
  assert.equal(restored.previewing, false);
});

test('return email is queued only for opted-in verified fans and delivers once', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    const body = JSON.parse(options.body);
    assert.deepEqual(body.to, ['return@example.com']);
    assert.match(body.subject, /30-point comeback/);
    assert.match(body.text, /https:\/\/replay.example.com\/#missions/);
    assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert.match(options.headers['Idempotency-Key'], /^[0-9a-f]{64}$/);
    return Response.json({ id: 'delivery' });
  });
  for (const name of ['RESEND_API_KEY', 'REPLAY_EMAIL_FROM']) {
    const previous = process.env[name];
    process.env[name] = 'test-only';
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
  const now = Date.now();
  const user = {
    id: 'lapsed', email: 'return@example.com', googleSub: 'verified', emailEnabled: now - 10 * day,
    unsubscribeToken: 'test-token', links: {}, created: now - 20 * day,
    ledger: [{ id: 'archive-quiz', label: 'starter', at: new Date(now - 9 * day).toISOString(), points: 20 }]
  };
  const state = { users: {
    lapsed: user,
    demo: { ...structuredClone(user), id: 'demo', demo: true, email: 'demo@example.com' },
    optedOut: { ...structuredClone(user), id: 'optedOut', emailEnabled: false, email: 'out@example.com' }
  } };
  const store = { read: async () => structuredClone(state), write: async update => update(state) };
  assert.equal(await deliverNotices(store, 'https://replay.example.com', now), 1);
  assert.equal(await deliverNotices(store, 'https://replay.example.com', now + 60_000), 0);
  assert.equal(user.inbox.filter(item => item.delivery?.sentAt).length, 1);
});

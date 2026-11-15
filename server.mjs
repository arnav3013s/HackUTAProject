import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { creators, games, matchRules, news, products, rewardRules, samplePatch } from './catalog.mjs';
import { faze } from './faze.mjs';
import { openStore } from './store.mjs';
import { analyze, clean, ensure, fetchJson, parsePatch, solanaRpc, tiers, verifyReceipt, vultrInstance } from './services.mjs';
import { answerFan } from './assistant.mjs';
import { categories, day, fanCategory, fanWallet, gameProfile, matchCredit, seedFans, seedMatchProfiles } from './fans.mjs';
import { rosters } from './rosters.mjs';
import { addNotice, dailyQuiz, deliverNotices, engagement, inboxView, mailConfigured, referralMilestones, starterQuiz, syncNotices, utcDate } from './engagement.mjs';

const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 4173);
const origin = new URL(process.env.PUBLIC_ORIGIN || `http://localhost:${port}`).origin;
const secure = origin.startsWith('https:');
const demo = process.env.DEMO_MODE === '1' || (process.env.DEMO_MODE !== '0' && !process.env.PUBLIC_ORIGIN);
const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const operators = new Set((process.env.OPERATOR_EMAILS || '').toLowerCase().split(',').map(email => email.trim()).filter(Boolean));
const reviewers = new Set((process.env.REVIEWER_EMAILS || '').toLowerCase().split(',').map(email => email.trim()).filter(Boolean));
const ingestToken = process.env.MATCH_INGEST_TOKEN;
const store = await openStore(demo);
const content = process.env.CONTENT_FILE ? JSON.parse(await readFile(process.env.CONTENT_FILE, 'utf8')) : {};
const token = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('hex');
const stored = await store.read();
if (!stored.activityMigrated || (demo && (!stored.fanLabSeed || !stored.matchProfilesSeeded))) {
  await store.write((data, _record, log) => {
    if (!data.activityMigrated) {
      for (const user of Object.values(data.users)) {
        for (const item of user.ledger) {
          log({ time: item.at, kind: item.points < 0 ? 'redeem' : 'points', subject: user.id, amount: item.points, sample: Boolean(user.demo) });
        }
      }
      data.activityMigrated = true;
    }
    if (demo) {
      seedFans(data, log);
      if (!data.matchProfilesSeeded) seedMatchProfiles(data, log);
    }
  });
}

function addUser(data, fields, invite, existingUserId) {
  const id = randomUUID();
  const user = { id, created: Date.now(), invite: `PL-${randomBytes(6).toString('hex').toUpperCase()}`, links: {}, ledger: [], ...fields };
  data.users[id] = user;
  const inviter = Object.values(data.users).find(candidate => candidate.invite === invite && !candidate.persona && Boolean(candidate.demo) === Boolean(user.demo));
  if (inviter && inviter.id !== existingUserId && inviter.id !== id) {
    data.referrals[id] = { inviter: inviter.id, invitee: id, status: 'pending', at: new Date().toISOString() };
    addNotice(inviter, { id: `invite-joined-${id}`, title: 'A friend joined your invite', message: `${user.name} joined Afterimage. Approval will appear under Rewards.`, route: '#rewards/redeem' });
  }
  syncNotices(user);
  return user;
}

const isOperator = user => Boolean(user?.demo && demo && (!user.sampleOf || user.practiceReviewer) || user?.googleSub && operators.has(user.email));
const isReviewer = user => isOperator(user) || Boolean(user?.googleSub && reviewers.has(user.email) && user.youtube);
const balance = user => fanWallet(user).balance;
const credit = (user, id, label, points, log) => {
  ensure(!user.ledger.some(entry => entry.id === id), 'This reward has already been applied.', 409);
  const at = new Date().toISOString();
  user.ledger.push({ id, label, points, at });
  log({ time: at, kind: points < 0 ? 'redeem' : 'points', subject: user.id, amount: points, sample: Boolean(user.demo) });
};

function approveReferral(referral, inviter, invitee, log) {
  credit(inviter, `referral:${invitee.id}`, 'Approved referral', rewardRules.referral, log);
  credit(invitee, 'referral-welcome', 'Referral welcome bonus', rewardRules.referralWelcome, log);
  referral.status = 'approved';
  referral.approvedAt = new Date().toISOString();
  addNotice(inviter, {
    id: `invite-approved-${invitee.id}`, title: `+${rewardRules.referral} points from an invite`,
    message: `${invitee.name} completed the referral requirements. Your points are in your wallet.`,
    route: '#rewards/redeem', email: true
  });
}

function finishDemoReferral(data, user, log) {
  const referral = data.referrals[user.id];
  if (!user.demo || referral?.status !== 'pending') return;
  const inviter = data.users[referral.inviter];
  if (!inviter?.demo) return;
  const earned = inviter.ledger.filter(entry => entry.id.startsWith('referral:')).length;
  if (earned >= rewardRules.referralCap) {
    referral.status = 'capped';
    return;
  }
  approveReferral(referral, inviter, user, log);
}
const cookieValue = (req, name) => (req.headers.cookie || '').split(/;\s*/).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const sessionKey = req => digest(cookieValue(req, 'pl_session'));
function current(data, key) {
  const session = data.sessions[key];
  const user = session?.expires > Date.now() ? data.users[session.user] : null;
  return user?.demo && !demo ? null : user;
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

async function startSession(res, action, oldKey) {
  const raw = token();
  await store.write((data, _record, log) => {
    const user = action(data, log);
    syncNotices(user);
    user.lastVisitAt = Date.now();
    for (const [key, session] of Object.entries(data.sessions)) {
      if (session.expires <= Date.now() || key === oldKey) delete data.sessions[key];
    }
    data.sessions[digest(raw)] = { user: user.id, expires: Date.now() + 7 * day };
  });
  res.setHeader('Set-Cookie', cookie('pl_session', raw, 7 * 86400));
}

const newest = (a, b) => b.created.localeCompare(a.created);
const dailyCount = user => user.ledger.filter(entry => entry.id.startsWith('daily:')).length;
const inChallenge = user => {
  const age = Date.now() - user.created;
  return age >= 0 && age < rewardRules.days * day && dailyCount(user) < rewardRules.days;
};
function publicState(data, user) {
  const patches = Object.values(data.patches).filter(patch => !patch.sample).sort(newest);
  if (demo) patches.push(user?.demoPatch || samplePatch);
  const publishedCreators = [];
  for (const candidate of Object.values(data.users)) {
    if (candidate.youtube && candidate.profile && isReviewer(candidate) && !candidate.demo) {
      const { id, name, subscribers } = candidate.youtube;
      const { game, specialty, description } = candidate.profile;
      const audience = subscribers === null ? 'Private audience count' : subscribers >= 100_000 ? 'Major creator' : subscribers >= 10_000 ? 'Established creator' : 'Rising creator';
      publishedCreators.push({ id: `YT-${id}`, name, game, specialty, description, audience, youtube: id, score: null, color: 'blue', earned: data.creatorPoints[`YT-${id}`] || 0 });
    }
  }
  const playerEmail = user?.googleSub ? user.email : '';
  const clips = (content.clips || []).filter(clip => /^https:\/\//i.test(clip.url || ''));
  const leagueEntries = (content.standings || []).filter(row => games.includes(row.game) && Number.isFinite(row.score) &&
    (!row.private || (playerEmail && row.members?.includes(playerEmail))));
  const result = {
    games, patches, creators: publishedCreators, news, faze, rosters, rewardRules, matchRules, missions: engagement(null),
    products: products.filter(item => !item.demoOnly || demo).map(({ cost, ...item }) => ({
      ...item,
      stock: data.inventory[item.id] ?? item.stock,
      available: user?.demo || (demo && Boolean(user) && item.id === 'pass') || (!item.demoOnly && Boolean(user?.googleSub) && data.inventory[item.id] > 0 && data.remainingBudget >= cost)
    })),
    standings: leagueEntries.map(({ name, game, league, score }) => ({ name, game, league, score })),
    clips,
    config: { demo, google, email: mailConfigured(origin), gemini: Boolean(process.env.GEMINI_API_KEY), receiptAuthority: Boolean(process.env.SOLANA_RECEIPT_AUTHORITY), database: store.name, heroVideo: process.env.HERO_VIDEO_URL || '/hero-placeholder.mp4', memberVideo: Boolean(process.env.MEMBER_VIDEO_URL) }
  };
  if (!user) return result;
  const owned = Object.values(data.redemptions).filter(order => order.user === user.id);
  const profile = gameProfile(user);
  const journey = engagement(user, Date.now(), profile);
  const matched = patches.find(patch => user.links[patch.game] && Boolean(patch.sample) === Boolean(user.demo));
  const returning = Date.now() - user.created >= rewardRules.minAge * day;
  return { ...result, user: {
    id: user.id, name: user.name, demo: Boolean(user.demo), verified: Boolean(user.googleSub), youtube: user.youtube,
    reviewer: isReviewer(user), operator: isOperator(user), links: user.links, invite: user.invite,
    ...fanWallet(user), category: fanCategory(user, Date.now(), profile), ledger: user.ledger, creator: user.creator,
    canUseFanLab: Boolean(user.demo && demo), previewing: Boolean(user.previewOwner),
    performance: playerPerformance(data, user, profile),
    entries: data.entries.filter(entry => entry.user === user.id).map(entry => entry.creator),
    journey, inbox: inboxView(user),
    referred: Boolean(data.referrals[user.id]),
    referrals: Object.values(data.referrals).filter(referral => referral.inviter === user.id).map(({ status, invitee, at, approvedAt }) => ({
      status, name: data.users[invitee]?.name || 'Afterimage fan', at, approvedAt,
      ...(data.users[invitee] ? referralMilestones(data.users[invitee]) : {})
    })),
    reviewQueue: isOperator(user) && !user.demo ? Object.values(data.referrals).filter(referral => referral.status === 'pending').map(referral => {
      const invitee = data.users[referral.invitee];
      return { id: invitee.id, name: invitee.name, verified: Boolean(invitee.googleSub), ...referralMilestones(invitee) };
    }) : [],
    sponsoredOrders: owned, offer: matched && journey.comeback ? { game: matched.game, patch: matched.id, bonus: journey.comeback } : null,
    merchUsed: owned.filter(order => order.product !== 'pass').length,
    challengeComplete: !inChallenge(user),
    completedToday: user.ledger.some(entry => entry.id === `daily:${new Date().toISOString().slice(0, 10)}`),
    member: owned.some(order => order.product === 'pass'), returning,
    rewindVideo: Boolean(playerEmail && Object.hasOwn(content.rewinds || {}, playerEmail) || user.demo && process.env.REWIND_VIDEO_URL),
    memberIntel: owned.some(order => order.product === 'pass') ? clean(content.memberIntel, 2400) : '',
    surveyInvites: isReviewer(user) ? patches.filter(patch => Boolean(patch.sample) === Boolean(user.demo) && !patch.reviews.some(review => review.user === user.id)).map(patch => ({ id: patch.id, game: patch.game, version: patch.version })) : []
  } };
}

function playerPerformance(data, user, profile = gameProfile(user)) {
  const peers = Object.values(data.users).filter(candidate => candidate.id !== user.id &&
    (user.demo ? candidate.persona && candidate.id !== user.sampleOf : !candidate.demo));
  const competitors = profile.some(game => game.ranked) ? peers.map(candidate => gameProfile(candidate)) : [];
  const standing = profile.map(game => {
    if (!game.ranked) return game;
    const scores = competitors.flatMap(candidate => candidate.filter(entry => entry.game === game.game && entry.ranked));
    return {
      ...game,
      rank: scores.filter(entry => entry.performance > game.performance ||
        (entry.performance === game.performance && entry.matches > game.matches)).length + 1,
      rankedFans: scores.length + 1
    };
  });
  const recent = (user.matches || []).slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  return { games: standing, recent };
}

function parseMatch(body, source) {
  const game = clean(body.game, 32);
  const id = clean(body.matchId, 96);
  const at = source === 'demo' ? new Date().toISOString() : clean(body.completedAt, 40);
  const time = Date.parse(at);
  const inputNumber = value => typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  const [minutes, placement, fieldSize] = [body.minutes, body.placement, body.fieldSize].map(inputNumber);
  ensure(games.includes(game) && /^[a-z0-9_-]+$/i.test(id), 'Choose a game and provide a valid match ID.');
  ensure(Number.isInteger(minutes) && minutes >= 1 && minutes <= 360 &&
    Number.isInteger(fieldSize) && fieldSize >= 2 && fieldSize <= 256 &&
    Number.isInteger(placement) && placement >= 1 && placement <= fieldSize, 'Enter valid minutes, placement, and field size.');
  ensure(Number.isFinite(time) && time > Date.UTC(2020, 0, 1) && time <= Date.now(), 'Enter a valid completion time.');
  return { game, id, at: new Date(time).toISOString(), minutes, placement, fieldSize, source };
}

function storeMatch(user, match, log) {
  const matches = user.matches ||= [];
  const existing = matches.find(row => row.game === match.game && row.id === match.id);
  if (existing) {
    ensure(existing.minutes === match.minutes && existing.placement === match.placement && existing.fieldSize === match.fieldSize &&
      (match.source !== 'verified' || existing.at === match.at),
      'This match ID already has different results.', 409);
    return { message: 'Match already recorded.' };
  }
  syncNotices(user);
  const result = matchCredit(match, user.ledger);
  matches.push({ ...match, credit: result });
  if (result.awarded) {
    credit(user, `match:${match.game}:${match.id}`, `${match.game} · Place ${match.placement}/${match.fieldSize}`, result.awarded, log);
  }
  return { message: result.awarded ? `Match recorded. +${result.awarded} points.` : 'Match recorded. 0 points earned.' };
}

async function importMatch(req) {
  ensure(ingestToken, 'The trusted match feed is waiting for setup.', 503);
  const provided = req.headers.authorization || '';
  ensure(timingSafeEqual(Buffer.from(digest(provided)), Buffer.from(digest(`Bearer ${ingestToken}`))), 'Trusted match feed authorization required.', 401);
  limit(req, 'match-import', 150);
  const body = await readBody(req);
  const match = parseMatch(body, 'verified');
  return store.write((data, _record, log) => {
    const id = clean(body.userId, 48);
    const user = Object.hasOwn(data.users, id) ? data.users[id] : null;
    const handle = user?.links?.[match.game]?.handle;
    ensure(user?.googleSub && !user.demo && handle && handle.toLowerCase() === clean(body.handle, 64).toLowerCase(),
      'Match results must correspond to an eligible linked fan account.', 404);
    return storeMatch(user, match, log);
  });
}

async function googleFlow(req, res, url, key) {
  ensure(google, 'Google sign-in needs OAuth credentials.', 503);
  const callback = `${origin}/auth/google/callback`;
  if (url.pathname === '/auth/google') {
    const state = token();
    const verifier = token();
    const youtube = url.searchParams.get('link') === 'youtube';
    const user = current(await store.read(), key);
    if (youtube) ensure(user?.googleSub, 'Sign in with Google before connecting YouTube.', 401);
    await store.write(data => {
      for (const [id, flow] of Object.entries(data.oauth)) if (flow.expires < Date.now()) delete data.oauth[id];
      data.oauth[digest(state)] = { verifier, expires: Date.now() + 600_000, youtube, user: user?.id, walkthrough: url.searchParams.get('from') === 'welcome', invite: clean(url.searchParams.get('invite'), 20).toUpperCase() };
    });
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: callback, response_type: 'code',
      scope: youtube ? 'openid email profile https://www.googleapis.com/auth/youtube.readonly' : 'openid email profile',
      state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256'
    });
    res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, 'Set-Cookie': cookie('pl_oauth', state, 600) }).end();
    return;
  }
  const state = url.searchParams.get('state');
  ensure(state && state === cookieValue(req, 'pl_oauth'), 'Google sign-in expired. Start again.');
  const flow = await store.write(data => {
    const flow = data.oauth[digest(state)];
    ensure(flow?.expires > Date.now(), 'Google sign-in expired. Start again.');
    delete data.oauth[digest(state)];
    return flow;
  });
  const code = url.searchParams.get('code');
  ensure(code, 'Google authorization was cancelled.');
  const credentials = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: callback, grant_type: 'authorization_code', code_verifier: flow.verifier })
  });
  const headers = { Authorization: `Bearer ${credentials.access_token}` };
  const profile = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', { headers });
  ensure(profile.sub && profile.email_verified && profile.email, 'Google could not verify the email address.');
  const email = profile.email.toLowerCase();
  let walk = flow.walkthrough;
  if (flow.youtube) {
    const result = await fetchJson('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers });
    const channel = result.items?.[0];
    ensure(channel?.id, 'No YouTube channel was returned for this Google account.');
    await store.write(data => {
      const user = current(data, key);
      ensure(user?.id === flow.user && user.googleSub === profile.sub, 'Connect YouTube using the same Google identity as your Patchline account.', 403);
      ensure(!Object.values(data.users).some(candidate => candidate.id !== user.id && candidate.youtube?.id === channel.id), 'This YouTube channel is already connected.', 409);
      user.youtube = { id: channel.id, name: clean(channel.snippet.title, 90), subscribers: channel.statistics.hiddenSubscriberCount ? null : Number(channel.statistics.subscriberCount || 0) };
    });
  } else {
    await startSession(res, data => {
      const existing = Object.values(data.users).find(user => user.googleSub === profile.sub);
      const sameEmail = Object.values(data.users).find(user => user.email === email && user.id !== existing?.id);
      if (sameEmail) {
        ensure(!sameEmail.googleSub && current(data, key)?.id === sameEmail.id, 'Sign in to the existing Patchline account before linking this email.', 409);
        sameEmail.googleSub = profile.sub;
        return sameEmail;
      }
      if (existing) {
        if (existing.email !== email) existing.emailEnabled = false;
        existing.email = email;
        return existing;
      }
      walk = true;
      return addUser(data, { email, name: clean(profile.name, 40) || 'Player', googleSub: profile.sub }, flow.invite, flow.user);
    }, key);
  }
  res.writeHead(302, { Location: flow.youtube ? '/#account' : walk ? '/#welcome' : '/#home' }).end();
}

async function publish(input) {
  const patch = parsePatch(input);
  const data = await store.read();
  if (data.patches[patch.id]) return data.patches[patch.id];
  const prior = Object.values(data.patches).filter(item => item.game === patch.game && !item.sample).sort(newest)[0];
  const draft = await analyze(patch, prior);
  return store.write((data, record) => {
    if (data.patches[patch.id]) return data.patches[patch.id];
    data.patches[patch.id] = draft;
    record({ patch: draft, phase: 'ai-draft' });
    return draft;
  });
}

const attempts = new Map();
function limit(req, scope, max) {
  const id = `${req.socket.remoteAddress}:${scope}`;
  const now = Date.now();
  const window = attempts.get(id);
  if (!window || window.expires <= now) {
    if (attempts.size >= 4096) for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
    ensure(attempts.size < 8192, 'Rate limit capacity reached. Try again soon.', 429);
    attempts.set(id, { expires: now + 600_000, count: 1 });
  } else {
    ensure(window.count < max, 'Too many attempts. Try again in a few minutes.', 429);
    window.count++;
  }
}

async function readBody(req) {
  ensure(req.headers['content-type']?.split(';')[0] === 'application/json', 'Send a JSON request.', 415);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    ensure(size <= 100_000, 'Request exceeded the body size limit.', 413);
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks));
    ensure(body && typeof body === 'object' && !Array.isArray(body), 'Expected a JSON object.');
    return body;
  } catch { ensure(false, 'Malformed JSON.'); }
}

async function mutate(req, res, action, key) {
  ensure(req.headers.origin === origin, 'Request origin does not match the site.', 403);
  limit(req, 'write', 150);
  const body = await readBody(req);
  if (action === 'newsletter') {
    const email = clean(body.email, 254).toLowerCase();
    ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email.');
    await store.write(data => {
      data.newsletter ??= [];
      if (!data.newsletter.some(entry => entry.email === email)) {
        data.newsletter.push({ email, at: new Date().toISOString() });
      }
    });
    return { message: 'You’re on the list.' };
  }
  if (action === 'ask') {
    limit(req, 'assistant', 20);
    const question = clean(body.question, 500);
    ensure(question.length >= 3, 'Enter a question.');
    const data = await store.read();
    const player = current(data, key);
    const state = publicState(data, player);
    const previous = clean(body.previous, 500);
    return answerFan(question, {
      player, patches: state.patches, performance: state.user?.performance, journey: state.user?.journey,
      referrals: state.user?.referrals, emailEnabled: state.user?.inbox.emailEnabled, mailAvailable: state.config.email,
      challengeOpen: Boolean(player && inChallenge(player)), previous, analytics: await activity()
    });
  }
  if (action === 'preview-fan') {
    limit(req, 'auth', 30);
    await startSession(res, data => {
      const currentUser = current(data, key);
      ensure(demo && currentUser?.demo, 'Switching profiles needs a demo session.', 403);
      const id = clean(body.id, 32);
      const sample = Object.hasOwn(data.users, id) ? data.users[id] : null;
      ensure(sample?.persona, 'Demo fan not found.', 404);
      const owner = currentUser.previewOwner || currentUser.id;
      const existing = Object.values(data.users).find(candidate => candidate.previewOwner === owner && candidate.sampleOf === id);
      if (existing) return existing;
      const user = addUser(data, {
        name: sample.name, demo: true, created: sample.created, sampleOf: id, previewOwner: owner,
        practiceReviewer: fanCategory(sample).name === 'Creator reviewer',
        ledger: structuredClone(sample.ledger), links: structuredClone(sample.links), matches: structuredClone(sample.matches || [])
      }, null);
      if (sample.ledger.some(item => item.id === 'redeem:seed')) {
        const orderId = `${user.id}:seed`;
        data.redemptions[orderId] = { id: orderId, user: user.id, product: 'pass', name: 'Intel Pass', status: 'activated' };
      }
      return user;
    }, key);
    return { message: 'Demo fan opened.' };
  }
  if (action === 'exit-preview') {
    limit(req, 'auth', 30);
    await startSession(res, data => {
      const preview = current(data, key);
      const owner = preview?.demo && preview.previewOwner ? data.users[preview.previewOwner] : null;
      ensure(demo && owner?.demo && !owner.persona, 'There’s no original demo account to return to.', 403);
      return owner;
    }, key);
    return { message: 'Back in your original demo account.' };
  }
  if (action === 'watch') {
    limit(req, 'watch', 30);
    const clip = faze.videos.find(item => item.id === body.clip);
    ensure(clip, 'Clip not found.', 404);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const browser = cookieValue(req, 'pl_viewer');
    const viewer = /^[\w-]{43}$/.test(browser) ? browser : token();
    if (viewer !== browser) res.setHeader('Set-Cookie', cookie('pl_viewer', viewer, 86400 * 14));
    return store.write((data, _record, log) => {
      if (data.clipDay !== today) {
        data.clipDay = today;
        data.clipViews = {};
      }
      const player = current(data, key);
      const marker = digest(`${player?.id || viewer}:${clip.id}`);
      if (!data.clipViews[marker]) {
        data.clipViews[marker] = true;
        log({ time: now, kind: 'clip', subject: clip.id, amount: 1, sample: demo });
      }
      return { message: 'Clip opened.' };
    });
  }
  if (['signup', 'login', 'demo'].includes(action)) {
    limit(req, 'auth', 30);
    if (action === 'demo') {
      ensure(demo, 'Demo accounts are disabled.', 403);
      await startSession(res, (data, log) => {
        const name = clean(body.name, 28) || (body.invite ? 'Invited fan' : 'Demo Player');
        const user = addUser(data, { name, demo: true }, clean(body.invite, 20).toUpperCase(), current(data, key)?.id);
        if (body.walkthrough !== '1') credit(user, 'demo', 'Demo point balance', rewardRules.demoBalance, log);
        return user;
      }, key);
      return { message: 'Demo account ready.' };
    }
    const email = clean(body.email, 254).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 10 && password.length <= 128, 'Enter a valid email and a password of 10–128 characters.');
    if (action === 'signup') {
      const name = clean(body.name, 40);
      ensure(name, 'Enter a display name.');
      const salt = token();
      const hash = (await scrypt(password, salt, 64)).toString('hex');
      await startSession(res, (data, log) => {
        ensure(!Object.values(data.users).some(user => user.email === email), 'An account already uses that email.', 409);
        const user = addUser(data, { email, name, salt, hash }, clean(body.invite, 20).toUpperCase(), current(data, key)?.id);
        const referral = data.referrals[user.id];
        if (demo && referral) {
          const inviter = data.users[referral.inviter];
          const earned = inviter.ledger.filter(entry => entry.id.startsWith('referral:')).length;
          if (earned < rewardRules.referralCap) approveReferral(referral, inviter, user, log);
          else referral.status = 'capped';
        }
        return user;
      }, key);
      return { message: 'Account created.' };
    }
    const user = Object.values((await store.read()).users).find(item => item.email === email);
    const check = await scrypt(password, user?.salt || 'patchline-missing-account', 64);
    ensure(user?.hash && timingSafeEqual(Buffer.from(user.hash, 'hex'), check), 'Invalid email or password.', 401);
    await startSession(res, data => data.users[user.id], key);
    return { message: 'Signed in.' };
  }
  const data = await store.read();
  const user = current(data, key);
  ensure(user, 'Sign in to continue.', 401);
  if (action === 'analyze') {
    ensure(isOperator(user) && !user.demo, 'Live analysis requires an allowlisted Google operator.', 403);
    limit(req, 'analysis', 12);
    const patch = await publish(body);
    return { message: 'Gemini draft ready for creator review.', patch: patch.id };
  }
  if (action === 'receipt') {
    const order = Object.hasOwn(data.redemptions, body.id) ? data.redemptions[body.id] : null;
    ensure(order?.user === user.id && order.memo && !order.signature, 'An unanchored redemption is required.', 404);
    limit(req, 'rpc', 15);
    await verifyReceipt(clean(body.signature, 100), order.memo);
  }
  return store.write((data, record, log) => {
    const user = current(data, key);
    ensure(user, 'Session expired.', 401);
    syncNotices(user);
    const patch = user.demo && demo && body.patch === samplePatch.id
      ? (user.demoPatch ??= structuredClone(samplePatch))
      : Object.hasOwn(data.patches, body.patch) && !data.patches[body.patch].sample ? data.patches[body.patch] : null;
    switch (action) {
      case 'favorite-games': {
        const picks = Array.isArray(body.games) ? body.games : [body.games];
        const gameList = [...new Set(picks)];
        ensure(gameList.length >= 1 && gameList.length <= 3 && gameList.every(game => games.includes(game)), 'Choose one to three games.');
        user.favoriteGames = gameList;
        return { message: 'Your games are saved.' };
      }
      case 'onboarding-done':
        ensure(user.favoriteGames?.length && user.ledger.some(item => item.id === 'archive-quiz'), 'Pick a game and complete the first mission.');
        user.onboardingDone = true;
        return { message: 'Your Replay dashboard is ready.' };
      case 'read-notice': {
        const notice = user.inbox?.find(item => item.id === body.id);
        ensure(notice, 'Notification not found.', 404);
        notice.readAt ||= new Date().toISOString();
        return { message: 'Notification read.' };
      }
      case 'read-all':
        for (const notice of user.inbox || []) notice.readAt ||= new Date().toISOString();
        return { message: 'Inbox caught up.' };
      case 'email-preference':
        ensure(!user.demo && user.googleSub && user.email, 'Email updates require a verified account.', 403);
        ensure(typeof body.enabled === 'boolean', 'Choose an email preference.');
        if (body.enabled) user.unsubscribeToken ||= token();
        user.emailEnabled = body.enabled ? user.emailEnabled || Date.now() : false;
        return { message: body.enabled ? 'Email updates enabled.' : 'Email updates turned off.' };
      case 'logout':
        delete data.sessions[key];
        res.setHeader('Set-Cookie', cookie('pl_session', '', 0));
        return { message: 'Signed out.' };
      case 'game-link': {
        ensure(games.includes(body.game), 'Choose a game.');
        const handle = clean(body.handle, 64);
        ensure(handle, 'Enter a player handle.');
        user.links[body.game] = { handle, verified: false };
        return { message: 'Game profile saved as self-reported.' };
      }
      case 'demo-match':
        ensure(user.demo && demo, 'Real match results come from the trusted match feed.', 403);
        return storeMatch(user, parseMatch(body, 'demo'), log);
      case 'creator-profile': {
        ensure(user.youtube && isReviewer(user), 'A connected YouTube channel and reviewer access are required.', 403);
        const specialty = clean(body.specialty, 45);
        const description = clean(body.description, 280);
        ensure(games.includes(body.game) && specialty && description, 'Choose a game and add your specialty and bio.');
        user.profile = { game: body.game, specialty, description };
        return { message: 'Creator gallery profile published.' };
      }
      case 'creator': {
        const code = clean(body.code, 60);
        const item = (demo ? creators : []).find(creator => creator.id === code.toUpperCase());
        const candidate = Object.values(data.users).find(player => player.youtube && player.profile && isReviewer(player) && `YT-${player.youtube.id}` === code);
        ensure((item && user.demo) || (candidate && !user.demo && candidate.id !== user.id), 'Creator code was unavailable.');
        ensure(!user.creator, 'A creator code is already attached to this account.', 409);
        ensure(user.demo || user.googleSub, 'Verify your Google identity to join a giveaway.', 403);
        user.creator = item?.id || code;
        data.entries.push({ user: user.id, creator: user.creator });
        return { message: 'Creator code applied. Giveaway entry recorded.' };
      }
      case 'daily': {
        const dailyPatch = patch || (demo && body.patch === samplePatch.id ? samplePatch : null);
        ensure(dailyPatch, 'Select an eligible patch.');
        ensure(dailyPatch.rankings.some(row => row.name === body.weapon), 'Choose a weapon from this patch.');
        ensure(inChallenge(user), 'Your challenge has ended.');
        ensure(user.demo || user.googleSub || (demo && dailyPatch.sample), 'Verify with Google to earn redeemable points.', 403);
        credit(user, `daily:${new Date().toISOString().slice(0, 10)}`, `Daily meta pick · ${body.weapon}`, rewardRules.daily, log);
        finishDemoReferral(data, user, log);
        return { message: `Daily meta pick recorded. +${rewardRules.daily} pts.` };
      }
      case 'check-in':
      case 'trivia': {
        ensure(demo || user.demo || user.googleSub, 'Verify with Google to earn rewards.', 403);
        const quiz = dailyQuiz();
        ensure(!body.date || body.date === quiz.date, 'The daily missions refreshed. Open Rewards again.', 409);
        if (action === 'trivia') ensure(body.answer === quiz.correct, 'Try another answer.');
        const points = action === 'trivia' ? rewardRules.trivia : rewardRules.checkIn;
        credit(user, `${action}:${quiz.date}`, action === 'trivia' ? 'Daily archive trivia' : 'Daily check-in', points, log);
        finishDemoReferral(data, user, log);
        return { message: `Mission complete. +${points} points.` };
      }
      case 'archive-quiz': {
        ensure(demo || user.demo || user.googleSub, 'Verify with Google to earn rewards.', 403);
        ensure(body.year === starterQuiz.correct, 'Try again. The hint is in the first mission.');
        credit(user, 'archive-quiz', 'First ILLCAMS archive challenge', rewardRules.archive, log);
        finishDemoReferral(data, user, log);
        return { message: `Archive challenge solved. +${rewardRules.archive} pts.` };
      }
      case 'comeback': {
        ensure(demo || user.demo || user.googleSub, 'Verify with Google to earn rewards.', 403);
        const journey = engagement(user);
        ensure(journey.comeback, 'There’s no comeback bonus available right now.', 409);
        credit(user, `comeback:${utcDate(journey.comebackActivity)}`, 'Comeback bonus', journey.comeback, log);
        return { message: `Welcome back. +${journey.comeback} points.` };
      }
      case 'return': {
        ensure(engagement(user).comeback && patch && user.links[patch.game] && Boolean(patch.sample) === Boolean(user.demo), 'No returning offer is available for this patch.');
        ensure(user.demo || user.googleSub, 'Verify with Google first.', 403);
        credit(user, 'return', `Returning player · ${patch.game}`, rewardRules.returning, log);
        return { message: `Returning player offer claimed. +${rewardRules.returning} pts.` };
      }
      case 'review': {
        ensure(isReviewer(user) && patch && Boolean(patch.sample) === Boolean(user.demo), 'Verified reviewer access is required for this patch.', 403);
        const row = patch.rankings.find(item => item.name === body.weapon);
        const reason = clean(body.reason, 300);
        ensure(row && tiers.includes(body.tier) && reason.length >= 10, 'Choose a weapon and tier and explain the change.');
        ensure(!patch.reviews.some(review => review.user === user.id), 'This reviewer already completed this patch survey.', 409);
        const review = { id: randomUUID(), user: user.id, name: user.youtube?.name || user.name, weapon: row.name, tier: body.tier, reason, status: 'pending' };
        patch.reviews.push(review);
        user.lastReviewAt = Date.now();
        return { message: 'Survey submitted for adjudication.' };
      }
      case 'approve-review': {
        ensure(isOperator(user) && patch && Boolean(patch.sample) === Boolean(user.demo), 'Operator access required.', 403);
        const review = patch.reviews.find(item => item.id === body.id && item.status === 'pending');
        ensure(review && (user.demo || review.user !== user.id), 'A pending survey from another reviewer is required.');
        const weapon = patch.rankings.find(row => row.name === review.weapon);
        const owner = data.users[review.user];
        if (body.approve === true) {
          weapon.aiTier ??= weapon.tier;
          weapon.tier = review.tier;
          weapon.reviewReason = review.reason;
          patch.rankings.sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier));
          const rewarded = owner.ledger.filter(entry => entry.id.startsWith('review:')).length;
          const points = rewarded < rewardRules.reviewCap ? rewardRules.review : 0;
          if (points) credit(owner, `review:${patch.id}`, `Accepted patch survey · ${patch.game}`, points, log);
          if (owner.youtube) {
            const code = `YT-${owner.youtube.id}`;
            data.creatorPoints[code] = (data.creatorPoints[code] || 0) + points;
          }
          review.status = 'accepted';
          addNotice(owner, { id: `review-${review.id}`, title: 'Your pro review was accepted', message: `${weapon.name} is now tier ${review.tier}.${points ? ` Your wallet earned ${points} points.` : ''}`, route: '#patches/pro-reviews', email: true });
          record({ patch: user.demo ? { ...patch, id: user.id } : patch, phase: 'creator-reviewed' });
        } else review.status = 'declined';
        return { message: review.status === 'accepted' ? 'Ranking updated and review recorded.' : 'Survey declined.' };
      }
      case 'referral': {
        ensure(isOperator(user) && !user.demo, 'A live operator must approve referrals.', 403);
        const referral = Object.hasOwn(data.referrals, body.id) ? data.referrals[body.id] : null;
        ensure(referral?.status === 'pending', 'No pending referral found.', 404);
        const inviter = data.users[referral.inviter];
        const invitee = data.users[referral.invitee];
        if (body.approve === true) {
          const milestones = referralMilestones(invitee);
          ensure(inviter.googleSub && invitee.googleSub && inviter.googleSub !== invitee.googleSub && milestones.age >= rewardRules.minAge && milestones.tasks >= rewardRules.referralTasks,
            `Referrals require two verified identities, ${rewardRules.minAge} days of account age and ${rewardRules.referralTasks} daily challenges.`);
          ensure(inviter.ledger.filter(entry => entry.id.startsWith('referral:')).length < rewardRules.referralCap, 'The inviter reached the referral cap.');
          approveReferral(referral, inviter, invitee, log);
        } else referral.status = 'declined';
        return { message: `Referral ${referral.status}.` };
      }
      case 'redeem': {
        const item = products.find(product => product.id === body.product);
        ensure(item && (demo || user.demo || user.googleSub) && (!item.demoOnly || user.demo), 'This reward requires an eligible account.', 403);
        const attempt = clean(body.attempt, 40);
        ensure(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(attempt), 'Invalid redemption request.');
        const id = `${user.id}:${attempt}`;
        if (data.redemptions[id]) {
          ensure(data.redemptions[id].product === item.id, 'This redemption request belongs to another item.', 409);
          return { message: 'Redemption already recorded.' };
        }
        const owned = Object.values(data.redemptions).filter(order => order.user === user.id);
        ensure(owned.filter(order => order.product !== 'pass').length < rewardRules.merchCap || item.id === 'pass', 'The merchandise redemption cap has been reached.');
        ensure(item.id !== 'pass' || !owned.some(order => order.product === 'pass'), 'Intel Pass is already active.');
        ensure(balance(user) >= item.price, 'Your balance is too low.');
        if (!user.demo) {
          ensure(data.inventory[item.id] > 0 && data.remainingBudget >= item.cost, 'The campaign inventory or budget has been exhausted.');
          data.inventory[item.id]--;
          data.remainingBudget -= item.cost;
        }
        credit(user, `redeem:${attempt}`, item.name, -item.price, log);
        const commitment = digest(JSON.stringify([id, item.id, item.price, token()]));
        data.redemptions[id] = { id, user: user.id, product: item.id, name: item.name, points: item.price, memo: `patchline:${Buffer.from(commitment, 'hex').toString('base64url')}`, status: user.demo || item.id === 'pass' ? 'activated' : 'reserved' };
        if (!user.demo && item.cost > 0 && user.creator) {
          data.creatorPoints[user.creator] = (data.creatorPoints[user.creator] || 0) + rewardRules.creator;
        }
        return { message: item.id === 'pass' ? 'Intel Pass activated.' : 'Sample reservation recorded. No item will ship.' };
      }
      case 'receipt': {
        const signature = clean(body.signature, 100);
        const order = data.redemptions[body.id];
        ensure(order?.user === user.id && !order.signature && !data.signatures[signature], 'This receipt was already recorded.', 409);
        order.signature = signature;
        data.signatures[signature] = order.id;
        return { message: 'Finalized Solana receipt verified.' };
      }
      default: ensure(false, 'Route not found.', 404);
    }
  });
}

const activity = () => store.analytics(demo, new Date(Date.now() - 7 * day).toISOString());
let checkCache;
async function trackChecks() {
  if (checkCache?.expires > Date.now()) return checkCache.result;
  const result = Promise.allSettled([
    solanaRpc('getSlot', [{ commitment: 'finalized' }]),
    vultrInstance(),
    activity()
  ]).then(([solana, vultr, database]) => ({
    solana: { slot: solana.status === 'fulfilled' && Number.isInteger(solana.value) ? solana.value : null, authority: Boolean(process.env.SOLANA_RECEIPT_AUTHORITY) },
    vultr: { instance: vultr.status === 'fulfilled' ? vultr.value : null, configured: Boolean(process.env.VULTR_API_KEY && process.env.VULTR_INSTANCE_ID) },
    database: { engine: store.name, available: database.status === 'fulfilled' },
    gemini: { configured: Boolean(process.env.GEMINI_API_KEY) }
  }));
  checkCache = { expires: Date.now() + 60_000, result };
  return result;
}

const vendorFiles = {
  '/vendor/react.js': ['react/umd/react.production.min.js', 'react@18.3.1/umd/react.production.min.js', 'text/javascript; charset=utf-8'],
  '/vendor/react-dom.js': ['react-dom/umd/react-dom.production.min.js', 'react-dom@18.3.1/umd/react-dom.production.min.js', 'text/javascript; charset=utf-8'],
  '/vendor/tailwind.css': ['tailwindcss/dist/tailwind.min.css', 'tailwindcss@2.2.19/dist/tailwind.min.css', 'text/css; charset=utf-8']
};
const assets ={ '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/arena.png': ['arena.png', 'image/png'], '/hero.png': ['hero.png', 'image/png'], '/hero.mp4': ['hero.mp4', 'video/mp4'] };
for (const file of ['club-bootstrap.js', 'afterimage.js', 'club-ui.js', 'club-pages.js', 'rewards-ui.js', 'shop-ui.js', 'gallery-data.js', 'esports-data.js', 'shop-data.js']) {
  assets['/' + file] = [file, 'text/javascript; charset=utf-8'];
}
assets['/afterimage.css'] = ['afterimage.css', 'text/css; charset=utf-8'];
assets['/hero-placeholder.mp4'] = ['hero-placeholder.mp4', 'video/mp4'];
assets['/experience.js'] = ['experience.js', 'text/javascript; charset=utf-8'];
assets['/experience.css'] = ['experience.css', 'text/css; charset=utf-8'];
for (const name of ['stage', 'missions', 'invites']) assets[`/art/${name}.jpg`] = [`art/${name}.jpg`, 'image/jpeg'];
for (const [file, mime] of [['logo.png', 'image/png'], ['tiger.jpg', 'image/jpeg'], ['anton.woff2', 'font/woff2'], ['source-sans.woff2', 'font/woff2'], ['source-sans-bold.woff2', 'font/woff2'], ['timeline.pdf', 'application/pdf']]) {
  assets[`/brand/${file}`] = [`brand/${file}`, mime];
}
const json = (res, status, payload) => res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(payload));
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' https://cdn.jsdelivr.net; font-src 'self'; img-src 'self' https:; media-src 'self' https:; frame-src https://www.youtube-nocookie.com; script-src 'self' https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    const url = new URL(req.url, origin);
    const key = sessionKey(req);
    if (url.pathname === '/mail/unsubscribe' && ['GET', 'POST'].includes(req.method)) {
      const unsubscribe = url.searchParams.get('token') || '';
      ensure(/^[A-Za-z0-9_-]{43}$/.test(unsubscribe), 'Invalid unsubscribe link.', 404);
      if (req.method === 'POST') {
        await store.write(data => {
          const user = Object.values(data.users).find(item => item.unsubscribeToken === unsubscribe);
          if (user) user.emailEnabled = false;
        });
        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
          res.writeHead(303, { Location: '/#inbox' }).end();
          return;
        }
        res.writeHead(204).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Afterimage email preferences</title><link rel="stylesheet" href="/style.css"><main><section class="panel pad flow"><h1>Afterimage email preferences</h1><p>Turn off email updates for this account.</p><form action="/mail/unsubscribe?token=${unsubscribe}" method="post"><button class="btn primary" type="submit">Unsubscribe</button></form></section></main></html>`);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/matches/import') return json(res, 200, await importMatch(req));
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) return json(res, 200, await mutate(req, res, url.pathname.slice(5), key));
    ensure(req.method === 'GET', 'Method not allowed.', 405);
    if (url.pathname === '/health') {
      await store.read();
      return json(res, 200, { ok: true, database: store.name, demo });
    }
    if (url.pathname === '/api/tracks') {
      limit(req, 'tracks', 30);
      return json(res, 200, await trackChecks());
    }
    if (url.pathname === '/api/activity') return json(res, 200, await activity());
    if (url.pathname === '/api/fans') {
      const data = await store.read();
      ensure(demo && current(data, key)?.demo, 'Start the demo to explore synthetic fan accounts.', 403);
      const id = url.searchParams.get('id');
      if (id) {
        const user = Object.hasOwn(data.users, id) ? data.users[id] : null;
        ensure(user?.persona, 'Sample fan not found.', 404);
        return json(res, 200, { id, name: user.name, category: fanCategory(user), ...fanWallet(user), created: user.created, links: user.links, ledger: user.ledger, performance: playerPerformance(data, user), journey: engagement(user) });
      }
      const fans = Object.values(data.users).filter(user => user.persona).map(user => ({
        id: user.id, name: user.name, category: fanCategory(user).name, ...fanWallet(user), games: [...new Set([...Object.keys(user.links), ...gameProfile(user).map(entry => entry.game)])]
      }));
      return json(res, 200, { groups: categories.map(([name]) => name), fans });
    }
    if (url.pathname === '/api/state') {
      let data = await store.read();
      const user = current(data, key);
      if (user && (!user.lastVisitAt || Date.now() - user.lastVisitAt >= 5 * 60_000)) {
        data = await store.write(updated => {
          const active = current(updated, key);
          if (active) {
            syncNotices(active);
            active.lastVisitAt = Date.now();
          }
          return updated;
        });
      }
      return json(res, 200, publicState(data, current(data, key)));
    }
    if (url.pathname === '/api/history') {
      const id = clean(url.searchParams.get('patch'), 36);
      const data = await store.read();
      const user = current(data, key);
      if (id === samplePatch.id) return json(res, 200, user?.demo && demo ? await store.history(user.id) : []);
      return json(res, 200, Object.hasOwn(data.patches, id) && !data.patches[id].sample ? await store.history(id) : []);
    }
    if (['/auth/google', '/auth/google/callback'].includes(url.pathname)) {
      limit(req, 'oauth', 40);
      return await googleFlow(req, res, url, key);
    }
    if (['/member-video', '/rewind-video'].includes(url.pathname)) {
      const data = await store.read();
      const user = current(data, key);
      const rewind = url.pathname === '/rewind-video';
      const playerRewind = user?.googleSub && Object.hasOwn(content.rewinds || {}, user.email) ? content.rewinds[user.email] : null;
      const target = rewind ? playerRewind || (user?.demo ? process.env.REWIND_VIDEO_URL : null) : process.env.MEMBER_VIDEO_URL;
      const eligible = rewind ? user && Date.now() - user.created >= 7 * day : user && Object.values(data.redemptions).some(order => order.user === user.id && order.product === 'pass');
      ensure(eligible && target && new URL(target).protocol === 'https:', 'Video is unavailable for this account.', 403);
      return res.writeHead(302, { Location: target }).end();
    }
    if (Object.hasOwn(vendorFiles, url.pathname)) {
      const [local, cdn, mime] = vendorFiles[url.pathname];
      try {
        const bytes = await readFile(new URL('./node_modules/' + local, import.meta.url));
        return res.writeHead(200, { 'Content-Type': mime }).end(bytes);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return res.writeHead(302, { Location: 'https://cdn.jsdelivr.net/npm/' + cdn }).end();
      }
    }
    const asset = Object.hasOwn(assets, url.pathname) ? assets[url.pathname] : null;
    ensure(asset, 'Page not found.', 404);
    let bytes;
    try { bytes = await readFile(new URL(`./public/${asset[0]}`, import.meta.url)); }
    catch (error) { if (error.code === 'ENOENT') return json(res, 404, { error: 'Asset not found.' }); throw error; }
    res.writeHead(200, { 'Content-Type': asset[1] }).end(bytes);
  } catch (error) {
    if (!error.status) console.error(error);
    if (!res.headersSent && !res.destroyed) json(res, error.status || 500, { error: error.status ? error.message : 'The request could not be completed.' });
  }
});

if (process.env.PATCH_FEED_URL && process.env.GEMINI_API_KEY) {
  let polling = false;
  async function poll() {
    if (polling) return;
    polling = true;
    try {
      const feed = await fetchJson(process.env.PATCH_FEED_URL);
      ensure(Array.isArray(feed), 'Patch feed must return an array.');
      for (const item of feed.slice(0, 10).reverse()) {
        try { await publish(item); } catch (error) { console.warn('Patch import:', error.message); }
      }
    } catch (error) { console.warn('Patch feed:', error.message); }
    finally { polling = false; }
  }
  setInterval(poll, 120_000).unref();
  void poll();
}

if (mailConfigured(origin)) {
  let processing = false;
  const sendPending = async () => {
    if (processing) return;
    processing = true;
    try { await deliverNotices(store, origin); }
    catch { console.warn('Replay email processing will retry.'); }
    finally { processing = false; }
  };
  setInterval(sendPending, 60_000).unref();
  void sendPending();
}

server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`FaZe Afterimage ready at ${origin} · ${store.name}${demo ? ' · demo enabled' : ''}`));

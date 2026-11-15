import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { creators, games, matchRules, news, ogQuizzes, products, rewardRules, samplePatch } from './catalog.mjs';
import { faze } from './faze.mjs';
import { openStore } from './store.mjs';
import { analyze, clean, ensure, fetchJson, parsePatch, solanaRpc, tiers, verifyReceipt, vultrInstance } from './services.mjs';
import { answerFan } from './assistant.mjs';
import { chatFeedback, chatHistory, chatMessage, chatRate, chatRequest, chatUpdate, pruneChats } from './ask-faze.mjs';
import { categories, day, fanCategory, fanWallet, gameProfile, matchCredit, seedFans, seedMatchProfiles } from './fans.mjs';
import { rosters } from './rosters.mjs';
import { addNotice, dailyQuiz, deliverNotices, engagement, inboxView, mailConfigured, referralMilestones, starterQuiz, syncNotices, utcDate, weeklyProgress } from './engagement.mjs';
import { teams, photoPath } from './public/teams-data.js';
import { activeMembership, applyStripeEvent, needsCaptcha, ogBilling, programMutation, programUser, programView, sendDropAlerts, verifyCaptcha, xpForPoints } from './programs.mjs';
import { ogConfig } from './public/og-config.js';

const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const originUrl = new URL(process.env.PUBLIC_ORIGIN || `http://localhost:${port}`);
let origin = originUrl.origin;
const homepageVideo = process.env.HERO_VIDEO_URL ||
  (existsSync(new URL('./public/hero.mp4', import.meta.url)) ? '/hero.mp4' : '/hero-placeholder.mp4');
const secure = origin.startsWith('https:');
const demo = process.env.DEMO_MODE === '1' || (process.env.DEMO_MODE !== '0' && !process.env.PUBLIC_ORIGIN);
const loopback = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const canUseFreePort = demo && loopback.has(host) && loopback.has(originUrl.hostname) && originUrl.protocol === 'http:' &&
  Number(originUrl.port || 80) === port;
const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const discord = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
const operators = new Set((process.env.OPERATOR_EMAILS || '').toLowerCase().split(',').map(email => email.trim()).filter(Boolean));
const reviewers = new Set((process.env.REVIEWER_EMAILS || '').toLowerCase().split(',').map(email => email.trim()).filter(Boolean));
const ingestToken = process.env.MATCH_INGEST_TOKEN;
const store = await openStore(demo);
const content = process.env.CONTENT_FILE ? JSON.parse(await readFile(process.env.CONTENT_FILE, 'utf8')) : {};
const token = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('hex');
const stored = await store.read();
if (!stored.activityMigrated || (demo && (stored.fanLabSeed !== 3 || !stored.matchProfilesSeeded))) {
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
  const user = { id, created: Date.now(), invite: `PL-${randomBytes(6).toString('hex').toUpperCase()}`, links: {}, ledger: [], accountType: 'New User', ...fields };
  data.users[id] = user;
  const inviter = Object.values(data.users).find(candidate => candidate.invite === invite && !candidate.persona && Boolean(candidate.demo) === Boolean(user.demo));
  if (inviter && inviter.id !== existingUserId && inviter.id !== id) {
    data.referrals[id] = { inviter: inviter.id, invitee: id, status: 'pending', at: new Date().toISOString() };
    addNotice(inviter, { id: `invite-joined-${id}`, title: 'A friend joined your invite', message: `${user.name} joined Clan. Approval will appear under Rewards.`, route: '#rewards/redeem' });
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
  if (points > 0 && activeMembership(user)) points = Math.round(points * ogConfig.paid.pointsMultiplier);
  user.ledger.push({ id, label, points, at, ...(points > 0 ? { expiresAt: new Date(Date.now() + rewardRules.expiryDays * day).toISOString() } : {}) });
  log({ time: at, kind: points < 0 ? 'redeem' : 'points', subject: user.id, amount: points, sample: Boolean(user.demo) });
  if (points > 0) xpForPoints(user, id);
};
function awardDailyCompletion(user, log) {
  const date = utcDate();
  if (['check-in', 'trivia', 'watch-task'].every(task => user.ledger.some(item => item.id === `${task}:${date}`)) &&
      !user.ledger.some(item => item.id === `completion:${date}`)) {
    credit(user, `completion:${date}`, 'Daily task completion bonus', rewardRules.completion, log);
  }
}

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

function finishPreviewReferral(data, user, log) {
  const referral = data.referrals[user.id];
  if (!demo || referral?.status !== 'pending') return;
  const inviter = data.users[referral.inviter];
  if (!inviter || Boolean(inviter.demo) !== Boolean(user.demo)) return;
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
function accountType(user, now = Date.now()) {
  if (user.personaType && user.demo) return user.personaType;
  if (user.youtube || user.profile) return 'Streamer';
  if (engagement(user, now).stage === 'returning') return 'Returning User';
  if (now - user.created < rewardRules.days * day) return 'New User';
  return 'Normal User';
}
const existingTypes = await store.read();
if (Object.values(existingTypes.users).some(user => user.accountType !== accountType(user))) {
  await store.write(data => { for (const user of Object.values(data.users)) user.accountType = accountType(user); });
}
function fanEra(user) {
  const year = user.fanSinceYear;
  if (!year) return null;
  const era = year <= 2011 ? 'Trickshot' : year <= 2013 ? 'Montage' : year <= 2017 ? 'Vlog/House' : year <= 2020 ? 'Fortnite' : 'Next Era';
  const badges = [['Trickshot', 2011], ['Montage', 2013], ['Vlog/House', 2017], ['Fortnite', 2020]]
    .filter(([, end]) => year <= end).map(([name]) => name);
  return { year, era, badges, selfReported: true, multiplier: user.demo && year <= 2020 ? 1.5 : 1 };
}
function pointsLeaders(data, user) {
  const now = Date.now();
  const windows = { weekly: now - 7 * day, monthly: now - 30 * day, allTime: 0 };
  const eligible = Object.values(data.users).filter(candidate => candidate.demo ? demo && (candidate.persona || candidate.id === user?.id) : candidate.leaderboardOptIn);
  return Object.fromEntries(Object.entries(windows).map(([period, since]) => [period, eligible.map(candidate => ({
    id: candidate.id, name: candidate.name, points: candidate.ledger.reduce((total, entry) => total + (entry.points > 0 && entry.id !== 'demo' && Date.parse(entry.at) >= since ? entry.points : 0), 0)
  })).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).slice(0, 10)]));
}
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
    ogQuizzes: ogQuizzes.map(({ correct, ...quiz }) => quiz),
    playerPhotos: Object.fromEntries(teams.flatMap(team => team.players.map(member => [team.slug + '/' + member.slug,
      existsSync(new URL('./public' + photoPath(team, member), import.meta.url))]))),
    pointsLeaders: pointsLeaders(data, user),
    products: products.filter(item => !item.demoOnly || demo).map(({ cost, ...item }) => ({
      ...item,
      stock: data.inventory[item.id] ?? item.stock,
      available: user?.demo || (demo && Boolean(user) && item.id === 'pass') || (!item.demoOnly && Boolean(user?.googleSub) && data.inventory[item.id] > 0 && data.remainingBudget >= cost)
    })),
    standings: leagueEntries.map(({ name, game, league, score }) => ({ name, game, league, score })),
    clips,
    config: { demo, google, discord, email: mailConfigured(origin), captcha: process.env.TURNSTILE_SITE_KEY || null, gemini: Boolean(process.env.GEMINI_API_KEY), receiptAuthority: Boolean(process.env.SOLANA_RECEIPT_AUTHORITY), database: store.name, heroVideo: homepageVideo, memberVideo: Boolean(process.env.MEMBER_VIDEO_URL) }
  };
  if (!user) return result;
  const owned = Object.values(data.redemptions).filter(order => order.user === user.id);
  const profile = gameProfile(user);
  const journey = engagement(user, Date.now(), profile);
  const matched = patches.find(patch => user.links[patch.game] && Boolean(patch.sample) === Boolean(user.demo));
  const returning = Date.now() - user.created >= rewardRules.minAge * day;
  return { ...result, user: {
    id: user.id, name: user.name, demo: Boolean(user.demo), verified: Boolean(user.googleSub), youtube: user.youtube,
    programs: programUser(user),
    accountType: accountType(user), personaType: user.personaType || null, leaderboardOptIn: Boolean(user.leaderboardOptIn), weekly: weeklyProgress(user), era: fanEra(user),
    reviewer: isReviewer(user), operator: isOperator(user), links: user.links, invite: user.invite,
    ...fanWallet(user), category: fanCategory(user, Date.now(), profile), ledger: user.ledger, creator: user.creator,
    canUseFanLab: Boolean(user.demo && demo), previewing: Boolean(user.previewOwner),
    performance: playerPerformance(data, user, profile),
    entries: data.entries.filter(entry => entry.user === user.id).map(entry => entry.creator),
    journey, inbox: inboxView(user),
    referred: Boolean(data.referrals[user.id]),
    referrals: Object.values(data.referrals).filter(referral => referral.inviter === user.id).map(({ status, invitee, at, approvedAt }) => ({
      status, name: data.users[invitee]?.name || 'Clan fan', at, approvedAt,
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

async function discordFlow(req, res, url, key) {
  ensure(discord, 'Discord sign-in needs OAuth credentials.', 503);
  const callback = `${origin}/auth/discord/callback`;
  if (url.pathname === '/auth/discord') {
    const state = token();
    const user = current(await store.read(), key);
    await store.write(data => {
      for (const [id, flow] of Object.entries(data.oauth)) if (flow.expires < Date.now()) delete data.oauth[id];
      data.oauth[digest(state)] = { discord: true, expires: Date.now() + 600_000, user: user?.id,
        invite: clean(url.searchParams.get('invite'), 20).toUpperCase() };
    });
    const params = new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, redirect_uri: callback,
      response_type: 'code', scope: 'identify email', state, prompt: 'consent' });
    return res.writeHead(302, { Location: `https://discord.com/oauth2/authorize?${params}`,
      'Set-Cookie': cookie('pl_discord_oauth', state, 600) }).end();
  }
  const state = url.searchParams.get('state');
  ensure(state && state === cookieValue(req, 'pl_discord_oauth'), 'Discord sign-in expired. Start again.', 403);
  const flow = await store.write(data => {
    const found = data.oauth[digest(state)];
    ensure(found?.discord && found.expires > Date.now(), 'Discord sign-in expired. Start again.', 403);
    delete data.oauth[digest(state)]; return found;
  });
  const code = url.searchParams.get('code');
  ensure(code, 'Discord authorization was cancelled.');
  const credentials = await fetchJson('https://discord.com/api/v10/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(process.env.DISCORD_CLIENT_ID + ':' + process.env.DISCORD_CLIENT_SECRET).toString('base64') },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callback })
  });
  const profile = await fetchJson('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${credentials.access_token}` }
  });
  ensure(profile.id && profile.email && profile.verified, 'Discord must return a verified email address.', 403);
  const email = profile.email.toLowerCase();
  await startSession(res, data => {
    const existing = Object.values(data.users).find(user => user.discordSub === profile.id);
    if (existing) return existing;
    const sameEmail = Object.values(data.users).find(user => user.email === email);
    if (sameEmail) {
      ensure(current(data, key)?.id === sameEmail.id, 'Sign in to the existing account before linking Discord.', 409);
      sameEmail.discordSub = profile.id; return sameEmail;
    }
    return addUser(data, { email, name: clean(profile.global_name || profile.username, 40) || 'Player', discordSub: profile.id }, flow.invite, flow.user);
  }, key);
  res.writeHead(302, { Location: '/#home' }).end();
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

async function readBytes(req, max) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    ensure(size <= max, 'Request exceeded the body size limit.', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readBody(req) {
  ensure(req.headers['content-type']?.split(';')[0] === 'application/json', 'Send a JSON request.', 415);
  const raw = await readBytes(req, 100_000);
  try {
    const body = JSON.parse(raw);
    ensure(body && typeof body === 'object' && !Array.isArray(body), 'Expected a JSON object.');
    return body;
  } catch { ensure(false, 'Malformed JSON.'); }
}

async function stripeWebhook(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  ensure(secret, 'Stripe webhooks are unavailable.', 503);
  const raw = await readBytes(req, 256_000);
  const parts = String(req.headers['stripe-signature'] || '').split(',').map(part => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  ensure(/^\d+$/.test(timestamp || '') && Math.abs(Date.now()/1000-Number(timestamp)) <= 300, 'Invalid Stripe signature timestamp.', 400);
  const expected = createHmac('sha256', secret).update(timestamp + '.').update(raw).digest();
  ensure(parts.some(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/i.test(value || '') && timingSafeEqual(Buffer.from(value,'hex'),expected)), 'Invalid Stripe signature.', 400);
  let event;
  try { event = JSON.parse(raw); } catch { ensure(false, 'Malformed Stripe event.'); }
  ensure(event?.livemode === false && /^evt_[a-zA-Z0-9_]+$/.test(event.id) && typeof event.type === 'string' && Number.isFinite(event.created), 'Only signed Stripe test events are accepted.', 400);
  await store.write(data => applyStripeEvent(data, event));
  return { received: true };
}

async function passwordRecovery(req, action, body) {
  limit(req, 'recovery', 5);
  if (action === 'password-forgot') {
    ensure(mailConfigured(origin), 'Email recovery is awaiting server mail configuration.', 503);
    const email = clean(body.email, 254).toLowerCase();
    ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email.');
    const raw = token();
    const exists = await store.write(data => {
      const user = Object.values(data.users).find(item => item.email === email && !item.demo && item.hash);
      if (!user) return false;
      data.recovery ||= {};
      for (const [id, recovery] of Object.entries(data.recovery)) if (recovery.user === user.id || recovery.expires < Date.now()) delete data.recovery[id];
      data.recovery[digest(raw)] = { user: user.id, expires: Date.now() + 30 * 60_000 };
      return true;
    });
    if (exists) try {
      await fetchJson('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.REPLAY_EMAIL_FROM, to: [email], subject: 'Reset your FaZe Clan password',
          text: 'Open this link within 30 minutes to reset your password: ' + origin + '/?reset=' + raw })
      });
    } catch { console.warn('FaZe password recovery email could not be sent.'); }
    return { message: 'If an account uses that email, a reset link is on its way.' };
  }
  const raw = clean(body.token, 50), password = body.password;
  ensure(/^[\w-]{43}$/.test(raw) && typeof password === 'string' && password.length >= 10 && password.length <= 128, 'Use a valid reset link and a password of 10–128 characters.');
  const salt = token(), hash = (await scrypt(password, salt, 64)).toString('hex');
  await store.write(data => {
    const id = digest(raw), recovery = data.recovery?.[id];
    ensure(recovery?.expires > Date.now() && data.users[recovery.user], 'This reset link has expired.', 403);
    Object.assign(data.users[recovery.user], { salt, hash });
    delete data.recovery[id];
    for (const [key, session] of Object.entries(data.sessions)) if (session.user === recovery.user) delete data.sessions[key];
  });
  return { message: 'Password updated. Log in with your new password.' };
}

async function mutate(req, res, action, key) {
  ensure(req.headers.origin === origin, 'Request origin does not match the site.', 403);
  limit(req, 'write', 150);
  const body = await readBody(req);
  if (['password-forgot','password-reset'].includes(action)) return passwordRecovery(req, action, body);
  if (/^(passport|og|drop|next)-/.test(action) && action !== 'og-quiz') {
    limit(req, ['next-vote','passport-watch-start','passport-watch-finish'].includes(action) ? action : 'programs', action === 'next-sponsor' ? 5 : 65);
    const data = await store.read();
    const user = current(data, key);
    if (['og-checkout','og-portal'].includes(action)) return ogBilling(action, origin, user, body);
    const ip = req.socket.remoteAddress || '';
    const risk = needsCaptcha(data, user, action, ip, body.device);
    if (risk) await verifyCaptcha(body.captcha, ip);
    return store.write((state, _record, log) => {
      const active = current(state, key);
      ensure(active?.id === user?.id, 'Your session changed. Sign in again.', 401);
      ensure(risk || !needsCaptcha(state, active, action, ip, body.device), 'Complete the CAPTCHA and retry.', 403);
      return programMutation({ data: state, user: active, body, action, demo, operator: isOperator(active), ip, risk,
        credit: (player, id, label, points) => credit(player, id, label, points, log), clips: faze.videos });
    });
  }
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
  if (action === 'contact') {
    limit(req, 'contact', 5);
    const name = clean(body.name, 80), company = clean(body.company, 100);
    const email = clean(body.email, 254).toLowerCase(), message = clean(body.message, 1500);
    ensure(name && company && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && message.length >= 10,
      'Complete all contact fields with a valid email and message.', 400);
    await store.write(data => {
      data.contactRequests ??= [];
      data.contactRequests.push({ name, company, email, message, at: new Date().toISOString() });
      data.contactRequests = data.contactRequests.slice(-500);
    });
    return { message: 'Inquiry saved. The team can review it in the site database.' };
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
        personaType: sample.personaType, fanSinceYear: sample.fanSinceYear,
        profile: sample.profile ? structuredClone(sample.profile) : undefined,
        practiceReviewer: sample.personaType === 'Streamer',
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
      if (player) {
        player.watchedClips ??= [];
        if (!player.watchedClips.some(item => item.id === clip.id && item.at.slice(0, 10) === today)) {
          player.watchedClips.push({ id: clip.id, at: now });
          player.watchedClips = player.watchedClips.slice(-120);
        }
      }
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
    ensure(email && password.length >= 10 && password.length <= 128, 'Enter an email or username and a password of 10–128 characters.');
    if (action === 'signup') {
      const name = clean(body.name, 40);
      ensure(name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a username and valid email.');
      const salt = token();
      const hash = (await scrypt(password, salt, 64)).toString('hex');
      await startSession(res, (data, log) => {
        ensure(!Object.values(data.users).some(user => user.email === email), 'An account already uses that email.', 409);
        const handle = name.toLowerCase();
        const useHandle = /^[a-z0-9][a-z0-9_-]{2,23}$/.test(handle);
        ensure(!useHandle || !Object.values(data.users).some(item => item.passport?.handle === handle || String(item.name || '').toLowerCase() === handle), 'That username is taken.', 409);
        const user = addUser(data, { email, name, salt, hash, adultConfirmed: body.adult === 'on' || body.adult === true,
          ...(useHandle ? { passport: { handle } } : {}) }, clean(body.invite, 20).toUpperCase(), current(data, key)?.id);
        return user;
      }, key);
      return { message: 'Account created.' };
    }
    const accounts = Object.values((await store.read()).users).filter(item => !item.demo && (item.email === email ||
      !email.includes('@') && (item.passport?.handle === email || String(item.name || '').toLowerCase() === email)));
    const user = accounts.length === 1 ? accounts[0] : null;
    const check = await scrypt(password, user?.salt || 'patchline-missing-account', 64);
    ensure(user?.hash && timingSafeEqual(Buffer.from(user.hash, 'hex'), check), 'Invalid email, username or password.', 401);
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
        return { message: 'Your Clan dashboard is ready.' };
      case 'leaderboard-optin':
        user.leaderboardOptIn = body.enabled === true;
        return { message: user.leaderboardOptIn ? 'You are visible on the points leaderboard.' : 'Your profile is hidden from the points leaderboard.' };
      case 'fan-era': {
        const year = Number(body.year);
        ensure(Number.isInteger(year) && year >= 2010 && year <= new Date().getUTCFullYear(), 'Choose a year from 2010 to today.');
        ensure(!user.fanSinceYear, 'Your fan-since year is already set.', 409);
        user.fanSinceYear = year;
        return { message: 'Your FaZe era is saved as self-reported history.' };
      }
      case 'og-quiz': {
        ensure(user.demo || user.googleSub, 'Verify with Google to earn throwback points.', 403);
        ensure(accountType(user) === 'Returning User' || fanEra(user)?.year <= 2020, 'Throwback tasks unlock for returning or OG fans.', 403);
        const quiz = ogQuizzes.find(item => item.id === body.id);
        ensure(quiz && body.answer === quiz.correct, 'Try another answer.');
        const points = fanEra(user)?.multiplier === 1.5 ? 15 : 10;
        credit(user, `og-quiz:${quiz.id}`, quiz.name, points, log);
        return { message: `Throwback task complete. +${points} points.` };
      }
      case 'weekly-claim': {
        ensure(user.demo || user.googleSub, 'Verify with Google to claim weekly rewards.', 403);
        const weekly = weeklyProgress(user);
        const task = weekly.tasks.find(item => item.id === body.task);
        ensure(task && task.progress >= task.goal && !task.claimed, 'This weekly quest is not ready to claim.', 409);
        credit(user, `weekly:${weekly.week}:${task.id}`, task.name, rewardRules.weekly, log);
        return { message: `Weekly quest complete. +${rewardRules.weekly} points.` };
      }
      case 'weekly-chest': {
        ensure(user.demo || user.googleSub, 'Verify with Google to claim weekly rewards.', 403);
        const weekly = weeklyProgress(user);
        ensure(weekly.chestReady && !weekly.chestClaimed, 'Finish and claim two weekly quests first.', 409);
        credit(user, `weekly-chest:${weekly.week}`, 'Weekly chest', rewardRules.weeklyChest, log);
        return { message: `Weekly chest opened. +${rewardRules.weeklyChest} points.` };
      }
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
        finishPreviewReferral(data, user, log);
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
        awardDailyCompletion(user, log);
        finishPreviewReferral(data, user, log);
        return { message: `Mission complete. +${points} points.` };
      }
      case 'watch-task': {
        ensure(user.demo || user.googleSub, 'Verify with Google to earn watch task points.', 403);
        const date = utcDate();
        ensure(user.watchedClips?.some(item => item.at.slice(0, 10) === date), 'Open a highlight from the gallery or news first.', 409);
        credit(user, `watch-task:${date}`, 'Daily highlight discovery', rewardRules.watch, log);
        awardDailyCompletion(user, log);
        finishPreviewReferral(data, user, log);
        return { message: `Highlight task complete. +${rewardRules.watch} points.` };
      }
      case 'archive-quiz': {
        ensure(demo || user.demo || user.googleSub, 'Verify with Google to earn rewards.', 403);
        ensure(body.year === starterQuiz.correct, 'Try again. The hint is in the first mission.');
        credit(user, 'archive-quiz', 'First ILLCAMS archive challenge', rewardRules.archive, log);
        finishPreviewReferral(data, user, log);
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
  '/vendor/tailwind.css': ['tailwindcss/dist/tailwind.min.css', 'tailwindcss@2.2.19/dist/tailwind.min.css', 'text/css; charset=utf-8'],
  '/vendor/chart.js': ['chart.js/dist/chart.umd.js', 'chart.js@4.5.1/dist/chart.umd.js', 'text/javascript; charset=utf-8']
};
const assets ={ '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/arena.png': ['arena.png', 'image/png'], '/hero.png': ['hero.png', 'image/png'], '/hero.mp4': ['hero.mp4', 'video/mp4'] };
for (const file of ['club-bootstrap.js', 'clan.js', 'club-ui.js', 'club-pages.js', 'rewards-ui.js', 'shop-ui.js', 'gallery-data.js', 'esports-data.js', 'shop-data.js', 'teams-data.js', 'teams-page.js', 'about-data.js', 'about-page.js', 'player-page.js', 'floating.js', 'fan-auth.js', 'patch-intel.js', 'patch-intel-data.js', 'passport-config.js', 'og-config.js', 'drops-config.js', 'next-config.js', 'program-ui.js', 'next-ui.js', 'house.js', 'ask-faze-client.js', 'data/passport.js']) {
  assets['/' + file] = [file, 'text/javascript; charset=utf-8'];
}
assets['/clan.css'] = ['clan.css', 'text/css; charset=utf-8'];
assets['/clan-features.css'] = ['clan-features.css', 'text/css; charset=utf-8'];
assets['/clan-programs.css'] = ['clan-programs.css', 'text/css; charset=utf-8'];
assets['/images/media-placeholder.svg'] = ['images/media-placeholder.svg', 'image/svg+xml'];
assets['/images/games/smash.svg'] = ['images/games/smash.svg', 'image/svg+xml'];
assets['/hero-placeholder.mp4'] = ['hero-placeholder.mp4', 'video/mp4'];
assets['/experience.js'] = ['experience.js', 'text/javascript; charset=utf-8'];
assets['/experience.css'] = ['experience.css', 'text/css; charset=utf-8'];
for (const name of ['stage', 'missions', 'invites']) assets[`/art/${name}.jpg`] = [`art/${name}.jpg`, 'image/jpeg'];
for (const [file, mime] of [['logo.png', 'image/png'], ['tiger.jpg', 'image/jpeg'], ['anton.woff2', 'font/woff2'], ['source-sans.woff2', 'font/woff2'], ['source-sans-bold.woff2', 'font/woff2'], ['timeline.pdf', 'application/pdf']]) {
  assets[`/brand/${file}`] = [`brand/${file}`, mime];
}
const json = (res, status, payload) => res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(payload));
const inlineThemeScript = (await readFile(new URL('./public/index.html', import.meta.url), 'utf8')).match(/<script id="theme-bootstrap">([\s\S]*?)<\/script>/)?.[1] || '';
const inlineThemeHash = createHash('sha256').update(inlineThemeScript).digest('base64');

async function streamVideo(req, res, path) {
  const { size } = await stat(path);
  const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' };
  const range = req.method === 'GET' ? req.headers.range : null;
  let start = 0;
  let end = size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalid = () => res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` }).end();
    if (!match || (!match[1] && !match[2])) return invalid();
    const [, first, last] = match;
    if (first) {
      start = Number(first);
      if (last) end = Math.min(Number(last), end);
    } else {
      start = Math.max(0, size - Number(last));
    }
    if (!Number.isSafeInteger(start) || start > end) return invalid();
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = end - start + 1;
  res.writeHead(range ? 206 : 200, headers);
  if (req.method === 'HEAD' || size === 0) return res.end();
  try {
    await pipeline(createReadStream(path, { start, end }), res);
  } catch (error) {
    if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
  }
}

const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', `default-src 'self'; style-src 'self' https://cdn.jsdelivr.net; font-src 'self'; img-src 'self' https:; media-src 'self' https:; frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; script-src 'self' 'sha256-${inlineThemeHash}' https://cdn.jsdelivr.net https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
  try {
    const url = new URL(req.url, origin);
    const key = sessionKey(req);
    if (req.method === 'POST' && url.pathname === '/api/stripe/webhook') return json(res, 200, await stripeWebhook(req));
    if (url.pathname.startsWith('/api/ask-faze/')) {
      const data = await store.read();
      const user = current(data, key);
      limit(req, 'ask-faze-api', 100);
      if (req.method === 'GET' && url.pathname === '/api/ask-faze/chats') return json(res, 200, await chatHistory(store.chats, user));
      if (req.method === 'GET' && url.pathname === '/api/ask-faze/feedback') {
        ensure(user && isOperator(user) && !user.demo, 'Operator access required.', 403);
        return json(res, 200, await chatFeedback(store.chats));
      }
      ensure(req.method === 'POST', 'Unknown Ask FaZe route.', 404);
      ensure(req.headers.origin === origin, 'Request origin does not match the site.', 403);
      const body = await readBody(req);
      if (url.pathname === '/api/ask-faze/history') return json(res, 200, await chatUpdate(store.chats, user, body));
      ensure(url.pathname === '/api/ask-faze/message', 'Unknown Ask FaZe route.', 404);
      const request = chatRequest(body);
      chatRate(req.socket.remoteAddress || '', user);
      const abort = new AbortController();
      res.once('close', () => abort.abort());
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      const send = (event, value) => {
        if (!res.destroyed && !res.writableEnded) res.write('event: ' + event + '\n' + 'data: ' + JSON.stringify(value) + '\n\n');
      };
      try {
        const reply = await chatMessage(store.chats, request, { user, data, demo }, { signal: abort.signal, onText: value => send('delta', value) });
        if (reply) send('reply', reply);
      } catch(error) {
        if (!abort.signal.aborted) {
          if(!error.status) console.warn('Ask FaZe request failed:', error.name);
          send('error', { message:error.status ? error.message : 'Ask FaZe is temporarily unavailable. Try again.' });
        }
      } finally { if (!res.destroyed) res.end(); }
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/programs') {
      const data = await store.read();
      const user = current(data, key);
      return json(res, 200, programView(data, user, { demo, operator: isOperator(user),
        seasonId: url.searchParams.get('season'), preview: url.searchParams.get('preview'), profileId: url.searchParams.get('profile') }));
    }
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Clan email preferences</title><link rel="stylesheet" href="/style.css"><main><section class="panel pad flow"><h1>Clan email preferences</h1><p>Turn off email updates for this account.</p><form action="/mail/unsubscribe?token=${unsubscribe}" method="post"><button class="btn primary" type="submit">Unsubscribe</button></form></section></main></html>`);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/matches/import') return json(res, 200, await importMatch(req));
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) return json(res, 200, await mutate(req, res, url.pathname.slice(5), key));
    const spa = ['/about', '/teams', '/clan', '/terms', '/privacy', '/patch-intel', '/house'].includes(url.pathname) ||
      /^\/(?:players\/[a-z0-9-]+|passport(?:\/[a-z0-9-]+)?|og(?:\/dashboard)?|drops(?:\/[a-z0-9-]+)?|next(?:\/(?:enter|gallery|finalists|rules|judge|winners|entry\/[a-z0-9-]+))?)$/.test(url.pathname);
    const asset = Object.hasOwn(assets, url.pathname) ? assets[url.pathname] : spa ? assets['/'] : null;
    if (asset?.[1] === 'video/mp4' && ['GET', 'HEAD'].includes(req.method)) {
      try { return await streamVideo(req, res, new URL(`./public/${asset[0]}`, import.meta.url)); }
      catch (error) {
        if (error.code === 'ENOENT') return json(res, 404, { error: 'Asset not found.' });
        throw error;
      }
    }
    ensure(req.method === 'GET', 'Method not allowed.', 405);
    if (/^\/images\/players\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/.test(url.pathname)) {
      const file = new URL('./public' + url.pathname, import.meta.url);
      if (existsSync(file)) return res.writeHead(200, { 'Content-Type': 'image/webp' }).end(await readFile(file));
      return res.writeHead(200, { 'Content-Type': 'image/svg+xml' }).end(await readFile(new URL('./public/images/media-placeholder.svg', import.meta.url)));
    }
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
        id: user.id, name: user.name, category: user.personaType, ...fanWallet(user), games: [...new Set([...Object.keys(user.links), ...gameProfile(user).map(entry => entry.game)])]
      }));
      return json(res, 200, { groups: ['Normal User', 'New User', 'Returning User', 'Streamer'], fans });
    }
    if (url.pathname === '/api/state') {
      let data = await store.read();
      const user = current(data, key);
      if (user && (!user.lastVisitAt || Date.now() - user.lastVisitAt >= 5 * 60_000 || user.accountType !== accountType(user))) {
        data = await store.write(updated => {
          const active = current(updated, key);
          if (active) {
            syncNotices(active);
            active.accountType = accountType(active);
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
    if (['/auth/discord', '/auth/discord/callback'].includes(url.pathname)) {
      limit(req, 'oauth', 40);
      return await discordFlow(req, res, url, key);
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

await pruneChats(store.chats);
setInterval(async () => { try { await pruneChats(store.chats); } catch(error) { console.warn('Ask FaZe retention cleanup failed:',error.name); } }, 3_600_000).unref();

let alertTick = false;
setInterval(async () => {
  if (alertTick) return;
  alertTick = true;
  try {
    const data = await store.read();
    if (Object.values(data.programs || {}).some(state => Object.keys(state.waitlist).length)) await store.write(updated => sendDropAlerts(updated, demo));
  } catch { console.warn('Drop alerts will retry.'); }
  finally { alertTick = false; }
}, 60_000).unref();

if (mailConfigured(origin)) {
  let processing = false;
  const sendPending = async () => {
    if (processing) return;
    processing = true;
    try { await deliverNotices(store, origin); }
    catch { console.warn('FaZe email processing will retry.'); }
    finally { processing = false; }
  };
  setInterval(sendPending, 60_000).unref();
  void sendPending();
}

server.listen(port, host);
try {
  await once(server, 'listening');
} catch (error) {
  if (!canUseFreePort || error.code !== 'EADDRINUSE') throw error;
  server.listen(0, host);
  await once(server, 'listening');
  originUrl.port = String(server.address().port);
  origin = originUrl.origin;
  console.log(`Port ${port} is busy. Using port ${server.address().port}.`);
}
console.log(`FaZe Clan ready at ${origin} · ${store.name}${demo ? ' · demo enabled' : ''}`);

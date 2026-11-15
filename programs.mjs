
import { createHash, randomUUID } from 'node:crypto';
import { clean, ensure } from './services.mjs';
import { fanWallet, day } from './fans.mjs';
import { addNotice, utcDate } from './engagement.mjs';
import { OG_XP_BONUS, RANK_XP_INCLUDE_OG_BONUS, passportConfig as passport, passportLevel } from './public/passport-config.js';
import { ogConfig as og } from './public/og-config.js';
import { dropConfig } from './public/drops-config.js';
import { nextConfig } from './public/next-config.js';

export const verifiedFan = user => Boolean(user?.googleSub || user?.discordSub);
const empty = () => ({ entries: {}, votes: {}, scores: {}, conflicts: {}, bookings: {}, orders: {}, waitlist: {}, reports: [], inquiries: [], audit: [], guardian: {}, finalistStatements: {}, followups: {}, polls: {} });
const scope = (data, demo, write = false) => {
  if (!write) return data.programs?.[demo ? 'demo' : 'live'] || empty();
  data.programs ||= {};
  return data.programs[demo ? 'demo' : 'live'] ??= empty();
};
const eventList = user => user?.passport?.events || [];
const activeMembership = user => {
  const membership = user?.og;
  return Boolean(membership && ['active','trialing','grace','canceling'].includes(membership.status) && membership.until > Date.now());
};
export { activeMembership };

export function earnsOgXp(user, now = Date.now()) {
  const plan = user?.og;
  return Boolean(plan?.status === 'active' && plan.until > now && Object.hasOwn(og.paid.prices, plan.plan));
}

export function awardXp(user, action, key, now = Date.now()) {
  if (!user || !(user.demo || verifiedFan(user))) return false;
  const rule = passport.actions[action];
  if (!rule) return false;
  const events = eventList(user);
  const prior = events.filter(entry => entry.action === action);
  const today = utcDate(now);
  if (prior.some(entry => entry.key === key) || prior.filter(entry => utcDate(entry.at) === today).length >= rule.cap ||
      (rule.cooldown > 0 && prior.some(entry => now - entry.at < rule.cooldown * 1000))) return false;
  user.passport ||= {};
  user.passport.events ||= [];
  const scale = 10_000;
  const paid = earnsOgXp(user, now);
  const accrued = paid ? (user.passport.ogBonusRemainder || 0) + rule.xp * Math.round(OG_XP_BONUS * scale) : 0;
  const ogBonus = Math.floor(accrued / scale);
  if (paid) user.passport.ogBonusRemainder = accrued % scale;
  user.passport.events.push({ action, key, baseXp: rule.xp, ogBonus, ogRate: paid ? OG_XP_BONUS : 0, xp: rule.xp + ogBonus, at: now });
  return true;
}

const awardActions = {
  'check-in': 'daily', 'trivia': 'daily', daily: 'daily', completion: 'daily',
  weekly: 'weekly', 'weekly-chest': 'chest', referral: 'referral',
  'archive-quiz': 'throwback', 'og-quiz': 'throwback'
};
export function xpForPoints(user, key) {
  const action = awardActions[key.split(':')[0]];
  if (action) awardXp(user, action, key);
}
const level = user => passportLevel(eventList(user).reduce((total, event) => total + event.xp, 0));
const displayHandle = user => user.passport?.handle || 'fan-' + user.id.slice(0, 8);
const badges = user => {
  const events = eventList(user);
  const stamps = passport.achievements.map(stamp => {
    const actions = events.filter(item => item.action === stamp.action);
    return { ...stamp, progress: Math.min(actions.length, stamp.goal), earned: actions[stamp.goal - 1]?.at || null };
  });
  for (const [id, name, year] of [['trickshot','Trickshot',2011],['montage','Montage',2013],['house','Vlog/House',2017],['fortnite','Fortnite',2020]]) {
    stamps.push({ id, name, icon: 'left', category: 'Throwback', goal: 1, rarity: 'Epic', description: 'Self-reported fan era', progress: Number(Boolean(user.fanSinceYear && user.fanSinceYear <= year)), earned: user.fanSinceYear && user.fanSinceYear <= year ? user.created : null });
  }
  for (const [month, at] of Object.entries(user.passport?.seasons || {})) {
    stamps.push({ id: 'season-' + month, name: 'Season ' + month, icon: 'plus', category: 'Community', goal: 1, rarity: 'Epic', description: 'Monthly challenge completed', progress: 1, earned: at });
  }
  if (activeMembership(user)) stamps.push({ id: 'og-member', name: 'OG Member', icon: 'person', category: 'Collector', goal: 1, rarity: 'Epic', description: 'Active OG membership', progress: 1, earned: user.og.joined });
  if (user.passport?.nextWinner) stamps.push({ id: 'next-winner', name: 'FaZe NEXT Winner', icon: 'diagonal', category: 'Compete', goal: 1, rarity: 'Legendary', description: 'Won a FaZe NEXT season', progress: 1, earned: user.passport.nextWinner });
  return stamps;
};
const monthId = timestamp => utcDate(timestamp).slice(0, 7);
const monthProgress = (user, now) => new Set(eventList(user).filter(event => monthId(event.at) === monthId(now)).map(event => utcDate(event.at))).size;

export function programUser(user) {
  if (!user) return null;
  const now = Date.now();
  const today = utcDate(now);
  const streak = user.passport?.streak || {};
  const difference = streak.last ? Math.round((Date.parse(today) - Date.parse(streak.last)) / day) : 0;
  const member = activeMembership(user);
  const upcoming = dropConfig.drops.filter(drop => Date.parse(drop.launch) > now).sort((a,b) => Date.parse(a.launch) - Date.parse(b.launch))[0];
  return {
    ...level(user), handle: displayHandle(user), member, ogXpActive: earnsOgXp(user, now),
    ogBonusXp: eventList(user).reduce((total, event) => total + (event.ogBonus || 0), 0),
    xpActivity: eventList(user).slice(-25).reverse().map(({action,at,xp,baseXp,ogBonus,ogRate})=>({action,at,xp,baseXp:baseXp??xp,ogBonus:ogBonus||0,ogRate:ogRate||0})),
    plan: user.og?.plan || null, status: user.og?.status || 'fan',
    renewal: user.og?.until || null, hasStripe: Boolean(user.og?.customer), invoices: user.og?.invoices || [],
    savings: user.og?.savings || 0, verified: verifiedFan(user), privacy: user.passport?.privacy || 'private',
    showcase: user.passport?.showcase || [], friends: user.passport?.friends || [], badges: badges(user),
    publicId: user.id, nextDrop: upcoming?.name || null,
    streak: { count: difference > 1 && !(difference === 2 && streak.freeze) ? 0 : streak.count || 0, checked: streak.last === today, freeze: streak.freeze || 0 },
    monthly: { id: monthId(now), progress: monthProgress(user, now), claimed: Boolean(user.passport?.seasons?.[monthId(now)]) },
    drops: (user.passport?.orders || []).map(({ id, drop, name, edition, quantity, size, color, total, at, sample }) => ({ id, drop, name, edition, quantity, size, color, total, at, sample }))
  };
}

function friends(a, b) {
  return Boolean(a && b && a.passport?.friends?.includes(b.id) && b.passport?.friends?.includes(a.id));
}
function visible(candidate, viewer) {
  const visibility = candidate.passport?.privacy;
  return viewer?.id === candidate.id || visibility === 'public' || visibility === 'friends' && friends(viewer, candidate);
}
const sameSpace = (candidate, user, demo) => candidate.demo ? Boolean(demo && user?.demo) : !user?.demo;
function leaders(data, user, demo) {
  const now = Date.now();
  const list = Object.values(data.users).filter(candidate => sameSpace(candidate, user, demo) && !candidate.persona);
  const windows = { weekly: now - 7 * day, monthly: now - 30 * day, allTime: 0, friends: 0, og: 0 };
  return Object.fromEntries(Object.entries(windows).map(([name, since]) => {
    const eligible = list.filter(candidate => name === 'friends' ? candidate.id === user?.id || friends(candidate, user) && visible(candidate, user) :
      (name !== 'og' || activeMembership(user) && activeMembership(candidate)) && (candidate.passport?.privacy === 'public' || candidate.id === user?.id));
    return [name, eligible.map(candidate => ({
      id: candidate.id, handle: displayHandle(candidate), og: earnsOgXp(candidate, now), xp: eventList(candidate).filter(event => event.at >= since).reduce((sum, event) => sum + (RANK_XP_INCLUDE_OG_BONUS ? event.xp : (event.baseXp ?? event.xp)), 0)
    })).filter(item => item.xp > 0).sort((a,b) => b.xp-a.xp || a.handle.localeCompare(b.handle)).slice(0, 30)];
  }));
}

function dropStatus(state, drop, user, now) {
  const sold = drop.sampleSold + Object.values(state.orders).filter(order => order.drop === drop.id).length;
  const held = Object.values(state.bookings).filter(row => row.drop === drop.id && row.expires > now).length;
  const remaining = Math.max(0, drop.quantity - sold - held);
  const launch = Date.parse(drop.launch);
  const early = drop.gate === 'og-early' && activeMembership(user) && now >= launch - dropConfig.earlyHours * 3600000;
  const unlocked = drop.gate !== 'level' || level(user).level >= drop.level || Boolean(drop.allowNextWinner && user?.passport?.nextWinner);
  return {
    ...drop, remaining, sold, unlocked,
    status: sold >= drop.quantity ? 'Sold Out' : now < launch && !early ? 'Upcoming' : 'Live',
    lock: !unlocked ? 'Passport Level ' + drop.level + '+' : now < launch && !early && drop.gate === 'og-early' ? 'OG members get ' + dropConfig.earlyHours + ' hours of early access' : ''
  };
}

export function chatDropContext(data, user, demo) {
  const state = scope(data, Boolean(demo && (!user || user.demo)));
  return dropConfig.drops.filter(drop => demo || !drop.sample).map(drop => dropStatus(state, drop, user, Date.now()));
}

export function sendDropAlerts(data, demo, now = Date.now()) {
  for (const sample of demo ? [true, false] : [false]) {
    const state = scope(data, sample);
    for (const row of Object.values(state.waitlist)) {
      const user = data.users[row.owner];
      const item = dropConfig.drops.find(drop => drop.id === row.drop && (demo || !drop.sample));
      if (!user || !item) continue;
      const drop = dropStatus(state, item, user, now);
      if (drop.status !== 'Live' || !drop.remaining || !drop.unlocked) continue;
      const noticeId = 'drop-alert:' + item.id + ':' + row.at;
      addNotice(user, { id: noticeId, title: item.name + ' is available', message: 'Check the current stock and your edition access.',
        route: '/drops/' + item.id, email: !sample });
      delete state.waitlist[row.owner + ':' + item.id];
    }
  }
}

const seasonFor = id => nextConfig.seasons.find(item => item.id === id) || nextConfig.seasons.find(item => item.id === nextConfig.defaultSeason);
function seasonPhase(season, now, demo, override) {
  if (demo && season.sample && season.phases.some(phase => phase[0] === override)) return override;
  return season.phases.find(([, , start, end]) => now >= Date.parse(start) && now < Date.parse(end))?.[0] || (now < Date.parse(season.phases[0][2]) ? 'upcoming' : 'archive');
}
const publicStatuses = new Set(['Approved','Finalist','Winner']);
function countVotes(state, entry) {
  return (entry.sampleVotes || 0) + Object.values(state.votes).filter(vote => vote.entry === entry.id && !vote.removed).length;
}
function entryView(state, entry, phase, privateView = false) {
  const { id, title, category, game, description, handle, status, video, thumbnail, sample, season, created } = entry;
  return { id, title, category, game, description, handle, status, video, thumbnail, sample, season, created,
    votes: countVotes(state, entry),
    ...(privateView ? { reason: entry.reason, socials: entry.socials, reports: state.reports.filter(report => report.entry === id) } : {}),
    ...(['winners','archive'].includes(phase) && Number.isFinite(entry.finalScore) ? { finalScore: entry.finalScore } : {}) };
}
function seedEntries(season, phase) {
  return nextConfig.samples.map(([title, description, sampleVotes], index) => ({
    id: 'sample-' + (index + 1), title, description, sampleVotes, category: nextConfig.categories[index], game: 'Sample game',
    handle: 'sample-creator-' + (index + 1), status: ['submissions','voting','judging'].includes(phase) ? 'Approved' : ['Finalist','Approved',phase==='finalists'||phase==='finale'?'Finalist':'Winner','Needs changes','Pending review','Rejected'][index],
    sample: true, season: season.id, created: Date.parse(season.phases[0][2]), reason: 'Sample moderation state.',
    thumbnail: '/images/media-placeholder.svg'
  }));
}
const cardRank = (state, entry, entries) => {
  const scores = Object.values(state.scores).filter(score => score.entry === entry.id);
  if (!scores.length) return null;
  const criteria = nextConfig.rubric.slice(0, -1);
  const averages = criteria.map((_, i) => scores.reduce((sum, score) => sum + score.values[i], 0) / scores.length);
  const maxVotes = Math.max(1, ...entries.map(candidate => countVotes(state, candidate)));
  const total = criteria.reduce((sum, [, weight], i) => sum + averages[i] * weight / 100, 0) + countVotes(state, entry) / maxVotes * nextConfig.rubric.at(-1)[1];
  return { id: entry.id, total, creativity: averages[0], skill: averages[1], created: entry.created };
};
function rankings(state, entries) {
  return entries.map(entry => cardRank(state, entry, entries)).filter(Boolean).sort((a,b) => b.total-a.total || b.creativity-a.creativity || b.skill-a.skill || a.created-b.created);
}
const judge = (user, operator) => Boolean(operator || verifiedFan(user) && (process.env.NEXT_JUDGE_EMAILS || '').toLowerCase().split(',').map(item => item.trim()).includes(user.email));

export function programView(data, user, { demo, operator, seasonId, preview, profileId }) {
  const sample = Boolean(demo && (!user || user.demo));
  const state = scope(data, sample);
  const season = seasonFor(seasonId);
  const phase = seasonPhase(season, Date.now(), sample, preview);
  const entries = [...Object.values(state.entries), ...(sample && season.sample ? seedEntries(season, phase) : [])].filter(entry => entry.season === season.id && !entry.withdrawn);
  const released = entry => publicStatuses.has(entry.status) && (entry.status !== 'Winner' || ['winners','archive'].includes(phase)) &&
    (entry.status !== 'Finalist' || ['finalists','finale','winners','archive'].includes(phase));
  const boards = leaders(data, user, demo);
  const candidate = profileId && Object.hasOwn(data.users, profileId) ? data.users[profileId] : null;
  const profile = candidate && sameSpace(candidate, user, demo) && visible(candidate, user) ? {
    id: candidate.id, handle: displayHandle(candidate), ...level(candidate), favoriteGame: candidate.favoriteGames?.[0] || null,
    joined: candidate.created, rank: (boards.allTime.findIndex(row => row.id === candidate.id) + 1) || null,
    badges: badges(candidate).filter(stamp => stamp.earned && candidate.passport?.showcase?.includes(stamp.id)).slice(0, 5),
    member: activeMembership(candidate), drops: programUser(candidate).drops.map(({ name, edition }) => ({ name, edition }))
  } : null;
  const eligibleEntries = entries.filter(row => !row.id.startsWith('sample-') && publicStatuses.has(row.status));
  return {
    sample, leaders: boards, profile, judge: judge(user, operator), operator,
    my: programUser(user), drops: chatDropContext(data, user, demo),
    bookings: Object.values(state.bookings).filter(row => user && row.owner === user.id && row.expires > Date.now()).map(({ id, drop, edition, size, color, expires }) => ({ id, drop, edition, size, color, expires })),
    season, phase, entries: entries.filter(released).map(entry => entryView(state, entry, phase)),
    mine: entries.filter(entry => user && entry.owner === user.id).map(entry => entryView(state, entry, phase, true)),
    voteCounts: Object.fromEntries(nextConfig.categories.map(category => [category, Object.values(state.votes).filter(vote => user && vote.season === season.id && vote.voter === user.id && vote.category === category && vote.date === utcDate() && !vote.removed).length])),
    voted: Object.values(state.votes).filter(vote => user && vote.season === season.id && vote.voter === user.id && vote.date === utcDate() && !vote.removed).map(vote => vote.entry),
    finalistStatement: ['finalists','finale','winners','archive'].includes(phase) ? state.finalistStatements[season.id] : null,
    queue: operator || judge(user, operator) ? entries.filter(entry => operator || publicStatuses.has(entry.status)).map(entry => ({
      ...entryView(state, entry, phase, operator), myScore: state.scores[user.id + ':' + entry.id]?.values,
      conflict: Boolean(state.conflicts[user.id + ':' + entry.id])
    })) : [],
    scores: operator ? rankings(state, eligibleEntries) : [],
    audit: operator ? state.audit.slice(-75).reverse() : [],
    xpAudit: operator ? Object.values(data.users).filter(candidate=>sample===Boolean(candidate.demo)).flatMap(candidate=>
      eventList(candidate).slice(-40).map(event=>({ ...event, handle:displayHandle(candidate), owner:candidate.id })))
      .sort((a,b)=>b.at-a.at).slice(0,75) : [],
    flaggedVotes: operator ? Object.values(state.votes).filter(vote => vote.flagged && !vote.removed).map(({ id, entry, date }) => ({ id, entry, date })) : [],
    sponsorInquiries: operator ? state.inquiries.filter(inquiry => !sample || inquiry.owner === user.id).slice(-50) : [],
    stripe: stripeEnabled()
  };
}

function audit(state, user, action, subject, detail = '') {
  state.audit.push({ at: new Date().toISOString(), actor: user?.id || 'guest', action, subject, detail });
  if (state.audit.length > 2000) state.audit.shift();
}
const canEarn = user => user.demo || verifiedFan(user);
const cardName = (body, key, max) => clean(body[key], max);
const isAdult = user => user.adultConfirmed === true || user.demo;
const plausibleDevice = value => /^[A-Za-z0-9_-]{15,90}$/.test(value || '');
const fingerprint = (secret, value) => createHash('sha256').update(secret + ':' + value).digest('hex');
const fingerprintSecret = process.env.PROGRAM_FRAUD_SECRET || randomUUID();

export function needsCaptcha(data, user, action, ip, device) {
  if (user?.demo) return false;
  if (action === 'drop-order') return true;
  if (action !== 'next-vote' || !user) return false;
  const mark = fingerprint(fingerprintSecret, ip);
  const browser = fingerprint(fingerprintSecret, device || '');
  const fromOther = new Set(Object.values(scope(data, false).votes).filter(vote => !vote.removed && vote.voter !== user.id && vote.date === utcDate() &&
    (vote.ip === mark || (plausibleDevice(device) && vote.device === browser))).map(vote => vote.voter));
  return fromOther.size >= 2;
}

export async function verifyCaptcha(response, ip) {
  const secret = process.env.TURNSTILE_SECRET;
  ensure(secret, 'CAPTCHA is unavailable. Ask the site operator to configure Turnstile.', 503);
  ensure(typeof response === 'string' && response.length > 0 && response.length <= 2048, 'Complete the CAPTCHA first.', 403);
  const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: new URLSearchParams({ secret, response, remoteip: ip }), signal: AbortSignal.timeout(7000)
  });
  ensure(check.ok && (await check.json()).success, 'The CAPTCHA could not be verified. Try again.', 403);
}

function videoIdentity(raw) {
  let url;
  try { url = new URL(raw); } catch { ensure(false, 'Enter a supported HTTPS video link.'); }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  ensure(url.protocol === 'https:' && !url.username && !url.password && !url.port && nextConfig.hosts.includes(host), 'Use a link from YouTube, TikTok, Twitch, or Instagram.');
  const path = url.pathname.replace(/\/$/, '');
  let video;
  if (host === 'youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? path.slice(1) : path === '/watch' ? url.searchParams.get('v') : path.match(/^\/(?:shorts|live)\/([\w-]+)$/)?.[1];
    ensure(/^[\w-]{11}$/.test(id || ''), 'Use a link to an individual YouTube video.');
    return { key: 'youtube:' + id, url: 'https://www.youtube.com/watch?v=' + id, thumbnail: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' };
  }
  if (host === 'tiktok.com') video = path.match(/^\/@[\w.]+\/video\/(\d+)$/)?.[1];
  if (host === 'twitch.tv') video = path.match(/^\/(?:videos\/|[\w]+\/clip\/)([\w-]+)$/)?.[1];
  if (host === 'clips.twitch.tv') video = path.match(/^\/([\w-]+)$/)?.[1];
  if (host === 'instagram.com') video = path.match(/^\/(?:p|reel|tv)\/([\w-]+)$/)?.[1];
  ensure(video, 'Use a link to an individual video or clip.');
  return { key: host.replace('clips.', '') + ':' + video.toLowerCase(), url: 'https://' + host + path, thumbnail: '/images/media-placeholder.svg' };
}

function entryValues(body) {
  const title = clean(body.title, 100), description = clean(body.description, 800), game = clean(body.game, 60);
  ensure(title.length >= 4 && description.length >= 12 && nextConfig.categories.includes(body.category) && game, 'Complete all required entry fields.');
  ensure(body.rules === true && body.rights === true && body.license === true, 'Accept the rules, content license, and rights confirmation.');
  const video = videoIdentity(clean(body.video, 500));
  const customThumbnail = clean(body.thumbnail, 500);
  if (customThumbnail) ensure(/^https:\/\/(i\.ytimg\.com|images\.fazeclan\.com)\/[a-z0-9_./-]+\.(jpg|png|webp)$/i.test(customThumbnail), 'Use an approved image host or leave the thumbnail blank.');
  return { title, description, game, category: body.category, video: video.url, videoKey: video.key, thumbnail: customThumbnail || video.thumbnail, socials: clean(body.socials, 140),
    consent: { rules: true, rights: true, license: true, marketing: body.marketing === true, version: nextConfig.termsVersion, at: new Date().toISOString() } };
}

export function programMutation({ data, user, body, action, demo, operator, ip, risk, credit, clips }) {
  const sample = Boolean(demo && (!user || user.demo));
  const state = scope(data, sample, true);
  const now = Date.now();
  const today = utcDate(now);
  if (action === 'next-sponsor') {
    const name = clean(body.name, 80), company = clean(body.company, 100), email = clean(body.email, 254), message = clean(body.message, 1500);
    ensure(name && company && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && ['Exploring','Under $5,000','$5,000–$20,000','Over $20,000'].includes(body.budget) && message.length >= 12, 'Complete the sponsor inquiry.');
    ensure(state.inquiries.length < 500, 'The sponsor inbox is full. Try again later.', 429);
    state.inquiries.push({ id: randomUUID(), owner: user?.id || null, name, company, email, budget: body.budget, message, at: now });
    return { message: 'Sponsor inquiry saved for review.' };
  }
  ensure(user, 'Sign in to continue.', 401);
  user.passport ||= {};
  const book = user.passport;
  if (action === 'passport-profile') {
    const handle = clean(body.handle, 24).toLowerCase();
    ensure(/^[a-z0-9][a-z0-9_-]{2,23}$/.test(handle), 'Use a 3–24 character username with letters, numbers, underscores, or hyphens.');
    ensure(!Object.values(data.users).some(candidate => candidate.id !== user.id && displayHandle(candidate) === handle), 'That username is taken.', 409);
    ensure(['public','friends','private'].includes(body.privacy), 'Choose a privacy setting.');
    const allowed = new Set(badges(user).filter(stamp => stamp.earned).map(stamp => stamp.id));
    const showcase = Array.isArray(body.showcase) ? [...new Set(body.showcase)] : [];
    ensure(showcase.length <= 5 && showcase.every(id => allowed.has(id)), 'Choose up to five earned badges.');
    book.handle = handle; book.privacy = body.privacy; book.showcase = showcase;
    return { message: 'Passport profile saved.' };
  }
  if (action === 'passport-friend') {
    const candidate = Object.values(data.users).find(row => row.id !== user.id && displayHandle(row) === clean(body.handle, 24).toLowerCase() && sameSpace(row, user, demo));
    ensure(candidate, 'No account has that username.', 404);
    const current = book.friends || [];
    ensure(current.length < 100 || current.includes(candidate.id), 'Your friend list is full.');
    book.friends = body.remove ? current.filter(id => id !== candidate.id) : [...new Set([...current,candidate.id])];
    return { message: body.remove ? 'Friend removed.' : friends(candidate,user) ? 'Friendship confirmed.' : 'Friend added. Ask them to add your username to connect.' };
  }
  if (action === 'passport-age') {
    ensure(body.adult === true, 'Adult eligibility confirmation is required.');
    user.adultConfirmed = true;
    return { message: 'Adult eligibility confirmed.' };
  }
  if (action === 'passport-checkin') {
    ensure(canEarn(user), 'Verify your account to earn Passport XP.', 403);
    const streak = book.streak ??= { count: 0, last: null, freeze: passport.streakFreezes, freezeMonth: monthId(now) };
    if (streak.freezeMonth !== monthId(now)) { streak.freezeMonth = monthId(now); streak.freeze = passport.streakFreezes; }
    ensure(streak.last !== today, 'You already checked in today.', 409);
    const days = streak.last ? Math.round((Date.parse(today) - Date.parse(streak.last)) / day) : 0;
    const usedFreeze = days === 2 && streak.freeze > 0;
    streak.count = days === 1 || usedFreeze ? streak.count + 1 : 1;
    if (usedFreeze) streak.freeze--;
    streak.last = today;
    awardXp(user, 'daily', 'passport-checkin:' + today, now);
    audit(state, user, action, today, usedFreeze ? 'Streak freeze used' : '');
    return { message: 'Passport check-in complete.' };
  }
  if (action === 'passport-season') {
    ensure(canEarn(user) && monthProgress(user, now) >= passport.monthlyGoal, 'Finish the monthly activity requirement.', 409);
    book.seasons ||= {};
    ensure(!book.seasons[monthId(now)], 'You already claimed this stamp.', 409);
    book.seasons[monthId(now)] = now;
    return { message: 'Seasonal Passport stamp earned.' };
  }
  if (action === 'passport-poll') {
    ensure(canEarn(user) && passport.poll.options.includes(body.choice), 'Verify your account and choose a poll option.', 403);
    const key = passport.poll.id + ':' + user.id;
    ensure(!state.polls[key], 'You already voted in this poll.', 409);
    state.polls[key] = body.choice;
    awardXp(user, 'poll', passport.poll.id);
    audit(state, user, action, passport.poll.id);
    return { message: 'Poll vote recorded.' };
  }
  if (action === 'passport-event') {
    ensure(canEarn(user), 'Verify your account to enter an attendance code.', 403);
    const event = passport.events.find(entry => entry.id === body.id);
    const code = event && process.env[event.codeEnv];
    ensure(code && clean(body.code, 100) === code && now >= Date.parse(event.start) && now < Date.parse(event.end), 'No matching attendance check is open.', 403);
    ensure(awardXp(user, 'event', event.id, now), 'Attendance has already been credited or the XP limit was reached.', 409);
    audit(state, user, action, event.id);
    return { message: 'Attendance verified.' };
  }
  if (action === 'passport-watch-start') {
    ensure(canEarn(user) && clips.some(clip => clip.id === body.clip), 'Choose an official highlight with a verified account.', 403);
    const id = randomUUID();
    book.watch = { id, clip: body.clip, started: now, pulse: now, seconds: 0 };
    return { id, message: 'Highlight timer started.' };
  }
  if (action === 'passport-watch-tick') {
    const watch = book.watch;
    ensure(watch && watch.id === body.id && now-watch.started <= passport.watchTokenMinutes*60000, 'The watch session expired.', 409);
    const gap = now-watch.pulse;
    if (gap >= 3600) {
      if (gap <= 8500) watch.seconds += Math.min(5, Math.floor(gap/1000+.1));
      watch.pulse = now;
    }
    return { seconds: watch.seconds };
  }
  if (action === 'passport-watch-finish') {
    const watch = book.watch;
    ensure(watch && watch.id === body.id && watch.seconds >= passport.watchSeconds && now - watch.started >= passport.watchSeconds * 1000 &&
      now - watch.started <= passport.watchTokenMinutes * 60000, 'Watch the highlight while the page is active before claiming XP.', 409);
    ensure(awardXp(user, 'watch', watch.clip + ':' + today, now), 'You have reached the watch limit or already claimed this highlight.', 409);
    delete book.watch;
    audit(state, user, action, watch.clip);
    return { message: 'Highlight XP earned.' };
  }
  if (action.startsWith('og-demo-')) {
    ensure(sample && user.demo && isAdult(user), 'Use a demo fan to preview membership.', 403);
    const command = action.slice(8);
    if (command === 'join' || command === 'change') {
      const plan = body.plan;
      ensure(Object.hasOwn(og.paid.prices, plan), 'Choose monthly or annual billing.');
      ensure(body.renewal === true, 'Confirm the sample renewal and cancellation terms.');
      ensure(command === 'change' ? user.og?.sample && activeMembership(user) : !activeMembership(user), 'Open the dashboard to manage your plan.', 409);
      const trial = og.welcome.enabled && user.accountType === 'Returning User' && !user.og?.joined;
      user.og = { ...user.og, plan, status: trial ? 'trialing' : 'active', sample: true, trial, joined: user.og?.joined || now, until: now + (trial ? og.welcome.trialDays : plan === 'month' ? 30 : 365) * day };
      user.og.invoices = [...(user.og.invoices || []), { at: now, cents: trial ? 0 : og.paid.prices[plan], status: 'Sample' }].slice(-30);
      awardXp(user, 'member', 'og-start');
    } else {
      ensure(user.og?.sample && user.og.until > now, 'No active demo membership.', 409);
      ensure(['cancel','reactivate','downgrade'].includes(command), 'Unknown membership action.', 404);
      user.og.status = command === 'reactivate' ? (user.og.trial ? 'trialing' : 'active') : 'canceling';
    }
    audit(state, user, action, user.id);
    return { message: 'Sample membership updated. No payment was collected.' };
  }
  if (action.startsWith('drop-')) {
    const preset = dropConfig.drops.find(drop => drop.id === body.id);
    ensure(preset && (!preset.sample || demo), 'Drop not found.', 404);
    let drop = dropStatus(state, preset, user, now);
    if (action === 'drop-notify') {
      state.waitlist[user.id + ':' + drop.id] = { owner: user.id, drop: drop.id, status: drop.status, at: now };
      return { message: 'Drop alert preference saved.' };
    }
    ensure(drop.sample && sample && user.demo, 'Sample checkout is available with a demo account.', 403);
    for (const [id, booking] of Object.entries(state.bookings)) if (booking.expires <= now) delete state.bookings[id];
    if (action === 'drop-reserve') {
      ensure(drop.status === 'Live' && drop.unlocked, drop.lock || 'This drop is unavailable.', 409);
      ensure(drop.sizes.includes(body.size) && drop.colors.includes(body.color), 'Select an available size and color.');
      ensure(Object.values(state.orders).filter(order => order.owner === user.id && order.drop === drop.id).length < dropConfig.perAccount, 'You reached the edition purchase limit.', 409);
      for (const [id, booking] of Object.entries(state.bookings)) if (booking.owner === user.id && booking.drop === drop.id) delete state.bookings[id];
      drop = dropStatus(state, preset, user, now);
      ensure(Object.keys(state.bookings).length < dropConfig.maximumPending && drop.remaining > 0, 'High demand. Try again once another reservation expires.', 409);
      const reserved = new Set([...Object.values(state.orders), ...Object.values(state.bookings)].filter(order => order.drop === drop.id).map(order => order.edition));
      let edition = drop.sampleSold + 1;
      while (reserved.has(edition)) edition++;
      ensure(edition <= drop.quantity, 'All remaining editions are reserved.', 409);
      const id = randomUUID();
      state.bookings[id] = { id, owner: user.id, drop: drop.id, size: body.size, color: body.color, edition, expires: now + dropConfig.reserveMinutes * 60000 };
      audit(state, user, action, drop.id);
      return { id, message: 'Your edition is reserved for checkout.' };
    }
    const existing = Object.hasOwn(state.orders, body.booking) ? state.orders[body.booking] : null;
    if (existing?.owner === user.id) return { message: 'This edition was already confirmed.', order: existing.id };
    const hold = Object.hasOwn(state.bookings, body.booking) ? state.bookings[body.booking] : null;
    ensure(hold?.owner === user.id && hold.drop === drop.id && hold.expires > now, 'The reservation expired. Reserve another edition.', 409);
    if (action === 'drop-release') {
      delete state.bookings[hold.id];
      return { message: 'Reservation released.' };
    }
    ensure(action === 'drop-order' && body.terms === true, 'Agree to the sample order terms.');
    ensure(drop.unlocked && drop.status === 'Live', drop.lock || 'Drop access changed.', 409);
    const code = clean(body.creatorCode, 20).toUpperCase();
    ensure(!code || code === dropConfig.previewCreatorCode, 'Use the sample creator code shown at checkout.');
    const tierDiscount = level(user).level >= 41 ? 10 : level(user).level >= 31 ? 8 : level(user).level >= 21 ? 5 : 0;
    const discount = Math.max(tierDiscount, activeMembership(user) ? og.paid.discount : 0, code ? dropConfig.creatorDiscount : 0);
    const reduced = Math.round(drop.priceCents * (100 - discount) / 100);
    const points = Number(body.points || 0);
    ensure(Number.isSafeInteger(points) && points >= 0 && points <= Math.min(fanWallet(user).balance, drop.pointsAllowed ? Math.floor(reduced * dropConfig.pointCapPercent / 100 / dropConfig.pointCents) : 0), 'Points exceed the redemption cap or available balance.');
    const order = { ...hold, name: drop.name, quantity: drop.quantity, sample: true, at: now, total: reduced - points * dropConfig.pointCents, points, creatorCode: code || null };
    delete order.expires;
    state.orders[order.id] = order;
    delete state.bookings[hold.id];
    (book.orders ||= []).push(order);
    if (points) credit(user, 'drop-spend:' + order.id, 'Edition points redemption', -points);
    credit(user, 'drop:' + order.id, drop.name + ' checkout', dropConfig.rewardPoints);
    if (activeMembership(user)) user.og.savings = (user.og.savings || 0) + drop.priceCents - reduced;
    awardXp(user, 'purchase', order.id);
    audit(state, user, action, order.id);
    return { order: order.id, message: 'Sample order confirmed. Edition #' + String(hold.edition).padStart(4, '0') + ' of ' + drop.quantity + '.' };
  }
  ensure(action.startsWith('next-'), 'Unknown action.', 404);
  const season = seasonFor(body.season);
  const phase = seasonPhase(season, now, sample, body.preview);
  const entry = Object.hasOwn(state.entries, body.id) ? state.entries[body.id] : sample && season.sample ? seedEntries(season, phase).find(item => item.id === body.id) : null;
  const owned = entry?.owner === user.id;
  const entries = Object.values(state.entries).filter(item => item.season === season.id && !item.withdrawn);
  if (entry) ensure(entry.season === season.id && !entry.withdrawn, 'Entry not found in this season.', 404);
  if (action === 'next-submit') {
    ensure(canEarn(user), 'Use a verified account to enter.', 403);
    ensure(isAdult(user) || nextConfig.allowGuardianConsent && state.guardian[user.id]?.verified, 'Adult eligibility or verified guardian consent is required.', 403);
    const starts = Date.parse(season.phases[0][2]);
    ensure(phase === 'submissions' || phase === 'upcoming' && activeMembership(user) && now >= starts-nextConfig.earlyHours*3600000, 'Applications are closed.', 409);
    const fields = entryValues(body);
    if (body.id) ensure(owned && !entry.id.startsWith('sample-') && ['Pending review','Approved','Needs changes'].includes(entry.status), 'You can only edit your eligible entry.', 403);
    else ensure(entries.filter(item => item.owner === user.id).length < nextConfig.maxEntries, 'You reached the season entry limit.', 409);
    ensure(!entries.some(item => item.id !== entry?.id && item.videoKey === fields.videoKey), 'This video was already submitted this season.', 409);
    const id = entry?.id || randomUUID();
    state.entries[id] = { ...entry, ...fields, id, season: season.id, sample, owner: user.id, handle: displayHandle(user), status: 'Pending review', reason: '', created: entry?.created || now };
    if (!entry) {
      awardXp(user, 'competition', season.id, now);
      awardXp(user, 'submit', id, now);
    }
    audit(state, user, action, id);
    return { id, message: 'Entry submitted for moderation.' };
  }
  if (action === 'next-withdraw') {
    ensure(owned && !entry.id.startsWith('sample-'), 'You can only withdraw your own entry.', 403);
    entry.withdrawn = now;
    audit(state, user, action, entry.id);
    return { message: 'Entry withdrawn from FaZe NEXT.' };
  }
  if (action === 'next-report') {
    const detail = clean(body.reason, 400);
    ensure(detail.length >= 8 && entry && publicStatuses.has(entry.status), 'Provide a reason for reporting a public entry.');
    ensure(!state.reports.some(report => report.entry === entry.id && report.actor === user.id && report.kind === body.kind), 'You already reported this entry.', 409);
    state.reports.push({ id: randomUUID(), entry: entry.id, actor: user.id, kind: body.kind === 'takedown' ? 'takedown' : 'content', detail, at: now });
    audit(state, user, action, entry.id);
    return { message: 'Your report has been forwarded for review.' };
  }
  if (action === 'next-vote') {
    ensure(canEarn(user) && phase === 'voting' && entry?.status === 'Approved' && !owned, 'Voting requires a verified fan, an approved entry, and an open voting phase.', 403);
    const actual = Object.values(state.votes).filter(vote => vote.season === season.id && vote.voter === user.id && vote.category === entry.category && vote.date === today && !vote.removed);
    ensure(actual.length < nextConfig.dailyVotes + (activeMembership(user) ? nextConfig.ogVotes : 0), 'You reached your daily vote limit for this category.', 409);
    ensure(!Object.values(state.votes).some(vote => vote.voter === user.id && vote.entry === entry.id && vote.date === today), 'You already voted for this entry today.', 409);
    const id = randomUUID();
    state.votes[id] = { id, season: season.id, entry: entry.id, category: entry.category, voter: user.id, date: today,
      flagged: risk, ip: fingerprint(fingerprintSecret, ip), device: fingerprint(fingerprintSecret, body.device || '') };
    awardXp(user, 'vote', entry.id + ':' + today, now);
    audit(state, user, action, id, risk ? 'Shared device or address pattern' : '');
    return { message: 'Vote saved.' };
  }
  if (action === 'next-followup') {
    const email = clean(body.email, 254), note = clean(body.note, 300);
    ensure(owned && ['Finalist','Winner'].includes(entry.status) && (sample || user.adultConfirmed) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'An adult finalist account and valid email are required.', 403);
    state.followups[entry.id] = { email, note, at: now };
    audit(state, user, action, entry.id);
    return { message: 'Private follow-up saved.' };
  }
  if (['next-score','next-conflict'].includes(action)) {
    ensure(judge(user, operator) && phase === 'judging' && entry && !owned && publicStatuses.has(entry.status), 'Judge access is required during judging.', 403);
    const key = user.id + ':' + entry.id;
    if (action === 'next-conflict') {
      state.conflicts[key] = true; delete state.scores[key];
    } else {
      ensure(!state.conflicts[key], 'You declared a conflict for this entry.', 403);
      ensure(Array.isArray(body.values) && body.values.length === nextConfig.rubric.length-1 && body.values.every(score => Number.isFinite(score) && score >= 0 && score <= 100), 'Enter all four scores from 0 through 100.');
      state.scores[key] = { entry: entry.id, values: body.values, notes: clean(body.notes, 800), judge: user.id };
    }
    audit(state, user, action, entry.id);
    return { message: action === 'next-conflict' ? 'Conflict recorded.' : 'Judging score saved.' };
  }
  ensure(operator, 'Operator access required.', 403);
  if (action === 'next-moderate') {
    ensure(entry && !entry.id.startsWith('sample-') && !owned, 'Select another fan’s submitted entry.', 403);
    ensure(['Approved','Needs changes','Rejected'].includes(body.status), 'Choose a moderation outcome.');
    const reason = clean(body.reason, 500);
    ensure(body.status === 'Approved' ? body.reviewed === true : Boolean(reason), 'Confirm a content review or enter a reason.');
    entry.status = body.status; entry.reason = reason;
    audit(state, user, action, entry.id, body.status);
    return { message: 'Moderation decision saved.' };
  }
  if (action === 'next-remove-vote') {
    const vote = Object.hasOwn(state.votes, body.id) ? state.votes[body.id] : null;
    ensure(vote && !vote.removed, 'Vote not found.', 404);
    vote.removed = true;
    audit(state, user, action, vote.id, clean(body.reason, 160));
    return { message: 'Vote removed from the count.' };
  }
  if (action === 'next-guardian-verify') {
    const candidate = Object.hasOwn(data.users, body.account) ? data.users[body.account] : null;
    ensure(nextConfig.allowGuardianConsent && candidate && candidate.id !== user.id && body.verified === true, 'Guardian consent must be verified through the operator review process.', 403);
    state.guardian[candidate.id] = { verified: true, operator: user.id, at: now, version: nextConfig.termsVersion };
    audit(state, user, action, candidate.id);
    return { message: 'Verified guardian consent recorded.' };
  }
  if (action === 'next-finalists' || action === 'next-winner') {
    const scored = rankings(state, entries.filter(item => action === 'next-finalists' ? item.status === 'Approved' : item.status === 'Finalist'));
    ensure(scored.length && (action === 'next-finalists' ? phase === 'finalists' : ['winners','archive'].includes(phase)), 'The season is not ready to publish these results.', 409);
    const finalists = action === 'next-finalists' ? scored.slice(0,nextConfig.finalistCount) : scored.slice(0,1);
    const statement = clean(body.statement, 800);
    ensure(statement.length >= 12, 'Add a public judging statement.');
    state.finalistStatements[season.id] = statement;
    for (const result of finalists) {
      const record = state.entries[result.id];
      record.status = action === 'next-finalists' ? 'Finalist' : 'Winner';
      record.finalScore = Math.round(result.total*100)/100;
      const participant = data.users[record.owner];
      if (!participant) continue;
      awardXp(participant,'finalist',record.id);
      if (record.status === 'Winner') participant.passport.nextWinner = now;
      addNotice(participant, { id: action + ':' + record.id, title: 'FaZe NEXT ' + record.status, message: 'There is an update on your FaZe NEXT entry.',
        route: '/next/entry/' + record.id, email: Boolean(participant.adultConfirmed), transactional: true });
    }
    audit(state, user, action, season.id);
    return { message: 'FaZe NEXT results published.' };
  }
  ensure(false, 'Unknown action.', 404);
}

export function stripeEnabled() {
  return /^sk_test_/.test(process.env.STRIPE_SECRET_KEY || '') && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}
async function stripe(path, fields, key) {
  ensure(stripeEnabled(), 'Stripe test mode is awaiting server configuration.', 503);
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST', body: new URLSearchParams(fields), signal: AbortSignal.timeout(12000),
    headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, ...(key ? { 'Idempotency-Key': key } : {}) }
  });
  const result = await response.json();
  ensure(response.ok, 'Stripe could not start this session. Try again shortly.', 502);
  return result;
}

export async function ogBilling(action, origin, user, body) {
  ensure(user && !user.demo && verifiedFan(user), 'Use a verified account for Stripe test billing.', 403);
  if (action === 'og-portal') {
    ensure(user.og?.customer, 'There is no Stripe billing history yet.', 409);
    const session = await stripe('billing_portal/sessions', { customer: user.og.customer, return_url: origin + '/og/dashboard' });
    return { url: session.url };
  }
  ensure(isAdult(user) && body.renewal === true, 'Confirm adult eligibility and the renewal terms.', 403);
  ensure(!activeMembership(user), 'Manage your current plan in the billing portal.', 409);
  const plan = body.plan;
  ensure(Object.hasOwn(og.paid.prices, plan), 'Choose an eligible plan.');
  const price = process.env[plan === 'month' ? 'STRIPE_OG_MONTH_PRICE' : 'STRIPE_OG_YEAR_PRICE'];
  ensure(/^price_[a-zA-Z0-9]+$/.test(price || ''), 'Set the plan’s Stripe test Price ID.', 503);
  const fields = {
    mode: 'subscription', 'line_items[0][price]': price, 'line_items[0][quantity]': '1', 'metadata[fan]': user.id,
    'subscription_data[metadata][fan]': user.id, 'subscription_data[metadata][plan]': plan,
    success_url: origin + '/og/dashboard?checkout=success', cancel_url: origin + '/og',
    ...(user.og?.customer ? { customer: user.og.customer } : { customer_email: user.email })
  };
  if (og.welcome.enabled && user.accountType === 'Returning User' && !user.og?.joined) fields['subscription_data[trial_period_days]'] = String(og.welcome.trialDays);
  const session = await stripe('checkout/sessions', fields, 'og-' + user.id + '-' + plan + '-' + Math.floor(Date.now()/600000));
  return { url: session.url };
}

export function applyStripeEvent(data, event) {
  const state = scope(data, false, true);
  state.stripeEvents ||= {};
  if (Object.hasOwn(state.stripeEvents, event.id)) return;
  const obj = event.data?.object || {};
  if (event.type.startsWith('customer.subscription.')) {
    const id = obj.metadata?.fan;
    const user = id && Object.hasOwn(data.users, id) ? data.users[id] : null;
    if (user && !user.demo && verifiedFan(user) && isAdult(user)) {
      const old = user.og || {};
      ensure(!old.subscription || old.subscription === obj.id || !activeMembership(user), 'A separate active subscription already exists.', 409);
      if (!old.eventAt || old.eventAt <= event.created) {
        const raw = obj.items?.data?.[0]?.current_period_end || obj.current_period_end;
        const status = event.type.endsWith('deleted') ? 'canceled' : obj.status === 'past_due' ? 'grace' : obj.cancel_at_period_end ? 'canceling' : obj.status;
        const until = status === 'grace' ? old.graceUntil || Date.now() + og.paid.graceDays * day : (raw || 0) * 1000;
        user.og = { ...old, customer: obj.customer, subscription: obj.id, status, until, eventAt: event.created,
          plan: obj.items?.data?.[0]?.price?.id === process.env.STRIPE_OG_YEAR_PRICE ? 'year' : obj.items?.data?.[0]?.price?.id === process.env.STRIPE_OG_MONTH_PRICE ? 'month' : obj.metadata?.plan || old.plan, joined: old.joined || Date.now(), graceUntil: status === 'grace' ? until : null };
        if (['active','trialing'].includes(status)) awardXp(user,'member','stripe:' + obj.id);
        audit(state,user,event.type,obj.id,status);
      }
    }
  }
  if (['invoice.paid','invoice.payment_failed'].includes(event.type)) {
    const user = Object.values(data.users).find(candidate => candidate.og?.customer && candidate.og.customer === obj.customer);
    if (user) {
      const invoices = user.og.invoices || [];
      const previous = invoices.find(invoice => invoice.id === obj.id);
      if (!previous || previous.status !== 'Paid' || event.type === 'invoice.paid') {
        const status = event.type === 'invoice.paid' ? 'Paid' : 'Failed';
        user.og.invoices = [...invoices.filter(invoice => invoice.id !== obj.id), { id: obj.id, at: event.created*1000, cents: obj.amount_paid || obj.amount_due || 0, status }].slice(-30);
        const subscription = obj.parent?.subscription_details?.subscription || obj.subscription;
        const appliesToMembership = subscription === user.og.subscription && subscription &&
          event.created >= (user.og.invoiceEventAt || 0);
        if (appliesToMembership) user.og.invoiceEventAt = event.created;
        if (appliesToMembership && status === 'Failed' && ['active','trialing','grace'].includes(user.og.status)) {
          if (user.og.status !== 'grace') user.og.paidThrough = user.og.until;
          user.og.failedInvoice = obj.id;
          user.og.graceUntil ||= Date.now() + og.paid.graceDays * day;
          user.og.until = user.og.graceUntil; user.og.status = 'grace';
          addNotice(user,{ id:'og-invoice:' + obj.id,title:'OG payment needs attention',message:'Update your payment in the billing portal before the grace period ends.',route:'/og/dashboard',email:true,transactional:true });
        }
        if (appliesToMembership && status === 'Paid' && user.og.status === 'grace' && user.og.failedInvoice === obj.id && obj.amount_paid > 0) {
          const periodEnd = Math.max(0,...(obj.lines?.data || []).map(line => Number(line.period?.end) || 0)) * 1000;
          const renewal = Math.max(user.og.paidThrough || 0,periodEnd);
          if (renewal > Date.now()) {
            Object.assign(user.og,{status:'active',until:renewal,graceUntil:null,failedInvoice:null});
          }
        }
      }
    }
  }
  state.stripeEvents[event.id] = event.created;
  for (const [id, date] of Object.entries(state.stripeEvents)) if (date < Math.floor(Date.now()/1000) - 90*86400) delete state.stripeEvents[id];
}

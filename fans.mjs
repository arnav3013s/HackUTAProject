import { games, matchRules, rewardRules } from './catalog.mjs';
import { videos } from './faze.mjs';

export const day = 86_400_000;
export const categories = [
  ['New fan', 'Start with the original ILLCAMS and the archive challenge.', '#welcome'],
  ['Patch regular', 'Check new tiers and bring a fresh pick to the daily challenge.', '#patches'],
  ['Returning fan', 'Catch up on the archive and claim your returning offer when eligible.', '#news'],
  ['Collector', 'See points, redemptions, and what you can unlock next.', '#rewards/points-shop'],
  ['Ambassador', 'Share your invite link and check which referrals cleared review.', '#rewards/campaign'],
  ['Creator reviewer', 'Compare draft tiers and submit your playtest findings.', '#patches'],
  ['Esports fan', 'Follow your favorite game and see the players behind the results.', '#teams']
];

export function placementScore(match) {
  return (match.fieldSize - match.placement) / (match.fieldSize - 1);
}

export function matchCredit(match, ledger, now = Date.now()) {
  const r = matchRules;
  const time = Math.min(r.timeCap, Math.floor(match.minutes / r.minutesPerPoint));
  const placement = Math.round(placementScore(match) * r.placementCap);
  const today = new Date(now).toISOString().slice(0, 10);
  const creditedToday = ledger.reduce((total, entry) => entry.id.startsWith('match:') && entry.at.startsWith(today) ? total + entry.points : total, 0);
  const eligible = match.minutes >= r.minimumMinutes && now - Date.parse(match.at) <= r.rewardWindowDays * day;
  const awarded = eligible ? Math.min(time + placement, Math.max(0, r.dailyCap - creditedToday)) : 0;
  return { time, placement, awarded };
}

export function gameProfile(user, now = Date.now()) {
  const cutoff = now - matchRules.recentDays * day;
  const summaries = new Map();
  for (const match of user.matches || []) {
    if (Date.parse(match.at) < cutoff) continue;
    const totals = summaries.get(match.game) || { game: match.game, minutes: 0, matches: 0, best: null, wins: 0, score: 0 };
    totals.minutes += match.minutes;
    totals.matches++;
    totals.score += placementScore(match);
    if (match.placement === 1) totals.wins++;
    if (!totals.best || placementScore(match) > placementScore(totals.best)) totals.best = match;
    summaries.set(match.game, totals);
  }
  return [...summaries.values()].map(({ score, ...totals }) => {
    const performance = Math.round(score * 100 / totals.matches);
    const level = totals.matches < matchRules.rankedMatches ? 'Placement pending'
      : performance >= 75 ? 'Top competitor' : performance >= 50 ? 'Competitive' : 'Developing';
    return { ...totals, performance, level, ranked: totals.matches >= matchRules.rankedMatches };
  }).sort((a, b) => b.minutes - a.minutes || b.matches - a.matches || a.game.localeCompare(b.game));
}

export function fanCategory(user, now = Date.now(), profile = gameProfile(user, now)) {
  const lastCredit = user.ledger.reduce((latest, item) => Math.max(latest, Date.parse(item.at) || 0), user.created);
  const latest = (user.matches || []).reduce((time, match) => Math.max(time, Date.parse(match.at)), lastCredit);
  const main = profile[0];
  const index = user.profile || user.ledger.some(item => item.id.startsWith('review:')) ? 5
    : user.ledger.some(item => item.id.startsWith('referral:')) ? 4
    : user.ledger.some(item => item.points < 0) ? 3
    : now - user.created >= 14 * day && now - latest >= 7 * day ? 2
    : user.ledger.filter(item => item.id.startsWith('daily:')).length >= 3 ? 1
    : main?.minutes >= 90 || Object.keys(user.links).length ? 6 : 0;
  const [name, next, href] = categories[index];
  const explanation = [
    'You’re still building your activity history.',
    'You’ve completed at least three daily patch picks.',
    'Your account is at least two weeks old and its last match or points activity was at least seven days ago.',
    'You’ve redeemed a reward.',
    'You’ve earned points from an approved referral.',
    'You have a creator profile or an accepted patch review.',
    main?.minutes >= 90 ? `You’ve logged at least 90 minutes in ${main.game} over the last ${matchRules.recentDays} days.` : 'You’ve added a game to follow.'
  ][index];
  return { name, next, href, explanation };
}

export function fanWallet(user) {
  let earned = 0;
  let spent = 0;
  const credits = [];
  for (const { points, expiresAt, at } of user.ledger) {
    if (points >= 0) { earned += points; credits.push({ remaining: points, expiresAt }); }
    else {
      spent -= points;
      let needed = -points;
      for (const credit of credits) {
        if (credit.expiresAt && Date.parse(credit.expiresAt) <= Date.parse(at)) continue;
        const used = Math.min(needed, credit.remaining);
        credit.remaining -= used;
        needed -= used;
        if (!needed) break;
      }
    }
  }
  const now = Date.now();
  const expired = credits.reduce((sum, item) => sum + (item.expiresAt && Date.parse(item.expiresAt) <= now ? item.remaining : 0), 0);
  return { earned, spent, expired, balance: credits.reduce((sum, item) => sum + item.remaining, 0) - expired };
}

export function seedFans(state, log, now = Date.now()) {
  if (state.fanLabSeed === 3) return;
  const removed = new Set(Object.values(state.users).filter(user => user.demo).map(user => user.id));
  for (const id of removed) delete state.users[id];
  for (const [key, session] of Object.entries(state.sessions)) if (removed.has(session.user)) delete state.sessions[key];
  for (const [id, redemption] of Object.entries(state.redemptions)) if (removed.has(redemption.user)) delete state.redemptions[id];
  for (const [id, referral] of Object.entries(state.referrals)) if (removed.has(referral.inviter) || removed.has(referral.invitee)) delete state.referrals[id];
  const personas = [
    { name: 'Regular User', type: 'Normal User', age: 45, game: games[0] },
    { name: 'New User', type: 'New User', age: 1, game: null },
    { name: 'Old Returning User', type: 'Returning User', age: 400, game: games[0] },
    { name: 'Pro Streamer', type: 'Streamer', age: 100, game: games[0] }
  ];
  personas.forEach((persona, index) => {
    const id = `fan-${index + 1}-1`;
    const created = now - persona.age * day;
    const user = { id, name: persona.name, created, demo: true, persona: true,
      personaType: persona.type, invite: `LAB-${index + 1}1`, ledger: [],
      links: persona.game ? { [persona.game]: { handle: `demo_${index + 1}`, verified: false } } : {},
      ...(persona.type === 'Streamer' ? { profile: { game: persona.game, specialty: 'Demo creator', description: 'Sample profile' } } : {}) };
    state.users[id] = user;
    const add = (entry, label, points, at) => {
      const time = new Date(at).toISOString();
      user.ledger.push({ id: entry, label, points, at: time });
      log({ kind: 'points', subject: id, amount: points, time, sample: true });
    };
    add('demo', 'Starter demo points', rewardRules.demoBalance, created);
    if (persona.type === 'Returning User') {
      for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
        const at = created + (dayIndex + 1) * day;
        add(`daily:${new Date(at).toISOString().slice(0, 10)}`, 'Historical daily activity', rewardRules.daily, at);
      }
      const contributionDays = user.ledger.filter(entry => entry.id.startsWith('daily:')).length;
      add('returning-loyalty', 'Return bonus based on past contribution days', 20 + Math.min(30, contributionDays * 5), now);
      user.fanSinceYear = 2015;
    }
    if (persona.type === 'Streamer') add('review:seed', 'Sample accepted creator survey', rewardRules.review, now - day);
    const clip = videos[index % videos.length];
    log({ kind: 'clip', subject: clip.id, amount: 1, time: new Date(now - day).toISOString(), sample: true });
  });
  state.fanLabSeed = 3;
  state.matchProfilesSeeded = false;
}

export function seedMatchProfiles(state, log) {
  const now = Date.now();
  for (const fan of Object.values(state.users)) {
    if (!fan.persona || fan.matches) continue;
    const [, cohort, number] = fan.id.split('-').map(Number);
    const primary = Object.keys(fan.links)[0] || games[number % games.length];
    const second = games[(games.indexOf(primary) + 1 + number % (games.length - 1)) % games.length];
    const lastMatch = fan.personaType === 'Returning User' ? now - 14 * day : now - day;
    const count = fan.personaType === 'New User' ? 0 : fan.personaType === 'Normal User' ? 2 : 3 + (number % 5);
    fan.matches = Array.from({ length: count }, (_, index) => {
      const fieldSize = [8, 12, 16][(index + cohort) % 3];
      const at = new Date(Math.max(fan.created, lastMatch - index * day)).toISOString();
      return {
        id: `seed-${index}`, game: index < count - 1 || count < 4 ? primary : second,
        minutes: 10 + ((index * 11 + number * 7 + cohort * 5) % 41),
        fieldSize, placement: 1 + ((index * (number % 3 + 1) + number * 3 + cohort) % fieldSize),
        at, source: 'sample'
      };
    });
    for (const match of [...fan.matches].reverse()) {
      const credit = matchCredit(match, fan.ledger, Date.parse(match.at));
      match.credit = credit;
      if (!credit.awarded) continue;
      fan.ledger.push({ id: `match:${match.game}:${match.id}`, label: `${match.game} · Place ${match.placement}/${match.fieldSize}`, points: credit.awarded, at: match.at });
      log({ kind: 'points', subject: fan.id, amount: credit.awarded, time: match.at, sample: true });
    }
  }
  state.matchProfilesSeeded = true;
}

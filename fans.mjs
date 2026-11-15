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
  for (const { points } of user.ledger) {
    if (points >= 0) earned += points;
    else spent -= points;
  }
  return { earned, spent, balance: earned - spent };
}

export function seedFans(state, log, now = Date.now()) {
  if (state.fanLabSeed === 1) return;
  const names = ['Ash', 'Blake', 'Casey', 'Devon', 'Ellis', 'Frankie', 'Gray', 'Harper'];
  const surname = ['Vale', 'Cruz', 'Park', 'Reed', 'Stone', 'Wells', 'Fox'];
  for (let group = 0; group < categories.length; group++) {
    for (let index = 0; index < names.length; index++) {
      const id = `fan-${group + 1}-${index + 1}`;
      const created = now - ((group === 2 ? 28 : group === 0 ? 1 : 11) + index) * day;
      const recent = now - (group === 2 ? 9 + index : 1) * day;
      const game = group === 2 ? games[0] : games[(index + group) % games.length];
      const user = {
        id, name: `${names[index]} ${surname[group]}`, created, demo: true, persona: true,
        invite: `LAB-${group + 1}${index + 1}`, ledger: [],
        links: group === 0 ? {} : { [game]: { handle: `${names[index]}_${index + group * 10}`, verified: false } }
      };
      state.users[id] = user;
      const add = (id, label, points, ts, kind = 'points') => {
        user.ledger.push({ id, label, points, at: new Date(ts).toISOString() });
        log({ kind, subject: user.id, amount: points, time: new Date(ts).toISOString(), sample: true });
      };
      add('demo', 'Starter demo points', rewardRules.demoBalance, created);
      const picks = group === 1 ? 3 + index : group === 0 ? 0 : group === 6 ? 1 : index % 3;
      for (let pick = 0; pick < picks; pick++) {
        const when = recent - pick * day;
        add(`daily:${new Date(when).toISOString().slice(0, 10)}`, 'Daily meta pick', rewardRules.daily, when);
      }
      if (group === 3) {
        add('redeem:seed', 'Intel Pass', -80, recent, 'redeem');
        const orderId = `${id}:seed`;
        state.redemptions[orderId] = { id: orderId, user: id, product: 'pass', name: 'Intel Pass', status: 'activated' };
      }
      if (group === 4) {
        for (let referral = 0; referral <= index % rewardRules.referralCap; referral++) {
          add(`referral:seed-${referral}`, 'Approved referral', rewardRules.referral, recent);
        }
      }
      if (group === 5) add('review:seed', 'Accepted CS2 survey', rewardRules.review, recent);
      for (let open = 0; open < (group === 0 ? 1 : 2 + index % 3); open++) {
        const clip = videos[(group + open + index * 2) % videos.length];
        const time = new Date(recent - open * 8 * day).toISOString();
        if (Date.parse(time) >= created) log({ kind: 'clip', subject: clip.id, amount: 1, time, sample: true });
      }
    }
  }
  state.fanLabSeed = 1;
}

export function seedMatchProfiles(state, log) {
  for (const fan of Object.values(state.users)) {
    if (!fan.persona || fan.matches) continue;
    const [, cohort, number] = fan.id.split('-').map(Number);
    const primary = Object.keys(fan.links)[0] || games[number % games.length];
    const second = games[(games.indexOf(primary) + 1 + number % (games.length - 1)) % games.length];
    const lastMatch = cohort === 3 ? fan.created + (16 - number) * day : fan.created + (cohort === 1 ? 0 : 9) * day;
    const count = cohort === 1 ? (number - 1) % 3 : 3 + (number % 5);
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

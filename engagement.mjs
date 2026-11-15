import { createHash } from 'node:crypto';
import { games, rewardRules } from './catalog.mjs';
import { day, gameProfile, placementScore } from './fans.mjs';
import { fetchJson } from './services.mjs';

export const returnAfterDays = 7;
export const comebackCooldownDays = 30;
export const utcDate = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

const trivia = [
  { prompt: 'Which game started FaZe’s trickshotting era?', options: ['Call of Duty', 'Fortnite', 'Halo'], correct: 'Call of Duty', detail: 'FaZe Sniping started as a Call of Duty trickshot crew.' },
  { prompt: 'Where did FaZe win its first Counter-Strike Major?', options: ['Copenhagen', 'Antwerp', 'Stockholm'], correct: 'Antwerp', detail: 'FaZe won the 2022 PGL Major in Antwerp.' },
  { prompt: 'Which tournament did FaZe win in 2023?', options: ['Six Invitational', 'PGL Antwerp Major', 'Halo World Championship'], correct: 'Halo World Championship', detail: 'FaZe won the 2023 Halo World Championship.' },
  { prompt: 'Which game is played at the Six Invitational?', options: ['Halo Infinite', 'Rainbow Six Siege', 'Call of Duty'], correct: 'Rainbow Six Siege', detail: 'The Six Invitational is the Rainbow Six Siege championship.' },
  { prompt: 'What was the name of FaZe’s early trickshot series?', options: ['ILLCAMS', 'Final Round', 'Match Point'], correct: 'ILLCAMS', detail: 'The first ILLCAMS episode was uploaded in 2010.' },
  { prompt: 'What team name did Atlanta FaZe adopt?', options: ['FaZe Vegas', 'FaZe London', 'FaZe Dallas'], correct: 'FaZe Vegas', detail: 'Atlanta FaZe became FaZe Vegas for the 2026 CDL season.' }
];

export const starterQuiz = {
  prompt: 'What year did the first ILLCAMS episode appear?',
  options: ['2009', '2010', '2012'], correct: '2010',
  detail: 'FaZe uploaded the first ILLCAMS episode in 2010. The series collected trickshots from the early Call of Duty community.'
};

export function dailyQuiz(now = Date.now()) {
  return { ...trivia[Math.floor(now / day) % trivia.length], date: utcDate(now) };
}

export function publicQuiz({ correct, ...question }, reveal) {
  return reveal ? { ...question, correct } : { prompt: question.prompt, options: question.options, date: question.date };
}

const isDaily = id => /^(daily|check-in|trivia):/.test(id);
const isPassive = id => /^(demo$|referral:|review:|returning-loyalty$)/.test(id);
export const dailyDates = user => [...new Set(user.ledger.filter(item => isDaily(item.id)).map(item => item.id.split(':')[1]))].sort();
export function weekStart(now = Date.now()) {
  const date = new Date(now);
  const weekday = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - weekday)).toISOString().slice(0, 10);
}
export function weeklyProgress(user, now = Date.now()) {
  const week = weekStart(now);
  const dailyDays = user?.ledger.filter(item => item.id.startsWith('completion:') && item.id.slice(11) >= week).length || 0;
  const clips = new Set((user?.watchedClips || []).filter(item => item.at.slice(0, 10) >= week).map(item => item.id)).size;
  const referrals = user?.ledger.filter(item => item.id.startsWith('referral:') && item.at.slice(0, 10) >= week).length || 0;
  const tasks = [
    { id: 'daily', name: 'Finish daily tasks on four days', progress: dailyDays, goal: 4 },
    { id: 'clips', name: 'Explore three different highlights', progress: clips, goal: 3 },
    { id: 'squad', name: 'Bring back your squad', progress: referrals, goal: 1 }
  ].map(task => ({ ...task, claimed: Boolean(user?.ledger.some(item => item.id === `weekly:${week}:${task.id}`)) }));
  return { week, tasks, chestReady: tasks.filter(task => task.claimed).length >= 2, chestClaimed: Boolean(user?.ledger.some(item => item.id === `weekly-chest:${week}`)) };
}
export function referralMilestones(user, now = Date.now()) {
  return { age: Math.max(0, Math.floor((now - user.created) / day)), tasks: dailyDates(user).length };
}

export function engagement(user, now = Date.now(), profile) {
  const date = utcDate(now);
  const cards = [
    { id: 'check-in', name: 'Daily check-in', points: rewardRules.checkIn },
    { id: 'trivia', name: 'Archive trivia', points: rewardRules.trivia },
    { id: 'daily', name: 'Meta pick', points: rewardRules.daily },
    { id: 'watch-task', name: 'Watch a highlight', points: rewardRules.watch }
  ].filter(card => card.id !== 'daily' || !user || now - user.created < rewardRules.days * day)
    .map(card => ({ ...card, done: Boolean(user?.ledger.some(item => item.id === `${card.id}:${date}`)) }));
  const quiz = publicQuiz(dailyQuiz(now), cards[1].done);
  if (!user) return { date, cards, quiz, starter: publicQuiz(starterQuiz, false) };
  profile ??= gameProfile(user, now);

  const actions = user.ledger.filter(item => !isPassive(item.id));
  const lastAction = actions.reduce((latest, item) => Math.max(latest, Date.parse(item.at) || 0), user.created);
  const lastMatch = (user.matches || []).reduce((latest, result) => Math.max(latest, Date.parse(result.at) || 0), user.created);
  const lastActivity = Math.max(lastAction, lastMatch, user.lastReviewAt || 0);
  const daysAway = Math.max(0, Math.floor((now - lastActivity) / day));
  const started = actions.length > 0 || Boolean(user.matches?.length || user.lastReviewAt);
  const stage = !started ? 'new' : daysAway >= returnAfterDays ? 'returning' : 'active';
  const reason = stage === 'returning' ? `Your last Clan activity was ${daysAway} days ago.`
    : stage === 'active' ? `You recorded Clan activity in the last ${returnAfterDays} days.`
    : 'Your profile is ready for its first mission.';
  const preferences = (user.favoriteGames || []).filter(game => games.includes(game));
  const primaryGame = profile[0]?.game || preferences[0] || Object.keys(user.links)[0] || null;
  const hasComeback = user.ledger.some(item => /^(return:|return$|comeback:)/.test(item.id)
    && now - Date.parse(item.at) < comebackCooldownDays * day);
  const pending = user.comebackOffer?.expires > now;
  const canOffer = stage === 'returning' && user.comebackOffer?.activity !== lastActivity;
  const comeback = !hasComeback && (pending || canOffer) ? rewardRules.returning : 0;
  const comebackActivity = pending ? user.comebackOffer.activity : lastActivity;
  const dates = new Set(dailyDates(user));
  let currentDay = dates.has(date) ? now : now - day;
  let streak = 0;
  while (dates.has(utcDate(currentDay))) {
    streak++;
    currentDay -= day;
  }
  const starterDone = user.ledger.some(item => item.id === 'archive-quiz');
  const matches = (user.matches || []).filter(match => match.game === primaryGame);
  const best = matches.reduce((best, match) => !best || placementScore(match) > placementScore(best) ? match : best, null);
  const rewind = best ? `You’ve logged ${matches.length} ${matches.length === 1 ? 'match' : 'matches'} in ${primaryGame}. Your best finish was ${best.placement} of ${best.fieldSize} on ${best.at.slice(0, 10)}.`
    : starterDone ? 'You completed the first ILLCAMS challenge and earned your archive points.' : '';
  return {
    date, cards, quiz, stage, reason, daysAway, preferences, primaryGame, lastActivity, streak, comeback, comebackActivity, rewind,
    starterDone, starter: publicQuiz(starterQuiz, starterDone), onboardingDone: Boolean(user.onboardingDone),
    watchedToday: Boolean(user.watchedClips?.some(item => item.at.slice(0, 10) === date)),
    completionDone: Boolean(user.ledger.some(item => item.id === `completion:${date}`))
  };
}

export function addNotice(user, notice, now = Date.now()) {
  const inbox = user.inbox ||= [];
  if (inbox.some(item => item.id === notice.id)) return;
  inbox.unshift({ ...notice, at: new Date(now).toISOString() });
}

export function syncNotices(user, now = Date.now()) {
  const status = engagement(user, now, []);
  if (!user.welcomed) {
    addNotice(user, { id: 'welcome', title: 'Welcome to Clan', message: 'Pick your games and earn your first points in the walkthrough.', route: '#welcome' }, now);
    user.welcomed = true;
  }
  if (status.stage === 'returning') {
    if (status.comeback && user.comebackOffer?.activity !== status.comebackActivity) {
      user.comebackOffer = { activity: status.comebackActivity, expires: now + returnAfterDays * day };
    }
    addNotice(user, {
      id: `return-${utcDate(status.lastActivity)}`, kind: 'returning',
      title: status.comeback ? `Your ${status.comeback}-point comeback is ready` : 'Your daily missions are ready',
      message: status.comeback ? `Your last activity was ${status.daysAway} days ago. Claim your comeback and see today’s missions.`
        : `It’s been ${status.daysAway} days since your last Clan activity. Come back for today’s check-in and archive question.`,
      route: '#missions',
      email: true
    }, now);
  }
}

export function inboxView(user) {
  const items = (user.inbox || []).slice(0, 30).map(({ id, title, message, route, at, readAt, delivery }) =>
    ({ id, title, message, route, at, readAt, sentAt: delivery?.sentAt }));
  return { items, unread: items.filter(item => !item.readAt).length, emailEnabled: Boolean(user.emailEnabled) };
}

export function mailConfigured(origin) {
  return origin.startsWith('https://') && Boolean(process.env.RESEND_API_KEY && process.env.REPLAY_EMAIL_FROM);
}

export async function deliverNotices(store, origin, now = Date.now()) {
  if (!mailConfigured(origin)) return 0;
  const dayAgo = now - day;
  const snapshot = await store.read();
  const recipients = Object.values(snapshot.users).filter(user => !user.demo && user.googleSub && user.email && user.emailEnabled && user.unsubscribeToken);
  if (!recipients.length) return 0;
  const jobs = await store.write(data => {
    const batches = [];
    for (const { id } of recipients) {
      const user = data.users[id];
      if (!user?.emailEnabled || user.demo || !user.googleSub || !user.email || !user.unsubscribeToken) continue;
      syncNotices(user, now);
      if (user.inbox.some(item => item.delivery?.sentAt >= dayAgo || item.delivery?.lease > now)) continue;
      const candidate = user.inbox.find(item => {
        const delivery = item.delivery || {};
        const created = Date.parse(item.at);
        return item.email && !item.readAt && !delivery.sentAt && !delivery.failed && created >= Math.max(dayAgo, user.emailEnabled)
          && (!delivery.lease || delivery.lease <= now) && (!delivery.nextAt || delivery.nextAt <= now)
          && (item.kind !== 'returning' || now - (user.lastVisitAt || 0) >= day && engagement(user, now, []).stage === 'returning');
      });
      if (!candidate) continue;
      const delivery = candidate.delivery ||= {};
      delivery.firstAt ??= now;
      if (now - delivery.firstAt >= day) continue;
      delivery.tries = (delivery.tries || 0) + 1;
      delivery.lease = now + 5 * 60_000;
      const unsubscribe = `${origin}/mail/unsubscribe?token=${user.unsubscribeToken}`;
      const message = delivery.message ||= {
        from: process.env.REPLAY_EMAIL_FROM, to: [user.email],
        subject: `FaZe Clan · ${candidate.title}`,
        text: `${candidate.message}\n\nOpen FaZe Clan: ${origin}/${candidate.route}\n\nUnsubscribe: ${unsubscribe}`,
        headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      };
      batches.push({ id, notice: candidate.id, tries: delivery.tries, message });
      if (batches.length === 10) break;
    }
    return batches;
  });
  let sent = 0;
  for (const job of jobs) {
    let ok = false;
    let permanent = false;
    const current = (await store.read()).users[job.id];
    if (current?.emailEnabled && current.googleSub && !current.demo && current.email === job.message.to[0]) {
      try {
        const idempotency = createHash('sha256').update(`${job.id}:${job.notice}`).digest('hex');
        const result = await fetchJson('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotency },
          body: JSON.stringify(job.message)
        });
        ok = typeof result.id === 'string';
      } catch (error) {
        permanent = [400, 401, 403, 422].includes(error.upstreamStatus);
      }
    }
    await store.write(data => {
      const delivery = data.users[job.id]?.inbox.find(item => item.id === job.notice)?.delivery;
      if (delivery?.tries !== job.tries) return;
      delete delivery.lease;
      if (ok) delivery.sentAt = now;
      else if (permanent || job.tries >= 3) delivery.failed = true;
      else delivery.nextAt = now + 15 * 60_000;
    });
    if (ok) sent++;
  }
  return sent;
}

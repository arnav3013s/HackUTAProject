export const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const n = value => Number(value || 0).toLocaleString();

const gameArt = {
  'Counter-Strike 2': 'CS₂', 'Call of Duty: Warzone': 'WZ', 'Rainbow Six Siege': 'R6',
  Valorant: 'V', 'Apex Legends': 'AL', Fortnite: 'FN'
};
const title = (heading, summary) => `<header class="club-title"><h1>${e(heading)}</h1><p>${e(summary)}</p></header>`;
const btn = (label, href, extra = '') => `<a class="btn ${extra}" href="${e(href)}">${e(label)} <span aria-hidden="true">↗</span></a>`;
const action = (label, post, extra = '') => `<button type="button" class="btn ${extra}" data-post="${e(post)}">${e(label)}</button>`;
const points = value => `<span class="point-tag">+${n(value)} <small>PTS</small></span>`;
const status = state => state.user?.journey || state.missions;
const eligible = state => state.user?.demo || state.user?.verified;
const stageLabels = { new: 'New fan', returning: 'Returning fan', active: 'Active fan' };
const signedInAction = state => state.config.google ? 'Verify Google account' : 'Open account';

const missionHelp = {
  'check-in': ['✓', 'Claim points for today’s visit.'],
  trivia: ['?', 'Answer one question from FaZe history.'],
  daily: ['◎', 'Pick a weapon from today’s patch pool.']
};

const hidden = (key, value) => `<input type="hidden" name="${e(key)}" value="${e(value)}">`;

function canPick(state) {
  return !state.user?.challengeComplete && state.patches.some(item => Boolean(item.sample) === Boolean(state.user?.demo ?? state.config.demo));
}

export function inviteURL(user) {
  const url = new URL('/', location.origin);
  url.searchParams.set('invite', user.invite);
  url.hash = 'welcome';
  return url.href;
}

function answerButtons(question, field, post, buttonText, context = '') {
  return `<form class="quiz-form" data-action="${post}">
    ${context}
    <fieldset><legend>${e(question.prompt)}</legend>
      ${question.options.map(choice => `<label class="quiz-choice"><input type="radio" name="${field}" value="${e(choice)}" required><span>${e(choice)}</span></label>`).join('')}
    </fieldset>
    <button class="btn primary" type="submit">${e(buttonText)} <span aria-hidden="true">→</span></button>
  </form>`;
}

function missionControl(state, card, short) {
  if (card.done) return `<span class="done-label"><span aria-hidden="true">✓</span> Complete</span>`;
  if (!state.user) return btn('Start', short ? '#welcome' : '#account', 'quiet');
  if (!eligible(state)) return btn(signedInAction(state), '#account', 'quiet');
  if (card.id === 'check-in') return action('Claim', 'check-in', 'claim-btn');
  if (short) return btn(card.id === 'trivia' ? 'Play' : 'Pick', `#missions/${card.id}`, 'quiet');
  if (card.id === 'trivia') {
    const quiz = status(state).quiz;
    return answerButtons(quiz, 'answer', 'trivia', 'Submit answer', hidden('date', quiz.date));
  }
  const patch = state.patches.find(item => Boolean(item.sample) === Boolean(state.user.demo));
  if (!canPick(state)) return '<p class="mission-note">Your first 21 days include a daily meta pick when rankings are available.</p>';
  return `<form class="quiz-form" data-action="daily">
    ${hidden('patch', patch.id)}
    <label>Weapon for ${e(patch.game)}<select name="weapon" required>
    ${patch.rankings.map(row => `<option value="${e(row.name)}">${e(row.name)} · ${e(row.tier)} tier</option>`).join('')}
    </select></label>
    <button class="btn primary" type="submit">Save my pick</button>
  </form>`;
}

function dailyBoard(state) {
  const journey = status(state);
  const available = journey.cards.filter(card => card.id !== 'daily' || canPick(state) || card.done);
  const completed = available.filter(card => card.done).length;
  return `<section class="daily-board panel">
    <div class="daily-board-top">
      <div class="board-header"><div><p class="club-kicker">DAILY ROTATION</p><h2>Today’s missions</h2></div><span class="board-count">${completed}/${available.length}</span></div>
      <progress aria-label="Daily missions completed" value="${completed}" max="${available.length}"></progress>
    </div>
    <div class="daily-items">
      ${available.map(card => `<div class="daily-row"><span class="mission-icon" aria-hidden="true">${missionHelp[card.id][0]}</span><div class="daily-row-name"><strong>${e(card.name)}</strong>${card.done ? '<small>Points credited</small>' : points(card.points)}</div>${missionControl(state, card, true)}</div>`).join('')}
    </div>
    <div class="daily-foot">${btn('View missions', '#missions', 'text-btn')}<span>Resets at 00:00 UTC</span></div>
  </section>`;
}

function featureClip(clip) {
  if (!clip) return '';
  return `<button class="featured-clip" data-play-clip="${e(clip.id)}" aria-label="Play ${e(clip.title)}">
    <img src="${e(clip.image)}" alt="" loading="lazy">
    <span class="featured-play" aria-hidden="true">▶</span>
    <span class="featured-title"><small>${e(clip.channel)} · ${e(clip.year)}</small><strong>${e(clip.title)}</strong></span>
  </button>`;
}

export function recommendedClip(state) {
  const game = state.user?.journey.primaryGame;
  const category = ({ 'Counter-Strike 2': 'Counter-Strike', 'Call of Duty: Warzone': 'Call of Duty' })[game] || game;
  return state.faze.videos.find(clip => clip.game && clip.game === category) || state.faze.videos[0];
}

export function homeExperience(state) {
  const user = state.user;
  const journey = status(state);
  const returning = journey.stage === 'returning';
  const gettingStarted = !user || journey.stage === 'new';
  const name = user?.name.split(' ')[0] || 'fan';
  const headline = returning ? ['WELCOME', 'BACK.'] : gettingStarted ? ['ENTER', 'FAZE REPLAY.'] : ['MAKE YOUR', 'NEXT PLAY.'];
  const lead = returning
    ? journey.comeback ? `It’s been ${journey.daysAway} days, ${name}. Your comeback bonus and a fresh set of missions are ready.` : `It’s been ${journey.daysAway} days, ${name}. Catch up with a new set of daily missions.`
    : gettingStarted ? 'Complete a mission, earn points, and bring a friend into the fan club.'
    : `Good to see you, ${name}. Pick up today’s missions or invite someone to join you.`;
  const primary = journey.comeback && eligible(state) ? action(`Claim +${journey.comeback} comeback points`, 'comeback', 'primary hero-main')
    : btn(gettingStarted ? 'Start walkthrough' : 'Play today’s missions', gettingStarted ? '#welcome' : '#missions', 'primary hero-main');
  const clip = recommendedClip(state);
  const video = state.config.heroVideo;
  const hasVideo = /^\/(?!\/)|^https:\/\//i.test(video);
  return `<div class="club-home">
    <div class="club-hero-grid">
      <section class="club-hero">
        <img class="club-hero-image" src="/art/stage.jpg" alt="" fetchpriority="high">
        ${hasVideo ? `<video class="club-hero-image club-hype-video" src="${e(video)}" preload="none" muted loop playsinline hidden></video><button class="btn quiet motion-clip" data-motion-clip aria-pressed="false">Play homepage reel</button>` : ''}
        <div class="hero-stage-copy">
          <p class="club-kicker">${returning ? 'RETURNING FAN' : user ? 'YOUR FAN DASHBOARD' : 'THE FAZE FAN HUB'}</p>
          <h1><span>${headline[0]}</span><span>${headline[1]}</span></h1>
          <p class="club-hero-lead">${e(lead)}</p>
          <div class="actions">${primary}<button class="btn hero-alt" data-play-clip="${e(clip?.id || '')}"><span aria-hidden="true">▶</span> Watch a highlight</button></div>
        </div>
      </section>
      ${dailyBoard(state)}
    </div>
    ${user ? `<section class="dashboard-strip" aria-label="Your fan stats">
      <div><span class="strip-label">POINTS BALANCE</span><strong>${n(user.balance)} <small>PTS</small></strong></div>
      <div><span class="strip-label">DAILY STREAK</span><strong>${n(journey.streak)} <small>${journey.streak === 1 ? 'DAY' : 'DAYS'}</small></strong></div>
      <div><span class="strip-label">FAN STATUS</span><strong class="strip-state">${e(stageLabels[journey.stage])}</strong></div>
      <button class="btn text-btn" data-why>Why this status?</button>
    </section>` : ''}
    <div class="dashboard-lower">
      <section class="club-invite-promo">
        <div><p class="club-kicker">INVITE A FRIEND</p><h2>Build your squad.</h2>
        <p>Earn <strong>${state.rewardRules.referral} points</strong> when a friend joins from your link and qualifies.</p>
        ${user ? `<button class="btn primary" data-copy="${e(inviteURL(user))}">Copy my invite link</button>` : btn('Get an invite link', '#welcome', 'primary')}
        ${user ? btn('View invites', '#invites', 'text-btn') : ''}</div>
      </section>
      <section class="club-watch">
        <div class="row"><div><p class="club-kicker">${e(clip?.game || 'FAZE CLASSICS')}</p><h2>${clip?.game ? 'Recommended for you' : 'From the FaZe archive'}</h2></div>${btn('More clips', '#news', 'text-btn')}</div>
        ${featureClip(clip)}
      </section>
    </div>
    ${returning && journey.rewind ? `<section class="mission-promo"><div><h2>Your Replay rewind</h2><p>${e(journey.rewind)}</p></div>${btn('Explore your history', '#news', 'quiet')}</section>` : ''}
  </div>`;
}

export function preferencesForm(state) {
  const chosen = new Set(status(state).preferences || []);
  return `<form class="preferences-form" data-action="favorite-games">
    <fieldset><legend>Choose up to three games</legend><div class="game-tiles">
      ${state.games.map(game => `<label class="game-tile"><input type="checkbox" name="games" value="${e(game)}"${chosen.has(game) ? ' checked' : ''}><span class="game-symbol" aria-hidden="true">${gameArt[game] || '•'}</span><span class="game-name">${e(game)}</span><span class="game-tick" aria-hidden="true">✓</span></label>`).join('')}
    </div></fieldset>
    <button class="btn primary" type="submit">Save my games <span aria-hidden="true">→</span></button>
  </form>`;
}

export function walkthroughExperience(state, invite, requestedStep) {
  const user = state.user;
  const journey = status(state);
  const steps = ['Join', 'Choose games', 'Earn points', 'Invite a friend'];
  const next = !user ? 0 : !journey.preferences.length ? 1 : !journey.starterDone ? 2 : 3;
  const current = user && requestedStep !== null ? Math.min(next, requestedStep) : next;
  const content = [
    () => `<h2>${invite ? 'You’re invited.' : 'Let’s get you in.'}</h2>
      <p>${invite ? 'Your friend’s invite will be attached when you create your account.' : 'Choose an account to save your games, missions, and points.'}</p>
      ${state.config.demo ? `<form class="join-form" data-action="demo">${hidden('invite', invite)}${hidden('walkthrough', '1')}<label>Your display name<input type="text" name="name" placeholder="Demo Player" maxlength="28" autocomplete="nickname"></label>
        <button class="btn primary" type="submit">Start with a demo account <span aria-hidden="true">→</span></button></form>` : ''}
      <div class="actions">${state.config.google ? btn('Continue with Google', `/auth/google?from=welcome&invite=${encodeURIComponent(invite)}`, 'quiet') : ''}
      ${btn('Sign in or create an account', '#account', 'text-btn')}</div>`,
    () => `<h2>Which games do you follow?</h2><p>Replay uses these picks until your match history shows what you play most.</p>${preferencesForm(state)}`,
    () => `<h2>Earn your first mission points.</h2>
      ${journey.starterDone ? `<div class="walk-wallet"><span class="done-label">✓ Mission complete</span><strong>${n(user.balance)} <small>POINTS</small></strong></div><p>${e(journey.starter.detail)}</p>`
        : `<p>FaZe’s first ILLCAMS upload was in <strong>2010</strong>. Answer the question to add ${state.rewardRules.archive} points to your wallet.</p>
        ${eligible(state) ? answerButtons(journey.starter, 'year', 'archive-quiz', `Claim ${state.rewardRules.archive} points`) : btn(signedInAction(state), '#account', 'primary')}`}`,
    () => `<h2>Bring someone with you.</h2>
      <div class="walk-wallet"><span>YOUR WALLET</span><strong>${n(user.balance)} <small>POINTS</small></strong></div>
      <p>Share your personal URL. When a friend joins and qualifies, ${state.rewardRules.referral} points land in your wallet.</p>
      <div class="actions"><button class="btn quiet" data-copy="${e(inviteURL(user))}">Copy my invite link</button>${action('Finish walkthrough', 'onboarding-done', 'primary')}</div>`
  ];
  return `<div class="walk-grid">
    <aside class="walk-cover"><div><p class="club-kicker">GET STARTED</p><strong>YOUR FIRST<br>PLAY.</strong></div></aside>
    <section class="walk-work panel">
      <nav class="walk-steps" aria-label="Walkthrough progress">${steps.map((step, i) => `<button type="button" data-walk-step="${i}" ${i === current ? 'aria-current="step"' : ''}${i > next || (!user && i !== 0) || user && i === 0 ? ' disabled' : ''}><span>${i < next ? '✓' : i + 1}</span>${e(step)}</button>`).join('')}</nav>
      <div class="walk-work-content">${content[current]()}</div>
      ${user && current < next ? `<button class="btn text-btn" data-walk-step="${next}">Continue walkthrough →</button>` : ''}
    </section>
  </div>`;
}

export function missionsExperience(state) {
  const user = state.user;
  const journey = status(state);
  const finished = journey.cards.filter(card => card.done).length;
  return `${title('Daily missions', 'Check in, test your FaZe knowledge, and make a meta pick. Missions refresh at 00:00 UTC.')}
    ${journey.comeback && eligible(state) ? `<div class="come-back"><div><p class="club-kicker">RETURNING FAN</p><h2>Claim your comeback</h2><p>${e(journey.reason)}</p></div>${action(`Claim ${journey.comeback} points`, 'comeback', 'primary')}</div>` : ''}
    <div class="missions-summary"><div><span>COMPLETED TODAY</span><strong>${finished} / ${canPick(state) || journey.cards[2].done ? 3 : 2}</strong></div><div><span>DAILY STREAK</span><strong>${n(journey.streak)} days</strong></div><div><span>POINTS TODAY</span><strong>${n(journey.cards.filter(card => card.done).reduce((sum, card) => sum + card.points, 0))} pts</strong></div></div>
    <div class="mission-tiles">${journey.cards.filter(card => card.id !== 'daily' || canPick(state) || card.done).map(card => `<article class="mission-tile panel" id="${card.id}" tabindex="-1">
      <header><span class="mission-icon" aria-hidden="true">${missionHelp[card.id][0]}</span>${points(card.points)}</header>
      <h2>${e(card.name)}</h2><p>${missionHelp[card.id][1]}</p>${missionControl(state, card, false)}
      ${card.done && card.id === 'trivia' ? `<p class="mission-note">${e(journey.quiz.detail)}</p>` : ''}
    </article>`).join('')}</div>
    ${user && !journey.starterDone ? `<div class="mission-promo"><div><h2>Your first bonus</h2><p>Take the ILLCAMS challenge for ${state.rewardRules.archive} points.</p></div>${btn('Start the challenge', '#welcome', 'primary')}</div>` : ''}
    <div class="mission-promo"><div><h2>Match points</h2><p>See how playtime and placement earn points in eligible matches.</p></div>${btn('Open my match activity', '#performance', 'quiet')}</div>`;
}

export function invitesExperience(state) {
  const user = state.user;
  const r = state.rewardRules;
  const invitees = user?.referrals || [];
  const approved = invitees.filter(entry => entry.status === 'approved').length;
  const pending = invitees.filter(entry => entry.status === 'pending').length;
  const link = user ? inviteURL(user) : '';
  return `<section class="invite-banner">
    <div><p class="club-kicker">REFERRAL PROGRAM</p><h1>BUILD YOUR SQUAD.</h1><p>Each qualifying friend earns you <strong>${r.referral} points</strong>. See who joined and when your points cleared.</p></div>
  </section>
  ${user ? `<section class="panel invite-work"><div><h2>Your invite link</h2>
    <p>${user.demo ? 'To try the full referral, open this link in a private browser window, start a new demo account, and complete a mission.' : 'Share this link with a friend so Replay can credit the referral when they qualify.'}</p>
    <div class="copy-field"><input readonly aria-label="Your invite link" value="${e(link)}"><button class="btn primary" data-copy="${e(link)}">Copy link</button></div></div>
    <div class="invite-counts"><div><strong>${approved}/${r.referralCap}</strong><span>APPROVED</span></div><div><strong>${pending}</strong><span>PENDING</span></div><div><strong>${approved * r.referral}</strong><span>POINTS EARNED</span></div></div>
  </section>` : `<section class="panel invite-work"><div><h2>Get your personal link</h2><p>It’s generated when you join Afterimage.</p></div>${btn('Start walkthrough', '#welcome', 'primary')}</section>`}
  <div class="invite-steps">
    <article><strong>1. Share</strong><p>Copy your link and send it to a friend.</p></article>
    <article><strong>2. They play</strong><p>${user?.demo || !user && state.config.demo ? 'A demo friend qualifies after their first mission.' : `Both fans verify their accounts. Your friend must play on ${r.referralTasks} different days and be signed up for ${r.minAge} days before review.`}</p></article>
    <article><strong>3. Earn points</strong><p>Your inbox shows the reward when the referral clears.</p></article>
  </div>
  ${user ? `<section class="panel invite-history"><div class="panel-head"><h2>Your referrals</h2></div>${invitees.length ? invitees.map(entry => {
    const detail = entry.status === 'approved' ? `${r.referral} points credited` : entry.status === 'pending' ? user.demo
      ? 'Awaiting their first mission' : `${Math.min(entry.tasks, r.referralTasks)}/${r.referralTasks} mission days · ${Math.min(entry.age, r.minAge)}/${r.minAge} account days` : 'Referral closed';
    return `<div class="invite-entry"><div><strong>${e(entry.name)}</strong><small>${detail}</small></div><span class="pill ${entry.status === 'approved' ? 'success-pill' : ''}">${e(entry.status)}</span></div>`;
  }).join('') : '<p class="empty">Share your link to start tracking invitations here.</p>'}</section>` : ''}`;
}

export function inboxExperience(state, showPreview) {
  const user = state.user;
  const items = user?.inbox.items || [];
  const notice = items.find(item => item.id.startsWith('return-')) || {
    title: `Your ${state.rewardRules.returning}-point comeback is ready`,
    message: 'Your daily missions are ready. Check in, answer the archive question, and see your points when you return.',
    route: '#missions'
  };
  const preview = showPreview ? `<article class="mail-preview"><p class="club-kicker">EMAIL PREVIEW</p><h3>FaZe Afterimage · ${e(notice.title)}</h3><p>${e(notice.message)}</p>${btn('Open missions', notice.route, 'primary')}<p class="dim">Unsubscribe from email updates at any time.</p></article>` : '';
  return `${title('Inbox', 'See who joined your squad, what you earned, and when there’s a reason to come back.')}
  ${!user ? `<section class="panel invite-work"><p>Your inbox is part of your fan profile.</p>${btn('Open an account', '#account', 'primary')}</section>`
    : `<div class="inbox-grid">
    <section class="panel"><div class="panel-head"><h2>Notifications</h2>${user.inbox.unread ? action('Mark all read', 'read-all', 'quiet') : '<span class="dim">All caught up</span>'}</div>
      ${items.length ? items.map(item => `<article class="inbox-notice ${item.readAt ? '' : 'unread'}"><div><h3>${e(item.title)}</h3><p>${e(item.message)}</p><small>${e(new Date(item.at).toLocaleString())}${item.sentAt ? ' · Emailed' : ''}</small></div>
        <a class="btn quiet" data-read-notice="${e(item.id)}" href="${e(item.route)}">Open <span aria-hidden="true">↗</span></a></article>`).join('') : '<p class="empty">Your updates will appear here.</p>'}
    </section>
    <section class="panel"><div class="panel-head"><h2>Email updates</h2></div><div class="pad flow">
      <p>Get a comeback reminder after time away, plus news when a referral or pro review earns points.</p>
      ${user.demo ? '<p class="dim">Email preview is available in demo mode.</p>'
        : user.verified ? `<p class="dim">${state.config.email ? 'Email delivery is connected.' : 'Email delivery is awaiting server setup.'}</p>
          <button class="btn quiet" data-post="email-preference" data-enabled="${!user.inbox.emailEnabled}">${user.inbox.emailEnabled ? 'Turn email updates off' : 'Turn email updates on'}</button>`
        : btn(signedInAction(state), '#account', 'quiet')}
      <button class="btn quiet" data-email-preview aria-expanded="${showPreview}">${showPreview ? 'Hide email preview' : 'Preview a comeback email'}</button>
      ${preview}
    </div></section>
  </div>`}`;
}

export function renderStatus(user) {
  const journey = user.journey;
  return `<h2 id="welcome-title">Your fan status</h2><p>${e(stageLabels[journey.stage])} · ${e(journey.reason)}</p>
    <dl class="status-rules">
      <div><dt>New</dt><dd>You’re still working toward your first recorded activity.</dd></div>
      <div><dt>Active</dt><dd>You’ve completed an activity and your last one was less than seven days ago.</dd></div>
      <div><dt>Returning</dt><dd>At least seven days have passed since your last mission, match, review submission, or redemption.</dd></div>
    </dl>
    <p>${journey.primaryGame ? `Your main game is ${e(journey.primaryGame)}. Replay uses your recent playtime when available, then your saved game picks.` : 'Pick your games in the walkthrough to personalize your dashboard.'}</p>`;
}

import { e, n, inboxExperience, preferencesForm, renderStatus, walkthroughExperience } from '/experience.js';

const main = document.querySelector('#legacy-main');
const notice = document.querySelector('#notice');
const invitation = () => new URLSearchParams(location.search).get('invite') || '';
const pages = {
  welcome: () => walkthroughExperience(data, invitation(), walkStep), ask, tracks, patches,
  inbox: () => inboxExperience(data, emailPreview),
  watch: newsPage, leaderboard, receipts: rewards, account, performance
};
let data, noticeTimer;
let game = 'All games', league = 'All leagues', patchId = '', history = [], authMode = 'signup';
let activity = { clips: [], days: [] }, trackStatus, clipFilter = 'week';
let chat = [];
let walkStep = null;
let emailPreview = false;
const welcomeDialog = document.querySelector('#welcome-dialog');
const clipDialog = document.querySelector('#clip-dialog');
const attempts = new Map();
let matchAttempt;
const web = value => /^https:\/\//i.test(value || '') ? e(value) : '';
const locationParts = () => location.hash.slice(1).split('/');
const route = () => Object.hasOwn(pages, locationParts()[0]) ? locationParts()[0] : '';
const selectedPatch = () => data.patches.find(item => item.id === patchId)
  || data.patches.find(item => Boolean(item.sample) === Boolean(data.user?.demo)) || data.patches[0];
const section = (title, body, extra = '', id = '') => `<section class="panel"${id ? ` id="${e(id)}" tabindex="-1"` : ''}><div class="panel-head"><h2>${e(title)}</h2>${extra}</div>${body}</section>`;
const intro = (title, lead) => `<div class="page-title"><h1>${e(title)}</h1><p>${e(lead)}</p></div>`;
const options = items => items.map(item => `<option value="${e(item)}">${e(item)}</option>`).join('');
const form = (action, content, button) => `<form data-action="${e(action)}">${content}<button class="btn primary">${e(button)}</button></form>`;
const hidden = (name, value) => `<input type="hidden" name="${e(name)}" value="${e(value)}">`;
const input = (label, name, type = 'text', attrs = '') => `<label>${e(label)}<input name="${e(name)}" type="${e(type)}" ${attrs} required></label>`;
const select = (label, name, items) => `<label>${e(label)}<select name="${e(name)}">${options(items)}</select></label>`;
const textArea = (label, name, max) => `<label>${e(label)}<textarea name="${e(name)}" maxlength="${max}" required></textarea></label>`;
const empty = message => `<p class="empty">${e(message)}</p>`;
const pill = (message, color = '') => `<span class="pill ${e(color)}">${e(message)}</span>`;
const authLink = () => '<a class="btn" href="#account">Sign in <span aria-hidden="true">↗</span></a>';

function flash(message, error = false) {
  notice.textContent = message;
  notice.className = error ? 'error' : '';
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 6300);
}

async function request(path, fields) {
  const response = await fetch(path, fields ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields)
  } : undefined);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

async function refresh() {
  const page = route();
  if (page === 'watch') clipFilter = ({ 'all-time': 'total', og: 'og' })[locationParts()[1]] || 'week';
  const getActivity = ['watch', 'tracks'].includes(page);
  const [state, existingActivity] = await Promise.all([request('/api/state'), getActivity ? request('/api/activity') : activity]);
  data = state;
  activity = existingActivity;
  const patch = selectedPatch();
  if (page === 'patches' && patch) {
    history = await request(`/api/history?patch=${encodeURIComponent(patch.id)}`);
  }
}

function rankings(patch, limit) {
  if (!patch) return empty('No patch rankings have been published.');
  const rows = patch.rankings.slice(0, limit);
  return `<div class="scroll"><table><thead><tr><th>Rank</th><th>Weapon</th><th>Tier</th><th>Move</th><th>Intel</th></tr></thead><tbody>
    ${rows.map((row, i) => `<tr><td class="mono dim">${String(i + 1).padStart(2, '0')}</td><td><strong>${e(row.name)}</strong></td>
    <td>${pill(row.tier, 'tier-' + row.tier.toLowerCase())}</td><td><span class="delta ${e(row.delta)}">${({ up: '↑', down: '↓', flat: '—', new: '•' })[row.delta]}</span></td>
    <td class="reason">${e(row.reviewReason || row.reason)}${row.aiTier ? ` <small>AI tier ${e(row.aiTier)}</small>` : ''}</td></tr>`).join('')}
    </tbody></table></div>`;
}

const offsite = (url, label, classes = '') => `<a class="${e(classes)}" href="${web(url)}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`;
const clipTile = (clip, count) => `<article class="media-tile"><button data-play-clip="${e(clip.id)}" class="thumb" aria-label="Play ${e(clip.title)}"><img src="${web(clip.image)}" alt="" loading="lazy"><span aria-hidden="true">▶</span></button><div class="media-copy"><p class="eyebrow">${e(clip.channel)} / ${e(clip.year)}</p><h3>${e(clip.title)}</h3>${count !== undefined ? `<p class="dim">${n(count)} opens in Clan</p>` : ''}<button class="btn quiet" data-play-clip="${e(clip.id)}">Play highlight</button></div></article>`;
const clipCount = (clip, window) => activity.clips.find(row => row.subject === clip.id)?.[window] || 0;
function rankedClips(window) {
  const clips = data.faze.videos.slice();
  return window === 'og' ? clips.filter(clip => clip.year <= 2013).sort((a, b) => a.year - b.year)
    : clips.sort((a, b) => clipCount(b, window) - clipCount(a, window));
}

function patchWorkspace(patch) {
  if (!patch) return empty('Choose a patch to review.');
  const user = data.user;
  const canReview = user?.reviewer && Boolean(patch.sample) === user.demo;
  return `<div class="patch-intro"><div class="eyebrow">${e(patch.game)} / ${e(patch.version)}</div><h2>${e(patch.summary)}</h2>
    <div class="actions">${pill(`${patch.sample ? 'Sample · ' : ''}${patch.reviews.some(item => item.status === 'accepted') ? 'Pro reviewed' : patch.sample ? 'Draft' : 'Gemini draft'}`, 'lime')}<a href="${web(patch.url)}" target="_blank" rel="noopener noreferrer">Publisher notes ↗</a></div></div>
    ${section('Weapon tier list', rankings(patch))}
    ${section('Patch notes', `<p class="pad prose">${e(patch.notes)}</p>`)}
    ${section('Pro reviews', `<div class="pad flow">
    <p class="dim">Reviewers submit a tier and playtest evidence. Accepted reviews can update the weapon ranking and earn points.</p>
    ${patch.reviews.length ? patch.reviews.map(review => `<article class="review"><div><strong>${e(review.weapon)} → ${e(review.tier)}</strong> <span class="dim">· ${e(review.name)}</span></div><p>${e(review.reason)}</p>${pill(review.status)}
    ${user?.operator && Boolean(patch.sample) === user.demo && review.status === 'pending' && (user.demo || review.user !== user.id) ?
      `<div class="actions"><button class="btn primary" data-post="approve-review" data-patch="${e(patch.id)}" data-id="${e(review.id)}" data-approve="true">Accept ranking</button><button class="btn" data-post="approve-review" data-patch="${e(patch.id)}" data-id="${e(review.id)}">Decline</button></div>` : ''}</article>`).join('') : empty('No creator surveys yet.')}
    ${canReview && !patch.reviews.some(review => review.user === user.id) ?
      form('review', hidden('patch', patch.id) + select('Weapon', 'weapon', patch.rankings.map(row => row.name)) + select('Proposed tier', 'tier', ['S', 'A', 'B', 'C', 'D']) + textArea('Your playtest observations', 'reason', 300), 'Submit survey') : ''}
    ${!canReview && user?.demo ? '<div><a class="btn" href="/#fanlab">Try the Pro Streamer profile in Fan Lab ↗</a></div>' : ''}
    </div>`, pill(`Eligible survey +${data.rewardRules.review} pts`, 'lime'), 'pro-reviews')}
    ${section('Ranking history', history.length ? `<div class="pad flow">${history.map(event => `<div class="row"><strong>${e(event.phase === 'ai-draft' ? 'Gemini draft' : 'Creator review')}</strong><span>${e(new Date(event.observed_at).toLocaleString())}</span><span>${event.rankings.length} ranked</span></div>`).join('')}</div>` : empty('Ranking revisions will appear here.'), pill(data.config.database))}
  `;
}

function patches() {
  const patch = selectedPatch();
  return intro('Patch Intel', 'Weapon rankings, publisher notes and creator playtest surveys.') +
    (data.patches.length ? `<div class="actions tabs">${data.patches.map(item => `<button class="btn ${item.id === patch?.id ? 'selected' : ''}" data-patch-select="${e(item.id)}">${e(item.game)} · ${e(item.version)}</button>`).join('')}</div>` : '') +
    patchWorkspace(patch) + (data.user?.operator && !data.user.demo ? section('Import a publisher patch', `<div class="pad">${form('analyze', select('Game', 'game', data.games) + input('Patch version', 'version', 'text', 'maxlength="48"') + input('Official patch URL', 'url', 'url') + textArea('Weapon roster, comma or newline separated', 'roster', 9000) + textArea('Official patch notes', 'notes', 24000), 'Analyze with Gemini')}</div>`, pill(data.config.gemini ? 'Gemini available' : 'Gemini setup required')) : '');
}

function newsPage() {
  const clipButtons = [['week', 'This week'], ['total', 'All time'], ['og', 'OG archive']];
  const patches = data.patches.filter(item => !item.sample);
  const updates = patches.length ? patches.slice(0, 3) : data.patches.filter(item => item.sample).slice(0, 1);
  return intro('Watch & news', 'Watch FaZe uploads and follow the publishers behind the games.') +
    section('FaZe video archive', `<div class="pad flow"><div class="actions">${clipButtons.map(([id,label]) => `<button class="btn ${clipFilter === id ? 'selected' : ''}" aria-pressed="${clipFilter === id}" data-clip-filter="${id}">${label}</button>`).join('')}</div><p class="dim">${clipFilter === 'og' ? 'Original uploads from the early trickshot years.' : `Ranked by unique clip opens in Clan ${clipFilter === 'week' ? 'over the last seven days' : 'since tracking began'}.${data.config.demo ? ' Includes demo activity.' : ''}`}</p><div class="tile-grid">${rankedClips(clipFilter).map(clip => clipTile(clip, clipFilter === 'og' ? undefined : clipCount(clip, clipFilter))).join('')}</div></div>`, offsite(data.faze.channel, 'FaZe on YouTube', 'subtle')) +
    (updates.length ? section(patches.length ? 'Recent patch coverage' : 'Try patch intel', `<div class="pad tile-grid">${updates.map(item => `<article class="tile team-tile"><p class="eyebrow">${e(item.version)}</p><h3>${e(item.game)}</h3><p>${e(item.summary)}</p><div><button class="btn quiet" data-patch-open="${e(item.id)}">Read analysis</button></div></article>`).join('')}</div>`) : '') +
    section('Publisher feeds', `<div class="pad tile-grid">${data.news.map(item => `<a class="tile news-tile" href="${web(item.url)}" target="_blank" rel="noopener noreferrer">${pill(item.name)}<h3>${e(item.title)} ↗</h3><p>${e(item.kind)} updates</p></a>`).join('')}</div>`, '', 'publishers') +
    (data.clips.length ? section('Trending clips', `<div class="pad tile-grid">${data.clips.map(clip => `<a class="tile news-tile" href="${web(clip.url)}" target="_blank" rel="noopener noreferrer">${pill(clip.game)}<h3>${e(clip.title)} ↗</h3><p>${e(clip.creator)}</p></a>`).join('')}</div>`) : '') +
    (data.user?.journey.rewind ? section('Your match rewind', `<div class="pad flow"><p>${e(data.user.journey.rewind)}</p>${data.user.rewindVideo ? '<video controls preload="metadata" src="/rewind-video"></video>' : ''}<a class="subtle" href="#performance">See your match history ↗</a></div>`) : '');
}

function merchImage(item) {
  return `<div class="merch-image"><img src="${web(item.image)}" alt="${e(item.name)}" loading="lazy"></div>`;
}

function assistantSource(source) {
  const clip = data.faze.videos.find(clip => clip.url === source.url);
  if (clip) return `<button class="btn quiet" data-play-clip="${e(clip.id)}">Play ${e(clip.title)}</button>`;
  return source.url.startsWith('#') || source.url.startsWith('/') ? `<a class="subtle" href="${e(source.url)}">${e(source.label)} ↗</a>` : offsite(source.url, source.label, 'subtle');
}

function ask() {
  const questions = ['What should I do today?', 'Why am I a returning fan?', 'When do I get my invite points?', 'Why is MP9 in its tier?', 'How do I submit a pro review?'];
  return intro('Ask Clan', 'Get a recommendation from your activity, work out your points, or ask about a pro review.') +
    section('Fan assistant', `<div class="pad assistant-layout"><div class="actions prompts">${questions.map(question => `<button class="btn" data-question="${e(question)}">${e(question)}</button>`).join('')}</div>
      <div class="chat" aria-live="polite">${chat.length ? chat.map(turn => `<article class="chat-turn"><p class="chat-user"><strong>You</strong> · ${e(turn.question)}</p><div class="chat-answer"><span class="eyebrow">${e(turn.mode?.replace('Clan guide','Clan guide') || 'Clan')}</span><p class="prose">${e(turn.answer || 'Looking up your question…')}</p>${turn.status ? `<p class="dim">${e(turn.status)}</p>` : ''}<div class="actions">${turn.action === 'check-in' && !data.user?.journey.cards[0].done ? '<button class="btn primary" data-post="check-in">Claim check-in points</button>' : ''}${turn.action === 'comeback' && data.user?.journey.comeback ? '<button class="btn primary" data-post="comeback">Claim comeback points</button>' : ''}${(turn.sources || []).map(assistantSource).join('')}</div></div></article>`).join('') : '<p class="dim">Pick a question above or ask your own.</p>'}</div>
      ${form('ask', input('Your question', 'question', 'text', 'maxlength="500" placeholder="What’s trending this week?"'), 'Ask Clan')}
    </div>`, pill(data.config.gemini ? 'Gemini configured' : 'Database guide'));
}

function wallet(user) {
  return `<div class="wallet-summary"><div><span>Available</span><strong>${n(user.balance)} pts</strong></div><div><span>Credited</span><strong>${n(user.earned)} pts</strong></div><div><span>Redeemed</span><strong>${n(user.spent)} pts</strong></div></div>`;
}

function pointsHistory(user) {
  return user.ledger.length ? `<div class="pad flow ledger-list">${[...user.ledger].reverse().map(item => `<div class="row"><div><strong>${e(item.label)}</strong><p class="dim">${e(item.at.slice(0, 10))}</p></div><span class="mono ${item.points > 0 ? 'lime-text' : ''}">${item.points > 0 ? '+' : ''}${n(item.points)} pts</span></div>`).join('')}</div>` : empty('Your earned and redeemed points will appear here.');
}

function profileGames(profile) {
  if (!profile.games.length) return empty('Game time, performance, and placements appear after your first recorded match.');
  return `<div class="profile-games">${profile.games.map(game => `<article class="profile-game">
    <div class="row"><h3>${e(game.game)}</h3>${pill(game.level, 'lime')}</div>
    <div class="profile-metrics">
      <div><span>Played</span><strong>${n(game.minutes)} min</strong><small>${game.matches} matches</small></div>
      <div><span>Avg. placement score</span><strong>${game.performance}/100</strong><small>${game.wins} wins</small></div>
      <div><span>Best finish</span><strong>${game.best.placement} / ${game.best.fieldSize}</strong><small>${game.rank ? `Clan rank #${game.rank} of ${game.rankedFans}` : `Rank after ${data.matchRules.rankedMatches} matches`}</small></div>
    </div>
  </article>`).join('')}</div>`;
}

function recentMatches(profile) {
  if (!profile.recent.length) return empty('No matches recorded.');
  return `<div class="scroll"><table><thead><tr><th>Game</th><th>Time</th><th>Place</th><th>Points</th><th>Record</th></tr></thead><tbody>${profile.recent.map(match => `<tr>
    <td><strong>${e(match.game)}</strong><br><small>${e(match.at.slice(0, 10))}</small></td><td>${match.minutes} min</td><td>${match.placement} of ${match.fieldSize}</td>
    <td>${n(match.credit?.awarded)} pts${match.credit ? `<br><small>${match.credit.time} time + ${match.credit.placement} placement before caps</small>` : ''}</td>
    <td>${e(match.source === 'verified' ? 'Trusted feed' : match.source === 'demo' ? 'Demo match' : 'Sample match')}</td>
  </tr>`).join('')}</tbody></table></div>`;
}

function performance() {
  const user = data.user;
  const r = data.matchRules;
  if (!user) return intro('My match activity', 'See your time played, best finishes, and points by game.') +
    section('Open your profile', `<div class="pad actions">${authLink()}${data.config.demo ? '<button class="btn primary" data-post="demo">Try match tracking</button>' : ''}</div>`);
  const mainGame = user.performance.games[0]?.game;
  const orderedGames = mainGame ? [mainGame, ...data.games.filter(game => game !== mainGame)] : data.games;
  const demoMatch = user.demo ? section('Record a demo match', `<div class="pad flow">
    ${form('demo-match', select('Game', 'game', orderedGames) +
      `<div class="match-fields">${input('Minutes played', 'minutes', 'number', 'min="1" max="360" value="35"')}
      ${input('Finishing position', 'placement', 'number', 'min="1" max="256" value="3"')}
      ${input('Players or teams in the field', 'fieldSize', 'number', 'min="2" max="256" value="20"')}</div>`, 'Record demo match')}
    </div>`) : section('Link a game', `<div class="pad flow"><p>Save your game handle in Account. Results appear when Clan receives them from a trusted match feed.</p><div><a class="btn" href="#account">Open account ↗</a></div></div>`);
  return intro('My match activity', `Your last ${r.recentDays} days of play, with the score and points behind each result.`) +
    `<div class="next-play"><div><p class="eyebrow">${e(user.category.name)}${mainGame ? ` · ${e(mainGame)}` : ''}</p><strong>${e(user.category.explanation)}</strong></div><a class="btn" href="#rewards">Open wallet ↗</a></div>` +
    section('Game profile', profileGames(user.performance)) +
    demoMatch +
    section('How match points work', `<div class="pad flow"><p>Earn 1 point per ${r.minutesPerPoint} minutes, up to ${r.timeCap}. First place adds ${r.placementCap} points, last adds zero, and finishes in between scale with field size.</p><p>The cap is ${r.dailyCap} match points per UTC day. Eligible results need at least ${r.minimumMinutes} minutes and must be recorded within ${r.rewardWindowDays} days.</p></div>`) +
    section('Recent matches', recentMatches(user.performance));
}

function tracks() {
  const status = trackStatus;
  const rows = [
    {
      name: 'Google Gemini', label: data.config.gemini ? 'API key configured' : 'API key needed',
      task: 'Ask why MP9 has its tier. Clan retrieves the weapon record, then Gemini explains it and links you back to the evidence.',
      setup: 'Set GEMINI_API_KEY on the server and restart. Try the question again and look for Gemini above the answer. Clan guide labels the available answer when Gemini is disconnected.',
      action: '<button class="btn" data-track-question>Try a Gemini question ↗</button>'
    },
    {
      name: 'Solana', label: status?.solana.slot ? `Finalized slot ${n(status.solana.slot)}` : status ? 'RPC could not be reached' : 'Checking Devnet…',
      task: 'Redeem an Intel Pass in the demo and open its receipt. The memo identifies your redemption.',
      setup: 'An operator with a funded Devnet signer runs npm run receipt -- <memo>. Paste the finalized signature into your receipt to check it and open it in Solana Explorer.',
      action: '<a class="btn" href="#rewards/points-shop">Try a demo redemption ↗</a><a class="subtle" href="#receipts">My receipts ↗</a>'
    },
    {
      name: 'Tiger Data', label: status?.database.engine === 'Tiger Data' && status.database.available ? 'Tiger Data connected' : data.config.database === 'SQLite' ? 'SQLite demo' : 'Checking database…',
      task: 'Record a demo match, then come back to see the points credited in the seven-day table. The clip rankings query the same activity stream.',
      setup: 'Set DATABASE_URL to a Tiger Cloud database with TimescaleDB, then restart. This page should show Tiger Data connected.',
      action: '<a class="btn" href="#performance">Try recording a match ↗</a><a class="subtle" href="#tracks/activity-data">See the activity table ↗</a>'
    },
    {
      name: 'Vultr', label: status?.vultr.instance ? `${status.vultr.instance.region.toUpperCase()} · ${status.vultr.instance.power}` : status?.vultr.configured ? 'Instance check failed' : 'Local preview',
      task: 'Open app health to see whether Clan and its database are responding. On a Vultr deployment, open that same check from the public site.',
      setup: 'Set PUBLIC_ORIGIN and run Docker Compose on a Vultr Cloud Compute instance. VULTR_API_KEY and VULTR_INSTANCE_ID enable the instance check here.',
      action: '<a class="btn" href="/health" target="_blank" rel="noopener">Open app health ↗</a>'
    }
  ];
  return intro('MLH track walkthrough', 'Each track has a task to try and a status you can check.') +
    `<div class="track-grid track-guide">${rows.map(({ name, task, label, setup, action }) => `<article class="track-card"><div class="row"><h2>${e(name)}</h2>${pill(label)}</div><p>${e(task)}</p><div class="actions">${action}</div><details><summary>Operator setup</summary><p>${e(setup)}</p></details></article>`).join('')}</div>` +
    section('Last seven days of activity', activity.days.length ? `<div class="pad scroll"><table><thead><tr><th>UTC date</th><th>Clip opens</th><th>Points credited</th><th>Points spent</th></tr></thead><tbody>${activity.days.map(row => `<tr><td>${e(row.day)}</td><td>${n(row.opens)}</td><td>${n(row.earned)}</td><td>${n(row.spent)}</td></tr>`).join('')}</tbody></table></div>` : empty('Activity will appear here after the first clip opens or point events.'), pill(data.config.demo ? 'Includes synthetic activity' : 'App activity'), 'activity-data') +
    '<div><button class="btn" data-check-tracks>Check connections</button></div>';
}

function shop() {
  return intro('Official FaZe gear', 'Browse FaZe merchandise. The store shows current availability, prices, and shipping.') +
    section('From the FaZe store', `<div class="pad tile-grid">${data.faze.merch.map(item => `<article class="media-tile">${merchImage(item)}<div class="media-copy"><h3>${e(item.name)}</h3>${offsite(item.url, 'View official listing', 'btn')}</div></article>`).join('')}</div>`, offsite(data.faze.shop, 'Full store', 'subtle'));
}

function filterControls(withLeague) {
  const leagues = [...new Set(data.standings.map(item => item.league).filter(Boolean))];
  return `<div class="actions filters"><label>Game<select data-filter="game">${options(['All games', ...data.games])}</select></label>
  ${withLeague ? `<label>League<select data-filter="league">${options(['All leagues', ...leagues])}</select></label>` : ''}</div>`;
}

function leaderboard() {
  const items = data.standings.filter(item => (game === 'All games' || item.game === game) && (league === 'All leagues' || item.league === league)).sort((a, b) => b.score - a.score);
  return intro('Tournament results', 'Selected FaZe placements with links to the original coverage.') +
    section('FaZe championship record', `<div class="scroll"><table><thead><tr><th>Year</th><th>Game</th><th>Event</th><th>Place</th></tr></thead><tbody>${data.faze.results.map(row => `<tr><td class="mono">${row.year}</td><td>${e(row.game)}</td><td>${offsite(row.source, row.event)}</td><td>${pill(row.place, 'lime')}</td></tr>`).join('')}</tbody></table></div>`, offsite(data.faze.team, 'More tournament history', 'subtle')) +
    (data.standings.length ? filterControls(true) + section('Community league standings', items.length ? `<div class="scroll"><table><thead><tr><th>Rank</th><th>Creator</th><th>Game</th><th>League</th><th>Score</th></tr></thead><tbody>
    ${items.map((item, index) => `<tr><td class="mono">${String(index + 1).padStart(2, '0')}</td><td><strong>${e(item.name)}</strong></td><td>${e(item.game)}</td><td>${e(item.league)}</td><td class="mono lime-text">${n(item.score)}</td></tr>`).join('')}
    </tbody></table></div>` : empty('No published results match these filters.')) : '');
}

function rewards() {
  const user = data.user;
  return intro('Redemptions and receipts', 'View your unlocked rewards and verify eligible Solana receipts.') +
    '<div class="actions"><a class="btn" href="#rewards/redeem">Back to Rewards</a></div>' +
    (user?.member ? section('Intel Pass', `<div class="pad flow"><p class="prose">${e(user.memberIntel || 'Member loadout intel is awaiting publication.')}</p>${data.config.memberVideo ? '<a class="btn" href="/member-video">Watch member video ↗</a>' : '<p class="dim">Member videos are awaiting publication.</p>'}</div>`, pill('Active', 'lime')) : '') +
    section('Redemptions & receipts', user?.sponsoredOrders.length ? `<div class="pad flow">${user.sponsoredOrders.map(order => `<article class="review"><div class="row"><strong>${e(order.name)}</strong>${pill(user.demo && order.product !== 'pass' ? 'Sample reservation' : order.status)}</div>
    ${order.signature ? `<a href="https://explorer.solana.com/tx/${encodeURIComponent(order.signature)}?cluster=devnet" target="_blank" rel="noopener noreferrer">View finalized receipt ↗</a>` : order.memo ?
      `<p>Solana receipt · ${data.config.receiptAuthority ? 'Awaiting signature' : 'Awaiting operator signing setup'}</p><code class="break">${e(order.memo)}</code>${data.config.receiptAuthority ? form('receipt', hidden('id', order.id) + input('Finalized transaction signature', 'signature', 'text', 'maxlength="90"'), 'Verify Solana receipt') : ''}` : '<p class="dim">Historical sample redemption</p>'}</article>`).join('')}</div>` : user ? empty('Your redemptions will appear here.') : '<div class="pad"><a class="btn" href="#account">Sign in to view redemptions</a></div>', '', 'receipts');
}

function account() {
  const user = data.user;
  const invite = new URLSearchParams(location.search).get('invite') || '';
  const google = `/auth/google?invite=${encodeURIComponent(invite)}`;
  if (!user) return intro('Join FaZe Clan', 'Create your fan profile to join challenges and earn rewards.') +
    section(authMode === 'signup' ? 'Create your account' : 'Sign in', `<div class="pad flow auth-form">
      <div class="actions"><button class="btn ${authMode === 'signup' ? 'selected' : ''}" data-auth="signup">Create account</button><button class="btn ${authMode === 'login' ? 'selected' : ''}" data-auth="login">Sign in</button></div>
      ${form(authMode, (authMode === 'signup' ? input('Display name', 'name', 'text', 'maxlength="40"') : '') + input('Email', 'email', 'email', 'autocomplete="email" maxlength="254"') +
      input('Password', 'password', 'password', `autocomplete="${authMode === 'signup' ? 'new-password' : 'current-password'}" minlength="10" maxlength="128"`) +
      (authMode === 'signup' ? `<label>Invite code <span class="dim">(optional)</span><input name="invite" maxlength="20" value="${e(invite)}"></label>` : ''), authMode === 'signup' ? 'Create account' : 'Sign in')}
      <div class="actions">${data.config.google ? `<a class="btn" href="${google}">Continue with Google ↗</a>` : ''}${data.config.demo ? '<button class="btn" data-post="demo">Try a demo account</button>' : ''}</div>
    </div>`);
  return intro(user.name, `${n(user.balance)} points available · ${user.demo ? 'Demo account' : 'Fan account'}`) +
    `<div class="next-play"><div><p class="eyebrow">${e(user.category.name)}</p><strong>${e(user.journey.reason)}</strong></div><div class="actions"><button class="btn" data-why>Why this status?</button><a class="btn" href="#performance">My match activity ↗</a></div></div>` +
    `<div class="actions">${user.canUseFanLab ? '<a class="btn primary" href="/#fanlab">Explore four demo accounts in Fan Lab ↗</a>' : ''}${user.previewing ? '<button class="btn quiet" data-post="exit-preview">Return to my demo account</button>' : ''}<a class="btn" href="#welcome">Replay the walkthrough</a><a class="btn quiet" href="#inbox">Email & notifications</a></div>` +
    section('Favorite games', `<div class="pad">${preferencesForm(data)}</div>`) +
    (user.surveyInvites.length ? section('Patch survey invitations', `<div class="pad flow">${user.surveyInvites.map(invite => `<div class="row"><strong>${e(invite.game)} · ${e(invite.version)}</strong><button class="btn" data-survey="${e(invite.id)}">Review patch</button></div>`).join('')}</div>`) : '') +
    section('Connected accounts', `<div class="pad flow">
      <div class="row"><strong>Google</strong>${user.verified ? pill('Verified', 'lime') : data.config.google && !user.demo ? `<a class="btn" href="${google}">Connect Google ↗</a>` : pill('Setup required')}</div>
      <div class="row"><strong>YouTube</strong>${user.youtube ? pill(user.youtube.name, 'lime') : data.config.google && user.verified ? '<a class="btn" href="/auth/google?link=youtube">Connect YouTube ↗</a>' : pill('Google verification required')}</div>
      ${Object.entries(user.links).map(([title, link]) => `<div class="row"><strong>${e(title)}</strong><span>${e(link.handle)}</span>${pill('Self-reported')}</div>`).join('')}
      ${form('game-link', select('Game', 'game', data.games) + input('In-game handle', 'handle', 'text', 'maxlength="64"'), 'Save game profile')}
    </div>`, user.demo ? pill('Demo account') : '') +
    (user.youtube && user.reviewer ? section('Creator gallery profile', `<div class="pad">${form('creator-profile', select('Primary game', 'game', data.games) + input('Specialty', 'specialty', 'text', 'maxlength="45"') + textArea('Creator bio', 'description', 280), 'Publish profile')}</div>`) : '') +
    (user.operator && !user.demo ? section('Pending referral review', user.reviewQueue.length ? `<div class="pad flow">${user.reviewQueue.map(row => `<article class="review"><strong>${e(row.name)}</strong><p>${row.age} days old · ${row.tasks} challenges · ${row.verified ? 'Google verified' : 'Google verification pending'}</p><div class="actions"><button class="btn primary" data-post="referral" data-id="${e(row.id)}" data-approve="true">Approve</button><button class="btn" data-post="referral" data-id="${e(row.id)}">Decline</button></div></article>`).join('')}</div>` : empty('No referrals are awaiting review.')) : '') +
    '<button class="btn" data-post="logout">Sign out</button>';
}

function render() {
  const active = route();
  window.dispatchEvent(new CustomEvent('clan:state', { detail: data }));
  if (!active || !main) return;
  main.innerHTML = pages[active]();
  for (const control of main.querySelectorAll('[data-filter]')) control.value = control.dataset.filter === 'game' ? game : league;

}

function showWelcome(returning = false) {
  if (!data) return;
  const user = data.user;
  const r = data.rewardRules;
  const heading = returning ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Welcome to FaZe Clan.';
  const progress = returning ? user.journey.reason : 'Play daily missions and see each credit arrive in your points wallet.';
  const cta = returning
    ? `<a class="btn primary" data-welcome-close href="#rewards/earn">${user.journey.comeback ? `See your +${user.journey.comeback} comeback bonus` : 'See today’s missions'} <span aria-hidden="true">→</span></a>`
    : '<a class="btn primary" data-welcome-close href="#welcome">Start the walkthrough <span aria-hidden="true">→</span></a>';
  welcomeDialog.innerHTML = `<div class="welcome-modal">
    <button class="btn welcome-close" data-welcome-close autofocus aria-label="Close welcome">×</button>
    <p class="club-kicker">${returning ? 'RETURNING FAN' : 'HOW CLAN WORKS'}</p>
    <h2 id="welcome-title">${e(heading)}</h2>
    <p>${e(progress)}</p>
    <div class="welcome-actions">
      <a class="welcome-item" data-welcome-close href="#rewards/earn"><strong>Daily missions</strong><span>Check in for ${r.checkIn} points and play archive trivia for ${r.trivia} points.</span></a>
      <a class="welcome-item" data-welcome-close href="#rewards/redeem"><strong>Invite a friend</strong><span>Earn ${r.referral} points when someone joins from your link and qualifies.</span></a>
      <a class="welcome-item" data-welcome-close href="#patches/pro-reviews"><strong>Pro reviews</strong><span>Creator playtests can change a weapon ranking. Eligible accepted reviews earn ${r.review} points.</span></a>
    </div>
    ${cta}
    </div>`;
  if (!welcomeDialog.open) welcomeDialog.showModal();
}

function showStatus() {
  if (!data.user) return;
  welcomeDialog.innerHTML = `<div class="welcome-modal"><button class="btn welcome-close" data-welcome-close autofocus aria-label="Close fan status">×</button>${renderStatus(data.user)}</div>`;
  if (!welcomeDialog.open) welcomeDialog.showModal();
}

function playClip(id) {
  const clip = data.faze.videos.find(item => item.id === id);
  if (!clip) return;
  clipDialog.innerHTML = `<div class="clip-head"><div><p class="club-kicker">${e(clip.channel)} · ${e(clip.year)}</p><h2 id="clip-title">${e(clip.title)}</h2></div><button class="btn quiet" data-close-clip autofocus aria-label="Close video">×</button></div>
    <iframe title="${e(clip.title)}" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(clip.id)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    <div class="clip-foot">${offsite(clip.url, 'Open original on YouTube', 'subtle')}</div>`;
  if (!clipDialog.open) clipDialog.showModal();
  void request('/api/watch', { clip: id }).catch(() => {});
}

clipDialog.addEventListener('close', () => { clipDialog.replaceChildren(); });

async function askQuestion(question) {
  if (!question?.trim()) return;
  const turn = { question: question.trim().slice(0, 500) };
  const previous = chat.at(-1)?.question;
  chat = [...chat.slice(-5), turn];
  render();
  try { Object.assign(turn, await request('/api/ask', { question: turn.question, previous })); }
  catch (error) { turn.answer = error.message; }
  if (route() === 'ask') render();
}

async function checkTracks() {
  try { trackStatus = await request('/api/tracks'); if (route() === 'tracks') render(); }
  catch (error) { flash(error.message, true); }
}

async function send(action, fields, target) {
  if (action === 'demo' && !fields.invite) fields.invite = invitation();
  if (action === 'redeem') {
    if (!attempts.has(fields.product)) attempts.set(fields.product, crypto.randomUUID());
    fields.attempt = attempts.get(fields.product);
  }
  if (action === 'demo-match') {
    const fingerprint = JSON.stringify(fields);
    if (matchAttempt?.fingerprint !== fingerprint) matchAttempt = { fingerprint, id: crypto.randomUUID() };
    fields.matchId = matchAttempt.id;
  }
  if (target) target.disabled = true;
  try {
    const result = await request(`/api/${action}`, fields);
    if (['favorite-games', 'archive-quiz', 'signup', 'demo'].includes(action)) walkStep = null;
    if (['logout', 'demo', 'preview-fan', 'exit-preview', 'signup', 'login'].includes(action)) {
      chat = [];
      patchId = '';
      matchAttempt = undefined;
      emailPreview = false;
      if (invitation()) {
        const url = new URL(location.href);
        url.searchParams.delete('invite');
        window.history.replaceState(null, '', url);
      }
    }
    if (action === 'demo-match') matchAttempt = undefined;
    if (action === 'redeem') attempts.delete(fields.product);
    if (result.patch) patchId = result.patch;
    const next = ['preview-fan', 'exit-preview', 'login', 'logout', 'onboarding-done'].includes(action) ? 'home'
      : action === 'signup' || action === 'demo' && route() === 'account' ? 'welcome' : '';
    if (next && next !== route()) {
      window.history.pushState(null, '', `#${next}`);
    }
    await refresh();
    render();
    if (next || ['favorite-games', 'archive-quiz', 'demo'].includes(action) && route() === 'welcome') {
      if (!welcomeDialog.open) focusRoute();
    }
    flash(result.message);
  } catch (error) { flash(error.message, true); }
  finally { if (target) target.disabled = false; }
}

document.addEventListener('submit', event => {
  const form = event.target.closest('form[data-action]');
  if (!form) return;
  event.preventDefault();
  const values = new FormData(form);
  if (form.dataset.action === 'ask') return void askQuestion(values.get('question'));
  const fields = Object.fromEntries(values);
  if (form.dataset.action === 'favorite-games') fields.games = values.getAll('games');
  void send(form.dataset.action, fields, event.submitter);
});
document.addEventListener('click', async event => {
  if (event.target.closest('[data-welcome-close]')) welcomeDialog.close();
  if (event.target.closest('[data-welcome]')) return showWelcome();
  if (event.target.closest('[data-why]')) return showStatus();
  if (event.target.closest('[data-close-clip]')) return clipDialog.close();
  const clip = event.target.closest('[data-play-clip]');
  if (clip) return playClip(clip.dataset.playClip);
  const item = event.target.closest('[data-read-notice]');
  if (item) {
    event.preventDefault();
    try {
      await request('/api/read-notice', { id: item.dataset.readNotice });
      if (location.hash !== item.hash) location.hash = item.hash;
      else { await refresh(); render(); }
    } catch (error) { flash(error.message, true); }
    return;
  }
  if (!event.target.closest('.nav-with-menu, .menu') || event.target.closest('.submenu a')) {
    for (const menu of document.querySelectorAll('.menu[open]')) menu.open = false;
  }
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-track-question')) {
    location.hash = 'ask';
    void askQuestion('Why is MP9 in its tier?');
    return;
  }
  if (button.dataset.question) return void askQuestion(button.dataset.question);
  if (button.hasAttribute('data-check-tracks')) return void checkTracks();
  if (button.dataset.walkStep !== undefined) {
    walkStep = Number(button.dataset.walkStep);
    render();
    main.querySelector('[aria-current="step"]')?.focus();
    return;
  }
  if (button.hasAttribute('data-email-preview')) {
    emailPreview = !emailPreview;
    render();
    main.querySelector('[data-email-preview]')?.focus();
    return;
  }
  if (button.dataset.clipFilter) {
    clipFilter = button.dataset.clipFilter;
    const tab = ({ total: '/all-time', og: '/og' })[clipFilter] || '';
    window.history.replaceState(null, '', `#news${tab}`);
    await refresh();
    render();
    main.querySelector('[aria-pressed="true"]')?.focus();
    return;
  }
  const { post, patch, id, product, approve, enabled, patchSelect, patchOpen, copy, auth, survey } = button.dataset;
  try {
    if (post) return void send(post, { patch, id, product, approve: approve === 'true', enabled: enabled === 'true' }, button);
    if (survey || patchOpen) {
      patchId = survey || patchOpen;
      location.hash = survey ? 'patches/pro-reviews' : 'patches';
    }
    if (patchSelect) {
      patchId = patchSelect;
      await refresh();
      render();
    }
    if (copy) {
      await navigator.clipboard.writeText(copy);
      flash('Invite link copied.');
    }
    if (auth) {
      authMode = auth;
      render();
      main.querySelector(`[data-auth="${auth}"]`)?.focus();
    }
    if (button.hasAttribute('data-motion-clip')) {
      const video = main.querySelector('.club-hype-video');
      if (video.paused) {
        await video.play();
        video.hidden = false;
      } else {
        video.pause();
        video.hidden = true;
      }
      button.setAttribute('aria-pressed', String(!video.paused));
      button.textContent = video.paused ? 'Play homepage reel' : 'Pause homepage reel';
    }
  } catch (error) { flash(error.message, true); }
});
document.addEventListener('change', event => {
  if (event.target.dataset.filter === 'game') game = event.target.value;
  else if (event.target.dataset.filter === 'league') league = event.target.value;
  else return;
  render();
  main.querySelector(`[data-filter="${event.target.dataset.filter}"]`)?.focus();
});
window.addEventListener('hashchange', async () => {
  if (!route() || location.hash === '#content') return;
  try { await refresh(); render(); focusRoute(); if (route() === 'tracks') void checkTracks(); }
  catch (error) { flash(error.message, true); }
});

function focusRoute() {
  if (welcomeDialog.open || !route()) return;
  const section = document.getElementById(locationParts()[1]);
  if (section) {
    section.focus({ preventScroll: true });
    section.scrollIntoView();
  } else {
    document.querySelector('#club-content')?.focus();
    window.scrollTo(0, 0);
  }
}

try { await refresh(); render(); if (locationParts()[1]) focusRoute(); if (route() === 'tracks') void checkTracks(); }
catch (error) { main.innerHTML = empty(error.message); }

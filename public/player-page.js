import { h, useEffect, useRef, Icon, LinkButton } from './club-ui.js';
import { allPlayers, photoPath } from './teams-data.js';

const palette = ['#E4002B', '#22B8CF', '#FFD166', '#8E7CFF', '#58D68D', '#FF7A59'];
const seedFor = text => [...text].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 17);
const series = (seed, count, min, span) => Array.from({ length: count }, (_, index) => min + ((seed + index * 37 + (index * index * 11)) % span));

function ChartPanel({ title, type, labels, datasets, theme, options = {} }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (!window.Chart || !canvas.current) return;
    const root = getComputedStyle(document.documentElement);
    const text = root.getPropertyValue('--ai-white').trim() || '#fff';
    const grid = root.getPropertyValue('--ai-line').trim() || '#ffffff25';
    const chart = new window.Chart(canvas.current, {
      type, data: { labels, datasets: datasets.map((set, index) => ({
        ...set, borderColor: set.color || palette[index % palette.length],
        backgroundColor: set.fill ? (set.color || palette[index % palette.length]) + '33' : set.color || palette[index % palette.length],
        pointBackgroundColor: set.color || palette[index % palette.length], borderWidth: 2.5, tension: .35
      })) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: text } }, tooltip: { backgroundColor: theme === 'light' ? '#18191c' : '#f9f6f7', titleColor: theme === 'light' ? '#fff' : '#111', bodyColor: theme === 'light' ? '#fff' : '#111' } },
        scales: type === 'radar' ? { r: { angleLines: { color: grid }, grid: { color: grid }, pointLabels: { color: text }, ticks: { display: false }, suggestedMin: 0, suggestedMax: 100 } } :
          { x: { ticks: { color: text }, grid: { color: grid } }, y: { beginAtZero: true, ticks: { color: text }, grid: { color: grid } } },
        ...options
      }
    });
    return () => chart.destroy();
  }, [theme, type, title, JSON.stringify(labels), JSON.stringify(datasets)]);
  return h('section', { className: 'player-chart' }, h('h2', null, title), h('div', null, h('canvas', { ref: canvas, role: 'img', 'aria-label': `${title}, illustrative sample data` })));
}

export function PlayerProfile({ slug, theme, data }) {
  const found = allPlayers.find(member => member.slug === slug);
  if (!found) return h('section', { className: 'ai-section' }, h('h1', null, 'PLAYER NOT FOUND'), h(LinkButton, { href: '/teams' }, 'Back to teams'));
  const seed = seedFor(slug);
  const visible = data?.playerPhotos?.[found.team.slug + '/' + slug];
  const last = series(seed, 8, 36, 51);
  const skills = series(seed + 18, 6, 43, 50);
  const peak = Math.max(...series(seed + 30, 6, 1200, 6000));
  return h('div', { className: 'player-page' },
    h('section', { className: 'player-hero' },
      h('div', null, h('a', { href: '/teams#' + found.team.slug }, '← Back to ' + found.team.name),
        h('p', { className: 'ai-kicker' }, 'FaZe ' + found.team.name), h('h1', null, found.name),
        h('p', null, found.fullName + ' · ' + found.country + ' · ' + found.role),
        found.inactive && h('span', { className: 'player-status' }, 'INACTIVE'),
        found.coach && h('span', { className: 'player-status' }, 'COACH')),
      h('div', { className: 'player-hero-photo' }, visible ? h('img', { src: photoPath(found.team, found), width: 420, height: 520, alt: found.name, onError: event => { event.currentTarget.hidden = true; } }) :
        h('span', { role: 'img', 'aria-label': 'Player portrait pending' }, found.name[0].toUpperCase()))),
    h('div', { className: 'player-disclaimer' }, 'All metrics and charts below are illustrative sample data. No game or streaming account is connected for this player.'),
    h('section', { className: 'ai-section player-metrics' },
      [['K/D', (1 + (seed % 110) / 100).toFixed(2)], ['Win rate', (45 + seed % 29) + '%'],
        ['Headshot %', (18 + seed % 33) + '%'], ['Accuracy', (20 + seed % 38) + '%'], ['Peak viewers', peak.toLocaleString()]].map(([label, value]) =>
        h('div', { key: label }, h('span', null, label), h('strong', null, value)))),
    h('div', { className: 'ai-section player-chart-grid' },
      h(ChartPanel, { title: 'Skill radar', type: 'radar', theme, labels: ['Aim', 'Positioning', 'Strategy', 'Utility', 'Teamplay', 'Clutch'], datasets: [{ label: 'Sample score', data: skills, color: palette[0], fill: true }] }),
      h(ChartPanel, { title: 'Win / loss trend', type: 'line', theme, labels: ['1', '2', '3', '4', '5', '6', '7', '8'], datasets: [{ label: 'Sample win score', data: last, color: palette[1], fill: true }, { label: 'Sample loss score', data: last.map(value => 100 - value), color: palette[0] }] }),
      h(ChartPanel, { title: 'Performance by map', type: 'bar', theme, labels: ['Map A', 'Map B', 'Map C', 'Map D', 'Map E'], datasets: [{ label: 'Sample rating', data: series(seed + 60, 5, 40, 55), color: palette[3] }] }),
      h(ChartPanel, { title: 'Viewers over time', type: 'line', theme, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Sample viewers', data: series(seed + 70, 7, 900, 5500), color: palette[2], fill: true }] }),
      h(ChartPanel, { title: 'Hours streamed', type: 'bar', theme, labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], datasets: [{ label: 'Sample hours', data: series(seed + 80, 4, 7, 24), color: palette[4] }] }),
      h(ChartPanel, { title: 'Follower growth', type: 'line', theme, labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ label: 'Sample followers', data: series(seed + 90, 6, 12, 60).map((value, index) => value + index * 28), color: palette[5], fill: true }] })),
    h('section', { className: 'ai-section player-career' }, h('h2', null, 'CAREER TIMELINE'),
      h('ol', null, h('li', null, h('strong', null, 'CURRENT'), h('p', null, 'Listed on the FaZe ' + found.team.name + ' roster supplied for this project.')),
        h('li', null, h('strong', null, 'HISTORY PENDING'), h('p', null, 'Verified player milestones will appear when an official source is connected.')))));
}

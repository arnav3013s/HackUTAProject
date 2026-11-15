import { h, useEffect, useRef, useState, Icon, Title } from './club-ui.js';
import { teams, pastDivisions, photoPath } from './teams-data.js';

const initials = name => name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();

function Portrait({ team, member, available }) {
  const [failed, setFailed] = useState(false);
  return h('div', { className: 'team-portrait' + (available && !failed ? ' has-photo' : '') },
    available && !failed ? h('img', {
      src: photoPath(team, member), alt: `${member.name} of FaZe ${team.name}`,
      width: 420, height: 520, loading: 'lazy', decoding: 'async', onError: () => setFailed(true)
    }) : h('div', { className: 'team-silhouette', role: 'img', 'aria-label': `Photo of ${member.name} coming soon` },
      h('span', { className: 'team-silhouette-head' }), h('span', { className: 'team-silhouette-body' }),
      h('strong', null, initials(member.name))));
}

function TeamRow({ team, index, players, photos }) {
  const row = useRef(null);
  const [progress, setProgress] = useState(0);
  const drag = useRef(null);
  const update = () => {
    const el = row.current;
    setProgress(el && el.scrollWidth > el.clientWidth ? el.scrollLeft / (el.scrollWidth - el.clientWidth) : 0);
  };
  useEffect(() => { update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }, [players.length]);
  const move = direction => row.current?.scrollBy({ left: direction * row.current.clientWidth * 0.77, behavior: 'smooth' });
  return h('section', { className: 'team-section' + (index % 2 ? ' red' : ' black'), id: team.slug, 'aria-label': team.name + ' roster' },
    h('div', { className: 'team-section-inner' },
      h('p', { className: 'team-meet' }, 'MEET ', h('span', null, '#' + (index + 1))),
      team.slug === 'super-smash-bros-ultimate' && h('img', { className: 'team-game-art', src: '/images/games/smash.svg', width: 180, height: 105, alt: 'FaZe Smash division artwork', loading: 'lazy' }),
      h('h2', null, 'FaZe ', team.name), h('p', { className: 'team-description' }, team.description),
      h('div', { className: 'team-row-controls' },
        h('span', null, players.length + (players.length === 1 ? ' member' : ' members')),
        h('div', null,
          h('button', { type: 'button', 'aria-label': `Scroll ${team.name} roster left`, onClick: () => move(-1) }, h(Icon, { name: 'left' })),
          h('button', { type: 'button', 'aria-label': `Scroll ${team.name} roster right`, onClick: () => move(1) }, h(Icon, { name: 'right' })))),
      h('div', {
        className: 'team-row', ref: row, tabIndex: 0, 'aria-label': `${team.name} players; scroll horizontally`,
        onScroll: update,
        onWheel: event => {
          const el = row.current;
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && el.scrollWidth > el.clientWidth) {
            const next = el.scrollLeft + event.deltaY;
            if (next >= 0 && next <= el.scrollWidth - el.clientWidth) { event.preventDefault(); el.scrollLeft = next; }
          }
        },
        onKeyDown: event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
        },
        onPointerDown: event => {
          if (event.pointerType === 'mouse' && !event.target.closest('a')) drag.current = { x: event.clientX, left: row.current.scrollLeft };
        },
        onPointerMove: event => { if (drag.current) row.current.scrollLeft = drag.current.left + drag.current.x - event.clientX; },
        onPointerUp: () => { drag.current = null; }, onPointerLeave: () => { drag.current = null; }
      }, players.map(member => h('article', { className: 'team-card', key: member.slug },
        h(Portrait, { team, member, available: photos?.[team.slug + '/' + member.slug] }),
        h('div', { className: 'team-tags' }, member.coach && h('span', null, 'COACH'), member.inactive && h('span', null, 'INACTIVE')),
        h('a', { href: '/players/' + member.slug, className: 'team-name' }, member.name),
        h('p', null, member.country, member.role && ' · ' + member.role)))),
      h('div', { className: 'team-progress', role: 'progressbar', 'aria-label': team.name + ' roster scroll progress', 'aria-valuenow': Math.round(progress * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 },
        h('span', { style: { left: `${progress * 76}%` } }))));
}

export function Teams({ data }) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(teams[0].slug);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-22% 0px -50% 0px', threshold: [0, .25, .5] });
    document.querySelectorAll('.team-section').forEach(el => observer.observe(el));
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); }
    }), { threshold: .05 });
    document.querySelectorAll('.team-card').forEach(el => reveal.observe(el));
    return () => { observer.disconnect(); reveal.disconnect(); };
  }, [search]);
  const query = search.trim().toLowerCase();
  const shown = teams.map(team => ({ team, players: team.players.filter(member => member.name.toLowerCase().includes(query) || member.fullName.toLowerCase().includes(query)) })).filter(({ players }) => players.length);
  return h('div', { className: 'teams-page' },
    h(Title, { label: 'CURRENT ROSTERS', title: 'MEET THE TEAMS' }, 'Current players and coaches across six divisions.'),
    h('div', { className: 'team-selector' },
      h('nav', { 'aria-label': 'Select a game' }, teams.map((team, index) => h('a', {
        key: team.slug, href: '/teams#' + team.slug, 'aria-current': active === team.slug ? 'location' : undefined,
        onClick: event => { event.preventDefault(); history.replaceState(null, '', '/teams#' + team.slug); document.getElementById(team.slug)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
      }, '#' + (index + 1) + ' ' + team.name))),
      h('label', null, 'Find a player', h('input', { type: 'search', value: search, onChange: event => setSearch(event.target.value), placeholder: 'Search roster', 'aria-label': 'Search players by name' }))),
    shown.length ? shown.map(({ team, players }) => h(TeamRow, { key: team.slug, team, players, index: teams.indexOf(team), photos: data?.playerPhotos })) :
      h('p', { className: 'team-no-results' }, 'No current players match your search.'),
    h('aside', { className: 'team-past' }, h('h2', null, 'Past Divisions'), h('p', null, pastDivisions.join(' · '))));
}

import { h, useEffect, useRef, useState, Icon, LinkButton, api } from './club-ui.js';
import { aboutContent as copy } from './about-data.js';
import { teams } from './teams-data.js';

const filters = ['All', 'Counter-Strike', 'Call of Duty', 'Rainbow Six Siege', 'Halo', 'Smash'];
const values = [
  ['Years competing', () => new Date().getFullYear() - 2011],
  ['Active divisions', () => teams.length],
  ['Championships won', () => copy.championships],
  ['Roster countries', () => new Set(teams.flatMap(team => team.players.map(member => member.country))).size]
];

function Counter({ label, getValue }) {
  const ref = useRef(null);
  const target = getValue();
  const [shown, setShown] = useState(typeof target === 'number' ? 0 : target);
  useEffect(() => {
    if (typeof target !== 'number') return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(target); return; }
      const start = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now - start) / 850);
        setShown(Math.round(target * (1 - (1 - progress) ** 3)));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .3 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return h('div', { ref }, h('strong', null, shown), h('span', null, label));
}

function ContactForm() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setStatus('');
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await api('contact', values);
      event.currentTarget.reset(); setStatus(result.message);
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }
  return h('form', { className: 'about-contact-form', onSubmit: submit },
    [['Name', 'name', 'text', 80], ['Company', 'company', 'text', 100], ['Email', 'email', 'email', 254]].map(([label, name, type, maxLength]) =>
      h('label', { key: name }, label, h('input', { name, type, maxLength, required: true }))),
    h('label', null, 'Message', h('textarea', { name: 'message', rows: 4, maxLength: 1500, minLength: 10, required: true })),
    h('button', { className: 'ai-button solid', disabled: busy }, busy ? 'Sending…' : 'Send inquiry'),
    status && h('p', { role: 'status' }, status));
}

export function About({ openAuth }) {
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState(false);
  const timeline = copy.timeline.filter(item => filter === 'All' || item.game === filter);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    document.querySelectorAll('.about-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [filter, form]);
  return h('div', { className: 'about-page' },
    h('a', { className: 'about-skip', href: '#about-main' }, 'Skip to main content'),
    h('section', { className: 'about-hero', id: 'about-main', tabIndex: -1 },
      h('p', { className: 'ai-kicker' }, 'ABOUT'), h('h1', null, 'ABOUT FaZe CLAN'),
      h('p', null, 'Where gaming culture and competition collide.'),
      h('div', { className: 'ai-actions' }, h(LinkButton, { href: '/teams' }, 'Meet the Teams'), h(LinkButton, { href: '/#rewards', kind: 'outline' }, 'Join Rewards'))),
    h('section', { className: 'ai-section about-prose about-reveal' },
      h('h2', null, 'ABOUT US'),
      h('p', null, 'FaZe Clan grew from Call of Duty trickshots and montages that shaped a generation of fans. Competitive play began in late 2011. ', copy.founding, '.'),
      h('p', null, 'FaZe expanded into Counter-Strike in January 2016, winning PGL Major Antwerp and IEM Katowice in 2022 and IEM Chengdu in 2024. Rainbow Six Siege followed in January 2018 and became the first organization to win back-to-back Six Invitationals in 2025 and 2026. Halo brought a 2023 World Championship and 2024 HCS London Major. Call of Duty League championships arrived in 2021 and 2026.'),
      h('p', null, 'After GameSquare’s 2024 restructuring, FaZe Esports runs the competitive teams. The Call of Duty franchise moved to Las Vegas as FaZe Vegas in September 2025.'),
      h('blockquote', null, copy.pullQuote)),
    h('section', { className: 'ai-section about-reveal' }, h('div', { className: 'ai-section-head' }, h('h2', null, 'WHERE WE COMPETE')),
      h('div', { className: 'about-divisions' }, copy.divisions.map((division, index) => h('article', { key: division.slug, className: index % 2 ? 'red' : '' },
        h('span', null, '#' + (index + 1)), h('h3', null, division.name), h('p', null, 'Joined: ' + division.joined),
        h('p', null, division.achievement), h('a', { href: '/teams#' + division.slug }, 'Meet the roster →'))))),
    h('section', { className: 'ai-section about-reveal' }, h('div', { className: 'ai-section-head' }, h('h2', null, 'HOME OF CHAMPIONS')),
      h('div', { className: 'about-filters', role: 'group', 'aria-label': 'Filter achievements by game' }, filters.map(value => h('button', {
        key: value, type: 'button', 'aria-pressed': filter === value, onClick: () => setFilter(value)
      }, value))),
      h('ol', { className: 'about-timeline', tabIndex: 0, 'aria-label': 'Championship timeline' }, timeline.map((item, index) => h('li', { key: item.year + item.event + index, tabIndex: 0 },
        h('strong', null, item.year), h('div', null, h('span', null, item.game), h('h3', null, item.event), h('p', null, item.result)))))),
    h('section', { className: 'ai-section about-reveal' }, h('div', { className: 'ai-section-head' }, h('h2', null, 'BY THE NUMBERS')),
      h('div', { className: 'about-numbers' }, values.map(([label, getValue]) => h(Counter, { key: label, label, getValue })))),
    h('section', { className: 'ai-section about-reveal' }, h('div', { className: 'ai-section-head' }, h('h2', null, 'MEET OUR LEADERSHIP')),
      ['Leadership', 'Senior Staff'].map(group => h('div', { key: group, className: 'about-leaders' },
        h('h3', null, group), h('div', null, copy.leadership.filter(person => person.group === group).map((person, index) => h('article', { key: index },
          h('div', { className: 'about-person-placeholder', role: 'img', 'aria-label': 'Photo to be added' }, h(Icon, { name: 'person', size: 50 })),
          h('h4', null, person.name), h('p', null, person.title), person.social && h('a', { href: person.social }, 'FaZe people page'))))))),
    h('section', { className: 'ai-section about-reveal' }, h('div', { className: 'ai-section-head' }, h('h2', null, 'WHAT WE STAND FOR')),
      h('div', { className: 'about-values' }, [
        ['Compete to win', 'Show up prepared. Play every round like it matters.'],
        ['Community first', 'The fans are part of the story.'],
        ['Creator culture', 'Make the clips people replay years later.'],
        ['Respect the OGs', 'Remember who was here from the beginning.']
      ].map(([title, text]) => h('article', { key: title }, h('h3', null, title), h('p', null, text))))),
    h('section', { className: 'ai-section about-reveal', id: 'contact' }, h('div', { className: 'ai-section-head' }, h('h2', null, 'PARTNERS')),
      h('div', { className: 'about-partners' }, copy.partners.map((partner, index) => h('div', { key: index }, partner))),
      h('p', null, 'Press contact: ', copy.pressContact),
      h('button', { className: 'ai-button outline', onClick: () => setForm(!form), 'aria-expanded': form }, 'Become a partner'),
      form && h(ContactForm)),
    h('section',{className:'ai-section about-reveal house-about'},
      h('h2',null,'FaZe House'),
      h('p',null,'FaZe House is home to Gaming Passport, OG Club, Exclusive Drops, and Clan.'),
      h(LinkButton,{href:'/house',kind:'outline'},'Explore FaZe House')),
    h('section', { className: 'about-join about-reveal' }, h('p', null, '#FaZeUp'), h('h2', null, 'THE NEXT ERA STARTS HERE.'),
      h('div', { className: 'ai-actions' }, h(LinkButton, { href: '/#rewards' }, 'Join Rewards'),
        h('button', { className: 'ai-button outline', onClick: () => openAuth('signup') }, 'Create Account'),
        h(LinkButton, { href: '/#rewards/redeem', kind: 'outline' }, 'Rewards Shop'), h(LinkButton, { href: '/next', kind: 'outline' }, 'Enter FaZe NEXT')),
      h('div', { className: 'about-socials' },
        h('a', { href: 'https://www.youtube.com/@FaZeClan', target: '_blank', rel: 'noopener noreferrer' }, 'YouTube'),
        h('a', { href: 'https://www.twitch.tv/faze', target: '_blank', rel: 'noopener noreferrer' }, 'Twitch'))));
}

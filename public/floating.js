import { h, useEffect, useRef, useState, Icon, api } from './club-ui.js';

const fullSteps = [
  { title: 'Welcome to FaZe Clan', text: 'Start on Home: watch the latest reel, discover the archive, and open your fan account.', href: '/#home', selector: '.ai-hero' },
  { title: 'The story', text: 'About Us puts the eras, current divisions, and achievements in one place.', href: '/about', selector: '.about-hero' },
  { title: 'Meet the teams', text: 'Search current players and coaches, then open a profile for sample stats.', href: '/teams', selector: '.team-selector' },
  { title: 'Follow competition', text: 'Esports brings the six current divisions, results, schedules, and highlights together.', href: '/#esports', selector: '.esports-hero' },
  { title: 'Replay a moment', text: 'Gallery holds championship photos and video highlights. Filter by game and open any moment.', href: '/#gallery', selector: '.ai-gallery-page' },
  { title: 'Earn your points', text: 'Finish daily tasks, claim weekly quests, and share your referral link in Rewards.', href: '/#rewards', selector: '.ai-rewards' },
  { title: 'Choose a reward', text: 'The Rewards Shop shows your balance, each point cost, and how far away your next unlock is.', href: '/#rewards/redeem', selector: '.ai-rewards' },
  { title: 'Ask the guide', text: 'The FaZe guide in the corner can explain points, team history, and where to go next.', href: '/#home', selector: '.clan-assistant-button' }
];
const returningSteps = [
  { title: 'Welcome back', text: 'Your points, comeback recap, and daily tasks are waiting in Rewards.', href: '/#rewards', selector: '.ai-rewards' },
  { title: 'Your team is here', text: 'Current rosters now have their own searchable page.', href: '/teams', selector: '.team-selector' },
  { title: 'Catch up fast', text: 'See the newest results and highlights on Esports.', href: '/#esports', selector: '.esports-hero' }
];

export function Tour({ mode, close, navigate }) {
  const steps = mode === 'returning' ? returningSteps : fullSteps;
  const [index, setIndex] = useState(0);
  const step = steps[index];
  useEffect(() => {
    navigate(step.href);
    const timer = setTimeout(() => {
      document.querySelectorAll('.tour-target').forEach(el => el.classList.remove('tour-target'));
      const target = document.querySelector(step.selector);
      target?.classList.add('tour-target');
      if (target && step.selector !== '.clan-assistant-button') target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    }, 120);
    return () => { clearTimeout(timer); document.querySelectorAll('.tour-target').forEach(el => el.classList.remove('tour-target')); };
  }, [index, mode]);
  return h('div', { className: 'clan-tour', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Site walkthrough' },
    h('div', { className: 'clan-tour-shade' }),
    h('div', { className: 'clan-tour-card' },
      h('span', { className: 'ai-kicker' }, mode === 'returning' ? "WHAT'S NEW" : 'FIRST PLAY', ' · ', index + 1, '/', steps.length),
      h('h2', null, step.title), h('p', null, step.text),
      h('div', { className: 'clan-tour-actions' },
        h('button', { className: 'ai-button outline', onClick: close }, 'Skip'),
        index > 0 && h('button', { className: 'ai-button outline', onClick: () => setIndex(index - 1) }, 'Back'),
        h('button', { className: 'ai-button solid', onClick: () => index === steps.length - 1 ? close() : setIndex(index + 1) }, index === steps.length - 1 ? 'Finish' : 'Next', h(Icon, { name: 'arrow', size: 16 })))));
}

const prompts = ['How do I earn points?', 'Where are the current teams?', 'What is my next task?'];
export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pulse] = useState(() => {
    try { if (localStorage.getItem('faze-clan-assistant-seen')) return false; localStorage.setItem('faze-clan-assistant-seen', '1'); }
    catch {} return true;
  });
  const input = useRef(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  async function ask(value) {
    const text = value.trim();
    if (text.length < 3 || busy) return;
    setBusy(true); setQuestion('');
    const previous = turns.at(-1)?.question || '';
    setTurns(items => [...items, { question: text, answer: 'Checking the FaZe records…', pending: true }]);
    try {
      const result = await api('ask', { question: text, previous });
      setTurns(items => [...items.slice(0, -1), { question: text, answer: result.answer, status: result.status, mode: result.mode, sources: result.sources || [] }]);
    } catch (error) {
      setTurns(items => [...items.slice(0, -1), { question: text, answer: 'The guide is unavailable right now. Open Rewards for point rules or Teams for current rosters.', status: error.message }]);
    } finally { setBusy(false); }
  }
  return h('div', { className: 'clan-assistant' },
    open && h('section', { className: 'clan-assistant-panel', role: 'dialog', 'aria-label': 'FaZe guide' },
      h('header', null, h('div', null, h('span', { className: 'ai-kicker' }, 'FaZe GUIDE'), h('h2', null, 'ASK THE CLAN')), h('button', { className: 'ai-icon', 'aria-label': 'Close guide', onClick: () => setOpen(false) }, h(Icon, { name: 'close' }))),
      h('div', { className: 'clan-assistant-chat', role: 'log', 'aria-live': 'polite' },
        turns.length ? turns.map((turn, index) => h('article', { key: index }, h('strong', null, 'You: ', turn.question),
          h('p', null, turn.answer), turn.status && h('small', null, turn.status),
          turn.sources?.length > 0 && h('div', { className: 'clan-assistant-sources' }, turn.sources.map((source, i) => h('a', {
            key: i, href: source.url.startsWith('#') ? '/' + source.url : source.url,
            target: source.url.startsWith('#') ? undefined : '_blank', rel: source.url.startsWith('#') ? undefined : 'noopener noreferrer'
          }, source.label))))) : h('div', null, h('p', null, 'Ask about FaZe, points, team history, or where to go next.'),
          h('div', { className: 'clan-assistant-prompts' }, prompts.map(prompt => h('button', { key: prompt, onClick: () => ask(prompt) }, prompt))))),
      h('form', { onSubmit: event => { event.preventDefault(); ask(question); } },
        h('input', { ref: input, value: question, onChange: event => setQuestion(event.target.value), maxLength: 500, placeholder: 'Ask a question', 'aria-label': 'Ask the FaZe guide' }),
        h('button', { className: 'ai-button solid', disabled: busy || question.trim().length < 3, 'aria-label': 'Send question' }, h(Icon, { name: 'arrow' })))),
    h('button', { className: 'clan-assistant-button' + (pulse ? ' pulse' : ''), 'aria-label': open ? 'Close FaZe guide' : 'Open FaZe guide', 'aria-expanded': open, title: 'Ask the FaZe guide', onClick: () => setOpen(!open) },
      h('span', { 'aria-hidden': 'true' }, 'F', h('b', null, '✦'))));
}

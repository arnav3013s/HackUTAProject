import { h, useEffect, useState, Icon } from './club-ui.js';

const fullSteps = [
  { title: 'Welcome to FaZe Clan', text: 'Start on Home: watch the latest reel, discover the archive, and open your fan account.', href: '/#home', selector: '.ai-hero' },
  { title: 'The story', text: 'About Us puts the eras, current divisions, and achievements in one place.', href: '/about', selector: '.about-hero' },
  { title: 'Meet the teams', text: 'Search current players and coaches, then open a profile for sample stats.', href: '/teams', selector: '.team-selector' },
  { title: 'Follow competition', text: 'Esports brings the six current divisions, results, schedules, and highlights together.', href: '/#esports', selector: '.esports-hero' },
  { title: 'Replay a moment', text: 'Gallery holds championship photos and video highlights. Filter by game and open any moment.', href: '/#gallery', selector: '.ai-gallery-page' },
  { title: 'Earn your points', text: 'Finish daily tasks, claim weekly quests, and share your referral link in Rewards.', href: '/#rewards', selector: '.ai-rewards' },
  { title: 'Choose a reward', text: 'The Rewards Shop shows your balance, each point cost, and how far away your next unlock is.', href: '/#rewards/redeem', selector: '.ai-rewards' },
  { title: 'Explore FaZe House', text: 'Open Gaming Passport, OG Club, Exclusive Drops, and Clan from one hub.', href: '/house', selector: '.house-hub' },
  { title: 'Enter FaZe NEXT', text: 'Submit a video, vote in the community gallery, and follow the finale.', href: '/next', selector: '.clan-program-hero' },
  { title: 'Ask FaZe', text: 'Use the assistant in the corner to explore rosters, Passport XP, and the site.', href: '/#home', selector: '.clan-assistant-button' }
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

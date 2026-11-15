
import { h, useState, Icon, LinkButton, Modal, api } from './club-ui.js';
import { ogConfig } from './og-config.js';

export function BrandLogo({ className = '' }) {
  return h('span', { className: 'faze-logo ' + className, 'aria-hidden': true });
}

export function WelcomeOffer() {
  return ogConfig.welcome.enabled && h('div', { className: 'clan-offer' },
    h('strong', null, 'Welcome back'), h('p', null, ogConfig.welcome.label),
    h('a', { href: '/og' }, 'See the OG Club'));
}

export function AuthForm({ mode, setMode, initialEmail, data, finish }) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [email, setEmail] = useState(initialEmail || '');
  const [name, setName] = useState('');
  const query = new URLSearchParams(location.search);
  const invite = query.get('invite') || '';
  const signup = mode === 'signup';
  const recovery = mode === 'recover' || mode === 'reset';
  function choose(next) { setFeedback(null); setMode(next); }
  async function submit(action, fields) {
    setFeedback(null);
    setPending(true);
    try {
      const result = await api(action, fields);
      if (action === 'password-forgot') setFeedback({ message: result.message });
      else if (action === 'password-reset') {
        const url = new URL(location.href);
        url.searchParams.delete('reset');
        history.replaceState(null, '', url);
        setMode('login');
        setFeedback({ message: result.message });
      } else await finish(result.message);
    } catch (error) { setFeedback({ message: error.message, error: true }); }
    finally { setPending(false); }
  }
  const title = { signup: 'CREATE ACCOUNT', login: 'WELCOME BACK', recover: 'RESET PASSWORD', reset: 'NEW PASSWORD' }[mode];
  return h('div', { className: 'ai-auth-form' },
    h(BrandLogo, { className: 'auth-brand-logo' }),
    h('h2', null, title),
    !recovery && h('div', { className: 'clan-auth-tabs', role: 'group', 'aria-label': 'Account form' },
      h('button', { type: 'button', 'aria-pressed': !signup, onClick: () => choose('login') }, 'Log In'),
      h('button', { type: 'button', 'aria-pressed': signup, onClick: () => choose('signup') }, 'Create Account')),
    invite && signup && h('p', { className: 'ai-invited' }, 'You are joining through a referral link.'),
    h('form', { key: mode, onSubmit: event => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      submit(mode === 'recover' ? 'password-forgot' : mode === 'reset' ? 'password-reset' : mode, { ...fields, invite, token: query.get('reset') });
    } },
    signup && h('label', null, 'Username', h('input', { name: 'name', value: name, onChange: e => setName(e.target.value), required: true, maxLength: 24, minLength: 3, pattern: '[a-zA-Z0-9][a-zA-Z0-9_\\-]{2,23}', autoComplete: 'username' })),
    mode !== 'reset' && h('label', null, mode === 'login' ? 'Email or username' : 'Email',
      h('input', { name: 'email', type: mode === 'login' ? 'text' : 'email', value: email, onChange: e => setEmail(e.target.value), required: true, maxLength: 254, autoComplete: mode === 'login' ? 'username' : 'email' })),
    mode !== 'recover' && h('label', null, mode === 'reset' ? 'New password' : 'Password', h('input', {
      name: 'password', type: 'password', required: true, minLength: 10, maxLength: 128, autoComplete: mode === 'login' ? 'current-password' : 'new-password'
    })),
    signup && h('label', { className: 'clan-check' }, h('input', { type: 'checkbox', name: 'adult' }), h('span', null, 'I am 18 or older. Required for paid plans and competitions.')),
    mode === 'login' && h('button', { type: 'button', className: 'ai-text-button', onClick: () => choose('recover') }, 'Forgot password?'),
    feedback && h('p', { className: feedback.error ? 'ai-form-error' : 'clan-success', role: feedback.error ? 'alert' : 'status' }, feedback.message),
    h('button', { className: 'ai-button solid', type: 'submit', disabled: pending }, pending ? 'Please wait' : signup ? 'Create account' : mode === 'recover' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : 'Log in')),
    recovery ? h('button', { type: 'button', className: 'ai-text-button', onClick: () => choose('login') }, 'Back to log in') :
      h('div', { className: 'ai-auth-alternates' },
        [['google','Google'],['discord','Discord']].map(([id,label]) => data?.config[id]
          ? h(LinkButton, { key: id, href: '/auth/' + id + '?invite=' + encodeURIComponent(invite), kind: 'outline', icon: null }, 'Continue with ' + label)
          : h('button', { key: id, className: 'ai-button outline', disabled: true, title: label + ' sign-in needs server OAuth credentials' }, 'Continue with ' + label)),
        data?.config.demo && h('button', { className: 'ai-button outline', disabled: pending, onClick: () => submit('demo', { invite, walkthrough: '1', name }) }, 'Try a demo account')));
}

export function SideAuth({ expanded, setExpanded, data, finish }) {
  const [mode, setMode] = useState('login');
  return h('div', { className: 'clan-side-auth' },
    h('button', { className: 'clan-auth-tab', type: 'button', 'aria-expanded': expanded, 'aria-haspopup': 'dialog', onClick: () => setExpanded(true) }, 'Log in / Sign up'),
    expanded && h(Modal, { label: 'log in or create an account', className: 'clan-side-dialog', close: () => setExpanded(false) }, h(AuthForm, { mode, setMode, data, finish })));
}

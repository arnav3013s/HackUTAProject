import { h, useEffect, useRef, useState, Icon, LinkButton, Modal, api, number } from './club-ui.js';
import { divisions } from './esports-data.js';
import { Home, Esports, Gallery, News, Clan, FanLabPage, VideoModal, NotFound } from './club-pages.js';
import { Rewards } from './rewards-ui.js';
import { Shop, Cart, readCart, saveCart, updateCart } from './shop-ui.js';
import { Teams } from './teams-page.js';
import { About } from './about-page.js';
import { PlayerProfile } from './player-page.js';
import { FloatingAssistant, Tour } from './floating.js';

const simpleLinks = [['home','Home'],['about','About Us'],['clan','Clan'],['news','News'],['esports','Esports'],['teams','Teams'],['gallery','Gallery'],['shop','Shop'],['rewards','Rewards']];
const extraLinks = [['fanlab','Fan Lab'],['watch','Video archive'],['patches/pro-reviews','Patch intel'],['performance','Match activity'],['inbox','Inbox'],['tracks','MLH tracks']];
const legacy = new Set(['account','ask','inbox','leaderboard','patches','performance','receipts','tracks','watch','welcome']);
const linkFor = key => ['about','clan','teams'].includes(key) ? '/'+key : '/#'+key;
const inviteCode = () => new URLSearchParams(location.search).get('invite') || '';
const saved = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key,value) => { try { localStorage.setItem(key,value); } catch {} };
const tourDoneKey = user => `faze-clan-tour-done-v2-${user?.id || 'guest'}`;
function getPath() {
  if (['/about','/teams','/clan','/terms','/privacy'].includes(location.pathname)) return location.pathname.slice(1);
  if (/^\/players\/[a-z0-9-]+$/.test(location.pathname)) return location.pathname.slice(1);
  const hash = location.hash.slice(1);
  if (!hash || hash==='club-content' || hash==='content') return 'home';
  const aliases = {missions:'rewards/earn',invites:'rewards/redeem','rewards/points-shop':'rewards/redeem','rewards/ledger':'rewards/history','rewards/receipts':'receipts',archive:'clan',fans:'fanlab'};
  return Object.hasOwn(aliases,hash) ? aliases[hash] : hash;
}

function Header({page,data,count,openAuth,theme,toggleTheme,replayTour}) {
  const [mobile,setMobile]=useState(false);
  const [menu,setMenu]=useState('');
  useEffect(()=>{setMobile(false);setMenu('');},[page]);
  return h('header',{className:'ai-header'},
    h('a',{className:'ai-brand',href:'/#home','aria-label':'FaZe Clan home'},h('img',{src:'/brand/logo.png',width:42,height:35,alt:''}),
      h('span',null,h('small',null,'FaZe'),h('strong',null,'CLAN'))),
    h('button',{className:'ai-icon ai-mobile-toggle','aria-label':mobile?'Close menu':'Open menu','aria-expanded':mobile,onClick:()=>setMobile(!mobile)},h(Icon,{name:mobile?'close':'menu'})),
    h('nav',{className:'ai-nav'+(mobile?' opened':''),'aria-label':'Main navigation',onClick:e=>{if(e.target.closest('a')){setMobile(false);setMenu('');}},onKeyDown:e=>{if(e.key==='Escape'){setMobile(false);setMenu('');}}},
      simpleLinks.map(([key,label])=>key==='esports'?
        h('div',{key,className:'ai-nav-group'+(menu===key?' shown':'')},h('a',{href:linkFor(key),'aria-current':page===key?'page':undefined},label),
          h('button',{className:'ai-nav-arrow','aria-label':'List esports games','aria-expanded':menu===key,onClick:()=>setMenu(menu===key?'':key)},h(Icon,{name:'down',size:13})),
          h('div',{className:'ai-nav-drop ai-esports-drop'},divisions.slice(0,6).map(game=>h('a',{key:game.key,href:'/#esports/'+game.key},game.name)))) :
        h('a',{key,href:linkFor(key),'aria-current':page===key?'page':undefined},label)),
      h('div',{className:'ai-nav-group'+(menu==='more'?' shown':'')},h('button',{className:'ai-more','aria-expanded':menu==='more',onClick:()=>setMenu(menu==='more'?'':'more')},'More',h(Icon,{name:'down',size:13})),
        h('div',{className:'ai-nav-drop'},extraLinks.map(([key,label])=>h('a',{key,href:linkFor(key)},label)),
          h('button',{className:'ai-nav-action',onClick:()=>{replayTour();setMobile(false);}},'Replay tour'))),
      h('button',{className:'ai-nav-action ai-mobile-theme',onClick:toggleTheme,'aria-label':theme==='dark'?'Switch to light mode':'Switch to dark mode'},h(Icon,{name:theme==='dark'?'sun':'moon'}),h('span',null,theme==='dark'?'Dark':'Light'))),
    h('div',{className:'ai-header-actions'},
      count>0&&h('a',{className:'ai-icon ai-cart-icon',href:'/#cart','aria-label':'Cart, '+count+' '+(count===1?'item':'items')},h(Icon,{name:'cart'}),h('span',null,count)),
      h('button',{className:'ai-icon ai-theme-toggle',onClick:toggleTheme,title:theme==='dark'?'Switch to light mode':'Switch to dark mode','aria-label':theme==='dark'?'Switch to light mode':'Switch to dark mode'},h(Icon,{name:theme==='dark'?'sun':'moon'})),
      data?.user ? h('a',{className:'ai-account-link',href:'/#account','aria-label':'Account for '+data.user.name},h(Icon,{name:'person'}),h('span',null,number(data.user.balance)+' pts')) :
        h('button',{className:'ai-sign-in',onClick:()=>openAuth('login')},h(Icon,{name:'person',size:16}),'Log in')));
}

function Footer({openAuth,notify}) {
  const [email,setEmail]=useState('');
  const [pending,setPending]=useState(false);
  async function subscribe(e) {
    e.preventDefault();
    setPending(true);
    try { const result=await api('newsletter',{email});notify(result.message); }
    catch(error) {notify(error.message,true);}
    finally {setPending(false);}
  }
  return h('footer',{className:'ai-footer'},
    h('div',{className:'ai-footer-inner'},
      h('div',{className:'ai-socials'},h('a',{href:'/#home',className:'ai-brand'},h('img',{src:'/brand/logo.png',alt:'',width:45,height:36}),h('strong',null,'FaZe CLAN')),
        h('div',{'aria-label':'FaZe social channels'},[
          ['instagram','Instagram','https://www.instagram.com/fazeclan/'],['twitter','X / Twitter','https://x.com/FaZeClan'],
          ['twitch','Twitch','https://www.twitch.tv/faze'],['youtube','YouTube','https://www.youtube.com/@FaZeClan']
        ].map(([icon,name,url])=>h('a',{key:icon,className:'ai-icon',href:url,target:'_blank',rel:'noopener noreferrer','aria-label':name},h(Icon,{name:icon}))))),
      h('div',{className:'ai-newsletter'},h('h2',null,'Stay informed of our newest arrivals, trends, and promotions'),
        h('form',{onSubmit:subscribe},h('input',{type:'email',value:email,onChange:e=>setEmail(e.target.value),required:true,maxLength:254,autoComplete:'email',placeholder:'Email address','aria-label':'Email address for updates'}),
          h('button',{className:'ai-button solid',type:'submit',disabled:pending},pending?'Signing up…':'Sign up for updates')),
        h('button',{className:'ai-text-button',onClick:()=>openAuth('signup',email)},'Create a fan account',h(Icon,{name:'arrow',size:15})))),
    h('div',{className:'ai-footer-bottom'},h('span',null,'© FaZe Clan. All Rights Reserved.'),
      [['About Us','/about'],['Teams','/teams'],['Rewards','/#rewards'],['Store','/#shop'],['Contact','/about#contact'],['Terms of Service','/terms'],['Privacy Policy','/privacy']].map(([label,url])=>h('a',{key:label,href:url},label))));
}

function Auth({mode,setMode,initialEmail,close,data,finish}) {
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [email,setEmail]=useState(initialEmail || '');
  const [name,setName]=useState('');
  const invite=inviteCode();
  async function submit(action,fields) {
    setError('');setPending(true);
    try { const result=await api(action,fields);await finish(result.message); }
    catch(e){setError(e.message);}
    finally {setPending(false);}
  }
  return h(Modal,{label:'fan account',close,className:'ai-auth-modal'},
    h('div',{className:'ai-auth-form'},
      h('img',{src:'/brand/logo.png',alt:'',width:50,height:39}),h('span',{className:'ai-kicker'},'FaZe CLAN'),
      h('h2',null,mode==='signup'?'CREATE ACCOUNT':'WELCOME BACK'),
      invite && mode==='signup' && h('p',{className:'ai-invited'},'You’re joining through a referral link.'),
      h('form',{key:mode,onSubmit:e=>{e.preventDefault();submit(mode,{...Object.fromEntries(new FormData(e.currentTarget)),invite});}},
        mode==='signup'&&h('label',null,'Username',h('input',{name:'name',value:name,onChange:e=>setName(e.target.value),required:true,maxLength:40,autoComplete:'nickname'})),
        h('label',null,'Email',h('input',{name:'email',type:'email',value:email,onChange:e=>setEmail(e.target.value),required:true,maxLength:254,autoComplete:'email'})),
        h('label',null,'Password',h('input',{name:'password',type:'password',required:true,minLength:10,maxLength:128,autoComplete:mode==='signup'?'new-password':'current-password'})),
        mode==='signup'&&h('p',{className:'ai-muted'},'Use at least 10 characters.'),
        error&&h('p',{className:'ai-form-error',role:'alert'},error),
        h('button',{className:'ai-button solid',type:'submit',disabled:pending},pending?'Please wait…':mode==='signup'?'Create account':'Log in',h(Icon,{name:'arrow'}))),
      h('button',{className:'ai-text-button',onClick:()=>{setError('');setMode(mode==='signup'?'login':'signup');}},mode==='signup'?'Already have an account? Log in':'New here? Create an account'),
      h('div',{className:'ai-auth-alternates'},data?.config.google ? h(LinkButton,{href:'/auth/google?invite='+encodeURIComponent(invite),kind:'outline',icon:null},'Continue with Google') :
        h('button',{className:'ai-button outline',disabled:true,title:'Google sign-in needs server OAuth credentials'},'Continue with Google'),
        data?.config.discord ? h(LinkButton,{href:'/auth/discord?invite='+encodeURIComponent(invite),kind:'outline',icon:null},'Continue with Discord') :
        h('button',{className:'ai-button outline',disabled:true,title:'Discord sign-in needs server OAuth credentials'},'Continue with Discord'),
        data?.config.demo&&h('button',{className:'ai-button outline',disabled:pending,onClick:()=>submit('demo',{invite,walkthrough:'1',name})},'Try a demo account'))));
}

function PersonaDemo({ user, theme }) {
  const chart = useRef(null);
  const activityChart = useRef(null);
  const [activity, setActivity] = useState(null);
  const [code, setCode] = useState(() => saved('faze-demo-creator-code') || '');
  const [channel, setChannel] = useState(() => saved('faze-demo-stream-channel') || '');
  useEffect(() => {
    if (user.personaType !== 'Streamer') return;
    const update = () => api('activity').then(setActivity).catch(() => {});
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [user.personaType]);
  useEffect(() => {
    if (user.personaType !== 'Streamer' || !chart.current || !window.Chart) return;
    const graph = new window.Chart(chart.current, {
      type: 'line', data: { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets: [
        { label: 'Sample followers', data: [1200,1250,1310,1390,1440,1510,1630], borderColor: '#22B8CF', backgroundColor: '#22B8CF33', fill: true, tension: .35 },
        { label: 'Sample viewers', data: [410,520,480,610,580,720,790], borderColor: '#E4002B', tension: .35 }
      ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: theme === 'light' ? '#191919' : '#fff' } } },
        scales: { x: { ticks: { color: theme === 'light' ? '#191919' : '#fff' } }, y: { ticks: { color: theme === 'light' ? '#191919' : '#fff' } } } }
    });
    return () => graph.destroy();
  }, [user.personaType, theme]);
  useEffect(() => {
    if (!activityChart.current || !window.Chart || !activity?.days?.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const days = activity.days.filter(row => row.day <= today).slice(-7);
    const ink = theme === 'light' ? '#191919' : '#fff';
    const graph = new window.Chart(activityChart.current, {
      type: 'bar', data: { labels: days.map(row => row.day.slice(5)), datasets: [
        { label: 'Points earned', data: days.map(row => row.earned), backgroundColor: '#8E7CFF', yAxisID: 'points' },
        { label: 'Clip opens', data: days.map(row => row.opens), backgroundColor: '#FF7A59', yAxisID: 'opens' }
      ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: ink } } },
        scales: { x: { ticks: { color: ink } }, points: { type: 'linear', position: 'left', ticks: { color: ink } },
          opens: { type: 'linear', position: 'right', ticks: { color: ink }, grid: { drawOnChartArea: false } } } }
    });
    return () => graph.destroy();
  }, [activity, theme]);
  if (!user.previewing || user.personaType === 'Normal User') return null;
  if (user.personaType === 'New User') return h('section', { className: 'persona-demo ai-section' },
    h('span', { className: 'ai-kicker' }, 'NEW FAN START HERE'), h('h2', null, 'YOUR FIRST POINTS ARE WAITING'),
    h('p', null, 'Complete daily activities, build a streak, and see which rewards are within reach.'),
    h('div', { className: 'ai-actions' }, h(LinkButton, { href: '/#rewards/earn' }, 'Daily activities'), h(LinkButton, { href: '/#rewards/redeem', kind: 'outline' }, 'Browse rewards')));
  if (user.personaType === 'Returning User') {
    const bonus = user.ledger.find(entry => entry.id === 'returning-loyalty');
    return h('section', { className: 'persona-demo ai-section' }, h('span', { className: 'ai-kicker' }, 'WELCOME BACK'),
      h('h2', null, 'YOUR FaZe ERA CONTINUES'), h('p', null, `Your past demo activity earned a one-time ${bonus?.points || 0}-point loyalty bonus.`),
      h(LinkButton, { href: '/#rewards' }, 'Explore your OG rewards'));
  }
  return h('section', { className: 'persona-demo persona-pro ai-section' },
    h('span', { className: 'ai-kicker' }, 'PRO STREAMER · DEMO'), h('h2', null, 'CREATOR CONTROL ROOM'),
    h('div', { className: 'persona-pro-grid' },
      h('div', null, h('p', null, 'Set up a preferred creator code and channel for this local demo. Live codes require approval.'),
        h('label', null, 'Preferred creator code', h('input', { value: code, maxLength: 20, onChange: e => { setCode(e.target.value); save('faze-demo-creator-code', e.target.value); } })),
        h('label', null, 'Streaming channel URL', h('input', { type: 'url', value: channel, placeholder: 'https://www.youtube.com/@...', onChange: e => { setChannel(e.target.value); save('faze-demo-stream-channel', e.target.value); } })),
        h('div', { className: 'ai-actions' }, h(LinkButton, { href: '/#patches/pro-reviews' }, 'Advanced surveys'), h(LinkButton, { href: '/#rewards/redeem', kind: 'outline' }, 'Creator codes'))),
      h('div', null, h('h3', null, 'FOLLOWERS & VIEWERS'), h('p', null, 'Illustrative seven-day comparison · demo data'),
        h('div', { className: 'persona-pro-chart' }, h('canvas', { ref: chart, role: 'img', 'aria-label': 'Sample followers and viewers over seven days' })),
        h('h3', null, 'SITE ACTIVITY'), h('p', null, 'Observed clip opens and points earned in this local demo · refreshes each minute'),
        h('div', { className: 'persona-pro-chart' }, h('canvas', { ref: activityChart, role: 'img', 'aria-label': 'Observed clip opens and points earned over seven days' })))));
}

function App() {
  const [path,setPath]=useState(getPath);
  const [theme,setTheme]=useState(document.documentElement.dataset.theme || 'dark');
  const [tourMode,setTourMode]=useState(null);
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [auth,setAuth]=useState(null);
  const [email,setEmail]=useState('');
  const [video,setVideo]=useState(null);
  const [cart,setCart]=useState(readCart);
  const [toast,setToast]=useState(null);
  const toastTimer=useRef(null);
  const performLock=useRef(false);
  const initialRoute=useRef(true);
  const [page,part]=path.split('/');
  const usingLegacy=legacy.has(page);
  const count=cart.reduce((sum,item)=>sum+item.quantity,0);

  function toggleTheme() {
    const next=theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    document.querySelector('meta[name="theme-color"]').content=next==='light'?'#f6f6f7':'#0b0b0c';
    save('faze-clan-theme',next);setTheme(next);
  }
  function replayTour(){setTourMode(data?.user?.accountType==='Returning User'?'returning':'full');}
  function closeTour(){save(tourDoneKey(data?.user),'1');setTourMode(null);}
  function navigate(href){history.pushState(null,'',href);setPath(getPath());}
  function closeAuth(){save('faze-clan-auth-dismissed','1');setAuth(null);}

  function notify(message,danger=false) {
    window.clearTimeout(toastTimer.current);
    setToast({message,danger});
    toastTimer.current=window.setTimeout(()=>setToast(null),5200);
  }
  async function refresh() {
    const state=await api('state');setData(state);setError('');return state;
  }
  function openAuth(mode,address=''){setEmail(address);setAuth(mode);}
  async function finishAuth(message) {
    await refresh();
    const url=new URL(location.href);url.searchParams.delete('invite');
    history.replaceState(null,'',url);
    setAuth(null);
    save('faze-clan-auth-dismissed','1');
    if(page==='account') location.hash='home';
    notify(message);
  }
  async function perform(action,fields) {
    if(performLock.current)return false;
    performLock.current=true;
    try {const result=await api(action,fields);await refresh();notify(result.message);return true;}
    catch(error){notify(error.message,true);return false;}
    finally {performLock.current=false;}
  }
  function play(clip) {
    setVideo(clip);
    if(data?.faze.videos.some(item=>item.id===clip.id)) void api('watch',{clip:clip.id}).catch(()=>{});
  }
  function change(id,size,delta){setCart(lines=>updateCart(lines,id,size,delta));}

  useEffect(()=>{
    const onHash=()=>{if(!['#club-content','#content'].includes(location.hash))setPath(getPath());};
    const onPop=()=>setPath(getPath());
    const onLegacy=e=>{setData(e.detail);setPath(getPath());};
    window.addEventListener('hashchange',onHash);
    window.addEventListener('popstate',onPop);
    window.addEventListener('clan:state',onLegacy);
    refresh().catch(e=>setError(e.message));
    if(inviteCode() && getPath()==='home')openAuth('signup');
    return ()=>{window.removeEventListener('hashchange',onHash);window.removeEventListener('popstate',onPop);window.removeEventListener('clan:state',onLegacy);window.clearTimeout(toastTimer.current);};
  },[]);
  useEffect(()=>{
    if (!data) return;
    if (!data.user && !saved('faze-clan-auth-dismissed') && !inviteCode()) setAuth('signup');
    if (!saved(tourDoneKey(data.user))) setTourMode(data.user?.accountType==='Returning User'?'returning':'full');
    else setTourMode(null);
  },[Boolean(data),data?.user?.id]);
  useEffect(()=>{
    const media=matchMedia('(prefers-color-scheme: light)');
    const follow=()=>{if(!saved('faze-clan-theme')){
      const next=media.matches?'light':'dark';document.documentElement.dataset.theme=next;setTheme(next);
      document.querySelector('meta[name="theme-color"]').content=next==='light'?'#f6f6f7':'#0b0b0c';
    }};
    media.addEventListener('change',follow);return()=>media.removeEventListener('change',follow);
  },[]);
  useEffect(()=>{saveCart(cart);},[cart]);
  useEffect(()=>{
    const title=page==='about'?'About FaZe Clan':(simpleLinks.find(([key])=>key===page)?.[1] || (page==='cart'?'Cart':page==='players'?'Player profile':'Fan hub'))+' | FaZe Clan';
    document.title=title;
    const description=page==='about'?'Where gaming culture and competition collide. Explore FaZe Clan teams and championship history.':'Explore FaZe Clan teams, moments, rewards, and official merchandise.';
    document.querySelector('meta[name="description"]').content=description;
    document.querySelector('meta[property="og:title"]').content=title;
    document.querySelector('meta[property="og:description"]').content=description;
    document.querySelector('meta[name="twitter:title"]').content=title;
    document.querySelector('meta[name="twitter:description"]').content=description;
    if(initialRoute.current){initialRoute.current=false;return;}
    window.scrollTo({top:0,behavior:'instant'});
    document.getElementById('club-content')?.focus({preventScroll:true});
    setVideo(null);
    if(location.hash && location.pathname!=='/') setTimeout(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView(),130);
  },[path]);
  useEffect(()=>{
    if(usingLegacy)import('./app.js').catch(e=>setError(e.message));
  },[usingLegacy]);
  useEffect(()=>{
    if(data && page==='account'&&!data.user&&!auth)openAuth('login');
  },[data?.user,page]);

  const content = {
    home:()=>h(Home,{data,openAuth,play}),
    fanlab:()=>h(FanLabPage,{data,openAuth}),
    about:()=>h(About,{openAuth}),
    clan:()=>h(Clan,{data,play}),
    teams:()=>h(Teams,{data}),
    players:()=>h(PlayerProfile,{slug:part,theme,data}),
    terms:()=>h('section',{className:'ai-section'},h('h1',null,'Terms of Service'),h('p',null,'[ADD TERMS OF SERVICE]')),
    privacy:()=>h('section',{className:'ai-section'},h('h1',null,'Privacy Policy'),h('p',null,'[ADD PRIVACY POLICY]')),
    rewards:()=>h(Rewards,{part,data,openAuth,perform,notify}),
    esports:()=>h(Esports,{part,data,play}),
    gallery:()=>h(Gallery,{data,play}),
    news:()=>h(News,{data,play}),
    shop:()=>h(Shop,{part,add:(item,size)=>{change(item.id,size,1);notify(item.name+' · '+size+' added to cart.');}}),
    cart:()=>h(Cart,{lines:cart,change})
  };
  return h('div',{className:'ai-app'},
    h(Header,{page,data,count,openAuth,theme,toggleTheme,replayTour}),
    h('main',{id:'club-content',tabIndex:-1},
      error && h('p',{className:'ai-global-error',role:'alert'},'Could not load fan data. ',error,' ',h('button',{className:'ai-text-button',onClick:()=>refresh().catch(e=>setError(e.message))},'Retry')),
      page==='account' && data?.user?.previewing && h(PersonaDemo,{user:data.user,theme}),
      h('div',{id:'legacy-main',className:'ai-legacy shell',hidden:!usingLegacy}),
      !usingLegacy && (Object.hasOwn(content,page)?content[page]():h(NotFound))),
    h(Footer,{openAuth,notify}),
    toast&&h('div',{className:'ai-toast'+(toast.danger?' error':''),role:toast.danger?'alert':'status'},toast.message),
    auth&&h(Auth,{mode:auth,setMode:setAuth,initialEmail:email,data,close:closeAuth,finish:finishAuth}),
    video&&h(VideoModal,{clip:video,close:()=>setVideo(null)}),
    h(FloatingAssistant),
    tourMode&&!auth&&h(Tour,{key:`${data?.user?.id || 'guest'}-${tourMode}`,mode:tourMode,close:closeTour,navigate}));
}
window.ReactDOM.createRoot(document.querySelector('#club-root')).render(h(App));

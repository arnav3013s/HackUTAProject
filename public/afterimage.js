import { h, useEffect, useRef, useState, Icon, LinkButton, Modal, api, number } from './club-ui.js';
import { divisions } from './esports-data.js';
import { Home, Esports, Gallery, News, VideoModal, NotFound } from './club-pages.js';
import { Rewards } from './rewards-ui.js';
import { Shop, Cart, readCart, saveCart, updateCart } from './shop-ui.js';

const simpleLinks = [['home','Home'],['news','News'],['esports','Esports'],['gallery','Gallery'],['shop','Shop'],['rewards','Rewards']];
const extraLinks = [['watch','Video archive'],['archive','FaZe timeline'],['patches/pro-reviews','Patch intel'],['creators','Creators'],['performance','Match activity'],['inbox','Inbox'],['fans','Fan Lab'],['ask','Ask Afterimage'],['tracks','Project details']];
const legacy = new Set(['account','archive','ask','creators','fans','inbox','leaderboard','patches','performance','receipts','teams','tracks','watch','welcome']);
const inviteCode = () => new URLSearchParams(location.search).get('invite') || '';
function getPath() {
  const hash = location.hash.slice(1);
  if (!hash || hash==='club-content' || hash==='content') return 'home';
  const aliases = {missions:'rewards/earn',invites:'rewards/redeem','rewards/points-shop':'rewards/redeem','rewards/ledger':'rewards/history','rewards/receipts':'receipts'};
  return Object.hasOwn(aliases,hash) ? aliases[hash] : hash;
}

function Header({page,data,count,openAuth}) {
  const [mobile,setMobile]=useState(false);
  const [menu,setMenu]=useState('');
  useEffect(()=>{setMobile(false);setMenu('');},[page]);
  return h('header',{className:'ai-header'},
    h('a',{className:'ai-brand',href:'#home','aria-label':'FaZe Afterimage home'},h('img',{src:'/brand/logo.png',width:42,height:35,alt:''}),
      h('span',null,h('small',null,'FAZE'),h('strong',null,'AFTERIMAGE'))),
    h('button',{className:'ai-icon ai-mobile-toggle','aria-label':mobile?'Close menu':'Open menu','aria-expanded':mobile,onClick:()=>setMobile(!mobile)},h(Icon,{name:mobile?'close':'menu'})),
    h('nav',{className:'ai-nav'+(mobile?' opened':''),'aria-label':'Main navigation',onClick:e=>{if(e.target.closest('a')){setMobile(false);setMenu('');}},onKeyDown:e=>{if(e.key==='Escape'){setMobile(false);setMenu('');}}},
      simpleLinks.map(([key,label])=>key==='esports'?
        h('div',{key,className:'ai-nav-group'+(menu===key?' shown':'')},h('a',{href:'#esports','aria-current':page===key?'page':undefined},label),
          h('button',{className:'ai-nav-arrow','aria-label':'List esports games','aria-expanded':menu===key,onClick:()=>setMenu(menu===key?'':key)},h(Icon,{name:'down',size:13})),
          h('div',{className:'ai-nav-drop ai-esports-drop'},divisions.map(game=>h('a',{key:game.key,href:'#esports/'+game.key},game.name)))) :
        h('a',{key,href:'#'+key,'aria-current':page===key?'page':undefined},label)),
      h('div',{className:'ai-nav-group'+(menu==='more'?' shown':'')},h('button',{className:'ai-more','aria-expanded':menu==='more',onClick:()=>setMenu(menu==='more'?'':'more')},'More',h(Icon,{name:'down',size:13})),
        h('div',{className:'ai-nav-drop'},extraLinks.map(([key,label])=>h('a',{key,href:'#'+key},label))))),
    h('div',{className:'ai-header-actions'},
      count>0&&h('a',{className:'ai-icon ai-cart-icon',href:'#cart','aria-label':'Cart, '+count+' '+(count===1?'item':'items')},h(Icon,{name:'cart'}),h('span',null,count)),
      data?.user ? h('a',{className:'ai-account-link',href:'#account','aria-label':'Account for '+data.user.name},h(Icon,{name:'person'}),h('span',null,number(data.user.balance)+' pts')) :
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
      h('div',{className:'ai-socials'},h('a',{href:'#home',className:'ai-brand'},h('img',{src:'/brand/logo.png',alt:'',width:45,height:36}),h('strong',null,'FAZE AFTERIMAGE')),
        h('div',{'aria-label':'FaZe social channels'},[
          ['instagram','Instagram','https://www.instagram.com/fazeclan/'],['twitter','X / Twitter','https://x.com/FaZeClan'],
          ['twitch','Twitch','https://www.twitch.tv/faze'],['youtube','YouTube','https://www.youtube.com/@FaZeClan']
        ].map(([icon,name,url])=>h('a',{key:icon,className:'ai-icon',href:url,target:'_blank',rel:'noopener noreferrer','aria-label':name},h(Icon,{name:icon}))))),
      h('div',{className:'ai-newsletter'},h('h2',null,'Stay informed of our newest arrivals, trends, and promotions'),
        h('form',{onSubmit:subscribe},h('input',{type:'email',value:email,onChange:e=>setEmail(e.target.value),required:true,maxLength:254,autoComplete:'email',placeholder:'Email address','aria-label':'Email address for updates'}),
          h('button',{className:'ai-button solid',type:'submit',disabled:pending},pending?'Signing up…':'Sign up for updates')),
        h('button',{className:'ai-text-button',onClick:()=>openAuth('signup',email)},'Create a fan account',h(Icon,{name:'arrow',size:15})))),
    h('div',{className:'ai-footer-bottom'},h('span',null,'FAZE AFTERIMAGE · HACKUTA 2026 FAN PROTOTYPE'),h('a',{href:'#tracks'},'Project details'),h('a',{href:'https://fazeclan.com/policies/terms-of-service',target:'_blank',rel:'noopener noreferrer'},'Official store terms')));
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
      h('img',{src:'/brand/logo.png',alt:'',width:50,height:39}),h('span',{className:'ai-kicker'},'FAZE AFTERIMAGE'),
      h('h2',null,mode==='signup'?'CREATE YOUR ACCOUNT':'WELCOME BACK'),
      invite && mode==='signup' && h('p',{className:'ai-invited'},'You’re joining through a referral link.'),
      h('form',{key:mode,onSubmit:e=>{e.preventDefault();submit(mode,{...Object.fromEntries(new FormData(e.currentTarget)),invite});}},
        mode==='signup'&&h('label',null,'Display name',h('input',{name:'name',value:name,onChange:e=>setName(e.target.value),required:true,maxLength:40,autoComplete:'nickname'})),
        h('label',null,'Email',h('input',{name:'email',type:'email',value:email,onChange:e=>setEmail(e.target.value),required:true,maxLength:254,autoComplete:'email'})),
        h('label',null,'Password',h('input',{name:'password',type:'password',required:true,minLength:10,maxLength:128,autoComplete:mode==='signup'?'new-password':'current-password'})),
        mode==='signup'&&h('p',{className:'ai-muted'},'Use at least 10 characters.'),
        error&&h('p',{className:'ai-form-error',role:'alert'},error),
        h('button',{className:'ai-button solid',type:'submit',disabled:pending},pending?'Please wait…':mode==='signup'?'Create account':'Log in',h(Icon,{name:'arrow'}))),
      h('button',{className:'ai-text-button',onClick:()=>{setError('');setMode(mode==='signup'?'login':'signup');}},mode==='signup'?'Already a member? Log in':'New here? Create an account'),
      h('div',{className:'ai-auth-alternates'},data?.config.google&&h(LinkButton,{href:'/auth/google?invite='+encodeURIComponent(invite),kind:'outline',icon:null},'Continue with Google'),
        data?.config.demo&&h('button',{className:'ai-button outline',disabled:pending,onClick:()=>submit('demo',{invite,walkthrough:'1',name})},'Try a demo account'))));
}

function App() {
  const [path,setPath]=useState(getPath);
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
    const onLegacy=e=>{setData(e.detail);setPath(getPath());};
    window.addEventListener('hashchange',onHash);
    window.addEventListener('afterimage:state',onLegacy);
    refresh().catch(e=>setError(e.message));
    if(inviteCode() && getPath()==='home')openAuth('signup');
    return ()=>{window.removeEventListener('hashchange',onHash);window.removeEventListener('afterimage:state',onLegacy);window.clearTimeout(toastTimer.current);};
  },[]);
  useEffect(()=>{saveCart(cart);},[cart]);
  useEffect(()=>{
    document.title=(simpleLinks.find(([key])=>key===page)?.[1] || (page==='cart'?'Cart':'Fan hub'))+' | FaZe Afterimage';
    if(initialRoute.current){initialRoute.current=false;return;}
    window.scrollTo({top:0,behavior:'instant'});
    document.getElementById('club-content')?.focus({preventScroll:true});
    setVideo(null);
  },[path]);
  useEffect(()=>{
    if(usingLegacy)import('./app.js').catch(e=>setError(e.message));
  },[usingLegacy]);
  useEffect(()=>{
    if(data && page==='account'&&!data.user&&!auth)openAuth('login');
  },[data?.user,page]);

  const content = {
    home:()=>h(Home,{data,openAuth,play}),
    rewards:()=>h(Rewards,{part,data,openAuth,perform,notify}),
    esports:()=>h(Esports,{part,data}),
    gallery:()=>h(Gallery),
    news:()=>h(News,{data,play}),
    shop:()=>h(Shop,{part,add:(item,size)=>{change(item.id,size,1);notify(item.name+' · '+size+' added to cart.');}}),
    cart:()=>h(Cart,{lines:cart,change})
  };
  return h('div',{className:'ai-app'},
    h(Header,{page,data,count,openAuth}),
    h('main',{id:'club-content',tabIndex:-1},
      error && h('p',{className:'ai-global-error',role:'alert'},'Could not load fan data. ',error,' ',h('button',{className:'ai-text-button',onClick:()=>refresh().catch(e=>setError(e.message))},'Retry')),
      h('div',{id:'legacy-main',className:'ai-legacy shell',hidden:!usingLegacy}),
      !usingLegacy && (Object.hasOwn(content,page)?content[page]():h(NotFound))),
    h(Footer,{openAuth,notify}),
    toast&&h('div',{className:'ai-toast'+(toast.danger?' error':''),role:toast.danger?'alert':'status'},toast.message),
    auth&&h(Auth,{mode:auth,setMode:setAuth,initialEmail:email,data,close:()=>setAuth(null),finish:finishAuth}),
    video&&h(VideoModal,{clip:video,close:()=>setVideo(null)}));
}
window.ReactDOM.createRoot(document.querySelector('#club-root')).render(h(App));

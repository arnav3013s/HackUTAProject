
import { h, useEffect, useRef, useState, Image, Icon, LinkButton, Title, api, money, number, date } from './club-ui.js';
import { OG_XP_BONUS_LABEL, RANK_XP_INCLUDE_OG_BONUS, passportConfig as passport } from './passport-config.js';
import { ogConfig as og } from './og-config.js';
import { dropConfig } from './drops-config.js';

export const actionButton = (label, onClick, options = {}) => h('button', { type: 'button', className: 'ai-button ' + (options.kind || 'solid'), onClick, ...options }, label);
export const sampleTag = (label='Sample') => h('span', { className: 'clan-tag clan-sample' }, label);
export function ProgramsHero({ label, title, subtitle, children }) {
  return h('section', { className: 'clan-program-hero' }, h(Title, { label, title }, subtitle), children);
}
export function StateNotice({ status, retry }) {
  if (status.error) return h('div', { className: 'clan-card', role: 'alert' }, h('p', null, status.error), actionButton('Try again', retry, {kind:'outline'}));
  return h('div', { className: 'clan-card clan-loading', role:'status', 'aria-busy':true }, 'Loading…');
}
export function RequireFan({ openAuth, children }) {
  return h('div', { className: 'clan-card clan-empty' }, h('h2',null,'Sign in to continue'), children,
    actionButton('Log in',()=>openAuth('login')), ' ', actionButton('Create account',()=>openAuth('signup'),{kind:'outline'}));
}
export function Field({ title, children }) { return h('label', { className:'clan-field' }, h('span',null,title),children); }
export function Check({ name, children, required, defaultChecked }) {
  return h('label',{className:'clan-check'},h('input',{name,type:'checkbox',required,defaultChecked}),h('span',null,children));
}
export const fieldsOf = form => Object.fromEntries(new FormData(form));
export const when = value => value ? date(value) : '—';
export function Select({ name, items, empty, ...props }) {
  return h('select',{name,...props},empty&&h('option',{value:''},empty),items.map(item=>{
    const [id,label]=Array.isArray(item)?item:[item,item];
    return h('option',{key:id,value:id},label);
  }));
}
export function Form({ onSave, children, title, busy, className = '' }) {
  return h('form',{className:'clan-form '+className,onSubmit:event=>{
    event.preventDefault(); onSave(fieldsOf(event.currentTarget),event.currentTarget);
  }},children,h('button',{className:'ai-button solid',disabled:busy},busy?'Please wait…':title));
}
function makeDevice() {
  try {
    const key='clan-browser-id';
    let id=localStorage.getItem(key);
    if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}
    return id;
  } catch { return ''; }
}
export function usePrograms({ data, notify, season='', preview='', profile='', poll=false, refresh }) {
  const [status,setStatus]=useState({value:null,error:''});
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const request=useRef(0);
  const qs=new URLSearchParams({season,preview,profile});
  const refreshView=async()=>{
    const current=++request.current;
    try {
      const result=await api('programs?'+qs);
      if (current===request.current) setStatus({value:result,error:''});
      return result;
    } catch(error) {
      if(current===request.current)setStatus({value:null,error:error.message});
    }
  };
  useEffect(()=>{
    if (!data) return;
    setStatus({value:null,error:''});
    refreshView();
    const interval=poll?setInterval(refreshView,15000):null;
    return ()=>{request.current++;if(interval)clearInterval(interval);};
  },[Boolean(data),data?.user?.id,season,preview,profile,poll]);
  async function act(action, payload={}) {
    if(lock.current)return null;
    lock.current=true;setBusy(true);
    try {
      const result=await api(action,{season,preview,device:makeDevice(),...payload});
      if(result.url){location.assign(result.url);return result;}
      await Promise.all([refreshView(), refresh?.()]);
      if (result.message) notify(result.message);
      return result;
    } catch(error) { notify(error.message,true);return null; }
    finally {lock.current=false;setBusy(false);}
  }
  return {...status,busy,act,refreshView};
}
export function Progress({ value,max=100,label }) { return h('progress',{className:'clan-progress',value,max,'aria-label':label}); }
export function MyFaze({ user, compact=false }) {
  const item=user?.programs;
  return h(compact?'div':'section',{className:'clan-card clan-my-faze'+(compact?' compact':'')},
    h('div',null,h('span',{className:'ai-kicker'},'MY FAZE'),h('h2',null,item?'Level '+item.level+' · '+item.tier:'Your fan profile'),
      item&&h('p',null,number(item.xp)+' XP · '+number(user.balance)+' points · '+(item.member?'OG Member':'Fan'))),
    item&&h('div',{className:'clan-xp-meter'},h(Progress,{value:item.progress,label:'Progress to next Passport level'}),item.ogXpActive&&h('span',{className:'clan-tag','aria-label':OG_XP_BONUS_LABEL+' OG XP bonus'},'+'+OG_XP_BONUS_LABEL)),
    item?.nextDrop&&h('p',{className:'ai-muted'},'Next drop: '+item.nextDrop),
    h('nav',{className:'clan-action-row','aria-label':'Fan programs'},
      [['/passport','Passport'],['/og','OG Club'],['/drops','Drops'],['/next','FaZe NEXT']].map(([href,label])=>h('a',{key:href,href},label))));
}
export function Countdown({ until, label }) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const t=setInterval(()=>{if(!document.hidden)setNow(Date.now());},1000);return()=>clearInterval(t);},[]);
  const left=Math.max(0, Math.ceil((new Date(until).getTime()-now)/1000));
  return h('span',{className:'clan-countdown'},label&&label+' ',left>0?Math.floor(left/86400)+'d '+Math.floor(left%86400/3600)+'h '+Math.floor(left%3600/60)+'m '+left%60+'s':'Ended');
}
function Stamp({ item }) {
  return h('article',{className:'clan-stamp'+(item.earned?' earned':'')},
    h('span',{className:'clan-stamp-icon'},h(Icon,{name:item.icon,size:24})),
    h('div',null,h('span',{className:'ai-kicker'},item.rarity),h('h3',null,item.name),h('p',null,item.description)),
    h(Progress,{value:item.progress,max:item.goal,label:item.name+' progress'}),
    h('small',null,item.earned?'Earned '+when(item.earned):item.progress+' / '+item.goal));
}
function Boards({ boards, member, friends=true, onlyOG=false }) {
  const [period,setPeriod]=useState(onlyOG?'og':'weekly');
  const options=[['weekly','Weekly'],['monthly','Monthly'],['allTime','All time'],...(friends?[['friends','Friends']]:[]),...(member?[['og','OG members']]:[])];
  const list=boards[period] || [];
  return h('section',{className:'clan-card'},h('h2',null,onlyOG?'OG XP leaderboard':'XP leaderboard'),
    !onlyOG&&h('div',{className:'clan-auth-tabs',role:'group','aria-label':'Leaderboard period'},options.map(([id,label])=>h('button',{key:id,'aria-pressed':period===id,onClick:()=>setPeriod(id)},label))),
    h('p',{className:'ai-muted'},RANK_XP_INCLUDE_OG_BONUS?'Ranked by total XP, including earned OG bonuses.':'Ranked by base XP.'),
    list.length?h('ol',{className:'clan-board'},list.map((row,index)=>h('li',{key:row.id},h('span',null,'#'+(index+1)),h('a',{href:'/passport/'+row.id},row.handle),row.og&&h('span',{className:'clan-tag'},'OG'),h('strong',null,number(row.xp)+' XP')))):
      h('p',{className:'ai-muted'},period==='friends'?'No ranked friends yet. Connect by adding each other’s usernames.':'No ranked members yet.'));
}
function Profile({ profile }) {
  if(!profile)return h('section',{className:'clan-card clan-empty'},h('h2',null,'Profile unavailable'),h('p',null,'This Passport profile may be private.'));
  return h('div',{className:'clan-stack'},
    h('section',{className:'clan-card clan-identity'},h('span',{className:'ai-kicker'},profile.member?'OG MEMBER':'FAZE FAN'),h('h2',null,profile.handle),
      h('p',null,'Level '+profile.level+' · '+profile.tier+' · '+number(profile.xp)+' XP'),
      h('p',null,'Joined '+when(profile.joined),profile.favoriteGame?' · Favorite game: '+profile.favoriteGame:'',profile.rank?' · Rank #'+profile.rank:'')),
    h('section',{className:'clan-card'},h('h2',null,'Showcase'),profile.badges.length?h('div',{className:'clan-grid'},profile.badges.map(item=>h(Stamp,{key:item.id,item}))):h('p',null,'No badges showcased.')),
    h(Collector,{orders:profile.drops}));
}
function Collector({ orders }) {
  return h('section',{className:'clan-card'},h('h2',null,'Collector editions'),
    orders.length?h('ul',{className:'clan-board'},orders.map(row=>h('li',{key:row.id || row.name+row.edition},h('span',null,row.name),' ',h('strong',null,'#'+String(row.edition).padStart(4,'0')+(row.quantity?' of '+row.quantity:''))))):
      h('p',{className:'ai-muted'},'No editions collected yet.'));
}
function PassportPreferences({ my, status }) {
  const [picked,setPicked]=useState(my.showcase);
  const earned=my.badges.filter(item=>item.earned);
  return h('section',{className:'clan-card'},
    h('h2',null,'Profile and privacy'),
    h(Form,{title:'Save profile',busy:status.busy,onSave:fields=>status.act('passport-profile',{...fields,showcase:picked})},
      h(Field,{title:'Public username'},h('input',{name:'handle',defaultValue:my.handle,required:true,minLength:3,maxLength:24})),
      h(Field,{title:'Who can view your profile?'},h(Select,{name:'privacy',defaultValue:my.privacy,items:[['private','Private'],['friends','Friends only'],['public','Public']]})),
      h('p',{className:'ai-muted'},'Showcase up to five earned badges.'),
      earned.length>0&&h('div',{className:'clan-checklist'},earned.map(item=>h('label',{className:'clan-check',key:item.id},h('input',{
        type:'checkbox',checked:picked.includes(item.id),disabled:picked.length>=5&&!picked.includes(item.id),
        onChange:()=>setPicked(items=>items.includes(item.id)?items.filter(id=>id!==item.id):[...items,item.id])
      }),h('span',null,item.name)))),
      h('a',{href:'/passport/'+my.publicId},'View profile')),
    h(Form,{title:'Add friend',busy:status.busy,onSave:fields=>status.act('passport-friend',fields)},
      h(Field,{title:'Friend username'},h('input',{name:'handle',required:true,maxLength:24}))));
}
export function PassportPage({ part, data, openAuth, notify, refresh }) {
  const status=usePrograms({data,notify,refresh,profile:part||''});
  const user=data?.user;
  const my=status.value?.my;
  const groups=[...new Set(my?.badges.map(item=>item.category)||[])];
  return h('div',{className:'clan-program'},
    h(ProgramsHero,{label:'YOUR FAZE JOURNEY',title:part?'MEMBER PASSPORT':'GAMING PASSPORT',subtitle:'Earn XP, level up, and fill your badge book. Spendable points stay in Rewards.'}),
    h('div',{className:'ai-section clan-stack'},
      !status.value?h(StateNotice,{status,retry:status.refreshView}):
      part?h(Profile,{profile:status.value.profile}):
      !my?h(RequireFan,{openAuth},h('p',null,'Your levels and badges follow your account.')):
      h('div',{className:'clan-stack'},
        h(MyFaze,{user}),
        h(XpActivity,{my}),
        h('div',{className:'clan-grid clan-grid-three'},
          h('section',{className:'clan-card'},h('h2',null,'Daily check-in'),h('p',null,my.streak.count+' day streak · '+my.streak.freeze+' freeze available'),
            actionButton(my.streak.checked?'Checked in':'Check in',()=>status.act('passport-checkin'),{disabled:status.busy||my.streak.checked})),
          h('section',{className:'clan-card'},h('h2',null,'Weekly chest'),h('p',null,'Claim two weekly quests in Rewards.'),actionButton(user.weekly?.chestClaimed?'Chest opened':'Open chest',()=>status.act('weekly-chest'),
            {disabled:status.busy||!user.weekly?.chestReady||user.weekly?.chestClaimed}),h('p',null,h('a',{href:'/#rewards/earn'},'Open weekly quests'))),
          h('section',{className:'clan-card'},h('h2',null,'Monthly season'),h('p',null,my.monthly.id+' · Active on '+my.monthly.progress+' of '+passport.monthlyGoal+' days'),
            h(Progress,{value:Math.min(my.monthly.progress,passport.monthlyGoal),max:passport.monthlyGoal,label:'Monthly participation'}),
            actionButton(my.monthly.claimed?'Stamp claimed':'Claim seasonal stamp',()=>status.act('passport-season'),{disabled:status.busy||my.monthly.claimed||my.monthly.progress<passport.monthlyGoal}))),
        h('section',{className:'clan-card'},h('h2',null,'Level perks'),h('p',null,my.next?my.next+' XP to the next level':'Maximum level reached'),
          h('ul',{className:'clan-perks'},passport.tiers.map(tier=>h('li',{key:tier.name,className:my.level<tier.level?'locked':''},h('strong',null,tier.name),h('span',null,tier.perk),h('span',null,my.level<tier.level?'Unlocks at level '+tier.level:'Unlocked'))))),
        h('section',{className:'clan-card clan-passport-book'},h('h2',null,'Passport stamp book'),
          groups.map(group=>h('div',{key:group},h('h3',null,group),h('div',{className:'clan-grid clan-grid-three'},my.badges.filter(badge=>badge.category===group).map(item=>h(Stamp,{key:item.id,item})))))),
        h('div',{className:'clan-grid'},
          h(Boards,{boards:status.value.leaders,member:my.member}),
          h(PassportPreferences,{key:my.publicId,my,status})),
        h(Collector,{orders:my.drops}),
        h('div',{className:'clan-grid'},
          h('section',{className:'clan-card'},sampleTag(),h('h2',null,'Community poll'),h(Form,{title:'Vote',busy:status.busy,onSave:body=>status.act('passport-poll',body)},
            h(Field,{title:passport.poll.prompt},h(Select,{name:'choice',items:passport.poll.options,required:true,empty:'Choose an era'})))),
          h('section',{className:'clan-card'},h('h2',null,'Event attendance'),
            passport.events.length?h(Form,{title:'Verify attendance',busy:status.busy,onSave:body=>status.act('passport-event',body)},
              h(Field,{title:'Event'},h(Select,{name:'id',items:passport.events.map(event=>[event.id,event.name])})),
              h(Field,{title:'Attendance code'},h('input',{name:'code',required:true,maxLength:100}))):h('p',null,'No event check-ins are open.'))),
        h('section',{className:'clan-card clan-sponsored'},h('span',{className:'clan-tag'},'Sponsored'),
          h('h2',null,passport.sponsor.name),h('p',null,passport.sponsor.challenge),h('p',null,passport.sponsor.reward)),
        h(LinkButton,{href:'/next',kind:'outline'},'Enter or vote in FaZe NEXT'))));
}
function XpActivity({ my }) {
  const titles = {watch:'Highlight watched',daily:'Daily task',weekly:'Weekly task',chest:'Weekly chest',poll:'Community poll',event:'Event attendance',competition:'Competition entry',submit:'NEXT submission',vote:'NEXT vote',referral:'Referral',purchase:'Merch purchase',member:'Membership',finalist:'NEXT finalist',throwback:'Throwback challenge'};
  return h('section',{className:'clan-card'},h('h2',null,'XP activity'),
    h('p',null,'OG bonus XP earned: '+number(my.ogBonusXp)),
    my.xpActivity.length?h('ul',{className:'clan-board'},my.xpActivity.map((item,i)=>h('li',{key:item.at+':'+i},
      h('div',null,h('strong',null,titles[item.action] || item.action),h('div',null,when(item.at)),
      item.ogRate>0&&h('small',{className:'clan-xp-bonus'},'+'+new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:2}).format(item.ogRate)+' OG bonus · '+(item.ogBonus?'+'+item.ogBonus+' XP':'fraction carried forward'))),
      h('strong',null,'+'+number(item.xp)+' XP')))):
      h('p',{className:'ai-muted'},'Your earned XP will appear here.'));
}

function RenewalTerms() {
  return h('div',{className:'clan-note'},h('p',null,'Your selected plan renews automatically until canceled. Cancel from your dashboard before renewal. Taxes, where applicable, are shown at checkout.'),
    h('p',null,h('a',{href:'/terms'},'Terms'), ' · ', h('a',{href:'/privacy'},'Privacy'), ' · ',h('a',{href:og.refund},'Refund policy')));
}
function BillingForm({ status, user, change=false }) {
  return h(Form,{title:change?'Change sample plan':user.demo?'Join OG sample plan':'Continue to Stripe test checkout',busy:status.busy,onSave:async fields=>{
    if(!user.demo && fields.adult && !await status.act('passport-age',{adult:true}))return;
    status.act(user.demo?(change?'og-demo-change':'og-demo-join'):'og-checkout',{plan:fields.plan,renewal:Boolean(fields.renewal)});
  }},
    h(Field,{title:'Billing period'},h(Select,{name:'plan',items:[['month',money(og.paid.prices.month/100)+' monthly'],['year',money(og.paid.prices.year/100)+' yearly']]})),
    !user.demo&&h(Check,{name:'adult',required:true},'I confirm I am 18 or older and meet my local minimum purchase age.'),
    h(RenewalTerms),h(Check,{name:'renewal',required:true},'I accept automatic renewal and the cancellation terms.'));
}
export function OgPage({ part, data, openAuth, notify, refresh }) {
  const status=usePrograms({data,notify,refresh});
  const my=status.value?.my;
  const user=data?.user;
  const dashboard=part==='dashboard';
  return h('div',{className:'clan-program'},
    h(ProgramsHero,{label:'ONCE A FAZE FAN, ALWAYS A FAZE FAN',title:dashboard?'OG MEMBERSHIP':'OG CLUB',subtitle:'Reconnect with the eras you grew up with and unlock member perks.'},
      h('div',{className:'clan-program-nav'},h(LinkButton,{href:dashboard?'/og':'/og/dashboard',kind:'outline'},dashboard?'View plans':'Membership dashboard'),h(LinkButton,{href:'/drops',kind:'outline'},'View drops'))),
    h('div',{className:'ai-section clan-stack'},
      user?.accountType==='Returning User'&&og.welcome.enabled&&h('section',{className:'clan-card clan-offer'},h('h2',null,'Welcome back'),h('p',null,og.welcome.label)),
      !status.value?h(StateNotice,{status,retry:status.refreshView}):dashboard?
        !user?h(RequireFan,{openAuth}):h('div',{className:'clan-stack'},
          h('section',{className:'clan-card'},h('h2',null,my.member?'OG · '+(my.plan==='year'?'Annual':'Monthly'):'Fan plan'),
            h('p',null,'Status: '+my.status+' · '+(my.status==='canceling'?'Access ends ':'Renewal or access date ')+when(my.renewal)),
            h('p',null,'Drop savings: '+money(my.savings/100)),my.member&&h('ul',{className:'clan-list'},og.perks.map(perk=>h('li',{key:perk},perk))),
            h('div',{className:'clan-action-row'},
              my.hasStripe&&actionButton('Manage, change or cancel billing',()=>status.act('og-portal'),{disabled:status.busy}),
              user.demo&&my.member&&my.status!=='canceling'&&actionButton('Cancel at renewal',()=>status.act('og-demo-cancel'),{disabled:status.busy,kind:'outline'}),
              user.demo&&my.member&&my.status==='canceling'&&actionButton('Reactivate',()=>status.act('og-demo-reactivate'),{disabled:status.busy}),
              !my.member&&h(LinkButton,{href:'/og'},'View OG plans')),
            user.demo&&my.member&&h('details',null,h('summary',null,'Change billing period'),h(BillingForm,{status,user,change:true}))),
          h('section',{className:'clan-card'},h('h2',null,'Billing history'),
            my.invoices.length?h('ul',{className:'clan-board'},my.invoices.slice().reverse().map((invoice,index)=>h('li',{key:invoice.id||index},h('span',null,when(invoice.at)),h('span',null,invoice.status),h('strong',null,money(invoice.cents/100))))):h('p',null,'No invoices yet.')),
          my.member&&h('div',{className:'clan-grid'},
            h('section',{className:'clan-card'},h('h2',null,'Classic Vault'),og.vault.map(item=>h('p',{key:item.title},item.title))),
            h('section',{className:'clan-card'},h('h2',null,'Member events and codes'),og.events.map(item=>h('p',{key:item.title},item.title)),og.codes.map(item=>h('p',{key:item},item)))),
          my.member&&h(Boards,{boards:status.value.leaders,member:true,onlyOG:true})) :
        h('div',{className:'clan-stack'},
          h('section',{className:'clan-card'},sampleTag('Sample pricing'),h('h2',null,'Compare membership tiers'),
            h('div',{className:'clan-table'},h('table',null,h('thead',null,h('tr',null,h('th',null,'Perk'),h('th',null,'Fan · Free'),h('th',null,'OG · '+og.paid.priceLabel))),
              h('tbody',null,h('tr',null,h('th',{scope:'row'},'Passport XP'),h('td',null,'Base XP'),h('td',null,'+'+OG_XP_BONUS_LABEL+' XP')),[...og.free.perks,...og.perks].map((perk,index)=>h('tr',{key:perk},h('th',{scope:'row'},perk),h('td',null,index<og.free.perks.length?'Included':'—'),h('td',null,'Included')))))),
            h('p',null,money(og.paid.prices.month/100)+' / month · '+money(og.paid.prices.year/100)+' / year · '+money((og.paid.prices.month*12-og.paid.prices.year)/100)+' sample annual savings.')),
          h('section',{className:'clan-card'},h('h2',null,'Join OG'),!user?h(RequireFan,{openAuth}):
            !user.demo&&!status.value.stripe?h('p',{role:'status'},'Stripe test checkout is awaiting configuration.'):
            my.member?h(LinkButton,{href:'/og/dashboard'},'Manage membership'):h(BillingForm,{status,user})),
          h('section',{className:'clan-card'},h('h2',null,'FAQ'),
            h('details',null,h('summary',null,'How do I cancel?'),h('p',null,'Open Membership dashboard and manage or cancel your plan there.')),
            h('details',null,h('summary',null,'How do points change?'),h('p',null,'Eligible earned points receive an OG multiplier while the plan is active. Passport XP is separate.')),
            h('details',null,h('summary',null,'How do drops work?'),h('p',null,'Some drops open to OG members before the public launch. Edition availability and access rules appear on each drop.')))),
      h(LinkButton,{href:'/drops',kind:'outline'},'Explore limited drops')));
}
function DropImage({ drop }) {
  return h('div',{className:'clan-drop-image'},h(Image,{src:drop.gallery[0],alt:drop.sample?'FaZe logo, sample artwork':drop.name}));
}
function DropDetail({ drop, status, user, openAuth }) {
  const reserved=status.value.bookings.find(item=>item.drop===drop.id);
  return h('section',{className:'clan-card clan-drop-detail'},
    h('div',null,h(DropImage,{drop}),h('div',{className:'clan-drop-gallery'},drop.gallery.slice(1).map(src=>h(Image,{key:src,src,alt:drop.name})))),
    h('div',null,drop.sample&&sampleTag(),h('h2',null,drop.name),h('p',null,drop.story),
      h('p',{className:'clan-tag'},drop.status+' · '+number(drop.remaining)+' of '+number(drop.quantity)+' available'),
      drop.status==='Upcoming'&&h(Countdown,{until:drop.launch,label:'Public launch in'}),
      h('p',null,drop.product+' · '+drop.priceLabel+' · '+money(drop.priceCents/100)+' sample'),
      h('p',null,drop.lock),
      reserved&&h('p',null,'Edition #'+String(reserved.edition).padStart(4,'0')+' is in your checkout. ',h('a',{href:'/#cart'},'Open cart')),
      !user?actionButton('Log in to continue',()=>openAuth('login')):drop.status==='Live'&&drop.unlocked?
        h(Form,{title:'Reserve edition',busy:status.busy,onSave:async body=>{
          const result=await status.act('drop-reserve',{id:drop.id,...body});
          if(result)location.assign('/#cart');
        }},h(Field,{title:'Size'},h(Select,{name:'size',items:drop.sizes,required:true,empty:'Select size'})),
          h(Field,{title:'Color'},h(Select,{name:'color',items:drop.colors,required:true,empty:'Select color'}))):
        drop.status!=='Live'&&actionButton(drop.status==='Sold Out'?'Join waitlist':'Notify me',()=>status.act('drop-notify',{id:drop.id}),{disabled:status.busy,kind:'outline'}),
      h('details',null,h('summary',null,'Shipping, returns and edition limits'),h('p',null,'Sample orders do not ship or collect money. Live shipping and returns require approved terms. One numbered edition per account.'),h('a',{href:'/terms'},'Terms'))));
}
export function DropsPage({ part, data, openAuth, notify, refresh }) {
  const status=usePrograms({data,notify,refresh,poll:true});
  const drops=status.value?.drops||[];
  const item=drops.find(drop=>drop.id===part);
  return h('div',{className:'clan-program'},
    h(ProgramsHero,{label:'NUMBERED FAZE EDITIONS',title:part&&item?item.name:'DROPS',subtitle:'Limited-run editions with live availability, OG access, and Passport unlocks.'},
      h('div',{className:'clan-program-nav'},h(LinkButton,{href:part?'/drops':'/og',kind:'outline'},part?'All drops':'OG Club'),h(LinkButton,{href:'/#rewards/redeem',kind:'outline'},'Rewards Shop'))),
    h('div',{className:'ai-section clan-stack'},
      !status.value?h(StateNotice,{status,retry:status.refreshView}):part?
        item?h(DropDetail,{drop:item,status,user:data?.user,openAuth}):h('div',{className:'clan-card'},'Drop not found.'):
        h('div',{className:'clan-grid clan-grid-three'},drops.map(drop=>h('article',{className:'clan-card clan-drop-card',key:drop.id},h(DropImage,{drop}),
          h('div',null,drop.sample&&sampleTag(),h('span',{className:'clan-tag'},drop.status),h('h2',null,drop.name),
            h('p',null,drop.story),h('p',null,drop.remaining+' of '+drop.quantity+' available'),
            drop.status==='Upcoming'&&h(Countdown,{until:drop.launch,label:'Launch in'}),
            drop.lock&&h('p',{className:'ai-muted'},drop.lock),h(LinkButton,{href:'/drops/'+drop.id,kind:'outline'},'View edition'))))),
      !part&&status.value&&!drops.length&&h('p',{className:'clan-card'},'No drops are currently listed.')));
}

export function CreatorCodeField({ sample=false, title='Creator code', ...props }) {
  return h(Field,{title},h('input',{name:'creatorCode',maxLength:sample?20:60,placeholder:sample?dropConfig.previewCreatorCode:'Enter creator code',...props}));
}
export function DropCheckout({ data, notify, refresh }) {
  const status=usePrograms({data,notify,refresh,poll:true});
  const [last,setLast]=useState('');
  if(!data?.user || !status.value)return null;
  const {bookings,drops,my}=status.value;
  const receipt=my.drops.find(row=>row.id===last);
  if(!bookings.length&&!receipt)return null;
  return h('div',{className:'ai-section clan-stack'},
    receipt&&h('section',{className:'clan-card',role:'status'},sampleTag('Sample order'),h('h2',null,'Edition confirmed'),
      h('p',null,receipt.name+' · #'+String(receipt.edition).padStart(4,'0')+' of '+receipt.quantity),
      h('p',null,money(receipt.total/100)+' sample total. No payment collected.'),h(LinkButton,{href:'/passport'},'View my collection')),
    bookings.map(booking=>{const drop=drops.find(item=>item.id===booking.drop);if(!drop)return null;return h('section',{className:'clan-card',key:booking.id},
      sampleTag('Sample checkout'),h('h2',null,drop.name),h('p',null,'Edition #'+String(booking.edition).padStart(4,'0')+' of '+drop.quantity+' · '+booking.size+' · '+booking.color),
      h(Countdown,{until:booking.expires,label:'Reservation expires in'}),
      h(Form,{title:'Confirm sample order',busy:status.busy,onSave:async body=>{
        const result=await status.act('drop-order',{id:drop.id,booking:booking.id,...body,terms:Boolean(body.terms)});
        if(result)setLast(result.order);
      }},h(CreatorCodeField,{sample:true}),
      h(Field,{title:'Points to apply'},h('input',{name:'points',type:'number',min:0,step:1,max:Math.min(data.user.balance, Math.floor(drop.priceCents*dropConfig.pointCapPercent/100)),defaultValue:0})),
      h('p',null,'Up to '+dropConfig.pointCapPercent+'% of the discounted subtotal may be paid with points. Eligible discounts apply at confirmation.'),
      h(Check,{name:'terms',required:true},'I agree to sample order terms. No charge, shipment, or fulfillment.')),
      actionButton('Release reservation',()=>status.act('drop-release',{id:drop.id,booking:booking.id}),{kind:'outline',disabled:status.busy}));}));
}

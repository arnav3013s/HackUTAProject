import { h, useEffect, useRef, useState, Image, Icon, LinkButton, Title, SectionTitle, Filters, Modal } from './club-ui.js';
import { gallery } from './gallery-data.js';
import { divisions, galleryFilters, primaryGalleryGames, updates } from './esports-data.js';
import { products } from './shop-data.js';
import { ProductGrid } from './shop-ui.js';

const divisionName = key => divisions.find(entry=>entry.key===key)?.name;
const divisionPhoto = key => gallery.find(x=>x.game===key);
const jump = id => document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
let lastGalleryFilter = 'all';

function Moment({ photo, open, className = '' }) {
  return h('button',{className:'ai-moment '+className,onClick:()=>open(photo),'aria-label':'View photo: '+photo.title},
    h(Image,{src:photo.url,alt:photo.subject,fallback:null}),h('span',{className:'ai-moment-open'},h(Icon,{name:'diagonal'})),
    h('span',{className:'ai-moment-text'},h('span',{className:'ai-kicker'},divisionName(photo.game)),h('strong',null,photo.title),h('small',null,photo.subject)));
}

export function Gallery() {
  const [filter,setFilter]=useState(lastGalleryFilter);
  const [selection,setSelection]=useState(null);
  const shown=gallery.filter(photo=>filter==='all'||(filter==='other-games' ? !primaryGalleryGames.has(photo.game) : photo.game===filter));
  const open=(photo, items)=>setSelection({index:items.indexOf(photo),items});
  const shift=step=>setSelection(state=>({...state,index:(state.index+step+state.items.length)%state.items.length}));
  const active=selection?.items[selection.index];
  return h('div',{className:'ai-gallery-page'},
    h('section',{className:'ai-editorial-hero'},
      h(Image,{src:gallery[0].url,alt:'FaZe players celebrating their 2022 Antwerp Major victory',priority:true,fallback:gallery[3].url}),
      h('div',{className:'ai-editorial-copy'},h('p',{className:'ai-kicker'},'FAZE ESPORTS GALLERY'),h('h1',null,'THE LEGACY',h('br'),'OF ',h('em',null,'FAZE')),h('p',null,'More than a team. A culture. A legacy.'),
        h('button',{className:'ai-button outline',onClick:()=>jump('ai-championships')},'Explore the gallery',h(Icon,{name:'down'})))),
    h('section',{className:'ai-section',id:'ai-championships'},
      h(SectionTitle,{label:'THE TROPHY ROOM',title:'CHAMPIONSHIP MOMENTS'}),
      h('div',{className:'ai-feature-grid'},gallery.slice(0,3).map((photo,i)=>h(Moment,{key:photo.id,photo,className:i===0?'lead':'',open:value=>open(value,gallery.slice(0,3))})))),
    h('section',{className:'ai-section ai-gallery-archive'},
      h(SectionTitle,{label:'THE PHOTO ARCHIVE',title:'ALL MOMENTS'}),
      h(Filters,{items:galleryFilters,current:filter,select:value=>{lastGalleryFilter=value;setFilter(value);},name:'Filter gallery by game'}),
      h('p',{className:'ai-results-count','aria-live':'polite'},shown.length+' photos'),
      h('div',{className:'ai-gallery-grid',key:filter},shown.map(photo=>h(Moment,{key:photo.id,photo,open:value=>open(value,shown)})))),
    active && h(Modal,{label:'photo viewer',className:'ai-lightbox',close:()=>setSelection(null),keyboard:e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();shift(e.key==='ArrowLeft'?-1:1);}
    }},
      h('div',{className:'ai-lightbox-media',key:active.id},h(Image,{src:active.url,alt:active.title+' — '+active.subject,priority:true,fallback:null})),
      h('div',{className:'ai-lightbox-caption'},h('div',null,h('span',{className:'ai-kicker'},divisionName(active.game)+'  /  '+(selection.index+1)+' of '+selection.items.length),h('h2',null,active.title),h('p',null,active.subject),h('a',{href:active.source,target:'_blank',rel:'noopener noreferrer'},'Photo source · '+active.credit)),
        h('div',{className:'flex gap-2'},h('button',{className:'ai-icon',onClick:()=>shift(-1),'aria-label':'Previous photo'},h(Icon,{name:'left'})),h('button',{className:'ai-icon',onClick:()=>shift(1),'aria-label':'Next photo'},h(Icon,{name:'right'}))))));
}

function GameCard({division}) {
  return h('a',{className:'ai-game-card',href:'#esports/'+division.key},h(Image,{src:division.art || divisionPhoto(division.key)?.url,alt:'',fallback:divisionPhoto(division.key)?.url}),h('div',null,h('span',{className:'ai-kicker'},division.caption),h('h3',null,division.name),h(Icon,{name:'diagonal'})));
}

export function Esports({ part, data }) {
  const division=divisions.find(item=>item.key===part);
  const roster=data?.rosters.find(item=>item.game===division?.rosterGame);
  const featured=divisionPhoto(division?.key);
  return h('div',{className:'ai-esports-page'},
    h(Title,{label:'COMPETITIVE DIVISIONS',title:division?.name || 'FAZE ESPORTS'},division?.lead || 'Explore the teams, titles and players that shaped FaZe on the world stage.'),
    h('nav',{className:'ai-section ai-division-tabs','aria-label':'Esports divisions'},
      h('a',{href:'#esports','aria-current':division?undefined:'page'},'All games'),
      divisions.map(game=>h('a',{key:game.key,href:'#esports/'+game.key,'aria-current':division===game?'page':undefined},game.name))),
    !division ? h('section',{className:'ai-section ai-division-grid'},divisions.map(game=>h(GameCard,{key:game.key,division:game}))) :
    h('section',{className:'ai-section ai-division-detail'},
      featured && h('figure',{className:'ai-team-photo'},h(Image,{src:featured.url,alt:featured.subject,priority:true}),h('figcaption',null,featured.subject,' · ',h('a',{href:featured.source,target:'_blank',rel:'noopener noreferrer'},featured.credit))),
      h('div',{className:'ai-results'},
        h(SectionTitle,{label:'COMPETITIVE RECORD',title:'TOURNAMENT RESULTS'}),
        h('div',{className:'ai-table-scroll'},h('table',null,h('thead',null,h('tr',null,['Year','Event','Finish','Details'].map(s=>h('th',{key:s,scope:'col'},s)))),
          h('tbody',null,division.results.map(row=>h('tr',{key:row.event},h('td',null,row.year),h('th',{scope:'row'},row.event),h('td',{className:'ai-red'},row.place),h('td',null,row.detail)))))),
      h(SectionTitle,{label:roster?.status || 'TEAM ARCHIVE',title:roster?.players.length?'FEATURED ROSTER':'HISTORICAL PLAYERS'}),
      h('ul',{className:'ai-roster'},(roster?.players.length?roster.players:roster?.alumni || []).map(player=>h('li',{key:player},player))),
      Boolean(roster?.players.length && roster?.alumni.length) && h('details',{className:'ai-disclosure'},h('summary',null,'View alumni'),h('ul',{className:'ai-roster'},roster.alumni.map(player=>h('li',{key:player},player)))),
      h('div',{className:'ai-actions'},h(LinkButton,{href:division.source,kind:'outline',external:true,icon:'diagonal'},'Results and roster source'),h(LinkButton,{href:'/brand/timeline.pdf',kind:'outline',external:true,icon:'diagonal'},'HackUTA FaZe timeline')))));
}

function VideoCard({ clip, play }) {
  return h('button',{className:'ai-video-card',onClick:()=>play(clip)},
    h(Image,{src:clip.image,alt:''}),h('span',{className:'ai-play'},h(Icon,{name:'play',size:20})),
    h('span',{className:'ai-video-text'},h('span',{className:'ai-kicker'},clip.label || clip.channel+' / '+clip.year),h('strong',null,clip.title)));
}

export function VideoModal({ clip, close }) {
  return h(Modal,{label:'video player',className:'ai-video-modal',close},
    h('iframe',{title:clip.title,src:'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(clip.id)+'?autoplay=1&rel=0',allow:'autoplay; encrypted-media; picture-in-picture; fullscreen',allowFullScreen:true,referrerPolicy:'strict-origin-when-cross-origin'}),
    h('div',{className:'ai-lightbox-caption'},h('h2',null,clip.title),h(LinkButton,{href:clip.url,kind:'outline',external:true,icon:'diagonal'},'Open on YouTube')));
}

export function News({ data, play }) {
  const [filter,setFilter]=useState('all');
  const list=updates.filter(item=>filter==='all'||filter===item.type);
  const official = (data?.faze?.videos || []).filter(item=>item.year>=2022);
  return h('div',null,
    h(Title,{label:'THE FAZE FEED',title:'NEWS'},'New uploads, tournament dates, and streams from the FaZe ecosystem.'),
    h('section',{className:'ai-section'},
      h(Filters,{items:[['all','All updates'],['video','Videos'],['tournament','Tournaments'],['stream','Streams']],current:filter,select:setFilter,name:'Filter news'}),
      h('div',{className:'ai-news-grid'},list.map(item=>item.type==='video' ? h(VideoCard,{key:item.title,clip:item,play}) :
        h('article',{className:'ai-news-card',key:item.title},h('span',{className:'ai-kicker'},item.label),h('h2',null,item.title),h('p',null,item.summary),h(LinkButton,{href:item.url,kind:'outline',external:true,icon:'diagonal'},item.type==='stream'?'Open channel':'Event schedule'))))),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'FAZE ON YOUTUBE',title:'FROM THE CHANNELS',href:'#watch',action:'Browse the archive'}),h('div',{className:'ai-video-grid'},official.map(clip=>h(VideoCard,{key:clip.id,clip,play})))));
}

export function Home({ data, openAuth, play }) {
  const video=useRef(null);
  const [playing,setPlaying]=useState(false);
  const [videoReady,setVideoReady]=useState(false);
  const [reduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    if(!video.current || reduced) return;
    video.current.play().catch(()=>{});
  },[data?.config.heroVideo,reduced]);
  const moments=gallery.slice(0,3);
  const legacyVideo=data?.faze.videos.find(clip=>clip.id==='rACwtbTSqwE');
  return h('div',{className:'ai-home'},
    h('section',{className:videoReady?'ai-hero ai-hero-video-ready':'ai-hero'},
      h(Image,{className:'ai-hero-poster',src:'/art/stage.jpg',alt:'',priority:true,fallback:null}),
      data?.config?.heroVideo && h('video',{
        className:'ai-hero-video',ref:video,src:data.config.heroVideo,muted:true,loop:true,playsInline:true,
        preload:reduced?'none':'metadata',onLoadedData:()=>setVideoReady(true),
        onError:()=>{setVideoReady(false);setPlaying(false);},
        onPlay:()=>setPlaying(true),onPause:()=>setPlaying(false),'aria-hidden':true
      }),
      h('div',{className:'ai-hero-shade'}),h('div',{className:'ai-hero-lines','aria-hidden':true}),
      h('div',{className:'ai-hero-body'},
        h('div',{className:'ai-hero-copy'},
          h('p',{className:'ai-kicker ai-hero-kicker'},h('span',{className:'ai-signal'}),'THE FAZE FAN EXPERIENCE'),
          h('h1',null,h('span',null,'FAZE'),h('em',null,'AFTERIMAGE')),
          h('p',{className:'ai-hero-description'},'From the first trickshots to the world stage. Watch the moments, follow the teams, and earn your place in the next era.'),
          h('div',{className:'ai-actions'},h(LinkButton,{href:'#gallery'},'Explore the legacy'),h(LinkButton,{href:'#esports',kind:'outline'},'Meet the teams'))),
        h('aside',{className:'ai-hero-account'},h('img',{src:'/brand/logo.png',alt:'',width:53,height:42}),h('h2',null,data?.user?'WELCOME BACK':'ENTER FAZE'),
          h('p',null,data?.user?data.user.name+', your points and daily challenges are waiting.':'Create an account to earn points, invite friends, and unlock rewards.'),
          data?.user ? h(LinkButton,{href:'#rewards'},'Open rewards') :
          h('div',{className:'ai-hero-auth-actions'},
            h('button',{className:'ai-button solid',onClick:()=>openAuth('signup')},'Sign up',h(Icon,{name:'arrow'})),
            h('button',{className:'ai-button outline',onClick:()=>openAuth('login')},'Log in',h(Icon,{name:'person'}))))),
      h('div',{className:'ai-hero-bottom'},h('button',{className:'ai-down',onClick:()=>jump('ai-latest')},h(Icon,{name:'down'}),'Discover'),
        data?.config?.heroVideo && h('button',{className:'ai-icon',onClick:()=>{if(video.current.paused) video.current.play().catch(()=>{});else video.current.pause();},'aria-label':playing?'Pause background video':'Play background video'},h(Icon,{name:playing?'pause':'play'})))),
    h('section',{className:'ai-section',id:'ai-latest'},
      h(SectionTitle,{label:'RECENT UPLOADS',title:'WATCH NOW',href:'#news',action:'See the news feed'}),
      h('div',{className:'ai-video-grid'},h(VideoCard,{clip:updates[0],play}),legacyVideo && h(VideoCard,{clip:legacyVideo,play}))),
    h('section',{className:'ai-section'},
      h(SectionTitle,{label:'ESPORTS HIGHLIGHTS',title:'MOMENTS THAT MADE FAZE',href:'#gallery',action:'Open the gallery'}),
      h('div',{className:'ai-home-moments'},moments.map(photo=>h('a',{className:'ai-highlight',key:photo.id,href:'#esports/'+photo.game},
        h(Image,{src:photo.url,alt:''}),h('div',null,h('span',{className:'ai-kicker'},photo.subject),h('h3',null,photo.title),h(Icon,{name:'diagonal'})))))),
    h('section',{className:'ai-section'},
      h('aside',{className:'ai-archive-callout'},h('div',null,h('span',{className:'ai-kicker'},'THE OG ARCHIVE'),h('h2',null,'BACK TO ILLCAMS'),h('p',null,'Revisit the trickshot series that started it all. Then try the archive challenge in Rewards.')),h(LinkButton,{href:'#watch/og',kind:'outline'},'Watch the originals'))),
    h('section',{className:'ai-section'},
      h(SectionTitle,{label:'OFFICIAL MERCH',title:'THE FAZE SHOP',href:'#shop',action:'Shop all merch'}),
      h(ProductGrid,{items:[products[1],products[0],products[2],products[3]]})),
    h('section',{className:'ai-about'},h('div',{className:'ai-about-photo'},h(Image,{src:'https://cdn.shopify.com/s/files/1/0667/9547/1031/files/Video_image.png?v=1770079941',alt:'FaZe Clan team and creators',fallback:gallery[0].url})),
      h('div',{className:'ai-about-copy'},h('span',{className:'ai-kicker'},'WHO ARE WE?'),h('h2',null,'WE DON’T JUST FOLLOW TRENDS. ',h('em',null,'WE CREATE THEM.')),
        h('p',null,'FaZe started as a group of friends sharing Call of Duty clips. Today its players and creators bring competitive gaming together with fashion, music and entertainment.'),
        h(LinkButton,{href:'https://fazeclan.com/pages/about',kind:'outline',external:true,icon:'diagonal'},'Our story'))),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'THE TEAMS',title:'ESPORTS',href:'#esports',action:'Explore all divisions'}),
      h('div',{className:'ai-division-grid ai-home-games'},divisions.map(division=>h(GameCard,{key:division.key,division})))));
}

export function NotFound() {
  return h('section',{className:'ai-section'},h(Title,{label:'404',title:'PAGE NOT FOUND'}),h(LinkButton,{href:'#home'},'Back to home'));
}

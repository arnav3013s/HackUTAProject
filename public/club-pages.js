import { h, useEffect, useRef, useState, Image, Icon, LinkButton, Title, SectionTitle, Filters, Modal, api } from './club-ui.js';
import { gallery } from './gallery-data.js';
import { divisions, galleryFilters, primaryGalleryGames, updates } from './esports-data.js';
import { teams } from './teams-data.js';

const divisionName = key => divisions.find(entry=>entry.key===key)?.name;
const divisionPhoto = key => gallery.find(x=>x.game===key);
const jump = id => document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
let lastGalleryFilter = 'all';

function Moment({ photo, open, className = '' }) {
  return h('button',{className:'ai-moment '+className,onClick:()=>open(photo),'aria-label':'View photo: '+photo.title},
    h(Image,{src:photo.url,alt:photo.subject,fallback:null}),h('span',{className:'ai-moment-open'},h(Icon,{name:'diagonal'})),
    h('span',{className:'ai-moment-text'},h('span',{className:'ai-kicker'},divisionName(photo.game)),h('strong',null,photo.title),h('small',null,photo.subject)));
}

export function Gallery({ data, play }) {
  const [filter,setFilter]=useState(lastGalleryFilter);
  const [selection,setSelection]=useState(null);
  const [videoError,setVideoError]=useState(false);
  const shown=gallery.filter(photo=>filter==='all'||(filter==='other-games' ? !primaryGalleryGames.has(photo.game) : photo.game===filter));
  const open=(photo, items)=>setSelection({index:items.indexOf(photo),items});
  const shift=step=>setSelection(state=>({...state,index:(state.index+step+state.items.length)%state.items.length}));
  const active=selection?.items[selection.index];
  return h('div',{className:'ai-gallery-page'},
    h('section',{className:'ai-editorial-hero'},
      h(Image,{src:gallery[0].url,alt:'FaZe players celebrating their 2022 Antwerp Major victory',priority:true,fallback:gallery[3].url}),
      h('div',{className:'ai-editorial-copy'},h('p',{className:'ai-kicker'},'FaZe ESPORTS GALLERY'),h('h1',null,'THE LEGACY',h('br'),'OF ',h('em',null,'FaZe')),h('p',null,'More than a team. A culture. A legacy.'),
        h('button',{className:'ai-button outline',onClick:()=>jump('ai-championships')},'Explore the gallery',h(Icon,{name:'down'})))),
    h('section',{className:'ai-section',id:'ai-championships'},
      h(SectionTitle,{label:'THE TROPHY ROOM',title:'CHAMPIONSHIP MOMENTS'}),
      h('div',{className:'ai-feature-grid'},gallery.slice(0,3).map((photo,i)=>h(Moment,{key:photo.id,photo,className:i===0?'lead':'',open:value=>open(value,gallery.slice(0,3))})))),
    h('section',{className:'ai-section ai-gallery-archive'},
      h(SectionTitle,{label:'THE PHOTO ARCHIVE',title:'ALL MOMENTS'}),
      h(Filters,{items:galleryFilters,current:filter,select:value=>{lastGalleryFilter=value;setFilter(value);},name:'Filter gallery by game'}),
      h('p',{className:'ai-results-count','aria-live':'polite'},shown.length+' photos'),
      h('div',{className:'ai-gallery-grid',key:filter},shown.map(photo=>h(Moment,{key:photo.id,photo,open:value=>open(value,shown)})))),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'ON THE SCREEN',title:'HIGHLIGHTS'}),
      h('div',{className:'gallery-video-layout'},
        h('div',null,videoError ? h('p',{role:'status'},'The reel could not load. Try another highlight below.') :
          h('video',{controls:true,preload:'metadata',playsInline:true,poster:'/hero.png',width:960,height:540,onError:()=>setVideoError(true)},
            h('source',{src:data?.config?.heroVideo || '/hero.mp4',type:'video/mp4'}))),
        h('div',{className:'gallery-video-links'},(data?.faze?.videos || []).slice(0,3).map(clip=>h(VideoCard,{key:clip.id,clip,play}))))),
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

export function Esports({ part, data, play }) {
  const division=divisions.find(item=>item.key===part);
  const highlights=(data?.faze?.videos || []).filter(clip=>clip.game?.toLowerCase().includes(division?.name.toLowerCase() || '---')).slice(0,3);
  const show=division ? [division] : divisions.slice(0,6);
  return h('div',{className:'ai-esports-page'},
    h('section',{className:'esports-hero'},h('p',{className:'ai-kicker'},'THE COMPETITIVE EDGE'),
      h('h1',null,division ? division.name : 'FaZe ESPORTS'),
      h('p',null,division?.lead || 'Six current divisions. A legacy of championship moments. Find the roster and follow the next match.'),
      h('div',{className:'ai-actions'},h(LinkButton,{href:'/teams'},'Meet current teams'),h(LinkButton,{href:'#news',kind:'outline'},'Watch highlights'))),
    h('section',{className:'ai-section esports-teams'},h(SectionTitle,{label:'CURRENT DIVISIONS',title:'TEAMS',href:'/teams',action:'All rosters'}),
      h('div',{className:'esports-marquee','aria-label':'Current teams, continuously scrolling'},
        h('div',{className:'esports-marquee-track'},[...teams,...teams].map((team,index)=>h('a',{key:index,href:'/teams#'+team.slug,'aria-label':'Meet FaZe '+team.name},
          h('span',null,'0'+(index%teams.length+1)),h('strong',null,team.name),h(Icon,{name:'arrow'})))))),
    h('section',{className:'ai-section esports-results'},h(SectionTitle,{label:division?'DIVISION INTEL':'THE LATEST RECORD',title:division?'PAST RESULTS':'PAST RESULTS'}),
      h('div',{className:'esports-event-grid'},show.map(game=>h('article',{key:game.key},
        h('span',{className:'ai-kicker'},game.caption),h('h2',null,game.name),
        h('ul',null,game.results.slice(0,3).map(result=>h('li',{key:result.event},h('strong',null,result.year+' · '+result.event),h('span',null,result.place+' · '+result.detail)))),
        h('a',{href:'/teams#'+(teams.find(team=>team.name.toLowerCase().includes(game.name.toLowerCase()))?.slug || teams[0].slug)},'Meet current roster →'))))),
    h('section',{className:'ai-section esports-live-grid'},
      h('article',null,h('span',{className:'ai-kicker'},'NEXT UP'),h('h2',null,'UPCOMING MATCHES'),
        h('p',null,'No verified upcoming fixtures are connected yet. Check the official competition schedule for match times.'),
        h(LinkButton,{href:'#news',kind:'outline'},'Open news and schedules')),
      h('article',null,h('span',{className:'ai-kicker'},'LIVE TABLE'),h('h2',null,'STANDINGS'),
        h('p',null,'Live standings will appear when an official competition feed is connected. Historical results are above.'),
        h(LinkButton,{href:'/teams',kind:'outline'},'Explore teams'))),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'OFFICIAL VIDEO ARCHIVE',title:'HIGHLIGHT CLIPS',href:'#watch',action:'See all videos'}),
      h('div',{className:'ai-video-grid'},(highlights.length?highlights:(data?.faze?.videos || []).slice(0,2)).map(clip=>h(VideoCard,{key:clip.id,clip,play})))));
}

function VideoCard({ clip, play }) {
  return h('button',{className:'ai-video-card',onClick:()=>play(clip)},
    h(Image,{src:clip.image,alt:''}),h('span',{className:'ai-play'},h(Icon,{name:'play',size:20})),
    h('span',{className:'ai-video-text'},h('span',{className:'ai-kicker'},clip.label || clip.channel+' / '+clip.year),h('strong',null,clip.title)));
}

export function VideoModal({ clip, close }) {
  return h(Modal,{label:'video player',className:'ai-video-modal',close},
    h('iframe',{title:clip.title,src:'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(clip.id)+'?autoplay=1&rel=0&playsinline=1',allow:'autoplay; encrypted-media; picture-in-picture; fullscreen',allowFullScreen:true,referrerPolicy:'strict-origin-when-cross-origin'}),
    h('div',{className:'ai-lightbox-caption'},h('h2',null,clip.title),h(LinkButton,{href:clip.url,kind:'outline',external:true,icon:'diagonal'},'Open on YouTube')));
}

export function News({ data, play }) {
  const [filter,setFilter]=useState('all');
  const list=updates.filter(item=>filter==='all'||filter===item.type);
  const official = (data?.faze?.videos || []).filter(item=>item.year>=2022);
  return h('div',null,
    h(Title,{label:'THE FaZe FEED',title:'NEWS'},'New uploads, tournament dates, and streams from the FaZe ecosystem.'),
    h('section',{className:'ai-section'},
      h(Filters,{items:[['all','All updates'],['video','Videos'],['tournament','Tournaments'],['stream','Streams']],current:filter,select:setFilter,name:'Filter news'}),
      h('div',{className:'ai-news-grid'},list.map(item=>item.type==='video' ? h(VideoCard,{key:item.title,clip:item,play}) :
        h('article',{className:'ai-news-card',key:item.title},h('span',{className:'ai-kicker'},item.label),h('h2',null,item.title),h('p',null,item.summary),h(LinkButton,{href:item.url,kind:'outline',external:true,icon:'diagonal'},item.type==='stream'?'Open channel':'Event schedule'))))),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'FaZe ON YOUTUBE',title:'FROM THE CHANNELS',href:'#watch',action:'Browse the archive'}),h('div',{className:'ai-video-grid'},official.map(clip=>h(VideoCard,{key:clip.id,clip,play})))));
}

function FanLabHome({ data, openAuth }) {
  const [fans, setFans] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!data?.user?.canUseFanLab) return;
    api('fans').then(result => setFans(result.fans)).catch(problem => setError(problem.message));
  }, [data?.user?.id]);
  const found = fans.filter(fan => (fan.name + ' ' + fan.games.join(' ')).toLowerCase().includes(search.toLowerCase()));
  return h('section', { className: 'ai-section fanlab-home', id: 'fanlab' },
    h(SectionTitle, { label: 'FAN INTELLIGENCE', title: 'FAN LAB' }),
    h('p', null, 'Compare the four demo account types, their activity, and their point histories. These are examples, never real fans.'),
    data?.user?.canUseFanLab ? h('div', null,
      h('label', null, 'Search fan profiles', h('input', { type: 'search', value: search, onChange: e => setSearch(e.target.value), placeholder: 'Name or game' })),
      error && h('p', { role: 'alert' }, error),
      h('div', { className: 'fanlab-grid' }, found.map(fan => h('article', { key: fan.id },
        h('span', { className: 'ai-kicker' }, fan.category), h('h3', null, fan.name),
        h('p', null, fan.games.join(' · ') || 'No linked game'), h('strong', null, fan.balance + ' pts'),
        h('button', { className: 'ai-button outline', onClick: async () => {
          try { await api('preview-fan', { id: fan.id }); location.reload(); }
          catch (problem) { setError(problem.message); }
        } }, 'Open demo account'))))) :
      h('div', { className: 'ai-actions' }, h('p', null, 'Start a demo account to inspect the sample profiles and their point histories.'),
        h('button', { className: 'ai-button solid', onClick: () => openAuth('signup') }, 'Create account')));
}

export function FanLabPage({ data, openAuth }) {
  return h('div', { className: 'ai-home' }, h(FanLabHome, { data, openAuth }));
}

export function Clan({ data, play }) {
  const eras=data?.faze?.eras || [];
  return h('div',{className:'clan-page'},
    h(Title,{label:'THE STORY CONTINUES',title:'FaZe CLAN'},'From early trickshots to championship Sundays. Revisit the eras that made the community.'),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'THE ARCHIVE',title:'ERAS OF FaZe'}),
      h('div',{className:'clan-era-list'},eras.map(era=>{
        const clip=data?.faze?.videos.find(item=>item.id===era.video);
        return h('article',{key:era.period},h('span',{className:'ai-kicker'},era.period),h('div',null,h('h2',null,era.title),h('p',null,era.text),
          h('div',{className:'ai-actions'},clip&&h('button',{className:'ai-button solid',onClick:()=>play(clip)},'Play official highlight'),
            h(LinkButton,{href:'/brand/timeline.pdf#page='+era.page,kind:'outline',external:true},'Timeline source'))));
      }))),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'KEEP EXPLORING',title:'YOUR NEXT STOP'}),
      h('div',{className:'ai-actions'},h(LinkButton,{href:'/about'},'About FaZe Clan'),h(LinkButton,{href:'/teams',kind:'outline'},'Current teams'),h(LinkButton,{href:'/#rewards',kind:'outline'},'Earn rewards'))));
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
          h('p',{className:'ai-kicker ai-hero-kicker'},h('span',{className:'ai-signal'}),'THE FaZe FAN EXPERIENCE'),
          h('h1',null,h('span',null,'FaZe'),h('em',null,'CLAN')),
          h('p',{className:'ai-hero-description'},'From the first trickshots to the world stage. Watch the moments, follow the teams, and earn your place in the next era.'),
          h('div',{className:'ai-actions'},h(LinkButton,{href:'#gallery'},'Explore the legacy'),h(LinkButton,{href:'/teams',kind:'outline'},'Meet the teams'),
            data?.user ? h(LinkButton,{href:'#rewards',kind:'outline'},'Open rewards') : h('button',{className:'ai-button outline',onClick:()=>openAuth('signup')},'Create Account')))),
      h('div',{className:'ai-hero-bottom'},h('button',{className:'ai-down',onClick:()=>jump('ai-latest')},h(Icon,{name:'down'}),'Discover'),
        data?.config?.heroVideo && h('button',{className:'ai-icon',onClick:()=>{if(video.current.paused) video.current.play().catch(()=>{});else video.current.pause();},'aria-label':playing?'Pause background video':'Play background video'},h(Icon,{name:playing?'pause':'play'})))),
    h('section',{className:'ai-section',id:'ai-latest'},
      h(SectionTitle,{label:'RECENT UPLOADS',title:'WATCH NOW',href:'#news',action:'See the news feed'}),
      h('div',{className:'ai-video-grid'},h(VideoCard,{clip:updates[0],play}),legacyVideo && h(VideoCard,{clip:legacyVideo,play}))),
    h('section',{className:'ai-section'},
      h(SectionTitle,{label:'ESPORTS HIGHLIGHTS',title:'MOMENTS THAT MADE FaZe',href:'#gallery',action:'Open the gallery'}),
      h('div',{className:'ai-home-moments'},moments.map(photo=>h('a',{className:'ai-highlight',key:photo.id,href:'#esports/'+photo.game},
        h(Image,{src:photo.url,alt:''}),h('div',null,h('span',{className:'ai-kicker'},photo.subject),h('h3',null,photo.title),h(Icon,{name:'diagonal'})))))),
    h('section',{className:'ai-section'},
      h('aside',{className:'ai-archive-callout'},h('div',null,h('span',{className:'ai-kicker'},'THE OG ARCHIVE'),h('h2',null,'BACK TO ILLCAMS'),h('p',null,'Revisit the trickshot series that started it all. Then try the archive challenge in Rewards.')),h(LinkButton,{href:'#watch/og',kind:'outline'},'Watch the originals'))),
    h('section',{className:'ai-section'},h(SectionTitle,{label:'THE TEAMS',title:'ESPORTS',href:'#esports',action:'Explore all divisions'}),
      h('div',{className:'ai-division-grid ai-home-games'},divisions.slice(0,6).map(division=>h(GameCard,{key:division.key,division})))));
}

export function NotFound() {
  return h('section',{className:'ai-section'},h(Title,{label:'404',title:'PAGE NOT FOUND'}),h(LinkButton,{href:'#home'},'Back to home'));
}


import { h, useEffect, useRef, useState, Image, LinkButton, Modal } from './club-ui.js';
import { nextConfig as next } from './next-config.js';
import { Form, Field, Check, Select, Countdown, ProgramsHero, RequireFan, StateNotice, usePrograms, actionButton, sampleTag, when } from './program-ui.js';

const links=[['/next','Overview'],['/next/enter','Enter'],['/next/gallery','Entries'],['/next/finalists','Finalists'],['/next/winners','Winners'],['/next/rules','Rules']];
const seasonLink=(path,season)=>path+(season&&season!==next.defaultSeason?'?season='+encodeURIComponent(season):'');
const publicLink=(id,season)=>seasonLink('/next/entry/'+id,season);
const phasesAfterFinale=['winners','archive'];
const safeUrl=url=>/^https:\/\//i.test(url||'');
function Sponsors({ open }) {
  return h('section',{className:'clan-card clan-sponsored'},h('div',{className:'clan-split'},h('h2',null,'Presented by'),actionButton('Become a sponsor',open,{kind:'outline'})),
    h('div',{className:'clan-grid clan-grid-three'},next.sponsors.map(item=>h('div',{className:'clan-sponsor',key:item.type},
      h('span',{className:'clan-tag'},'Sponsored'),h('h3',null,item.type),
      item.logo&&h(Image,{src:item.logo,alt:''}), safeUrl(item.url)?h('a',{href:item.url,target:'_blank',rel:'noopener noreferrer'},item.name):h('p',null,item.name),h('small',null,item.slot)))));
}
function SponsorForm({ status, close }) {
  return h(Modal,{label:'sponsorship inquiry',close,className:'clan-program-modal'},h('div',{className:'clan-card'},
    h('h2',null,'Become a sponsor'),h(Form,{title:'Send inquiry',busy:status.busy,onSave:async fields=>{if(await status.act('next-sponsor',fields))close();}},
      [['name','Name','text',80],['company','Company','text',100],['email','Email','email',254]].map(([name,title,type,maxLength])=>h(Field,{key:name,title},h('input',{name,type,maxLength,required:true}))),
      h(Field,{title:'Budget range'},h(Select,{name:'budget',items:['Exploring','Under $5,000','$5,000–$20,000','Over $20,000']})),
      h(Field,{title:'Message'},h('textarea',{name:'message',required:true,minLength:12,maxLength:1500})))));
}
function PhaseTracker({ season, phase }) {
  return h('section',{className:'clan-card'},h('h2',null,'Season phases'),
    h('ol',{className:'clan-phases'},season.phases.map(([key,label,start,end],index)=>h('li',{key,'aria-current':phase===key?'step':undefined},
      h('span',{className:'clan-phase-count'},index+1),h('div',null,h('strong',null,label),h('p',null,when(start)+' – '+when(end))),phase===key&&h('span',{className:'clan-tag'},'Current phase')))));
}

function EntryCard({ entry }) {
  return h('article',{className:'clan-card clan-entry-card'},
    h('a',{href:publicLink(entry.id,entry.season)},h(Image,{src:entry.thumbnail||'/images/media-placeholder.svg',alt:''})),
    h('div',null,entry.sample&&sampleTag(),h('span',{className:'clan-tag'},entry.category),
      h('h3',null,h('a',{href:publicLink(entry.id,entry.season)},entry.title)),
      h('p',null,'@'+entry.handle+' · '+entry.votes+' votes'),h('p',null,entry.description),
      ['Finalist','Winner'].includes(entry.status)&&h('strong',null,entry.status)));
}
function EntryList({ entries, empty='No entries are published yet.' }) {
  return entries.length?h('div',{className:'clan-grid clan-grid-three'},entries.map(entry=>h(EntryCard,{key:entry.id,entry}))):h('div',{className:'clan-card clan-empty'},h('p',null,empty));
}
function NextLanding({ view, sponsor }) {
  const trending=[...view.entries].sort((a,b)=>b.votes-a.votes).slice(0,3);
  const winners=view.entries.filter(entry=>entry.status==='Winner');
  return h('div',{className:'clan-stack'},
    h(PhaseTracker,{season:view.season,phase:view.phase}),
    h('div',{className:'clan-grid'},
      h('section',{className:'clan-card'},h('h2',null,'Prizes and opportunities'),h('p',null,next.prize),h('p',null,next.opportunity),h('p',null,'Judges: '+next.judge)),
      h('section',{className:'clan-card'},h('h2',null,'Past winners'),winners.length?h('ul',null,winners.map(entry=>h('li',{key:entry.id},h('a',{href:publicLink(entry.id,entry.season)},entry.title)))):h('p',null,'No winners have been published.'))),
    h('section',{className:'clan-stack'},h('h2',null,'Trending entries'),h(EntryList,{entries:trending})),
    h(Sponsors,{open:sponsor}),
    h('section',{className:'clan-card'},h('h2',null,'FAQ'),
      h('details',null,h('summary',null,'Who can enter?'),h('p',null,'Verified fans aged '+next.minAge+' or older can apply during the submission phase. Full eligibility is subject to the published rules.')),
      h('details',null,h('summary',null,'Do votes decide the winner?'),h('p',null,'Community voting counts toward '+next.rubric.at(-1)[1]+'% of the sample score. Judges score the other criteria.')),
      h('details',null,h('summary',null,'Can I withdraw?'),h('p',null,'Open My entries and choose Withdraw. The entry is removed from the public gallery.'))));
}
function Gallery({ view }) {
  const [category,setCategory]=useState('');
  const [sort,setSort]=useState('trending');
  const entries=view.entries.filter(entry=>!category||entry.category===category).sort((a,b)=>sort==='trending'?b.votes-a.votes:b.created-a.created);
  return h('div',{className:'clan-stack'},h('section',{className:'clan-card clan-split'},
    h('div',null,h('h2',null,'Community gallery'),h('p',{role:'status'},entries.length+' entries')),
    h(Field,{title:'Category'},h(Select,{items:next.categories,empty:'All categories',value:category,onChange:e=>setCategory(e.target.value)})),
    h(Field,{title:'Sort'},h(Select,{items:[['trending','Trending'],['newest','Newest']],value:sort,onChange:e=>setSort(e.target.value)}))),
    h(EntryList,{entries,empty:'There are no approved entries in this category.'}));
}
function Enter({ view, status, user, openAuth }) {
  const [editing,setEditing]=useState('');
  const draft=view.mine.find(entry=>entry.id===editing);
  const start=Date.parse(view.season.phases[0][2]);
  const mayEnter=view.phase==='submissions'||view.phase==='upcoming'&&view.my?.member&&Date.now()>=start-next.earlyHours*3600000;
  if(!user)return h(RequireFan,{openAuth},h('p',null,'Sign in with a verified account to enter.'));
  return h('div',{className:'clan-stack'},
    h('section',{className:'clan-card'},
      h('h2',null,draft?'Edit your entry':'Submit your entry'),
      h('p',null,'Up to '+next.maxEntries+' entries per season. Entries stay private until reviewed.'),
      mayEnter?h(Form,{key:editing,title:draft?'Save and resubmit':'Submit for review',busy:status.busy,onSave:async (fields,form)=>{
        if(fields.adult && !await status.act('passport-age',{adult:true}))return;
        const saved=await status.act('next-submit',{...fields,id:editing||undefined,rules:Boolean(fields.rules),license:Boolean(fields.license),rights:Boolean(fields.rights),marketing:Boolean(fields.marketing)});
        if(saved){form.reset();setEditing('');}
      }},
        h('div',{className:'clan-grid'},h(Field,{title:'Title'},h('input',{name:'title',required:true,minLength:4,maxLength:100,defaultValue:draft?.title})),
          h(Field,{title:'Category'},h(Select,{name:'category',items:next.categories,required:true,empty:'Choose a category',defaultValue:draft?.category||''}))),
        h(Field,{title:'Game'},h('input',{name:'game',required:true,maxLength:60,defaultValue:draft?.game})),
        h(Field,{title:'Video link'},h('input',{name:'video',type:'url',required:true,maxLength:500,placeholder:'YouTube, TikTok, Twitch or Instagram',defaultValue:draft?.video})),
        h(Field,{title:'Thumbnail URL (optional)'},h('input',{name:'thumbnail',type:'url',maxLength:500,defaultValue:safeUrl(draft?.thumbnail)?draft.thumbnail:''})),
        h(Field,{title:'Description'},h('textarea',{name:'description',required:true,minLength:12,maxLength:800,defaultValue:draft?.description})),
        h(Field,{title:'Social handles (optional, private for review)'},h('input',{name:'socials',maxLength:140,defaultValue:draft?.socials})),
        !user.demo&&h(Check,{name:'adult'},'I am at least '+next.minAge+'. If you are younger, submit only after a guardian consent approval when available.'),
        h(Check,{name:'rules',required:true},'I accept the ',h('a',{href:'/next/rules',target:'_blank',rel:'noopener noreferrer'},'competition rules'),'.'),
        h(Check,{name:'license',required:true},'I grant FaZe a limited license to display and promote this entry for the competition. I keep ownership.'),
        h(Check,{name:'rights',required:true},'I have the rights to all footage, music, and likenesses in this entry.'),
        h(Check,{name:'marketing'},'I opt in to optional competition marketing emails.')):h('p',{role:'status'},'Submissions are closed for this phase.')),
    h('section',{className:'clan-card'},h('h2',null,'My entries'),
      !view.mine.length?h('p',null,'You have no entries this season.'):view.mine.map(entry=>h('article',{className:'clan-entry-row',key:entry.id},
        h('div',null,h('h3',null,h('a',{href:publicLink(entry.id,entry.season)},entry.title)),h('p',null,entry.status),entry.reason&&h('p',null,entry.reason)),
        h('div',{className:'clan-action-row'},mayEnter&&['Pending review','Approved','Needs changes'].includes(entry.status)&&actionButton('Edit',()=>setEditing(entry.id),{kind:'outline'}),
          actionButton('Withdraw',()=>status.act('next-withdraw',{id:entry.id}),{kind:'outline',disabled:status.busy}))))));
}
let captchaScript;
function Captcha({ siteKey, onToken }) {
  const host=useRef(null);
  useEffect(()=>{
    if(!siteKey)return;
    let widget,active=true;
    if(!captchaScript)captchaScript=new Promise((resolve,reject)=>{
      if(window.turnstile)return resolve();
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true; script.onload=resolve; script.onerror=reject;
      document.head.append(script);
    });
    captchaScript.then(()=>{
      if(active&&host.current)widget=window.turnstile.render(host.current,{
        sitekey:siteKey, theme:document.documentElement.dataset.theme==='light'?'light':'dark', size:'flexible',
        callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')
      });
    }).catch(()=>onToken(''));
    return()=>{active=false;if(widget!=null)window.turnstile?.remove(widget);onToken('');};
  },[siteKey]);
  return h('div',{className:'clan-captcha',ref:host});
}
function Entry({ entryId, view, status, data, openAuth }) {
  const [video,setVideo]=useState(false);
  const [report,setReport]=useState('');
  const [captcha,setCaptcha]=useState('');
  const [captchaOpen,setCaptchaOpen]=useState(false);
  const mine=view.mine.find(row=>row.id===entryId);
  const entry=mine||view.entries.find(row=>row.id===entryId);
  if(!entry)return h('div',{className:'clan-card clan-empty'},h('h2',null,'Entry unavailable'),h('p',null,'It may be pending review, withdrawn, or outside this season.'));
  const videoId=entry.video?.match(/^https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/)?.[1];
  const user=data?.user;
  const votesLeft=Math.max(0,next.dailyVotes+(view.my?.member?next.ogVotes:0)-(view.voteCounts[entry.category]||0));
  const voted=view.voted.includes(entry.id);
  return h('div',{className:'clan-stack'},
    h('article',{className:'clan-card'},entry.sample&&sampleTag(),h('span',{className:'clan-tag'},entry.category),
      h('h2',null,entry.title),h('p',null,'@'+entry.handle+' · '+entry.game+' · '+entry.status),
      h('p',null,entry.description),mine?.reason&&h('p',{role:'status'},mine.reason),
      h('div',{className:'clan-entry-media'},
        video && videoId ? h('iframe',{title:entry.title,loading:'lazy',src:'https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&rel=0',allow:'autoplay; encrypted-media; picture-in-picture',allowFullScreen:true,referrerPolicy:'strict-origin-when-cross-origin'}) :
        h(Image,{src:entry.thumbnail||'/images/media-placeholder.svg',alt:''})),
      h('div',{className:'clan-action-row'},videoId&&!video&&actionButton('Play entry',()=>setVideo(true)),
        entry.video&&h(LinkButton,{href:entry.video,kind:'outline',external:true},'Open original video')),
      h('p',{role:'status'},entry.votes+' community votes',entry.finalScore!=null?' · Score '+entry.finalScore+'/100':''),
      view.phase==='voting'&&entry.status==='Approved'&&!mine&&h('div',{className:'clan-stack'},
        h('p',null,votesLeft+' votes left in this category today',view.my?.member?' · Includes '+next.ogVotes+' OG bonus vote':''),
        user?actionButton(voted?'Voted':'Vote',async()=>{
          const saved=await status.act('next-vote',{id:entry.id,captcha});
          if(!saved && data.config.captcha){setCaptchaOpen(false);setTimeout(()=>setCaptchaOpen(true),0);}
          if(saved)setCaptchaOpen(false);
        },{disabled:status.busy||voted||!votesLeft||captchaOpen&&!captcha}):actionButton('Sign in to vote',()=>openAuth('login')),
        captchaOpen&&h(Captcha,{siteKey:data.config.captcha,onToken:setCaptcha})),
      !mine&&h('div',{className:'clan-action-row'},actionButton('Report entry',()=>setReport('content'),{kind:'outline'}),actionButton('Takedown request',()=>setReport('takedown'),{kind:'outline'})),
      mine&&['Finalist','Winner'].includes(mine.status)&&h(Form,{title:'Send private follow-up',busy:status.busy,onSave:fields=>status.act('next-followup',{...fields,id:entry.id})},
        h(Field,{title:'Contact email'},h('input',{name:'email',type:'email',maxLength:254,required:true})),
        h(Field,{title:'Private message'},h('textarea',{name:'note',maxLength:300})))),
    report&&h(Modal,{label:report==='takedown'?'takedown request':'entry report',close:()=>setReport(''),className:'clan-program-modal'},
      h('div',{className:'clan-card'},h('h2',null,report==='takedown'?'Request removal':'Report this entry'),
        !user?h(RequireFan,{openAuth:mode=>{setReport('');openAuth(mode);}}):
        h(Form,{title:'Send report',busy:status.busy,onSave:async fields=>{if(await status.act('next-report',{id:entry.id,kind:report,...fields}))setReport('');}},
          h(Field,{title:'Reason'},h('textarea',{name:'reason',maxLength:400,minLength:8,required:true}))))));
}
function Rules() {
  return h('div',{className:'clan-stack'},
    h('section',{className:'clan-card'},h('span',{className:'clan-tag'},'[LEGAL REVIEW REQUIRED]'),h('h2',null,'Official rules and eligibility'),
      h('p',null,'[ADD ELIGIBILITY] · [ADD HOW TO ENTER] · [ADD WINNER SELECTION] · [ADD PRIZE TERMS] · [ADD NO PURCHASE NECESSARY TEXT] · [ADD PRIVACY TERMS] · [ADD GOVERNING LAW]'),
      h('p',null,'Default age minimum: '+next.minAge+'. Creator ownership stays with the entrant. The display and promotion license is limited to this competition.'),
      h('p',null,'Report rights violations from an entry page. Entrants can withdraw their work from My entries. Appeals: '+next.appeals+'.'),
      h('p',null,h('a',{href:'/terms'},'Terms of service'),' · ',h('a',{href:'/privacy'},'Privacy policy'))),
    h('section',{className:'clan-card'},sampleTag('Sample scoring weights'),h('h2',null,'Judging rubric'),
      h('dl',{className:'clan-board'},next.rubric.map(([label,weight])=>h('div',{key:label},h('dt',null,label),h('dd',null,weight+'%')))),
      h('p',null,'Final score = weighted average of each judging criterion (0–100) plus the entry’s vote total divided by the top vote total, multiplied by the community weight.'),
      h('p',null,'Tie-break: '+next.tieBreak)));
}
function Finalists({ view, sponsor, winners=false }) {
  const revealed=phasesAfterFinale.includes(view.phase);
  const finalists=view.entries.filter(entry=>winners?entry.status==='Winner':['Finalist','Winner'].includes(entry.status));
  const finale=view.season.phases.find(phase=>phase[0]==='finale');
  const reveal=view.season.phases.find(phase=>phase[0]==='winners');
  return h('div',{className:'clan-stack'},
    h('section',{className:'clan-card'},h('h2',null,winners?'Winners and recognition':'Finalists'),
      view.finalistStatement&&h('p',null,view.finalistStatement),
      winners&&!revealed?h(Countdown,{until:reveal[2],label:'Results reveal in'}):h(EntryList,{entries:finalists,empty:winners?'No winners have been published.':'Finalists haven’t been announced.'})),
    h('section',{className:'clan-card'},h('h2',null,winners?'What winners receive':'Live finale'),
      winners?h('p',null,next.opportunity):h('div',null,h('p',null,'Finale: '+when(finale[2])),h(Countdown,{until:finale[2],label:'Starts in'}),
        safeUrl(next.stream)?h(LinkButton,{href:next.stream,external:true},'Watch the live finale'):h('p',null,next.stream)),
      winners&&revealed&&finalists.length>0&&h('p',null,'Profiles receive a winner stamp and FaZe NEXT Alumni recognition.')),
    h(Sponsors,{open:sponsor}));
}
function JudgePanel({ view, status, user }) {
  if(!view.judge&&!view.operator)return h('div',{className:'clan-card'},h('p',null,'This page requires an authorized judge or operator.'));
  const judging=view.phase==='judging';
  return h('div',{className:'clan-stack'},
    h('section',{className:'clan-card'},h('h2',null,'Review and judging queue'),
      !view.queue.length&&h('p',null,'No entries to review.'),
      view.queue.map(entry=>h('details',{className:'clan-queue-item',key:entry.id},h('summary',null,entry.title+' · '+entry.status,entry.sample&&sampleTag()),
        h('p',null,entry.description),entry.video&&h(LinkButton,{href:entry.video,external:true,kind:'outline'},'Review original video'),
        entry.reports?.map(report=>h('p',{key:report.id},report.kind+': '+report.detail)),
        view.operator&&user&& !entry.id.startsWith('sample-') && h(Form,{title:'Save moderation decision',busy:status.busy,onSave:fields=>status.act('next-moderate',{id:entry.id,...fields,reviewed:Boolean(fields.reviewed)})},
          h(Field,{title:'Outcome'},h(Select,{name:'status',items:['Approved','Needs changes','Rejected']})),
          h(Field,{title:'Reason'},h('textarea',{name:'reason',maxLength:500})),
          h(Check,{name:'reviewed'},'I reviewed the video for hate, sexual content, graphic violence, harassment, and rights.')),
        judging&&['Approved','Finalist','Winner'].includes(entry.status)&&(entry.conflict?h('p',null,'Conflict declared.'):
          h('div',null,actionButton('Declare conflict',()=>status.act('next-conflict',{id:entry.id}),{kind:'outline',disabled:status.busy}),
            h(Form,{title:'Save score',busy:status.busy,onSave:fields=>status.act('next-score',{id:entry.id,notes:fields.notes,values:next.rubric.slice(0,-1).map((_,index)=>Number(fields['score'+index]))})},
              next.rubric.slice(0,-1).map(([label],index)=>h(Field,{key:label,title:label},h('input',{name:'score'+index,type:'number',min:0,max:100,step:0.1,required:true,defaultValue:entry.myScore?.[index]}))),
              h(Field,{title:'Private notes'},h('textarea',{name:'notes',maxLength:800})))))))),
    view.operator&&h('div',{className:'clan-stack'},
      h('section',{className:'clan-card'},h('h2',null,'Final admin leaderboard'),
        view.scores.length?h('ol',{className:'clan-board'},view.scores.map(score=>h('li',{key:score.id},h('a',{href:publicLink(score.id,view.season.id)},view.queue.find(item=>item.id===score.id)?.title||score.id),h('strong',null,score.total.toFixed(2))))):h('p',null,'No scored entries.'),
        (view.phase==='finalists'||phasesAfterFinale.includes(view.phase))&&h(Form,{title:view.phase==='finalists'?'Publish finalists':'Publish winner',busy:status.busy,onSave:body=>status.act(view.phase==='finalists'?'next-finalists':'next-winner',body)},
          h(Field,{title:'Public judging statement'},h('textarea',{name:'statement',minLength:12,maxLength:800,required:true})))),
      h('section',{className:'clan-card'},h('h2',null,'Fraud and moderation audit'),
        view.flaggedVotes.length>0&&h('ul',{className:'clan-board'},view.flaggedVotes.map(vote=>h('li',{key:vote.id},
          h('a',{href:publicLink(vote.entry,view.season.id)},'Flagged vote · '+vote.date),actionButton('Remove vote',()=>status.act('next-remove-vote',{id:vote.id,reason:'Operator-reviewed suspicious vote'}),{kind:'outline',disabled:status.busy})))),
        view.audit.length?h('ul',{className:'clan-board'},view.audit.map((row,index)=>h('li',{key:index},
          h('span',null,when(row.at)),h('strong',null,row.action),h('span',null,row.detail||row.subject)))):h('p',null,'No audit events.')),
      h('section',{className:'clan-card'},h('h2',null,'Passport XP audit'),
        view.xpAudit.length?h('ul',{className:'clan-board'},view.xpAudit.map(event=>h('li',{key:event.owner+':'+event.action+':'+event.key},
          h('span',null,when(event.at)),h('strong',null,event.handle+' · '+event.action),h('span',null,'+'+event.xp+' XP')))):h('p',null,'No XP awards have been recorded.')),
      h('section',{className:'clan-card'},h('h2',null,'Sponsor inquiries'),
        view.sponsorInquiries.length?view.sponsorInquiries.map(item=>h('p',{key:item.id},item.company+' · '+item.name+' · '+item.email+' · '+item.budget+' · '+item.message)):h('p',null,'No sponsorship inquiries.')),
      next.allowGuardianConsent&&h('section',{className:'clan-card'},h('h2',null,'Guardian consent review'),
        h(Form,{title:'Record externally verified consent',busy:status.busy,onSave:fields=>status.act('next-guardian-verify',{account:fields.account,verified:Boolean(fields.verified)})},
          h(Field,{title:'Fan account ID'},h('input',{name:'account',required:true,maxLength:45})),
          h(Check,{name:'verified',required:true},'I verified guardian consent against the approved policy.')))));
}

export function NextPage({ part, detail, data, openAuth, notify, refresh }) {
  const query=new URLSearchParams(location.search);
  const [season,setSeason]=useState(query.get('season')||next.defaultSeason);
  const [preview,setPreview]=useState(()=>{try{return sessionStorage.getItem('next-preview:'+season)||'';}catch{return '';}});
  function changePreview(value){try{sessionStorage.setItem('next-preview:'+season,value);}catch{}setPreview(value);}
  const [sponsor,setSponsor]=useState(false);
  function changeSeason(value){history.replaceState(null,'',seasonLink(location.pathname,value));setSeason(value);try{setPreview(sessionStorage.getItem('next-preview:'+value)||'');}catch{setPreview('');}}
  const status=usePrograms({data,notify,refresh,season,preview,poll:true});
  const view=status.value;
  const phase=view?.season.phases.find(row=>row[0]===view.phase);
  const title={enter:'ENTER FAZE NEXT',gallery:'FAZE NEXT GALLERY',entry:'CREATOR ENTRY',finalists:'FAZE NEXT FINALISTS',winners:'WINNERS AND ALUMNI',rules:'FAZE NEXT RULES',judge:'JUDGE DASHBOARD'}[part]||'FAZE NEXT';
  const content=!view?h(StateNotice,{status,retry:status.refreshView}):({
    enter:()=>h(Enter,{view,status,user:data?.user,openAuth}),
    gallery:()=>h(Gallery,{view}),
    entry:()=>h(Entry,{key:detail,entryId:detail,view,status,data,openAuth}),
    finalists:()=>h(Finalists,{view,sponsor:()=>setSponsor(true)}),
    winners:()=>h(Finalists,{view,winners:true,sponsor:()=>setSponsor(true)}),
    rules:()=>h(Rules),
    judge:()=>h(JudgePanel,{view,status,user:data?.user})
  }[part]||(()=>h(NextLanding,{view,sponsor:()=>setSponsor(true)})))();
  return h('div',{className:'clan-program clan-next'},
    h(ProgramsHero,{label:view?.season.name||'CREATOR DISCOVERY',title,subtitle:part?'Create, vote, and follow the competition.':'Show us what’s next.'},
      h('div',{className:'clan-program-nav'},phase&&h(Countdown,{until:phase[3],label:'Phase closes in'}),
        part!=='enter'&&h(LinkButton,{href:seasonLink('/next/enter',season)},'Enter now'))),
    h('div',{className:'ai-section clan-stack'},
      h('nav',{className:'clan-program-nav','aria-label':'FaZe NEXT sections'},[...links,...(view?.judge||view?.operator?[['/next/judge','Judge dashboard']]:[])].map(([href,label])=>h('a',{key:href,href:seasonLink(href,season),'aria-current':location.pathname===href?'page':undefined},label))),
      h('div',{className:'clan-card clan-split'},
        h(Field,{title:'Season'},h(Select,{items:next.seasons.map(item=>[item.id,item.name]),value:season,onChange:e=>changeSeason(e.target.value)})),
        view?.sample&&h(Field,{title:'Sample phase preview'},h(Select,{items:view.season.phases.map(row=>row.slice(0,2)),empty:'Use current date',value:preview,onChange:e=>changePreview(e.target.value)}))),
      content),
    sponsor&&h(SponsorForm,{status,close:()=>setSponsor(false)}));
}

import { h, useState, useRef, Image, Icon, LinkButton, SectionTitle, Title, number, date } from './club-ui.js';

function Totals({user}) {
  return h('div',{className:'ai-wallet-totals'},[['Available points',user.balance],['Credited points',user.earned],['Redeemed points',user.spent]].map(([label,value])=>
    h('div',{key:label},h('span',null,label),h('strong',null,number(value)),h('small',null,'PTS'))));
}

function InvitePanel({user,data,notify}) {
  const field=useRef(null);
  const url=new URL(location.origin);
  url.searchParams.set('invite',user.invite);
  url.hash='home';
  const link=url.href;
  async function copy() {
    try { await navigator.clipboard.writeText(link); notify('Invite link copied.'); }
    catch { field.current.select(); notify('Link selected. Use your device’s Copy command.'); }
  }
  return h('section',{className:'ai-reward-block ai-referrals'},
    h(SectionTitle,{label:'REFERRALS',title:'INVITE A FRIEND'}),
    h('p',null,'Share your link. When a friend signs up through it and qualifies, you earn '+data.rewardRules.referral+' points and they earn '+data.rewardRules.referralWelcome+' welcome points.'),
    h('p',{className:'ai-muted'},data.config.demo
      ? user.demo ? 'For demo accounts, your invitee must complete their first challenge. Invitees must also select the demo account option.' : 'For email accounts in this preview, points arrive after your friend completes a first challenge. Use a separate browser or private window to test the link.'
      : 'Verified accounts qualify after seven days, three days with challenges, and review.'),
    h('div',{className:'ai-share'},h('input',{ref:field,readOnly:true,value:link,'aria-label':'Your referral link',onFocus:e=>e.currentTarget.select()}),
      h('button',{className:'ai-button solid',onClick:copy},'Copy link',h(Icon,{name:'copy',size:16})),
      navigator.share && h('button',{className:'ai-button outline',onClick:()=>navigator.share({title:'Join FaZe Clan',url:link}).catch(()=>{})},'Share')),
    h('h3',null,'Your referrals'),
    user.referrals.length?h('ul',{className:'ai-referral-list'},user.referrals.map((person,i)=>h('li',{key:i},h('div',null,h('strong',null,person.name),h('small',null,'Joined '+date(person.at))),h('span',{className:'ai-ref-status'},person.status),h('b',null,person.status==='approved'?'+'+data.rewardRules.referral+' pts':person.status==='pending'?person.tasks+' challenge days':'—')))):
      h('p',{className:'ai-muted'},'Your friends will appear here after they join through your link.'));
}

function Redeem({data,user,perform}) {
  const attempts=useRef(new Map());
  const [code,setCode]=useState('');
  const [codeStatus,setCodeStatus]=useState('');
  return h('section',{className:'ai-reward-block'},
    h(SectionTitle,{label:'POINTS SHOP',title:'REDEEM YOUR POINTS'}),
    h('p',{className:'ai-muted'},'Points have no cash value. New credits expire after '+data.rewardRules.expiryDays+' days. Merchandise is capped at '+data.rewardRules.merchCap+' redemptions per account; stock and campaign budget still apply.'),
    h('form',{className:'creator-code-form',onSubmit:async event=>{
      event.preventDefault();const ok=await perform('creator',{code:code.trim()});
      setCodeStatus(ok?'Creator code applied. You are entered in this creator’s eligible giveaway.':'Invalid or unavailable creator code. Check the spelling and your account eligibility.');
    }},h('label',null,'Apply a Creator Code',h('input',{value:code,onChange:event=>setCode(event.target.value),maxLength:60,required:true,disabled:Boolean(user.creator),placeholder:'Enter creator code'})),
      h('button',{className:'ai-button solid',disabled:Boolean(user.creator)},'Apply'),
      h('p',{role:'status'},user.creator?'Applied: '+user.creator:codeStatus)),
    h('div',{className:'ai-reward-grid'},data.products.map(item=>{
      const merch=data.faze.merch.find(x=>x.id===item.merch);
      const owned=item.id==='pass'&&user.member;
      const available=item.available && user.balance>=item.price && !owned;
      return h('article',{className:'ai-reward-card',key:item.id},
        merch && h(Image,{src:merch.image,alt:merch.name,fallback:null}),h('span',{className:'ai-kicker'},item.type),h('h3',null,item.name),h('p',null,number(item.price)+' points'),
        h('div',{className:'reward-progress','aria-label':Math.min(100,Math.round(user.balance/item.price*100))+'% of points needed'},h('span',{style:{width:Math.min(100,Math.round(user.balance/item.price*100))+'%'}})),
        !available&&!owned&&h('small',null,Math.max(0,item.price-user.balance)+' points to go'),
        h('button',{className:'ai-button '+(available?'solid':'outline'),disabled:!available,onClick:async()=>{
          if(!attempts.current.has(item.id))attempts.current.set(item.id,crypto.randomUUID());
          if(await perform('redeem',{product:item.id,attempt:attempts.current.get(item.id)})) attempts.current.delete(item.id);
        }},owned?'Already unlocked':!item.available?'Unavailable for this account':!available?'Keep earning points':'Redeem',h(Icon,{name:'arrow'})));
    })));
}

function Earn({data,user,perform}) {
  const j=user.journey;
  const [answer,setAnswer]=useState('');
  const [year,setYear]=useState('');
  const [weapon,setWeapon]=useState('');
  const patch=data.patches.find(x=>Boolean(x.sample)===Boolean(user.demo)) || (data.config.demo ? data.patches.find(x=>x.sample) : null);
  return h('section',{className:'ai-reward-block'},
    h(SectionTitle,{label:'DAILY CHALLENGES',title:'EARN POINTS'}),
    h('p',{className:'ai-muted'},'Finish check-in, trivia, and a highlight for a +'+data.rewardRules.completion+' point completion bonus. Current streak: '+j.streak+' days.'+(j.completionDone?' Today’s bonus is already in your wallet.':'')),
    !user.demo && !user.verified && !data.config.demo && h('p',{className:'ai-muted'},'Sign in with a verified Google account to earn live rewards.'),
    h('div',{className:'ai-reward-grid'},j.cards.map(card=>{
      const quiz=card.id==='trivia',pick=card.id==='daily';
      const options=quiz?j.quiz.options:patch?.rankings.map(row=>row.name) || [];
      const input=quiz?answer:weapon;
      const choose=quiz?setAnswer:setWeapon;
      return h('article',{key:card.id,className:'ai-reward-card'},h('span',{className:'ai-kicker'},'+'+card.points+' POINTS'),h('h3',null,card.name),
        h('p',null,quiz?j.quiz.prompt:pick?'Choose a weapon from the current patch.':card.id==='watch-task'?'Open an official highlight in Gallery or News, then claim this task. One claim per day.':'Check in each day to add to your balance.'),
        card.id==='watch-task' && h(LinkButton,{href:'#gallery',kind:'outline'},'Open Gallery'),
        card.done ? h('p',{className:'ai-red'},'Completed today') :
        h('form',{onSubmit:e=>{e.preventDefault();perform(card.id,quiz?{date:j.date,answer}:pick?{patch:patch?.id,weapon}:{date:j.date});}},
          options.length>0 && h('label',null,quiz?'Your answer':'Your pick',h('select',{value:input,onChange:e=>choose(e.target.value),required:true},h('option',{value:''},'Select an option'),options.map(value=>h('option',{key:value},value)))),
          h('button',{className:'ai-button solid',disabled:pick&&(!patch||user.challengeComplete)},pick&&!patch?'Patch unavailable':pick&&user.challengeComplete?'Challenge ended':quiz?'Submit answer':pick?'Submit pick':card.id==='watch-task'?'Claim after watching':'Claim points',h(Icon,{name:'arrow'}))));
    }),
    !j.starterDone && h('article',{className:'ai-reward-card'},h('span',{className:'ai-kicker'},'+'+data.rewardRules.archive+' POINTS'),h('h3',null,'The first ILLCAMS'),h('p',null,j.starter.prompt),
      h('form',{onSubmit:e=>{e.preventDefault();perform('archive-quiz',{year});}},h('label',null,'Your answer',h('select',{value:year,onChange:e=>setYear(e.target.value),required:true},h('option',{value:''},'Select a year'),j.starter.options.map(value=>h('option',{key:value},value)))),h('button',{className:'ai-button solid'},'Submit answer',h(Icon,{name:'arrow'})))),
    j.comeback>0 && h('article',{className:'ai-reward-card'},h('span',{className:'ai-kicker'},'+'+j.comeback+' POINTS'),h('h3',null,'Comeback bonus'),h('p',null,j.reason),h('button',{className:'ai-button solid',onClick:()=>perform('comeback',{})},'Claim bonus'))));
}

function Weekly({data,user,perform}) {
  const weekly=user.weekly;
  return h('section',{className:'ai-reward-block'},h(SectionTitle,{label:'BIG QUESTS',title:'WEEKLY TASKS'}),
    h('p',{className:'ai-muted'},'Week of '+weekly.week+'. Finish two quests and claim their rewards to open the weekly chest.'),
    h('div',{className:'ai-reward-grid'},weekly.tasks.map(task=>h('article',{className:'ai-reward-card',key:task.id},
      h('span',{className:'ai-kicker'},'+'+data.rewardRules.weekly+' POINTS'),h('h3',null,task.name),
      h('p',null,Math.min(task.progress,task.goal)+' / '+task.goal+' complete'),
      h('div',{className:'reward-progress'},h('span',{style:{width:Math.min(100,task.progress/task.goal*100)+'%'}})),
      h('button',{className:'ai-button solid',disabled:task.progress<task.goal||task.claimed,onClick:()=>perform('weekly-claim',{task:task.id})},task.claimed?'Claimed':task.progress<task.goal?'Keep playing':'Claim quest')))),
    h('div',{className:'weekly-chest'},h('strong',null,'WEEKLY CHEST · +'+data.rewardRules.weeklyChest+' pts'),
      h('button',{className:'ai-button solid',disabled:!weekly.chestReady||weekly.chestClaimed,onClick:()=>perform('weekly-chest',{})},weekly.chestClaimed?'Opened':weekly.chestReady?'Open chest':'Complete two quests')));
}

function Nostalgia({data,user,perform}) {
  const [year,setYear]=useState('');
  const old=user.accountType==='Returning User'||user.era?.year<=2020;
  const clip=data.faze.videos.find(item=>item.id==='3o65zAETqPQ');
  return h('section',{className:'ai-reward-block nostalgia-block'},h(SectionTitle,{label:'THE OG CORNER',title:'YOUR FaZe ERA'}),
    user.era ? h('div',{className:'nostalgia-recap'},h('span',null,'WELCOME BACK'),h('h3',null,'Fan since '+user.era.year),
      h('p',null,'Your FaZe era: '+user.era.era+'. This year is self-reported; verified account history is needed for live OG bonus points.'),
      h('div',{className:'nostalgia-badges'},user.era.badges.map(badge=>h('span',{key:badge},badge))),
      h('strong',null,user.era.multiplier>1?'Demo OG multiplier · 1.5× throwback points':'OG multiplier awaits verified legacy history')) :
      h('form',{className:'nostalgia-year',onSubmit:event=>{event.preventDefault();perform('fan-era',{year});}},
        h('label',null,'When did you start following FaZe? (self-reported)',h('select',{value:year,onChange:event=>setYear(event.target.value),required:true},
          h('option',{value:''},'Choose a year'),Array.from({length:new Date().getFullYear()-2009},(_,index)=>2010+index).map(value=>h('option',{key:value,value},value)))),
        h('button',{className:'ai-button solid'},'Save my era')),
    old && h('div',{className:'nostalgia-quests'},data.ogQuizzes.map(quiz=>{
      const done=user.ledger.some(item=>item.id==='og-quiz:'+quiz.id);
      return h('article',{key:quiz.id},h('span',{className:'ai-kicker'},'THROWBACK TASK'),h('h3',null,quiz.name),h('p',null,quiz.prompt),
        quiz.clip&&clip&&h('a',{href:clip.url,target:'_blank',rel:'noopener noreferrer'},'Watch the official clip ↗'),
        done ? h('strong',null,'Completed') : h('form',{onSubmit:event=>{event.preventDefault();perform('og-quiz',{id:quiz.id,answer:new FormData(event.currentTarget).get('answer')});}},
          h('select',{name:'answer',required:true,defaultValue:''},h('option',{value:''},'Choose an answer'),quiz.options.map(option=>h('option',{key:option,value:option},option))),
          h('button',{className:'ai-button solid'},'Submit answer')));
    })),
    h('div',{className:'nostalgia-bottom'},h('p',null,'Retro merch for OG fans appears in the rewards ladder when a funded drop is available.'),
      h(LinkButton,{href:'#rewards/redeem',kind:'outline'},'Bring back your squad')));
}

function PointsLeaderboard({data,user,perform}) {
  const [period,setPeriod]=useState('weekly');
  const prizes={weekly:'Featured fan badge',monthly:'Monthly fan badge',allTime:'Hall of Fame feature'};
  return h('section',{className:'ai-reward-block'},h(SectionTitle,{label:'THE FAN CHART',title:'POINTS LEADERBOARD'}),
    h('p',{className:'ai-muted'},'Earned points rank the chart. Prize: '+prizes[period]+'. This pilot displays rankings and badge targets; fulfillment is not active.'),
    h('div',{className:'ai-reward-tabs'},[['weekly','Weekly'],['monthly','Monthly'],['allTime','All-time']].map(([key,label])=>h('button',{key,'aria-pressed':period===key,onClick:()=>setPeriod(key)},label))),
    !user.demo&&h('button',{className:'ai-button outline',onClick:()=>perform('leaderboard-optin',{enabled:!user.leaderboardOptIn})},user.leaderboardOptIn?'Hide my profile':'Show my profile'),
    h('ol',{className:'points-leaders'},(data.pointsLeaders?.[period]||[]).map((entry,index)=>h('li',{key:entry.id},h('span',null,'#'+(index+1)),
      h('strong',null,entry.id===user.id?'You · '+entry.name:entry.name),h('b',null,number(entry.points)+' pts')))));
}

function History({user}) {
  const entries=user.ledger.slice().reverse();
  return h('section',{className:'ai-reward-block'},
    h(SectionTitle,{label:'WALLET ACTIVITY',title:'POINTS HISTORY'}),
    entries.length?h('ul',{className:'ai-referral-list'},entries.map(item=>h('li',{key:item.id},h('div',null,h('strong',null,item.label),h('small',null,date(item.at))),h('b',null,(item.points>0?'+':'')+item.points+' pts')))):
      h('p',{className:'ai-muted'},'Complete your first challenge to start your points history.'),
    h(LinkButton,{href:'#receipts',kind:'outline'},'Redemptions and receipts'));
}

export function Rewards({part,data,openAuth,perform,notify}) {
  const user=data?.user;
  const active=['redeem','points-shop'].includes(part)?'redeem':part==='history'?'history':'earn';
  return h('div',null,h(Title,{label:'YOUR FAN WALLET',title:'REWARDS'},'Earn points through challenges and referrals. Use them to unlock rewards.'),
    h('section',{className:'ai-section ai-rewards'},
      !user?h('div',{className:'ai-empty'},h('h2',null,'Sign in to open your wallet'),h('p',null,'Your points, referrals, and reward history are saved with your account.'),
        h('button',{className:'ai-button solid',onClick:()=>openAuth('signup')},'Create account',h(Icon,{name:'arrow'})),h('button',{className:'ai-button outline',onClick:()=>openAuth('login')},'Log in')) :
      h('div',null,h('nav',{className:'ai-reward-tabs','aria-label':'Reward views'},[['earn','Earn points'],['redeem','Redeem points'],['history','Points history']].map(([key,label])=>h('a',{key,href:'#rewards/'+key,'aria-current':key===active?'page':undefined},label))),
        h(Totals,{user}),active==='redeem'?h('div',null,h(InvitePanel,{user,data,notify}),h(Redeem,{data,user,perform}),h(Nostalgia,{data,user,perform})):
          active==='history'?h(History,{user}):h('div',null,h(Earn,{data,user,perform}),h(Weekly,{data,user,perform}),h(PointsLeaderboard,{data,user,perform}),h(Nostalgia,{data,user,perform})))));
}

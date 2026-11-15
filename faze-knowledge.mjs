import { fanWallet } from './fans.mjs';
import { programUser, chatDropContext } from './programs.mjs';
import { teams, pastDivisions } from './public/teams-data.js';
import { aboutContent } from './public/about-data.js';
import { passportConfig, OG_XP_BONUS_LABEL } from './public/passport-config.js';
import { ogConfig } from './public/og-config.js';
import { dropConfig } from './public/drops-config.js';
import { nextConfig } from './public/next-config.js';
import { patchGames } from './public/patch-intel-data.js';
import { products as storeProducts } from './public/shop-data.js';
import { rewardRules, products, news } from './catalog.mjs';
import { faze } from './faze.mjs';

export const normalize = text => text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const link=(label,url)=>({label,url});
const dollars=cents=>'$'+(cents/100).toFixed(2);
const house=link('FaZe House','/house');
const aliases={
  'counter-strike':'cs2 csgo counterstrike neo',
  'call-of-duty':'cod cdl faze vegas atlanta',
  'rainbow-six-siege':'r6 r6s siege',
  pubg:'pubg battlegrounds',
  halo:'halo infinite hcs',
  'super-smash-bros-ultimate':'smash ssbu sparg0'
};
const records=[];
function add(id,label,url,tags,text,sample=false) {
  const words=new Set(normalize(label+' '+tags+' '+text).split(' '));
  records.push({id,label,url,text,sample,words});
}
for(const team of teams)add('team:'+team.slug,team.name+' roster','/teams#'+team.slug,'players lineup roster coach '+(aliases[team.slug]||''),
  'Roster listed on this fan hub: '+team.players.map(player=>player.name+' ('+player.role+(player.inactive?', inactive':'')+')').join(', ')+'. '+team.description);
for(const era of faze.eras)add('history:'+era.period,era.title,'/brand/timeline.pdf','founders founding start trickshot montages archive '+era.period,era.period+': '+era.text);
for(const name of pastDivisions)add('division:'+normalize(name),name+' past division','/teams#past-divisions','past esports division '+name,name+' appears in the fan hub past divisions list.');
for(const row of aboutContent.divisions)add('division:'+row.slug,row.name+' history','/about','history joining archive division', [row.name,row.joined,row.achievement].filter(value=>value&&!value.startsWith('[')).join(' · '));
for(const item of faze.results)add('result:'+item.event,item.event,item.source||'/about',item.game+' results victories history championship '+item.year,[item.year,item.game,item.event,item.place].join(' · '));
for(const item of news)if(item.title)add('news:'+item.title,item.title,'/#news','news schedule latest updates',item.title+' '+(item.detail||item.summary||''));
const xp='Each level requires '+passportConfig.xpPerLevel+' XP; the maximum is level 50. Tiers: '+passportConfig.tiers.map(item=>item.name+' (level '+item.level+')').join(', ')+'.';
add('passport','Gaming Passport','/passport','XP levels badges tiers leaderboards caps carry',
  xp+' Sample award rules: '+Object.entries(passportConfig.actions).map(([action,value])=>action+' '+value.xp+' base XP, '+value.cap+' awards/day, '+value.cooldown+'s cooldown').join('; ')+'.',true);
const ogText='**Sample pricing.** Free Fan is $0. Paid OG is '+dollars(ogConfig.paid.prices.month)+' per month or '+dollars(ogConfig.paid.prices.year)+' per year. Active paid members earn **+'+OG_XP_BONUS_LABEL+' XP** with fractional carry. The '+ogConfig.paid.pointsMultiplier+'× points multiplier is separate. Other eligible perks include '+ogConfig.perks.join(', ')+'.';
add('og','OG Club','/og','membership paid monthly annual price og bonus xp discount renewal',ogText,true);
for(const drop of dropConfig.drops)add('drop:'+drop.id,drop.name,'/drops/'+drop.id,'drop stock sample merch limited numbered edition '+drop.gate,
  drop.story+' Edition size '+drop.quantity+'. '+(drop.gate==='og-early'?'OG early access up to '+dropConfig.earlyHours+' hours before launch.':drop.gate==='level'?'Passport level '+drop.level+' required.':'Public access when available.')+' Displayed price '+dollars(drop.priceCents)+'.',drop.sample);
const nextText='**Sample FaZe NEXT rules.** Up to '+nextConfig.maxEntries+' entries per season, '+nextConfig.dailyVotes+' category votes per day plus '+nextConfig.ogVotes+' for eligible OG users. Entries require moderator approval before public voting. Scoring: '+nextConfig.rubric.map(([criterion,weight])=>criterion+' '+weight+'%').join(', ')+'. Rules text awaits review.';
add('next','FaZe NEXT rules','/next/rules','competition entries voting criteria judging finalists submission rules',nextText,true);
for(const game of patchGames)for(const patch of game.patches)add('patch:'+patch.id,game.name+' '+patch.version,'/patch-intel?patch='+patch.id,game.name+' sample patch intel meta '+patch.tags.join(' '),patch.summary+' '+patch.changes.map(change=>change.text).join(' '),patch.sample);
const rewardsText='Daily check-in gives '+rewardRules.checkIn+' points and archive trivia gives '+rewardRules.trivia+'. Rewards include '+products.map(item=>item.name+' ('+item.price+' points'+(item.demoOnly?', demo only':'')+')').join(', ')+'. Spendable points are separate from Passport XP.';
add('rewards','Rewards','/#rewards','earn spend wallet points redeem tasks missions',rewardsText);
add('shop','Shop','/#shop','store buy cart merch apparel gift',storeProducts.slice(0,10).map(item=>item.name).join(', ')+'. Open the store for current product details.');
add('house','FaZe House','/house','navigation where open find site clan community', 'FaZe House houses Gaming Passport, OG Club, Exclusive Drops, and Clan. FaZe NEXT is under More.');
add('clan','Clan','/clan','clan community creator archive','Browse community and fan content.');
add('privacy','Account and privacy','/privacy','account privacy login reset help','Sign in through the header; use Forgot password on the login form.');

const ignore=new Set('a an the i it me is are was and or with my this that what how show do does in for tell of which about'.split(' '));
const words=text=>[...new Set(normalize(text).split(' ').filter(word=>word.length>1&&!ignore.has(word)))];
const suggestion={
  teams:['Who is their coach?','Which games does FaZe play?','Tell me FaZe’s history'],
  history:['Who plays for FaZe Counter-Strike?','Which games does FaZe play?','Show me around the site'],
  passport:['How much XP until my next level?','What’s the OG XP bonus?','How do I earn points?'],
  og:['How much is that?','What’s the OG XP bonus?','What’s in the next drop?'],
  drops:['Which drops are open?','What does OG Club give me?','How do I earn XP?'],
  next:['How does voting work in FaZe NEXT?','How do I enter FaZe NEXT?','How do I earn XP?'],
  patch:['Show Counter-Strike 2 patch changes','Are these official patch notes?','Who plays for FaZe Counter-Strike?'],
  rewards:['How many points do I have?','How do I earn XP?','How do I redeem rewards?'],
  house:['Show me around the site','How do I earn XP?','What does OG Club give me?']
};
export const reply=(answer,topic='house',sources=[],extra={})=>({answer,topic,sources,suggestions:suggestion[topic]||[],...extra});
const teamIn=text=>teams.find(team=>text.includes(normalize(team.name))||text.includes(normalize(team.slug))||words(aliases[team.slug]||'').some(word=>text.split(' ').includes(word))||
  team.players.some(player=>normalize(player.name).length>=3&&text.split(' ').includes(normalize(player.name))));
const glossary=[
  ['igl','IGL means in-game leader: the player who makes strategy and coordination calls during play.'],
  ['awp','In Counter-Strike, the AWP is a sniper rifle. An AWPer is the player who typically uses it.'],
  ['meta','The meta is the set of strategies, equipment, or characters competitors commonly consider strongest or most effective.'],
  ['nerf','A nerf reduces the strength of a game mechanic, weapon, character, or ability. A buff increases it.'],
  ['buff','A buff increases the strength of a game mechanic, weapon, character, or ability.'],
  ['gg','GG means good game, often said after a match.'],
  ['nt','NT means nice try.']
];
for(const [term,definition] of glossary)add('term:'+term,term.toUpperCase()+' definition','/patch-intel',term+' gaming esports vocabulary terms',definition);
const domain=/\b(faze|gaming|games?|esports|clan|roster|players|passport|membership|og club|patch|points|rewards|drops?|xp|shop|stream|twitch|tournament|loadout|nerf|buff|strategy|gg|nt|igl|awp|lineup|gameplay|controller|fps|trickshot|valorant|fortnite|apex|rocket league|overwatch|privacy|billing)\b/i;
export function knowledge(question,history){
  const q=normalize(question);
  const follow=/^(and |what about |who is (?:their|the) |how much is (?:that|it)|(?:can|do) i (?:get|use) (?:it|that)|which one|how so|what is that)/.test(q);
  const prior=history.at(-1)?.topic;
  const past=pastDivisions.find(name=>q.includes(normalize(name)));
  const team=(past?null:teamIn(q))||((follow||/\b(their|that team|them)\b/.test(q))?history.slice().reverse().map(turn=>teamIn(normalize(turn.question))).find(Boolean):null);
  let topic='house';
  if(/\b(my xp|my level|my points|my balance|my membership|my drop eligibility|xp (?:do i need|until my|to the next)|am i eligible)\b/.test(q)||
    /\b(?:how many|how much)\b.*\b(?:xp|points)\b.*\bdo i (?:have|need)\b/.test(q))topic='personal';
  else if(/\b(faze next|competition rules|vote limit|judging|finalists|submission)\b/.test(q))topic='next';
  else if(/\b(og club|membership|paid og|og bonus|og xp|og member|annual|monthly|refund|billing|cancell?ation)\b/.test(q))topic='og';
  else if(/\b(drop|drops|edition|stock|reservation)\b/.test(q))topic='drops';
  else if(/\b(patch|patches|nerf|buff|loadout)\b/.test(q))topic='patch';
  else if(/\b(xp|passport|level up|stamps|badges)\b/.test(q))topic='passport';
  else if(/\b(points?|rewards?|redeem|missions)\b/.test(q))topic='rewards';
  else if(past||/\b(history|founders?|founding|founded|montage|trickshot|timeline|formed|joined|when did faze start)\b/.test(q))topic='history';
  else if(team||/\b(roster|players|lineup|coach|which games)\b/.test(q))topic='teams';
  else if(follow&&prior&&suggestion[prior])topic=prior;
  else if(/\b(merch|shop|cart|store)\b/.test(q))topic='shop';
  else if(/\b(forgot (?:my )?password|reset (?:my )?password|how do i (?:log|sign) in|privacy|account help)\b/.test(q))topic='privacy';
  const relevant=Boolean(topic!=='house'||team||domain.test(q)||/\b(hi|hello|hey|how do i log in|forgot password)\b/.test(q));
  const target=topic==='teams'&&team?'team:'+team.slug:topic;
  const fresh=words(question);
  const earlier=follow?words(history.map(turn=>turn.question).slice(-5).join(' ')):[];
  const docs=records.map(record=>({record,score:(record.id===target?9:0)+(record.id.startsWith(target+':')?2:0)+
    fresh.reduce((sum,word)=>sum+Number(record.words.has(word)),0)+earlier.reduce((sum,word)=>sum+(record.words.has(word)?0.15:0),0)}))
    .filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(item=>item.record);
  const current=/\b(latest|recent|today|currently|current|news|last match|scores?|results?|next match|standings|this week|up to date)\b/.test(q)&&
    !/\b(this site|sample|demo|patch intel|passport|drops|og club|membership)\b/.test(q);
  const outsideIndex=topic==='history'&&Boolean(past)&&/\b(roster|coach|players|dates?|when|scores?|results?)\b/.test(q)||
    topic==='teams'&&Boolean(team)&&/\b(salary|stats|rating|career|contracts?|nationality|transfer)\b/.test(q)||
    topic==='house'&&relevant&&!/\b(home|where is|where can|open|find|faZe house|clan page|hi|hello|hey)\b/i.test(q);
  const requiresSearch=current||outsideIndex;
  return {q,topic,team,past,docs,relevant,requiresSearch};
}

export function siteAnswer({q,topic,team,past,docs},ctx){
  const answer=(text,sources=[],extras={})=>reply(text,topic,sources,extras);
  if(topic==='privacy')return answer('Use Log in in the header. Select Forgot password on the login form to request a reset email.',[link('Account and privacy','/privacy')],{action:'login'});
  const term=glossary.find(([key])=>q.split(' ').includes(key));
  if(term&&/\b(mean|meaning|define|definition|stands? for|what is|explain)\b/.test(q))return answer(term[1],[link('Patch Intel','/patch-intel')]);
  if(topic==='personal'){
    if(!ctx.user)return answer('Log in to see your own Passport XP, level, points, membership, and drop eligibility.',[link('Gaming Passport','/passport')],{action:'login'});
    const my=programUser(ctx.user), wallet=fanWallet(ctx.user);
    if(/\b(drop|eligible)\b/.test(q)){
      const eligible=chatDropContext(ctx.data,ctx.user,ctx.demo).filter(drop=>drop.status==='Live'&&drop.unlocked&&drop.remaining>0);
      return answer(eligible.length?'Eligible to reserve: '+eligible.map(drop=>drop.name+(drop.sample?' (sample)':'')).join(', ')+'. Stock and account limits apply.':'There are no live editions you can reserve right now.',[link('Exclusive Drops','/drops')]);
    }
    return answer('You have **'+my.xp+' XP**, level **'+my.level+'**, and **'+wallet.balance+' points**. '+(my.next?'You need **'+my.next+' XP** for the next level.':'You are at the maximum level.')+' Your membership is '+(my.member?'OG ('+my.status+')':'free Fan')+'.',[link('Gaming Passport','/passport'),link('OG dashboard','/og/dashboard'),link('Rewards','/#rewards')]);
  }
  if(topic==='teams'){
    if(/\b(scores?|results?|last match|next match|standings)\b/.test(q)){
      const events=faze.results.filter(item=>!team||teamIn(normalize(item.game))===team).slice(0,3);
      return answer(events.length?'Recorded results in the fan-hub archive:\n'+events.map(event=>'- '+event.year+' '+event.event+' — '+event.place).join('\n'):'The fan hub does not have a verified result for this query.',
        events.map(event=>link(event.event,event.source)));
    }
    if(!team)return answer('The fan hub lists '+teams.map(item=>item.name).join(', ')+'. Which roster would you like?',[link('Team rosters','/teams')]);
    const coaches=team.players.filter(player=>player.coach);
    const squad=team.players.filter(player=>!player.coach);
    const href='/teams#'+team.slug;
    if(/\bcoach(?:es|ing)?\b/.test(q))return answer(coaches.length?'Our '+team.name+' roster lists '+coaches.map(player=>'**'+player.name+'** as '+player.role).join(' and ')+'.':'Our '+team.name+' roster does not list a coach.',[link('Team roster',href)]);
    return answer('Our '+team.name+' roster lists '+squad.map(player=>'**'+player.name+'**'+(player.inactive?' (inactive)':'')).join(', ')+'.'+(coaches.length?' Coaching: '+coaches.map(player=>player.name+' ('+player.role+')').join(', ')+'.':''),
      [link('Team roster',href)],{card:{label:team.name,detail:squad.filter(player=>!player.inactive).map(player=>player.name).join(' · '),href}});
  }
  if(topic==='drops'){
    const drops=chatDropContext(ctx.data,ctx.user,ctx.demo);
    const next=drops.find(drop=>q.includes(normalize(drop.name)))||drops.filter(drop=>drop.status==='Upcoming').sort((a,b)=>Date.parse(a.launch)-Date.parse(b.launch))[0]||drops.find(drop=>drop.status==='Live');
    if(!next)return answer('I found no upcoming or live drop in the site data.',[link('Exclusive Drops','/drops')]);
    const href='/drops/'+next.id;
    return answer((next.sample?'**Sample drop.** ':'')+'**'+next.name+'** is '+next.status.toLowerCase()+'. '+next.story+' '+next.quantity+' editions. '+(next.lock||'Open its page to check availability or reserve.'),[link('Exclusive Drops',href)],
      {card:{label:next.name,detail:next.sample?'Sample edition':'FaZe edition',href,countdown:next.status==='Upcoming'?next.launch:undefined}});
  }
  if(topic==='og'){
    if(/\b(refund|legal|tax|chargeback|contract)\b/.test(q))return answer('Check the posted terms and refund policy. The demo has policy placeholders. FaZe contact options are on About Us.',[link('Refund policy','/terms#refunds'),link('Contact','/about#contact')]);
    return answer(ogText,[link('OG Club','/og')]);
  }
  if(topic==='passport')return answer(xp+' Sample XP activities include eligible watches, tasks, polls, NEXT entries and votes, referrals, events, and purchases. Active paid OG members receive **+'+OG_XP_BONUS_LABEL+' XP**, with fractional carry. Daily caps and cooldowns apply to base XP.',[link('Gaming Passport','/passport'),link('OG Club','/og')]);
  if(topic==='next')return answer(nextText,[link('FaZe NEXT rules','/next/rules'),link('Enter FaZe NEXT','/next/enter')]);
  if(topic==='patch'){
    const detail=docs.find(record=>record.id.startsWith('patch:')&&(!team||normalize(record.label).includes(normalize(team.name))));
    return answer('Patch Intel currently shows **sample data** for six games. Verify official changes with the game publisher.'+(detail?' '+detail.label+': '+detail.text:''),
      detail?[link(detail.label,detail.url),link('Patch Intel','/patch-intel')]:[link('Patch Intel','/patch-intel')]);
  }
  if(topic==='history'&&past)return answer(past+' is listed among the past FaZe divisions on this site.',[link('Past divisions','/teams#past-divisions'),link('FaZe timeline','/brand/timeline.pdf')]);
  if(topic==='history'&&/\b(founders?|founding|founded|when did faze start)\b/.test(q)){
    const era=faze.eras[0];
    return answer(era.period+': '+era.text,[link('FaZe timeline','/brand/timeline.pdf'),link('About FaZe','/about')]);
  }
  if(topic==='history')return answer('FaZe’s early identity grew around Call of Duty trickshots, montages, and the ILLCAMS era. The site timeline follows the move into professional competition across games.',[link('About FaZe','/about'),link('FaZe timeline','/brand/timeline.pdf'),link('Official FaZe Clan','https://fazeclan.com/')]);
  if(topic==='rewards')return answer(rewardsText,[link('Rewards','/#rewards')]);
  if(topic==='shop')return answer('Browse Shop for current listings and product links. Exclusive Drops shows limited editions and eligibility.',[link('Shop','/#shop'),link('Exclusive Drops','/drops')]);
  if(topic==='general')return answer('Gemini is unavailable right now. You can still ask about FaZe, gaming, or this site.',[house]);
  return answer('FaZe House brings together Gaming Passport, OG Club, Exclusive Drops, and Clan. FaZe NEXT is under **More**.',[house,link('FaZe NEXT','/next')]);
}

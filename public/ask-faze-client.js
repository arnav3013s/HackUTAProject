import { h, useEffect, useRef, useState, Icon, Modal, api } from './club-ui.js';
import { BrandLogo } from './fan-auth.js';

const starts=['Who plays for FaZe Counter-Strike?','How do I earn XP?','What’s in the next drop?','What does OG Club give me?','Tell me FaZe’s history','Show me around the site'];
const guestKey='ask-faze-session-v1';
const stamp=value=>new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(value);
const button=(text,action,props={})=>h('button',{type:'button',className:'ask-faze-control',onClick:action,...props},text);
function guestHistory(){
  try{const value=JSON.parse(sessionStorage.getItem(guestKey)||'[]');return Array.isArray(value)?value.slice(0,20):[];}catch{return [];}
}
function link(label,url,key){
  const internal=typeof url==='string'&&/^\/(?!\/)|^#/.test(url)&&!/[\s\\]/.test(url);
  let external=false;
  if(!internal)try{const u=new URL(url);external=u.protocol==='https:'&&!u.username&&!u.password;}catch{}
  return internal||external?h('a',{key,href:internal&&url.startsWith('#')?'/'+url:url,target:external?'_blank':undefined,rel:external?'noopener noreferrer':undefined},label):label;
}
function inline(text){
  const result=[];
  const pattern=/\*\*([^*\n]+)\*\*|__([^_\n]+)__|`([^`\n]+)`|\[([^\]\n]+)\]\(([^\s)]+)\)|\*([^*\n]+)\*/g;
  let start=0;
  for(const match of text.matchAll(pattern)){
    if(match.index>start)result.push(text.slice(start,match.index));
    const key=match.index;
    result.push(match[1]||match[2]?h('strong',{key},match[1]||match[2]):match[3]?h('code',{key},match[3]):
      match[4]?link(match[4],match[5],key):h('em',{key},match[6]));
    start=key+match[0].length;
  }
  if(start<text.length)result.push(text.slice(start));
  return result;
}
const cells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
const fence=/^ *```/;
const item=/^\s*(?:(\d+)\.|[-*+])\s+(.+)$/;
const divider=/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
export function AskMarkdown({ value }){
  const lines=(value||'').split(/\r?\n/),nodes=[];
  const tr=(row,count,key,tag)=>h('tr',{key},Array.from({length:count},(_,i)=>h(tag,{key:i,scope:tag==='th'?'col':undefined},inline(row[i]||''))));
  for(let i=0;i<lines.length;){
    const key=i,line=lines[i++];
    if(!line.trim())continue;
    if(fence.test(line)){
      const code=[];
      while(i<lines.length&&!fence.test(lines[i]))code.push(lines[i++]);
      if(i<lines.length)i++;
      nodes.push(h('pre',{key},h('code',null,code.join('\n'))));
    }else if(line.includes('|')&&i<lines.length&&divider.test(lines[i])){
      const header=cells(line),rows=[];
      i++;
      while(i<lines.length&&lines[i].trim()&&lines[i].includes('|'))rows.push(cells(lines[i++]));
      nodes.push(h('div',{key,className:'ask-faze-table'},h('table',null,h('thead',null,tr(header,header.length,'head','th')),
        h('tbody',null,rows.map((row,j)=>tr(row,header.length,j,'td'))))));
    }else if(item.test(line)){
      const first=line.match(item),ordered=Boolean(first[1]),values=[first[2]];
      while(i<lines.length){
        const match=lines[i].match(item);
        if(!match||Boolean(match[1])!==ordered)break;
        values.push(match[2]);i++;
      }
      nodes.push(h(ordered?'ol':'ul',{key,...(ordered?{start:Number(first[1])}:{})},values.map((value,j)=>h('li',{key:j},inline(value)))));
    }else{
      const heading=line.match(/^\s*#{1,6}\s+(.*)/);
      nodes.push(h('p',{key},heading?h('strong',null,inline(heading[1])):inline(line.replace(/^>\s?/,''))));
    }
  }
  return h('div',{className:'ask-faze-markdown'},nodes);
}
async function receive(payload,signal,onDelta){
  const res=await fetch('/api/ask-faze/message',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok){const problem=await res.json().catch(()=>({}));throw Error(problem.error||'Ask FaZe is unavailable. Try again.');}
  const decoder=new TextDecoder();
  let rest='',reply;
  for await(const chunk of res.body){
    rest+=decoder.decode(chunk,{stream:true});
    let end;
    while((end=rest.indexOf('\n\n'))>=0){
      const frame=rest.slice(0,end);rest=rest.slice(end+2);
      const event=frame.match(/^event: (.+)$/m)?.[1],raw=frame.match(/^data: (.+)$/m)?.[1];
      if(!raw)continue;
      const data=JSON.parse(raw);
      if(event==='delta')onDelta(data);
      if(event==='reply')reply=data;
      if(event==='error')throw Error(data.message);
    }
  }
  if(!reply)throw Error('The reply ended early. Try again.');
  return reply;
}
function Clock({ date }){
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const n=Math.max(0,Math.floor((Date.parse(date)-now)/1000));
  if(!Number.isFinite(n))return null;
  return h('small',null,n?'Launches in '+Math.floor(n/86400)+'d '+Math.floor(n%86400/3600)+'h '+Math.floor(n%3600/60)+'m '+n%60+'s':'Check the current drop status');
}
function Answer({ turn, animate, motion, recent, busy, run, react, act, notice }){
  const length=turn.answer.length;
  const [visible,setVisible]=useState(animate&&!motion&&!turn.streamed?0:length);
  useEffect(()=>{
    if(!animate||motion||turn.streamed){setVisible(length);return;}
    const timer=setInterval(()=>setVisible(count=>{
      if(count+1>=length){clearInterval(timer);return length;}return count+1;
    }),19);
    return()=>clearInterval(timer);
  },[animate,motion,turn.id]);
  if(visible<length)return h('article',{className:'clan-chat-answer'},h('p',{'aria-hidden':true},turn.answer.slice(0,visible)),button('Skip',()=>setVisible(length)));
  const action={tour:'Start guided tour',signup:'Create account',login:'Log in'}[turn.action];
  const refs=turn.sources?.map((item,i)=>link(item.label,item.url,i));
  const searches=turn.searches?.map((query,i)=>link('Google Search · '+query,'https://www.google.com/search?q='+encodeURIComponent(query),i));
  return h('article',{className:'clan-chat-answer'},
    h(AskMarkdown,{value:turn.answer}),turn.status&&h('p',{role:'status',className:'ask-faze-status'},turn.status),
    refs?.length>0&&h('div',{className:'clan-assistant-sources'},refs),searches?.length>0&&h('div',{className:'clan-assistant-sources'},searches),
    turn.card&&h('div',{className:'ask-faze-card'},h('strong',null,turn.card.label),h('span',null,turn.card.detail),turn.card.countdown&&h(Clock,{date:turn.card.countdown}),link('Open '+turn.card.label,turn.card.href)),
    action&&button(action,()=>act(turn.action)),
    h('div',{className:'ask-faze-reactions'},
      button('Copy',async()=>{try{await navigator.clipboard.writeText(turn.answer);notice('Copied reply.');}catch{notice('Could not copy reply.');}},{'aria-label':'Copy reply'}),
      ['up','down'].map(kind=>button(kind==='up'?'👍':'👎',()=>react(turn,kind),{key:kind,disabled:busy,'aria-label':kind==='up'?'Thumbs up':'Thumbs down','aria-pressed':turn.reaction===kind})),
      recent&&button(turn.retry?'Try again':'Regenerate',()=>run(turn.question,true),{disabled:busy})),
    recent&&turn.suggestions?.length>0&&h('div',{className:'ask-faze-suggestions'},turn.suggestions.slice(0,3).map(prompt=>button(prompt,()=>run(prompt),{key:prompt,disabled:busy}))));
}

function History({ chats, active, rename, setRename, change, select, busy, loading, admin, review }){
  const rows=chats.map(chat=>{
    if(rename?.id===chat.id)return h('li',{key:chat.id},h('form',{onSubmit:event=>{event.preventDefault();const title=rename.title.trim();if(title)void change('rename',{chatId:chat.id,title});}},
      h('input',{autoFocus:true,value:rename.title,maxLength:70,'aria-label':'Chat title',onChange:event=>setRename({...rename,title:event.target.value})}),
      h('button',{className:'ask-faze-control'},'Save'),button('Cancel',()=>setRename(null))));
    return h('li',{key:chat.id,className:'ask-faze-history-row'},button(chat.title,()=>select(chat.id),{'aria-current':active===chat.id?'true':undefined,title:chat.title}),
      button('Rename',()=>setRename({id:chat.id,title:chat.title}),{'aria-label':'Rename '+chat.title,disabled:busy}),
      button('Delete',()=>{if(window.confirm('Delete this chat?'))void change('delete',{chatId:chat.id});},{'aria-label':'Delete '+chat.title,disabled:busy}));
  });
  return h('aside',{className:'ask-faze-history','aria-label':'Chat history'},
    h('div',{className:'ask-faze-history-title'},h('strong',null,'Chat history'),button('New chat',()=>select(null))),
    loading?h('p',{role:'status'},'Loading saved chats…'):rows.length?h('ul',null,rows):h('p',null,'No chats yet.'),
    admin&&button('Review feedback',review),
    button('Clear conversation',()=>{if(active&&window.confirm('Clear this conversation?'))void change('delete',{chatId:active});},{disabled:busy||!chats.some(chat=>chat.id===active)}));
}

export function FloatingAssistant({ blocked, user, onAction }){
  const [open,setOpen]=useState(false),[large,setLarge]=useState(false),[chats,setChats]=useState([]);
  const [active,setActive]=useState(null),[draft,setDraft]=useState(''),[pending,setPending]=useState(null);
  const [busy,setBusy]=useState(false),[motion,setMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[rename,setRename]=useState(null);
  const [feedback,setFeedback]=useState(null),[animate,setAnimate]=useState(null);
  const [config,setConfig]=useState({maxInput:800,maxThreads:20,maxTurns:32});
  const [pulse]=useState(()=>{try{if(localStorage.getItem('ask-faze-seen'))return false;localStorage.setItem('ask-faze-seen','1');}catch{}return true;});
  const launcher=useRef(null),input=useRef(null),log=useRef(null),request=useRef(null),known=useRef([]);
  const buffer=useRef(''),owner=useRef(user?.id);
  owner.current=user?.id;
  const signed=Boolean(user);
  const thread=chats.find(chat=>chat.id===active);
  const turns=thread?.turns||[];
  const visible=pending?.retry?turns.slice(0,-1):turns;

  function publish(list){
    known.current=list;setChats(list);
    if(!signed)try{sessionStorage.setItem(guestKey,JSON.stringify(list));}catch{}
  }
  useEffect(()=>{
    request.current?.abort();request.current=null;setBusy(false);setPending(null);setRename(null);setFeedback(null);setDraft('');
    const restored=signed?[]:guestHistory();
    publish(restored);setActive(restored[0]?.id||null);setLoading(signed);
    let alive=true;
    api('ask-faze/chats').then(info=>{
      if(!alive)return;
      setConfig(info.config);
      if(signed){publish(info.threads);setActive(info.threads[0]?.id||null);}
    }).catch(()=>{if(alive&&signed)setNotice('Saved chats are temporarily unavailable.');}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;request.current?.abort();};
  },[user?.id]);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setMotion(media.matches);
    media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{if(open&&!blocked&&!large)input.current?.focus();},[open,blocked,large,active]);
  useEffect(()=>{
    if(!open||blocked||!log.current)return;
    const pane=log.current,scroll=()=>{pane.scrollTop=pane.scrollHeight;};
    const observer=new MutationObserver(scroll);
    observer.observe(pane,{subtree:true,childList:true,characterData:true});
    scroll();return()=>observer.disconnect();
  },[open,blocked,large,active]);
  useEffect(()=>{
    if(!busy||motion)return;
    const timer=setInterval(()=>{
      const part=buffer.current.match(/^\s*\S+\s*|^\s+/)?.[0];
      if(!part)return;
      buffer.current=buffer.current.slice(part.length);
      setPending(current=>current?{...current,text:(current.text||'')+part}:current);
    },28);
    return()=>clearInterval(timer);
  },[busy,motion]);

  function stop(){
    if(!request.current)return;
    request.current.abort();request.current=null;buffer.current='';setBusy(false);
    setPending(current=>current?{...current,status:'Stopped generating.'}:current);
  }
  function select(id){stop();setPending(null);setActive(id);setDraft('');setRename(null);setFeedback(null);setAnimate(null);}
  function close(){setOpen(false);setLarge(false);launcher.current?.focus();}
  async function run(question,retry=false){
    question=question.trim();
    if(question.length<2||question.length>config.maxInput||request.current||loading)return;
    const chatId=active||crypto.randomUUID(),account=user?.id,controller=new AbortController();
    request.current=controller;buffer.current='';
    setActive(chatId);setDraft('');setNotice('');setBusy(true);setPending({question,retry,text:'',time:Date.now()});
    try{
      const reply=await receive({chatId,question,retry,history:signed?undefined:turns.slice(-8).map(({question,answer,topic})=>({question,answer,topic}))},
        controller.signal,part=>{if(request.current===controller&&!motion)buffer.current+=part;});
      if(request.current!==controller||owner.current!==account)return;
      const before=known.current.find(chat=>chat.id===chatId);
      const old=before?.turns||[];
      const updated={id:chatId,title:before?.title||question.slice(0,52),updated:reply.time,turns:[...(retry?old.slice(0,-1):old),reply].slice(-config.maxTurns)};
      publish([updated,...known.current.filter(chat=>chat.id!==chatId)].slice(0,config.maxThreads));
      setAnimate(reply.id);setPending(null);
    }catch(error){
      if(!controller.signal.aborted&&request.current===controller)setPending(current=>current?{...current,text:'',status:error.message||'The reply failed. Try again.'}:current);
    }finally{
      if(request.current===controller){request.current=null;buffer.current='';setBusy(false);}
    }
  }
  async function change(operation,args={}){
    const account=user?.id;
    try{
      if(signed){
        const result=await api('ask-faze/history',{operation,...args});
        if(owner.current!==account)return;
        publish(result.threads);
      }else{
        if(operation==='react'&&args.reaction)await api('ask-faze/history',{operation,...args});
        if(owner.current!==account)return;
        const old=known.current;
        if(operation==='rename')publish(old.map(chat=>chat.id===args.chatId?{...chat,title:args.title}:chat));
        if(operation==='delete')publish(old.filter(chat=>chat.id!==args.chatId));
        if(operation==='react')publish(old.map(chat=>chat.id===args.chatId?{...chat,turns:chat.turns.map(turn=>turn.id===args.turnId?{...turn,reaction:args.reaction}:turn)}:chat));
      }
      if(operation==='delete'&&args.chatId===active)select(null);
      if(operation==='rename')setRename(null);
      if(operation==='react')setNotice('Feedback saved.');
    }catch(error){setNotice(error.message||'Could not update chats.');}
  }
  const react=(turn,kind)=>change('react',{chatId:active,turnId:turn.id,reaction:turn.reaction===kind?null:kind});
  const act=kind=>{close();onAction(kind);};
  const userTurn=(question,time)=>h('article',{className:'clan-chat-you'},h('time',null,stamp(time)),h('p',null,question));
  const messages=visible.map((turn,index)=>h('div',{className:'ask-faze-turn',key:turn.id},userTurn(turn.question,turn.time),
    h(Answer,{turn,animate:animate===turn.id,motion,recent:!pending&&index===visible.length-1,busy,run,react,act,notice:setNotice})));
  const waiting=pending&&h('div',{className:'ask-faze-turn'},userTurn(pending.question,pending.time),
    h('article',{className:'clan-chat-answer'},pending.status?h('div',{role:'status'},h('p',null,pending.status),button('Try again',()=>run(pending.question,pending.retry))):
      pending.text&&!motion?h('p',{'aria-hidden':true},pending.text):h('div',{className:'clan-typing',role:'status'},[0,1,2].map(i=>h('i',{key:i,'aria-hidden':true})),'FaZe AI is typing')));
  const review=async()=>{try{setFeedback(await api('ask-faze/feedback'));}catch(error){setNotice(error.message);}};
  if(blocked)return null;
  const conversation=h('div',{className:'ask-faze-conversation'},
    h('div',{ref:log,className:'clan-assistant-chat ask-faze-log',role:'log','aria-label':'Ask FaZe chat','aria-live':'polite','aria-relevant':'additions text'},
      feedback?h('section',null,h('h3',null,'Reply feedback'),button('Back to chat',()=>setFeedback(null)),feedback.items.length?
        h('ul',null,feedback.items.map((item,i)=>h('li',{key:i},(item.reaction==='up'?'Thumbs up':'Thumbs down')+' · '+item.topic+' · '+new Date(item.at).toLocaleDateString()))):h('p',null,'No recent feedback.')):
      h('div',null,!messages.length&&!waiting&&h('div',{className:'ask-faze-empty'},
        h('p',null,'Ask about rosters, FaZe history, or your fan perks.'),
        h('div',{className:'ask-faze-suggestions'},starts.map(prompt=>button(prompt,()=>run(prompt),{key:prompt,disabled:loading})))),messages,waiting)),
    notice&&h('p',{className:'ask-faze-notice',role:'status'},notice),
    h('form',{className:'ask-faze-composer',onSubmit:event=>{event.preventDefault();void run(draft);}},
      h('textarea',{ref:input,'aria-label':'Ask FaZe message',placeholder:'Message Ask FaZe',value:draft,maxLength:config.maxInput,rows:2,onChange:event=>setDraft(event.target.value),
        onKeyDown:event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void run(draft);}}}),
      h('div',{className:'ask-faze-send-row'},h('small',{'aria-label':'Message character count'},draft.length+'/'+config.maxInput),
        h('a',{href:'/privacy#ask-faze-privacy'},'Privacy'),busy&&button('Stop generating',stop),
        h('button',{type:'submit',className:'ai-button solid',disabled:busy||draft.trim().length<2||loading,'aria-label':'Send message'},h(Icon,{name:'arrow',size:16}),'Send'))));
  const heading=h('header',{className:'ask-faze-heading'},h('h2',null,'Ask FaZe'),h('div',null,
    button(large?'Collapse':'Expand',()=>setLarge(!large),{'aria-label':large?'Collapse Ask FaZe':'Expand Ask FaZe'}),
    !large&&button('Clear chat',()=>{if(thread&&window.confirm('Clear this conversation?'))void change('delete',{chatId:active});},{disabled:busy||!thread,'aria-label':'Clear conversation'}),
    !large&&button(h(Icon,{name:'close'}),close,{'aria-label':'Close Ask FaZe'})));
  return h('div',{className:'clan-assistant ask-faze'},
    open&&(large?h(Modal,{label:'Ask FaZe',className:'ask-faze-expanded',close},
      h('div',{className:'ask-faze-shell'},heading,h('div',{className:'ask-faze-expanded-grid'},
        h(History,{chats,active,rename,setRename,change,select,busy,loading,admin:user?.operator&&!user.demo,review}),conversation))):
      h('section',{className:'clan-assistant-panel ask-faze-compact',role:'dialog','aria-label':'Ask FaZe',onKeyDown:event=>{if(event.key==='Escape')close();}},heading,conversation)),
    h('button',{ref:launcher,type:'button',className:'clan-assistant-button'+(pulse?' pulse':''),'aria-label':open?'Close Ask FaZe':'Open Ask FaZe','aria-expanded':open,title:'Ask FaZe',onClick:()=>{if(open)close();else setOpen(true);}},h(BrandLogo)));
}

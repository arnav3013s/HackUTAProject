import { h, useEffect, useRef, useState, Icon, LinkButton } from './club-ui.js';

export const housePages = [
  { route:'passport', name:'Gaming Passport', note:'Earn XP, level up, and collect badges', icon:'person' },
  { route:'og', name:'OG Club', note:'Membership perks for day-one fans', icon:'star' },
  { route:'drops', name:'Exclusive Drops', note:'Limited-edition FaZe merch', icon:'cart' },
  { route:'next', name:'FaZe NEXT', note:'Submit clips, vote, and follow the finale', icon:'play' },
  { route:'clan', name:'Clan', note:'Meet the FaZe community', icon:'globe' }
];
export function inHouse(page) { return page === 'house' || housePages.some(item=>item.route===page); }

export function HouseMenu({ page, open, setOpen, mobile }) {
  const timer = useRef(null);
  const focusNext = useRef(null);
  const button = useRef(null);
  const panel = useRef(null);
  const [shift,setShift] = useState(0);
  const [touch,setTouch] = useState(()=>matchMedia('(hover: none)').matches);
  const pointer = useRef(null);
  const mode = mobile || touch;
  useEffect(()=>{
    const media=matchMedia('(hover: none)');
    const update=()=>setTouch(media.matches);
    media.addEventListener('change',update);
    return()=>{media.removeEventListener('change',update);clearTimeout(timer.current);};
  },[]);
  useEffect(()=>{
    if(!open||!panel.current)return;
    const place=()=>{
      const box=button.current.getBoundingClientRect();
      const width=panel.current.offsetWidth;
      setShift(mode?0:Math.min(0,window.innerWidth-box.left-width-12));
    };
    place();
    window.addEventListener('resize',place);
    if(focusNext.current!=null){panel.current.querySelectorAll('[role=menuitem]')[focusNext.current]?.focus();focusNext.current=null;}
    return()=>window.removeEventListener('resize',place);
  },[open,mode]);
  const delay=(action, ms)=>{clearTimeout(timer.current);timer.current=setTimeout(action,ms);};
  function show(index) {
    clearTimeout(timer.current);
    if(open)panel.current?.querySelectorAll('[role=menuitem]')[index]?.focus();
    else {focusNext.current=index;setOpen(true);}
  }
  function close(refocus=false) {
    clearTimeout(timer.current);
    focusNext.current=null;
    setOpen(false);
    if(refocus)button.current.focus();
  }
  function keys(event){
    if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close(true);return;}
    if(event.key==='Tab'&&open){close(panel.current?.contains(event.target));return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();
    const items=[...(panel.current?.querySelectorAll('[role=menuitem]') || [])];
    const current=items.indexOf(document.activeElement);
    const last=items.length-1;
    const index=event.key==='Home'?0:event.key==='End'?last:current<0?(event.key==='ArrowUp'?last:0):
      (current+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;
    show(index);
  }
  return h('div',{className:'ai-nav-group house-group'+(open?' shown':''),onKeyDown:keys,
    onPointerEnter:event=>{if(!mode&&event.pointerType==='mouse')delay(()=>setOpen(true),120);},
    onPointerLeave:event=>{if(!mode&&event.pointerType==='mouse')delay(()=>{if(!panel.current?.contains(document.activeElement))close();},250);},
    onBlur:event=>{if(!event.currentTarget.contains(event.relatedTarget)&&open)close();}},
    h('button',{type:'button',ref:button,className:'ai-more house-trigger','aria-haspopup':'menu','aria-expanded':open,'aria-controls':'faze-house-menu',
      'aria-current':inHouse(page)?'true':undefined,onPointerDown:event=>{pointer.current=event.pointerType;},
      onClick:event=>{
        const type=pointer.current;
        pointer.current=null;
        if(event.detail===0){show(0);return;}
        if(mode||type==='touch'||type==='pen'||event.target.closest('[data-house-chevron]')){if(open)close();else setOpen(true);return;}
        location.assign('/house');
      }},
    'FaZe House',h('span',{'data-house-chevron':'',className:'house-chevron'},h(Icon,{name:'down',size:13}))),
    h('div',{id:'faze-house-menu',ref:panel,role:'menu','aria-label':'FaZe House',className:'ai-nav-drop house-menu',style:{'--house-shift':shift+'px'}},
      housePages.map(item=>h('a',{key:item.route,role:'menuitem',className:'clan-menu-item',href:'/'+item.route,tabIndex:-1,
        'aria-current':page===item.route?'page':undefined},
        h(Icon,{name:item.icon}),h('span',null,h('strong',null,item.name),h('small',null,item.note)))),
      h('a',{href:'/house',role:'menuitem',tabIndex:-1,className:'clan-menu-item house-all','aria-current':page==='house'?'page':undefined},'View all',h(Icon,{name:'arrow',size:13}))));
}

export function HouseNavigation({ page }) {
  if(!inHouse(page))return null;
  const item=housePages.find(entry=>entry.route===page);
  return h('div',{className:'house-subnav'},
    h('nav',{'aria-label':'Breadcrumb',className:'house-crumb'},h('a',{href:'/house','aria-current':page==='house'?'page':undefined},'FaZe House'),
      item&&h('span',null,h('span',{'aria-hidden':true},' / '),h('span',{'aria-current':'page'},item.name))),
    h('nav',{'aria-label':'FaZe House pages',className:'house-tabs'},
      housePages.map(entry=>h('a',{key:entry.route,href:'/'+entry.route,'aria-current':page===entry.route?'page':undefined},entry.name))));
}

export function HousePage() {
  return h('section',{className:'ai-section house-hub'},h('div',{className:'house-hero'},h('h1',null,'FaZe House'),h('p',null,'Level up, unlock OG perks, and discover the Clan.')),
    h('div',{className:'house-card-grid'},housePages.map(item=>h('article',{key:item.route,className:'clan-card house-card'},
      h('div',{className:'house-card-icon'},h(Icon,{name:item.icon,size:34})),h('h2',null,item.name),h('p',null,item.note),
      h(LinkButton,{href:'/'+item.route,kind:'outline'},'Open '+item.name)))));
}

export function HouseFooter() {
  return h('nav',{className:'house-footer','aria-label':'FaZe House'},h('a',{href:'/house'},h('strong',null,'FaZe House')),
    housePages.map(item=>h('a',{key:item.route,href:'/'+item.route},item.name)));
}

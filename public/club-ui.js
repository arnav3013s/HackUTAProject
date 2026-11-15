const { createElement, useEffect, useRef, useState } = window.React;
export { createElement as h, useEffect, useRef, useState };
const h = createElement;

export function Icon({ name, size = 19 }) {
  const paths = {
    arrow: 'M4 12h15m-6-6 6 6-6 6', diagonal: 'M6 18 18 6M7 6h11v11',
    down: 'm6 9 6 6 6-6', close: 'M6 6l12 12M18 6 6 18',
    menu: 'M4 7h16M4 12h16M4 17h16', person: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    cart: 'M4 8h16l1 13H3L4 8Zm4 2V6a4 4 0 1 1 8 0v4', play: 'm8 5 12 7-12 7V5Z',
    pause: 'M9 5v14m6-14v14', left: 'm15 5-7 7 7 7', right: 'm9 5 7 7-7 7',
    copy: 'M8 8h12v12H8zM16 8V4H4v12h4', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm9 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm2-5h.01',
    twitter: 'M4 4h4l12 16h-4L4 4Zm16 0L4 20', twitch: 'M4 3h17v12l-5 5h-4l-3 3v-3H4V3Zm7 5v5m5-5v5',
    youtube: 'M3 7c0-2 2-3 9-3s9 1 9 3v10c0 2-2 3-9 3s-9-1-9-3V7Zm7 1 6 4-6 4V8Z',
    sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    moon: 'M20.4 15.3A8.5 8.5 0 0 1 8.7 3.6 8.5 8.5 0 1 0 20.4 15.3Z'
  };
  return h('svg', { viewBox:'0 0 24 24', width:size, height:size, fill:'none', stroke:'currentColor', strokeWidth:1.55, strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true }, h('path',{d:paths[name]}));
}

export function LinkButton({ href, children, kind = 'solid', external = false, icon = 'arrow', ...props }) {
  return h('a', { className:'ai-button '+kind, href, target:external ? '_blank' : undefined, rel:external ? 'noopener noreferrer' : undefined, ...props }, children, icon && h(Icon,{name:icon}));
}

export function SectionTitle({ label, title, href, action, children }) {
  return h('div',{ className:'ai-section-head' },h('div',null,label && h('div',{className:'ai-kicker'},label),h('h2',null,title),children),href && h(LinkButton,{href,kind:'outline'},action));
}

export function Title({ label, title, children }) {
  return h('div',{className:'ai-page-head'},h('div',{className:'ai-kicker'},label),h('h1',null,title),children && h('p',null,children));
}

export function Image({ src, alt = '', priority = false, fallback = '/images/media-placeholder.svg', ...props }) {
  return h('img',{src,alt,loading:priority ? 'eager' : 'lazy',decoding:'async',fetchpriority:priority ? 'high' : undefined,
    onError:event=>{if (!event.currentTarget.dataset.fallback) {
      event.currentTarget.dataset.fallback = 'true';
      event.currentTarget.src = fallback || '/images/media-placeholder.svg';
    } else event.currentTarget.style.visibility = 'hidden';},...props});
}

export function Filters({ items, current, select, name }) {
  return h('div',{className:'ai-filters flex flex-wrap gap-2','aria-label':name,role:'group'},
    items.map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':id===current,onClick:()=>select(id)},label)));
}

export function Modal({ children, close, label, className = '', keyboard }) {
  const ref = useRef(null);
  useEffect(()=>{
    const element = ref.current;
    const trigger = document.activeElement;
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return ()=>{ if (element.open) element.close(); document.body.style.overflow = previous; if (trigger?.isConnected) trigger.focus({preventScroll:true}); };
  },[]);
  return h('dialog',{ref,className:'ai-modal '+className,'aria-label':label,onCancel:e=>{e.preventDefault();close();},
    onKeyDown:keyboard,onClick:e=>{if(e.target===e.currentTarget) close();}},
    h('div',{className:'ai-modal-inner'},h('button',{className:'ai-icon ai-modal-close',type:'button','aria-label':'Close '+label,onClick:close,autoFocus:true},h(Icon,{name:'close'})),children));
}

export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
export const number = value => new Intl.NumberFormat('en-US').format(value ?? 0);
export const date = value => new Date(value).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
export const officialShop = 'https://fazeclan.com/collections/faze-esports';

export async function api(path, payload) {
  const response = await fetch('/api/' + path,payload === undefined ? undefined : {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed. Please try again.');
  return result;
}

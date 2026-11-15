
import { h, useEffect, useState, Icon, LinkButton } from './club-ui.js';

const emptyFilters = { type: '', category: '', impact: '', from: '', to: '' };
const fmtDate = text => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(text));
const count = (patch, type) => patch.changes.filter(change => change.type === type).length;
const typeClass = type => 'intel-chip ' + type.toLowerCase();

function Impact({ value }) {
  return h('span', { className: 'intel-impact', role: 'img', 'aria-label': 'Competitive impact ' + value + ' of 5' },
    [...Array(5)].map((_,i) => h('i', { key: i, className: i < value ? 'filled' : '' })), h('b', { 'aria-hidden': true }, value + '/5'));
}
function PatchCard({ game, patch, types, selected, setSelected, deep, notify }) {
  const allCats = [...new Set(patch.changes.map(change => change.category))];
  const official = /^https:\/\//i.test(patch.official);
  async function copy() {
    const url = new URL('/patch-intel', location.origin);
    url.searchParams.set('patch', patch.id);
    try { await navigator.clipboard.writeText(url.href); notify('Patch link copied.'); }
    catch { notify('Could not copy automatically. Open the patch link and copy it from the address bar.', true); }
  }
  return h('article', { className: 'intel-card', id: patch.id },
    h('header', null, h('div', null, h('p', { className: 'ai-kicker' }, game.name), h('h2', null, patch.version)),
      h('div', { className: 'intel-card-date' }, h('time', { dateTime: patch.date }, fmtDate(patch.date)), patch.sample && h('span', { className: 'clan-tag' }, 'Sample data'))),
    h('div', { className: 'intel-pills' }, h(Impact, { value: patch.impact }),
      types.filter(type => count(patch,type)).map(type => h('span', { key: type, className: typeClass(type) }, count(patch,type) + ' ' + type))),
    h('p', { className: 'intel-summary' }, patch.summary),
    h('div', { className: 'intel-pills' }, patch.tags.map(tag => h('span', { className: 'clan-tag', key: tag }, tag))),
    h('details', { className: 'intel-breakdown', open: selected === patch.id || undefined, onToggle: event => {
      if (event.currentTarget.open) setSelected(patch.id);
      else if (selected === patch.id) setSelected('');
    } },
    h('summary', null, h('span', null, 'Full breakdown'), h(Icon, { name: 'down', size: 16 })),
    allCats.map(category => h('section', { key: category },
      h('h3', null, h(Icon, { name: 'plus', size: 15 }), category),
      h('ul', null, patch.changes.filter(change => change.category === category).map((change, i) => h('li', { key: i },
        h('span', { className: typeClass(change.type) }, change.type),
        h('span', null, change.text),
        change.before != null && h('span', { className: 'intel-numeric' }, h('del', null, change.before), h(Icon, { name: 'arrow', size: 14 }), h('strong', null, change.after))))))),
    h('div', { className: 'intel-callouts' },
      h('div', null, h('h3', null, 'What this means for FaZe'), h('p', null, patch.faze)),
      h('div', null, h('h3', null, 'Meta shift'), h('p', null, patch.meta)))),
    h('footer', null, official ? h(LinkButton, { href: patch.official, kind: 'outline', external: true }, 'Official notes') :
      h('button', { className: 'ai-button outline', disabled: true, title: patch.official }, 'Official notes pending'),
      h('button', { className: 'ai-button outline', onClick: copy }, h(Icon, { name: 'copy', size: 15 }), 'Copy link'),
      deep && h('span', { className: 'clan-tag' }, 'Linked patch')));
}

function AtGlance({ patch, game }) {
  const [open,setOpen] = useState(false);
  if (!patch) return null;
  return h('aside', { className: 'intel-glance' },
    h('button', { className: 'intel-glance-toggle', 'aria-expanded': open, onClick: () => setOpen(!open) }, 'This patch at a glance', h(Icon,{name:'down',size:16})),
    h('div', { className: 'intel-glance-body' + (open ? ' opened' : '') },
      h('h2', null, 'This patch at a glance'), h('p', null, game.name + ' · ' + patch.version), h(Impact, { value: patch.impact }),
      h('dl', null, ['Buff','Nerf','Adjustment'].map(type => h('div',{key:type},h('dt',null,type),h('dd',null,count(patch,type))))),
      h('h3', null, 'Top changes'), h('ol', null, patch.changes.slice(0,3).map((change,index) => h('li',{key:index}, change.text)))));
}
export function PatchIntel({ notify }) {
  const deep = new URLSearchParams(location.search).get('patch') || '';
  const [source,setSource] = useState(null);
  const [error,setError] = useState(false);
  const [query,setQuery] = useState('');
  const [tab,setTab] = useState('all');
  const [filters,setFilters] = useState(emptyFilters);
  const [sort,setSort] = useState('newest');
  const [view,setView] = useState('cards');
  const [selected,setSelected] = useState(deep);
  useEffect(() => { let active = true; import('./patch-intel-data.js').then(data => { if (active) setSource(data); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, []);
  useEffect(() => {
    if (!source || !deep) return;
    const frame = requestAnimationFrame(() => document.getElementById(deep)?.scrollIntoView({ block:'center' }));
    return () => cancelAnimationFrame(frame);
  }, [source, deep]);
  const { patchGames = [], changeTypes = [], patchCategories = [] } = source || {};
  const tabs = [{ id:'all', name:'All games' }, ...patchGames];
  const match = query.trim().toLowerCase();
  const rows = patchGames.filter(game => tab === 'all' || game.id === tab)
    .flatMap(game => game.patches.map(patch => ({ game, patch }))).filter(({game,patch}) => {
      const words = [game.name,patch.version,patch.summary,patch.faze,patch.meta,...patch.tags,...patch.changes.flatMap(change=>[change.text,change.category,change.type])];
      return (!match || words.join(' ').toLowerCase().includes(match)) &&
        ((!filters.type && !filters.category) || patch.changes.some(change => (!filters.type || change.type === filters.type) && (!filters.category || change.category === filters.category))) &&
        (!filters.impact || patch.impact >= Number(filters.impact)) && (!filters.from || patch.date >= filters.from) && (!filters.to || patch.date <= filters.to);
    }).sort((a,b) => (sort === 'impact' ? b.patch.impact-a.patch.impact : 0) || b.patch.date.localeCompare(a.patch.date));
  const active = rows.find(row=>row.patch.id===selected) || rows[0];
  const select = (key, value) => setFilters({ ...filters, [key]: value });
  const labels = { type: 'Change type', category: 'Category', impact:'Minimum impact', from:'From', to:'To' };
  return h('div', { className: 'intel-page' },
    h('section', { className: 'intel-hero' }, h('div', { className: 'intel-shell' },
      h('div', { className: 'intel-head' }, h('div',null,h('p',{className:'ai-kicker'},'THE COMPETITIVE BRIEF'),h('h1',null,'PATCH INTEL'),
        h('p',null,'Track balance changes, competitive impact, and what to watch across six games.')),
      h('label',null,'Search all patches',h('input',{type:'search',placeholder:'Search weapons, maps, changes…',value:query,onChange:event=>setQuery(event.target.value)}))),
      h('div',{className:'clan-split'},h('h2',null,'Latest patches across all games'),h(LinkButton,{href:'/#patches/pro-reviews',kind:'outline'},'Pro reviews')),
      h('div',{className:'intel-latest'}, patchGames.map(game=>{
        const patch=[...game.patches].sort((a,b)=>b.date.localeCompare(a.date))[0];
        return h('button',{key:game.id,onClick:()=>{setTab(game.id);setSelected(patch?.id || '');document.getElementById('intel-tabs')?.scrollIntoView({block:'start'});},'aria-label':'Show '+game.name+' patches'},
          h('span',{className:'intel-game-icon', 'aria-hidden':true},game.icon),h('strong',null,game.name),
          patch ? h('span',null,patch.version + ' · ' + fmtDate(patch.date), patch.sample && h('small', null, 'Sample data')) : h('span',null,'No patches yet'));
      })))),
    h('div',{className:'intel-shell intel-body',id:'intel-tabs'},
      h('nav',{className:'intel-tabs','aria-label':'Patch games'},tabs.map(item=>h('button',{key:item.id,'aria-pressed':tab===item.id,onClick:()=>{setTab(item.id);setSelected('');}},item.name))),
      h('div',{className:'intel-filters'},
        [['type',changeTypes],['category',patchCategories],['impact',[1,2,3,4,5]]].map(([key,options]) => h('label',{key},labels[key],h('select',{value:filters[key],onChange:event=>select(key,event.target.value)},
          h('option',{value:''},'All'),options.map(value=>h('option',{key:value,value},value))))),
        ['from','to'].map(key=>h('label',{key},labels[key],h('input',{type:'date',value:filters[key],onChange:event=>select(key,event.target.value)}))),
        h('label',null,'Sort',h('select',{value:sort,onChange:e=>setSort(e.target.value)},h('option',{value:'newest'},'Newest first'),h('option',{value:'impact'},'Highest impact')))),
      h('div',{className:'intel-results'},h('span',{role:'status'},source ? rows.length + ' patches' : 'Loading patch intel'),
        h('div',{className:'intel-pills'},Object.entries(filters).filter(([,value])=>value).map(([key,value])=>h('button',{className:'clan-tag',key,onClick:()=>select(key,''),'aria-label':'Remove '+labels[key]},labels[key]+': '+value+' ×')),
        (query || Object.values(filters).some(Boolean)) && h('button',{className:'ai-text-button',onClick:()=>{setFilters(emptyFilters);setQuery('');}},'Clear all')),
        h('div',{className:'intel-view',role:'group','aria-label':'Patch layout'},['cards','timeline'].map(item=>h('button',{key:item,'aria-pressed':view===item,onClick:()=>setView(item)},item==='cards'?'Cards':'Timeline')))),
      tab!=='all'&&source&&h('p',{className:'ai-muted'},'Last updated: '+(patchGames.find(game=>game.id===tab)?.updated ? fmtDate(patchGames.find(game=>game.id===tab).updated) : 'No data yet')),
      error ? h('p',{role:'alert',className:'clan-card'},'Patch intel could not load. Refresh to retry.') : !source ?
        h('div',{'aria-busy':true,className:'intel-skeleton'},[0,1,2].map(index=>h('div',{key:index}))) :
        !rows.length ? h('div',{className:'clan-card'},h('h2',null,'No patches found'),h('p',null,'Try a different game, date or filter.')) :
        h('div',{className:'intel-layout'},
          h(AtGlance,active),
          h('div',{className:'intel-list '+view},rows.map(({patch,game})=>h(PatchCard,{key:patch.id,patch,game,types:changeTypes,selected,setSelected,deep:deep===patch.id,notify}))))));
}

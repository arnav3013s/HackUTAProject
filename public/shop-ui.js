import { h, useState, Image, Icon, LinkButton, Filters, Title, money, officialShop } from './club-ui.js';
import { products } from './shop-data.js';

const names = new Map(products.map(item=>[item.id,item]));
const storageKey='faze-clan-cart-v1';
const previousStorageKey=['faze','after','image','cart','v1'].join('-');
export function readCart() {
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem(previousStorageKey));
    if (!Array.isArray(saved)) return [];
    return saved.filter(line=>line && names.get(line.id)?.sizes.includes(line.size) && Number.isInteger(line.quantity) && line.quantity>0 && line.quantity<=10);
  } catch { return []; }
}
export function saveCart(lines) {
  try { localStorage.setItem(storageKey,JSON.stringify(lines)); } catch {}
}
export function updateCart(lines,id,size,delta) {
  const existing=lines.find(line=>line.id===id&&line.size===size);
  const quantity=Math.min(10,(existing?.quantity || 0)+delta);
  if (existing) return lines.flatMap(line=>line===existing?(quantity>0?[{...line,quantity}]:[]):[line]);
  return quantity>0?[...lines,{id,size,quantity}]:lines;
}

function Price({item}) {
  return h('span',{className:'ai-price'},item.original && h('s',null,money(item.original)),' ',money(item.price));
}
function ProductCard({item}) {
  return h('a',{className:'ai-product',href:'#shop/'+item.id},
    h('div',{className:'ai-product-image'},h(Image,{src:item.image,alt:item.name,fallback:null}),
      item.soldOut && h('span',{className:'ai-stock'},'Out of stock'),h('span',{className:'ai-product-open'},h(Icon,{name:'plus'}))),
    h('div',{className:'ai-product-copy'},h('span',{className:'ai-kicker'},item.kind),h('h3',null,item.name),h(Price,{item})));
}
export function ProductGrid({items}) {
  return h('div',{className:'ai-product-grid'},items.map(item=>h(ProductCard,{key:item.id,item})));
}

function ProductDetail({item,add}) {
  const [size,setSize]=useState(item.sizes.length===1?item.sizes[0]:'');
  const [zoom,setZoom]=useState(false);
  return h('section',{className:'ai-section ai-shop-detail'},
    h('a',{className:'ai-back',href:'#shop'},h(Icon,{name:'left'}),'Back to shop'),
    h('div',{className:'ai-product-detail'},
      h('button',{className:'ai-product-photo'+(zoom?' zoomed':''),onClick:()=>setZoom(!zoom),'aria-pressed':zoom,'aria-label':zoom?'Zoom out of product photo':'Zoom in on product photo'},
        h(Image,{src:item.image,alt:item.name,priority:true,fallback:null}),h('span',{className:'ai-product-open'},h(Icon,{name:zoom?'minus':'plus'}))),
      h('div',{className:'ai-product-info'},h('span',{className:'ai-kicker'},item.kind+' / OFFICIAL FaZe MERCH'),h('h1',null,item.name),h(Price,{item}),h('p',null,item.detail),
        h('form',{onSubmit:e=>{e.preventDefault();if(size && !item.soldOut)add(item,size);}},
          h('fieldset',null,h('legend',null,'Select size'),h('div',{className:'ai-sizes'},item.sizes.map(value=>h('label',{key:value},
            h('input',{type:'radio',name:'size',value,required:true,checked:size===value,onChange:()=>setSize(value)}),h('span',null,value))))),
          h('button',{className:'ai-button solid',type:'submit',disabled:item.soldOut},item.soldOut?'Out of stock':'Add to cart',h(Icon,{name:'cart'}))),
        h('p',{className:'ai-muted'},'See the official store for current availability, shipping, and returns.'),
        h(LinkButton,{href:item.url,kind:'outline',external:true,icon:'diagonal'},'Shop at FaZe'))));
}

export function Shop({part,add}) {
  const [category,setCategory]=useState('all');
  const item=names.get(part);
  if (part && !item) return h('section',{className:'ai-section'},h(Title,{label:'OFFICIAL MERCH',title:'ITEM UNAVAILABLE'}),h(LinkButton,{href:'#shop'},'Back to shop'));
  if (item) return h(ProductDetail,{key:item.id,item,add});
  const shown=products.filter(product=>category==='all'||product.kind===category);
  return h('div',null,h(Title,{label:'THE FaZe ESPORTS COLLECTION',title:'SHOP'},'Official FaZe jerseys, apparel, and gear.'),
    h('section',{className:'ai-section'},h(Filters,{name:'Filter products',items:[['all','All items'],...['Jerseys','Tees','Outerwear','Accessories'].map(s=>[s,s])],current:category,select:setCategory}),
      h('p',{className:'ai-results-count','aria-live':'polite'},shown.length+' items'),
      h(ProductGrid,{items:shown})));
}

export function Cart({lines,change}) {
  const total=lines.reduce((sum,line)=>sum+names.get(line.id).price*line.quantity,0);
  return h('div',null,h(Title,{label:'OFFICIAL MERCH',title:'YOUR CART'}),
    h('section',{className:'ai-section ai-cart'},!lines.length?
      h('div',{className:'ai-empty'},h(Icon,{name:'cart',size:34}),h('h2',null,'Your cart is empty'),h(LinkButton,{href:'#shop'},'Browse the collection')) :
      h('div',{className:'ai-cart-grid'},h('div',{className:'ai-cart-lines'},lines.map(line=>{
        const item=names.get(line.id);
        return h('article',{className:'ai-cart-line',key:line.id+line.size},
          h('a',{href:'#shop/'+item.id},h(Image,{src:item.image,alt:item.name,fallback:null})),
          h('div',null,h('h2',null,h('a',{href:'#shop/'+item.id},item.name)),h('p',null,'Size '+line.size+' · '+money(item.price)),h('button',{className:'ai-text-button',onClick:()=>change(line.id,line.size,-line.quantity)},'Remove')),
          h('div',{className:'ai-quantity'},h('button',{className:'ai-icon',onClick:()=>change(line.id,line.size,-1),disabled:line.quantity<=1,'aria-label':'Decrease '+item.name+' quantity'},h(Icon,{name:'minus',size:15})),h('output',{'aria-label':'Quantity'},line.quantity),h('button',{className:'ai-icon',onClick:()=>change(line.id,line.size,1),disabled:line.quantity>=10,'aria-label':'Increase '+item.name+' quantity'},h(Icon,{name:'plus',size:15}))),
          h('strong',null,money(item.price*line.quantity)));
      })),h('aside',{className:'ai-cart-summary'},h('h2',null,'ORDER SUMMARY'),h('div',null,h('span',null,'Subtotal'),h('strong',null,money(total))),h('p',null,'Your selections are saved here. To buy, select your items again in the official FaZe store. The store confirms stock, shipping and tax.'),
        h(LinkButton,{href:officialShop,external:true,icon:'diagonal'},'Go to official FaZe store'),h(LinkButton,{href:'#shop',kind:'outline'},'Continue shopping')))));
}

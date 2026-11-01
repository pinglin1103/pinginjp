/* PinginJp 商店：商品資料即時讀取 Google 試算表 */
const CONFIG={
  SHEET_ID:'1lduSRfviAJyvBAq1a-XE1FdDrc0GfFBy8KNEAveOFP4',
  GIDS:{商品:'',庫存:'',商店設定:''},   // 留空時改用工作表名稱讀取
  API_URL:'',                           // 後台 Apps Script 網址；留空時讀試算表「商店設定」的「後台網址」
  REFRESH_MS:60000
};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'NT$ '+Math.round(+n||0).toLocaleString('zh-TW');
const ST={in:'現貨',order:'需調貨',out:'缺貨',pre:'預購'};
const REV={'現貨':'in','有貨':'in','需調貨':'order','調貨':'order','缺貨':'out','預購':'pre'};
let CAT={shop:{},products:[]};

$('mount').innerHTML=`<header class="bar"><div class="wrap gut">
  <a class="logo" href="#" id="logo"></a>
  <div class="hdr-r"><button class="cartbtn" id="cartBtn" type="button" aria-label="打開購物車">購物車 <b id="cartCount">0</b></button></div>
</div></header>
<main class="gut"><div class="wrap" id="view"></div></main>
<footer class="gut"><div class="wrap" id="foot"></div></footer>
<div class="scrim" id="scrim" hidden></div>
<aside class="drawer" id="drawer" hidden aria-label="購物車">
  <header><h2 id="dTitle">購物車</h2><button class="x" id="dClose" type="button" aria-label="關閉">✕</button></header>
  <div class="dbody" id="dBody"></div><div class="dfoot" id="dFoot"></div>
</aside>
<div class="toast" id="toast" hidden></div>`;

let cart=[];try{cart=JSON.parse(localStorage.getItem('pj_cart')||'[]')}catch(e){}
const visible=()=>CAT.products.filter(p=>!p.hidden);
function saveCart(){try{localStorage.setItem('pj_cart',JSON.stringify(cart))}catch(e){};$('cartCount').textContent=cart.reduce((a,l)=>a+l.qty,0)}
let cat='全部',q='';
function toast(t,ms){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,ms||1800)}
function phHTML(p,color,small){
  const c=(p.colors||[]).find(x=>x.name===color)||(p.colors||[])[0]||{swatch:'#9b958f',name:''};
  const img=(p.images||[]).find(i=>i.color===color)||(p.images||[]).find(i=>!i.color)||(p.images||[])[0];
  if(img) return `<div class="ph"><img src="${esc(img.src)}" alt="${esc(p.name+' '+(img.color||''))}" loading="lazy"></div>`;
  return `<div class="ph" style="background:linear-gradient(160deg,${esc(c.swatch)},color-mix(in srgb,${esc(c.swatch)} 70%,#000))"><span class="ph-label">${esc(c.name)}</span>${small?'':`<span class="ph-brand">${esc(p.brand)}</span>`}</div>`;
}
function renderChrome(){
  $('logo').textContent=CAT.shop.name||'商店';
  const s=CAT.shop;
  $('foot').innerHTML=`<b>代購須知</b><ul>${(s.notice||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
    <p>聯絡我們：${s.ig?`IG <a href="https://www.instagram.com/${esc(s.ig)}" target="_blank" rel="noopener" style="color:var(--ai)">@${esc(s.ig)}</a>`:''}${s.line?`　LINE ID：${esc(s.line)}`:''}</p><p style="text-align:right;margin:0"><a href="#admin" style="color:var(--muted);font-size:12px">管理</a></p>`;
}

function renderList(){
  const V=visible();
  const cats=['全部',...new Set(V.map(p=>p.category).filter(Boolean))];
  if(!cats.includes(cat))cat='全部';
  $('view').innerHTML=`<div class="hero"><h1>日本正品代購</h1><p>挑好款式加入購物車，結帳後把訂單截圖私訊給我就完成了。${esc(CAT.shop.eta||'')}</p></div>
  <div class="search"><input type="search" id="q" placeholder="搜尋品牌、商品名稱，例如：X-girl、福袋、後背包" value="${esc(q)}" aria-label="搜尋商品" autocomplete="off"></div>
  ${cats.length>2?`<div class="chips">${cats.map(c=>`<button class="chip" type="button" data-c="${esc(c)}" aria-pressed="${c===cat}">${esc(c)}</button>`).join('')}</div>`:''}
  <div class="grid" id="grid"></div>`;
  const qi=$('q');qi.addEventListener('input',()=>{q=qi.value;drawGrid()});
  document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{cat=b.dataset.c;document.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x===b));drawGrid()});
  drawGrid();
}
function drawGrid(){
  const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list=visible().filter(p=>cat==='全部'||p.category===cat).filter(p=>{const h=[p.brand,p.name,p.nameJa,p.category,p.desc,(p.colors||[]).map(c=>c.name).join(' ')].join(' ').toLowerCase();return words.every(w=>h.includes(w))});
  $('grid').innerHTML=`${list.map(p=>`<a class="card" href="#item-${esc(p.id)}">${phHTML(p,(p.colors[0]||{}).name)}
    <div class="body"><span class="brand">${esc(p.brand)}${p.colors.some(c=>Object.values(c.sizes).includes('pre'))?'<span class="tag">預購</span>':''}</span><h3>${esc(p.name)}</h3><span class="price">${money(p.price)}</span>
    <div class="dots">${p.colors.map(c=>`<i style="background:${esc(c.swatch)}" title="${esc(c.name)}"></i>`).join('')}</div></div></a>`).join('')||`<p class="empty" style="grid-column:1/-1">${words.length?'找不到符合「'+esc(q.trim())+'」的商品，換個關鍵字試試。':'目前沒有商品'}</p>`}`;
}

function renderItem(p){
  let color=((p.colors.find(c=>Object.values(c.sizes).some(s=>s!=='out'))||p.colors[0])||{}).name,size=null,qty=1,imgIdx=0;
  function draw(){
    const c=p.colors.find(x=>x.name===color)||{sizes:{}};
    const imgs=(p.images||[]).filter(i=>!i.color||i.color===color);
    if(imgIdx>=imgs.length)imgIdx=0;
    const big=imgs[imgIdx]?`<div class="ph"><img src="${esc(imgs[imgIdx].src)}" alt="${esc(p.name)}"></div>`:phHTML(p,color);
    const st=size?c.sizes[size]:null;
    $('view').innerHTML=`<button class="back" type="button" id="back">← 全部商品</button>
    <div class="sheet">
      <div class="gallery">${big}${imgs.length>1?`<div class="thumbs">${imgs.map((im,i)=>`<button type="button" data-i="${i}" aria-pressed="${i===imgIdx}"><img src="${esc(im.src)}" alt=""></button>`).join('')}</div>`:''}</div>
      <div class="info">
        <div><span class="brand">${esc(p.brand)}</span><h1>${esc(p.name)}</h1>${p.nameJa?`<p class="ja">${esc(p.nameJa)}</p>`:''}</div>
        <div class="price">${money(p.price)}<small>含代購費與國際運費</small></div>
        <div class="opt"><span class="lbl">顏色：<b>${esc(color)}</b></span><div class="opts">${p.colors.map(x=>`<button type="button" data-color="${esc(x.name)}" aria-pressed="${x.name===color}"><i style="background:${esc(x.swatch)}"></i>${esc(x.name)}</button>`).join('')}</div></div>
        <div class="opt"><span class="lbl">尺寸：<b>${size?esc(size):'請選擇'}</b></span><div class="opts">${Object.entries(c.sizes).map(([s,v])=>`<button type="button" data-size="${esc(s)}" aria-pressed="${s===size}" class="${v==='out'?'out':''}" ${v==='out'?'disabled':''}>${esc(s)}<span class="st">${ST[v]||''}</span></button>`).join('')}</div></div>
        <div class="opt"><span class="lbl">數量</span><div class="qty"><button type="button" id="qm" aria-label="減少">−</button><span id="qv">${qty}</span><button type="button" id="qp" aria-label="增加">＋</button></div></div>
        <div class="btnrow"><button type="button" id="add" ${size?'':'disabled'}>加入購物車</button></div>
        <div class="msg ${st==='order'?'warn':''}" id="msg">${st==='order'?'這個尺寸需要向日本調貨，出貨會比較久。':''}</div>
        ${p.note?`<p class="howto">${esc(p.note)}</p>`:''}
        <p class="desc">${esc(p.desc)}</p>${p.spec?`<p class="spec">${esc(p.spec)}</p>`:''}
        ${p.ig?`<a class="btn" href="${esc(p.ig)}" target="_blank" rel="noopener" style="width:max-content">在 IG 看商品貼文</a>`:''}
      </div></div>`;
    $('back').onclick=()=>{location.hash='';};
    document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;imgIdx=0;const cc=p.colors.find(x=>x.name===color);if(size&&(!cc.sizes[size]||cc.sizes[size]==='out'))size=null;draw()});
    document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{size=b.dataset.size;draw()});
    document.querySelectorAll('.thumbs button').forEach(b=>b.onclick=()=>{imgIdx=+b.dataset.i;draw()});
    $('qm').onclick=()=>{qty=Math.max(1,qty-1);$('qv').textContent=qty};
    $('qp').onclick=()=>{qty=Math.min(20,qty+1);$('qv').textContent=qty};
    $('add').onclick=()=>{
      const key=p.id+'|'+color+'|'+size;const ex=cart.find(l=>l.key===key);
      if(ex)ex.qty+=qty;else cart.push({key,id:p.id,color,size,qty});
      saveCart();toast('已加入購物車');
    };
  }
  draw();window.scrollTo(0,0);
}

// cart
function openCart(step){ $('scrim').hidden=false;$('drawer').hidden=false;renderCart(step||'cart') }
function closeCart(){ $('scrim').hidden=true;$('drawer').hidden=true }
$('cartBtn').onclick=()=>openCart();$('dClose').onclick=closeCart;$('scrim').onclick=closeCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('drawer').hidden)closeCart()});
function lines(){return cart.map(l=>({...l,p:visible().find(p=>p.id===l.id)})).filter(l=>l.p)}
function total(){return lines().reduce((a,l)=>a+l.p.price*l.qty,0)}
let buyer={};try{buyer=JSON.parse(localStorage.getItem('pj_buyer')||'{}')}catch(e){}
let lastOrder=null;
function renderCart(step){
  const L=lines();
  if(step==='slip'&&lastOrder) return renderSlip();
  $('dTitle').textContent=step==='info'?'填寫訂購資料':'購物車';
  if(!L.length){$('dBody').innerHTML='<p class="empty">購物車是空的，去挑幾件喜歡的吧。</p>';$('dFoot').innerHTML='';return}
  if(step==='info'){
    $('dBody').innerHTML=`<label class="f">名字或 IG 帳號<input id="bName" value="${esc(buyer.name||'')}" autocomplete="name"></label>
      <label class="f">手機<input id="bPhone" value="${esc(buyer.phone||'')}" inputmode="tel" autocomplete="tel"></label>
      <label class="f">備註（選填，例如：想要的寄送方式）<textarea id="bNote" rows="3">${esc(buyer.note||'')}</textarea></label>
      <p class="howto">付款與寄送方式會在你私訊後由小編告知，這裡不用填付款資料。</p>`;
    $('dFoot').innerHTML=`<div class="sum"><span>合計 ${L.reduce((a,l)=>a+l.qty,0)} 件</span><span class="price">${money(total())}</span></div>
      <div class="msg warn" id="bMsg"></div>
      <div class="btnrow"><button class="ghost" type="button" id="toCart">回購物車</button><button type="button" id="mk">產生訂單</button></div>`;
    $('toCart').onclick=()=>renderCart('cart');
    $('mk').onclick=()=>{
      buyer={name:$('bName').value.trim(),phone:$('bPhone').value.trim(),note:$('bNote').value.trim()};
      if(!buyer.name){$('bMsg').textContent='請填名字或 IG 帳號，小編才知道是誰下的單。';return}
      try{localStorage.setItem('pj_buyer',JSON.stringify(buyer))}catch(e){}
      const d=new Date();const pad=x=>String(x).padStart(2,'0');
      lastOrder={no:`PJ${String(d.getFullYear()).slice(2)}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${Math.floor(Math.random()*90+10)}`,
        date:`${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        lines:L.map(l=>({brand:l.p.brand,name:l.p.name,color:l.color,size:l.size,qty:l.qty,price:l.p.price,st:(l.p.colors.find(c=>c.name===l.color)||{sizes:{}}).sizes[l.size]})),
        total:total(),buyer:{...buyer}};
      sendOrder(lastOrder);
      renderSlip();
    };
    return;
  }
  $('dBody').innerHTML=L.map((l,i)=>`<div class="line"><div class="mini">${phHTML(l.p,l.color,true)}</div>
    <div class="t">${esc(l.p.name)}<div class="v">${esc(l.color)}／${esc(l.size)}</div><div class="price">${money(l.p.price)}</div></div>
    <div class="r"><div class="qty"><button type="button" data-m="${i}" aria-label="減少">−</button><span>${l.qty}</span><button type="button" data-p="${i}" aria-label="增加">＋</button></div><button class="rm" type="button" data-r="${i}">移除</button></div></div>`).join('');
  $('dFoot').innerHTML=`<div class="sum"><span>合計 ${L.reduce((a,l)=>a+l.qty,0)} 件</span><span class="price">${money(total())}</span></div><button type="button" id="next">下一步：填寫資料</button>`;
  const idx=i=>cart.findIndex(c=>c.key===L[i].key);
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const c=cart[idx(+b.dataset.m)];c.qty=Math.max(1,c.qty-1);saveCart();renderCart()});
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const c=cart[idx(+b.dataset.p)];c.qty=Math.min(20,c.qty+1);saveCart();renderCart()});
  document.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{cart.splice(idx(+b.dataset.r),1);saveCart();renderCart()});
  $('next').onclick=()=>renderCart('info');
}
function orderText(o){
  return [`【${CAT.shop.name}】訂單 ${o.no}`,`日期：${o.date}`,`訂購人：${o.buyer.name}${o.buyer.phone?'／'+o.buyer.phone:''}`,'',
    ...o.lines.map((l,i)=>`${i+1}. ${l.brand} ${l.name}\n   ${l.color}／${l.size} × ${l.qty}　${money(l.price*l.qty)}${l.st==='order'?'（需調貨）':''}`),
    '',`合計：${money(o.total)}`,o.buyer.note?`備註：${o.buyer.note}`:''].filter(x=>x!=='').join('\n');
}
function renderSlip(){
  const o=lastOrder,S=CAT.shop;
  $('dTitle').textContent='訂單已產生';
  $('dBody').innerHTML=`<p class="howto"><b>最後一步：</b>把下面這張訂單<b>截圖</b>（或按「複製訂單」），私訊給小編。收到後會回覆付款方式，付款完成才算訂購成功。</p>
  <div class="slip" id="slip"><div class="hd"><b>${esc(S.name)}</b><span class="no">${esc(o.no)}</span></div>
    <div class="who">${esc(o.date)}　訂購人：${esc(o.buyer.name)}${o.buyer.phone?'／'+esc(o.buyer.phone):''}</div>
    <table>${o.lines.map(l=>`<tr><td>${esc(l.brand)} ${esc(l.name)}<br><span class="who">${esc(l.color)}／${esc(l.size)} × ${l.qty}${l.st==='order'?'（需調貨）':''}</span></td><td class="n">${money(l.price*l.qty)}</td></tr>`).join('')}</table>
    <div class="tot"><span>合計</span><span>${money(o.total)}</span></div>
    ${o.buyer.note?`<div class="who">備註：${esc(o.buyer.note)}</div>`:''}</div>`;
  const ig=S.ig?`<a class="btn solid" href="https://ig.me/m/${encodeURIComponent(S.ig)}" target="_blank" rel="noopener">私訊 IG @${esc(S.ig)}</a>`:'';
  const line=S.line?`<a class="btn solid" href="https://line.me/R/ti/p/${encodeURIComponent(S.line)}" target="_blank" rel="noopener">傳 LINE</a>`:'';
  $('dFoot').innerHTML=`<div class="btnrow"><button class="ghost" type="button" id="cp">複製訂單</button>${ig}${line}</div>
    ${S.line?`<div class="who" style="font-size:12px;color:var(--muted)">LINE ID：${esc(S.line)}</div>`:''}
    <button class="ghost" type="button" id="done">我已經傳給小編了，清空購物車</button>`;
  $('cp').onclick=async()=>{try{await navigator.clipboard.writeText(orderText(o));toast('已複製，貼到私訊就可以了')}catch(e){const r=document.createRange();r.selectNodeContents($('slip'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('已選取訂單，請按「複製」')}};
  $('done').onclick=()=>{cart=[];saveCart();lastOrder=null;closeCart();toast('謝謝你的訂購！')};
}


/* ---------- 讀取試算表 ---------- */
const CODE={'現貨':'in','有貨':'in','需調貨':'order','調貨':'order','缺貨':'out','預購':'pre'};
function parseCSV(t){
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
    else if(ch==='"')q=true;else if(ch===','){row.push(f);f=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}
    else f+=ch}
  if(f!==''||row.length){row.push(f);rows.push(row)}
  const h=(rows.shift()||[]).map(x=>x.trim());
  return rows.filter(r=>r.some(x=>x.trim()!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k,(r[i]||'').trim()])));
}
function sheetURL(name){
  const id=CONFIG.SHEET_ID,g=CONFIG.GIDS[name];
  return g!==''&&g!=null?`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${g}`
    :`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
}
async function fetchSheet(name){
  const r=await fetch(sheetURL(name)+'&_='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error(name+' '+r.status);
  const t=await r.text();if(/^\s*</.test(t))throw new Error(name+' 不是公開的');
  return parseCSV(t);
}
function imgSrc(s){
  s=s.trim();const m=s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  return m?`https://lh3.googleusercontent.com/d/${m[1]}`:s;
}
function buildCatalog(P,I,S,all){
  const shop={notice:[]};
  S.forEach(r=>{const k=r['項目'],v=r['內容']||'';if(k==='商店名稱')shop.name=v;else if(k==='IG帳號')shop.ig=v.replace(/^@/,'');else if(k==='LINE ID')shop.line=v;else if(k==='到貨說明')shop.eta=v;else if(k==='代購須知'&&v)shop.notice.push(v);else if(k==='後台網址')shop.api=v.trim()});
  const inv={};
  I.forEach(r=>{const id=r['商品ID'];if(!id||!r['顏色'])return;const L=inv[id]||(inv[id]=[]);
    let c=L.find(x=>x.name===r['顏色']);if(!c){c={name:r['顏色'],swatch:/^#[0-9a-f]{3,6}$/i.test(r['色塊'])?r['色塊']:'#a39e99',sizes:{}};L.push(c)}
    if(r['尺寸'])c.sizes[r['尺寸']]=CODE[r['狀態']]||'in'});
  const products=P.filter(r=>r['商品ID']).map(r=>({id:r['商品ID'].replace(/[^A-Za-z0-9-]/g,'-'),hidden:r['上架']!=='是',brand:r['品牌'],name:r['品名'],nameJa:r['日文原名'],category:r['分類'],
    price:+String(r['售價']).replace(/[^\d.]/g,'')||0,desc:r['說明'],spec:r['規格'],note:r['提醒'],ig:r['IG連結'],
    images:(r['照片']||'').split(/\n|,(?=\s*(?:https?:|images\/))/).map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^([^|]+)\|(.+)$/);return m?{color:m[1].trim(),src:imgSrc(m[2])}:{src:imgSrc(x)}}),
    colors:(inv[r['商品ID']]||[]).filter(c=>Object.keys(c.sizes).length)}))
    .filter(p=>all||p.colors.length);
  return {shop,products};
}
let sig='';
function apply(c,from){
  const s=JSON.stringify(c);if(s===sig)return false;sig=s;CAT=c;
  renderChrome();cart=cart.filter(l=>CAT.products.some(p=>p.id===l.id));saveCart();
  if(from==='first')route();
  else if(!/^#(item-|admin)/.test(location.hash)){if(document.activeElement&&document.activeElement.id==='q'&&$('grid'))drawGrid();else renderList()}
  return true;
}
async function loadLive(){
  const [P,I,S]=await Promise.all(['商品','庫存','商店設定'].map(fetchSheet));
  const c=buildCatalog(P,I,S);if(!c.products.length)throw new Error('empty');
  try{localStorage.setItem('pj_cat',JSON.stringify(c))}catch(e){}
  return c;
}
const apiURL=()=>CONFIG.API_URL||CAT.shop.api||'';
async function sendOrder(o){
  if(!apiURL())return;
  try{await fetch(apiURL(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action:'order',no:o.no,date:o.date,name:o.buyer.name,phone:o.buyer.phone,note:o.buyer.note,total:o.total,
      items:o.lines.map(l=>`${l.brand} ${l.name}／${l.color}／${l.size} × ${l.qty}　NT$${l.price*l.qty}${l.st==='order'?'（需調貨）':''}${l.st==='pre'?'（預購）':''}`).join('\n')})})}catch(e){}
}
function route(){
  if(location.hash==='#admin')return renderAdmin();
  const m=location.hash.match(/^#item-([A-Za-z0-9-]+)$/);
  const p=m&&visible().find(x=>x.id===m[1]);
  if(p)renderItem(p);else renderList();
}
window.addEventListener('hashchange',route);

/* ---------- 管理後台：資料透過 Apps Script 寫進 Google 試算表，照片存進 Google 雲端硬碟 ---------- */
let ADM=null,admName='',admTab='products',editing=null,draft=null,dirty=false,busy=false,orders=null;
const clone=o=>JSON.parse(JSON.stringify(o));
function getPw(){try{return sessionStorage.getItem('pj_pw')||localStorage.getItem('pj_pw')||''}catch(e){return ''}}
function setPw(pw,remember){try{sessionStorage.setItem('pj_pw',pw);if(remember)localStorage.setItem('pj_pw',pw);else localStorage.removeItem('pj_pw')}catch(e){}}
function clearPw(){try{sessionStorage.removeItem('pj_pw');localStorage.removeItem('pj_pw')}catch(e){}}
async function api(action,data,pw){
  const url=apiURL();if(!url)throw new Error('還沒設定後台網址');
  const r=await fetch(url,{method:'POST',body:JSON.stringify({action,pw:pw||getPw(),...data})});
  let j;try{j=await r.json()}catch(e){throw new Error('後台沒有回應，請確認 Apps Script 已部署給「所有人」')}
  if(!j.ok){if(j.error==='密碼不對'){clearPw();ADM=null}throw new Error(j.error||'失敗')}
  return j;
}
function takeData(d){
  ADM=buildCatalog(d['商品'],d['庫存'],d['商店設定'],true);
  const pub=buildCatalog(d['商品'],d['庫存'],d['商店設定']);
  try{localStorage.setItem('pj_cat',JSON.stringify(pub))}catch(e){}
  sig=JSON.stringify(pub);CAT=pub;renderChrome();
}
async function run(label,fn){
  if(busy)return;busy=true;const s=$('aState');if(s){s.textContent=label+'…';s.className='s'}
  try{await fn()}catch(e){toast(e.message||'失敗',4000);if(!getPw()){ADM=null;renderAdmin();busy=false;return}}
  busy=false;updBar();
}
function updBar(){
  const s=$('aState');if(!s)return;
  s.textContent=dirty?'這個商品有還沒儲存的修改':`${admName||''} 已登入・修改會直接存進試算表`;s.className='s'+(dirty?' dirty':'');
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});

function renderAdmin(){
  window.scrollTo(0,0);
  if(!apiURL()){$('view').innerHTML=`<section class="apanel"><h2>管理後台還沒設定</h2><p class="hint">請在「PinginJp 商品資料」試算表的「商店設定」分頁加一列：項目填 <b>後台網址</b>，內容貼上 Apps Script 部署後的網址。</p><button class="ghost sm" type="button" onclick="location.hash=''">回到商店</button></section>`;return}
  if(!ADM)return renderLogin();
  $('view').innerHTML=`<div class="abar"><span class="s" id="aState"></span>
    <button class="${admTab==='products'?'':'ghost '}sm" type="button" data-tab="products">商品</button>
    <button class="${admTab==='orders'?'':'ghost '}sm" type="button" data-tab="orders">訂單</button>
    <button class="${admTab==='shop'?'':'ghost '}sm" type="button" data-tab="shop">商店設定</button>
    <button class="ghost sm" type="button" id="aExit">回到商店</button><button class="ghost sm" type="button" id="aOut">登出</button></div><div id="aBody"></div>`;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(dirty&&!confirm('這個商品還沒儲存，確定離開？'))return;dirty=false;editing=null;admTab=b.dataset.tab;renderAdmin()});
  $('aExit').onclick=()=>{if(dirty&&!confirm('這個商品還沒儲存，確定離開？'))return;dirty=false;editing=null;location.hash=''};
  $('aOut').onclick=()=>{clearPw();ADM=null;dirty=false;editing=null;location.hash=''};
  updBar();
  if(admTab==='orders')renderOrders();else if(admTab==='shop')renderShopSettings();else if(editing)renderEditor();else renderAdminList();
}
function renderLogin(){
  const pw=getPw();
  $('view').innerHTML=`<section class="apanel" style="max-width:420px;margin-inline:auto"><h2>管理登入</h2>
    <label class="f">管理密碼<input type="password" id="lPw" autocomplete="current-password"></label>
    <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="lRem" checked>在這台裝置記住我</label>
    <div class="msg warn" id="lMsg"></div>
    <div class="btnrow"><button class="ghost" type="button" id="lBack">回到商店</button><button type="button" id="lGo">登入</button></div></section>`;
  $('lBack').onclick=()=>{location.hash=''};
  const go=async(p)=>{const v=p||$('lPw').value.trim();if(!v)return;$('lGo').disabled=true;$('lMsg').textContent='登入中…';
    try{const j=await api('getAll',{},v);if(!p)setPw(v,$('lRem').checked);admName=j.name;takeData(j.data);renderAdmin()}
    catch(e){if($('lMsg')){$('lMsg').textContent=e.message;$('lGo').disabled=false}}};
  $('lGo').onclick=()=>go();$('lPw').onkeydown=e=>{if(e.key==='Enter')go()};
  if(pw)go(pw);else $('lPw').focus();
}
function renderAdminList(){
  const P=ADM.products,b=$('aBody');
  b.innerHTML=`<section class="apanel"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2>商品（${P.length}）</h2><button type="button" class="sm" id="aNew">＋ 新增商品</button></div>
    <div>${P.map((p,i)=>`<div class="arow ${p.hidden?'off':''}"><div class="mini">${p.colors.length?phHTML(p,(p.colors[0]||{}).name,true):'<div class="ph"></div>'}</div>
      <div class="t">${esc(p.name)||'（未命名）'}<div class="m">${money(p.price)}・${esc(p.category||'未分類')}・${(p.images||[]).length} 張照片${p.hidden?'・<b>已下架</b>':''}</div></div>
      <div class="acts"><button type="button" class="sm" data-ed="${i}">編輯</button><button type="button" class="ghost sm" data-up="${i}" aria-label="往上">↑</button><button type="button" class="ghost sm" data-dn="${i}" aria-label="往下">↓</button><button type="button" class="ghost sm" data-hd="${i}">${p.hidden?'上架':'下架'}</button><button type="button" class="ghost sm" data-del="${i}">刪除</button></div></div>`).join('')}</div></section>`;
  $('aNew').onclick=()=>{draft={id:'p'+Date.now().toString(36),brand:'',name:'',nameJa:'',category:'',price:0,desc:'',spec:'',note:'',ig:'',images:[],colors:[{name:'單一色',swatch:'#a39e99',sizes:{F:'pre'}}],hidden:true,_new:true};editing=draft.id;dirty=true;renderAdmin()};
  b.querySelectorAll('[data-ed]').forEach(x=>x.onclick=()=>{draft=clone(P[+x.dataset.ed]);draft._old=draft.id;editing=draft.id;dirty=false;renderAdmin()});
  const act=(label,action,data)=>run(label,async()=>{const j=await api(action,data);takeData(j.data);renderAdminList()});
  b.querySelectorAll('[data-up]').forEach(x=>x.onclick=()=>{const i=+x.dataset.up;if(i>0)act('移動中','moveProduct',{id:P[i].id,dir:'up'})});
  b.querySelectorAll('[data-dn]').forEach(x=>x.onclick=()=>{const i=+x.dataset.dn;if(i<P.length-1)act('移動中','moveProduct',{id:P[i].id,dir:'down'})});
  b.querySelectorAll('[data-hd]').forEach(x=>x.onclick=()=>{const p=P[+x.dataset.hd];act(p.hidden?'上架中':'下架中','setHidden',{id:p.id,hidden:!p.hidden})});
  b.querySelectorAll('[data-del]').forEach(x=>x.onclick=()=>{
    if(x.dataset.armed!=='1'){x.dataset.armed='1';x.textContent='確定刪除？';setTimeout(()=>{x.dataset.armed='';x.textContent='刪除'},3000);return}
    act('刪除中','deleteProduct',{id:P[+x.dataset.del].id})});
}
function markDirty(){dirty=true;updBar()}
function bindText(root,obj){root.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{const k=el.dataset.k;obj[k]=el.type==='number'?(+el.value||0):el.value;markDirty()}))}
const sizesText=s=>Object.entries(s||{}).map(([k,v])=>`${k}=${ST[v]||'現貨'}`).join(', ');
function parseSizes(t){const o={};t.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean).forEach(x=>{const [s,v]=x.split(/[=＝]/).map(y=>(y||'').trim());if(s)o[s]=REV[v]||'in'});return o}
function renderEditor(){
  const p=draft;if(!p){editing=null;return renderAdminList()}
  const b=$('aBody');const cats=[...new Set(ADM.products.map(x=>x.category).filter(Boolean))];
  b.innerHTML=`<section class="apanel"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2>${p._new?'新增商品':'編輯商品'}</h2>
      <div style="display:flex;gap:8px"><button type="button" class="ghost sm" id="eBack">回商品列表</button><button type="button" class="sm" id="eSave">儲存</button></div></div>
    <div class="afields">
      <label class="f wide">商品名稱<input data-k="name" value="${esc(p.name)}"></label>
      <label class="f">品牌<input data-k="brand" value="${esc(p.brand)}"></label>
      <label class="f">分類<input data-k="category" value="${esc(p.category)}" list="catList" placeholder="例如：童裝福袋"><datalist id="catList">${cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label>
      <label class="f">售價（NT$）<input data-k="price" type="number" inputmode="numeric" min="0" value="${esc(p.price)}"></label>
      <label class="f">狀態<select class="f" id="eHidden"><option value="0" ${p.hidden?'':'selected'}>上架中（客人看得到）</option><option value="1" ${p.hidden?'selected':''}>下架（客人看不到）</option></select></label>
      <label class="f">商品 ID（英文、數字、連字號）<input data-k="id" value="${esc(p.id)}" pattern="[A-Za-z0-9-]+"></label>
      <label class="f wide">日文原名（選填）<input data-k="nameJa" value="${esc(p.nameJa)}"></label>
      <label class="f wide">預購／出貨提醒（選填）<input data-k="note" value="${esc(p.note)}" placeholder="例如：11/4 日本開賣，12 月下旬出貨"></label>
      <label class="f wide">商品說明<textarea data-k="desc" rows="4">${esc(p.desc)}</textarea></label>
      <label class="f wide">尺寸／規格（選填）<input data-k="spec" value="${esc(p.spec)}"></label>
      <label class="f wide">IG 貼文連結（選填）<input data-k="ig" value="${esc(p.ig)}" placeholder="https://www.instagram.com/p/…"></label>
    </div></section>
    <section class="apanel"><h2>顏色與尺寸</h2>
      <p class="hint">尺寸寫法：<b>尺寸=狀態</b>，用逗號分開。狀態可寫 現貨、需調貨、缺貨、預購。例：S=現貨, M=需調貨, L=缺貨</p>
      <div style="display:grid;gap:8px">${p.colors.map((c,i)=>`<div class="colorrow">
        <input aria-label="顏色名稱" data-cn="${i}" value="${esc(c.name)}" placeholder="顏色名稱">
        <input type="color" aria-label="色塊" data-cs="${i}" value="${esc(/^#[0-9a-f]{6}$/i.test(c.swatch)?c.swatch:'#a39e99')}">
        <input class="sz" aria-label="尺寸與狀態" data-cz="${i}" value="${esc(sizesText(c.sizes))}" placeholder="S=現貨, M=現貨">
        <button type="button" class="ghost sm" data-cd="${i}" ${p.colors.length<2?'disabled':''}>刪除</button></div>`).join('')}</div>
      <div><button type="button" class="ghost sm" id="eAddColor">＋ 新增顏色</button></div>
    </section>
    <section class="apanel"><h2>商品照片（${(p.images||[]).length}）</h2>
      <p class="hint">按住照片拖曳就能調整順序（手機請按住一下再拖），第一張是封面。照片會自動縮小後存進你的 Google 雲端硬碟。加完照片記得按「儲存」。</p>
      <div class="drop" id="eDrop" role="button" tabindex="0">點這裡選照片，或把照片拖進來（可一次選多張）</div>
      <input type="file" id="eFile" accept="image/*" multiple hidden>
      <div class="msg" id="eMsg"></div>
      <div class="imgs" id="eImgs">${(p.images||[]).map((im,i)=>`<div class="imgc" data-idx="${i}"><div class="imgwrap"><img src="${esc(im.src)}" alt="照片 ${i+1}" loading="lazy">${i===0?'<span class="cover">封面</span>':''}<span class="handle" aria-hidden="true">⠿</span></div>
        <select data-ic="${i}" aria-label="照片顏色"><option value="">所有顏色</option>${p.colors.map(c=>`<option ${im.color===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
        <div class="acts"><button type="button" class="ghost sm" data-il="${i}" aria-label="往前">←</button><button type="button" class="ghost sm" data-ir="${i}" aria-label="往後">→</button><button type="button" class="ghost sm" data-ix="${i}">刪除</button></div>${i>0?`<button type="button" class="ghost sm" data-icov="${i}">設為封面</button>`:''}</div>`).join('')}</div>
    </section>
    <div class="btnrow" style="margin-bottom:24px"><button type="button" id="eSave2">儲存</button></div>`;
  bindText(b.querySelector('.afields'),p);
  $('eBack').onclick=()=>{if(dirty&&!confirm('還沒儲存，確定回列表？'))return;dirty=false;editing=null;draft=null;renderAdmin()};
  const save=()=>run('儲存中',async()=>{
    p.id=String(p.id||'').trim();if(!/^[A-Za-z0-9-]{2,60}$/.test(p.id))throw new Error('商品 ID 只能用英文、數字和連字號');
    if(!p.name.trim())throw new Error('請填商品名稱');
    if(!p.colors.some(c=>Object.keys(c.sizes).length))throw new Error('至少要有一個顏色和尺寸');
    const {_new,_old,...prod}=p;
    const j=await api('saveProduct',{product:prod,oldId:_new?'':_old});takeData(j.data);
    dirty=false;draft._new=false;draft._old=p.id;toast('已儲存，客人重新整理就看得到');renderEditor();
  });
  $('eSave').onclick=save;$('eSave2').onclick=save;
  $('eHidden').onchange=e=>{p.hidden=e.target.value==='1';markDirty()};
  b.querySelectorAll('[data-cn]').forEach(el=>el.addEventListener('change',()=>{const c=p.colors[+el.dataset.cn];const old=c.name;c.name=el.value.trim()||old;(p.images||[]).forEach(im=>{if(im.color===old)im.color=c.name});markDirty();renderEditor()}));
  b.querySelectorAll('[data-cs]').forEach(el=>el.addEventListener('input',()=>{p.colors[+el.dataset.cs].swatch=el.value;markDirty()}));
  b.querySelectorAll('[data-cz]').forEach(el=>el.addEventListener('change',()=>{p.colors[+el.dataset.cz].sizes=parseSizes(el.value);el.value=sizesText(p.colors[+el.dataset.cz].sizes);markDirty()}));
  b.querySelectorAll('[data-cd]').forEach(el=>el.onclick=()=>{const c=p.colors.splice(+el.dataset.cd,1)[0];(p.images||[]).forEach(im=>{if(im.color===c.name)delete im.color});markDirty();renderEditor()});
  $('eAddColor').onclick=()=>{const sz=Object.keys((p.colors[0]||{}).sizes||{F:1});p.colors.push({name:'新顏色',swatch:'#a39e99',sizes:Object.fromEntries(sz.map(s=>[s,'in']))});markDirty();renderEditor()};
  const I=p.images||(p.images=[]);
  b.querySelectorAll('[data-ic]').forEach(el=>el.onchange=()=>{const im=I[+el.dataset.ic];if(el.value)im.color=el.value;else delete im.color;markDirty()});
  b.querySelectorAll('[data-il]').forEach(el=>el.onclick=()=>{const i=+el.dataset.il;if(i>0){[I[i-1],I[i]]=[I[i],I[i-1]];markDirty();renderEditor()}});
  b.querySelectorAll('[data-ir]').forEach(el=>el.onclick=()=>{const i=+el.dataset.ir;if(i<I.length-1){[I[i+1],I[i]]=[I[i],I[i+1]];markDirty();renderEditor()}});
  b.querySelectorAll('[data-ix]').forEach(el=>el.onclick=()=>{I.splice(+el.dataset.ix,1);markDirty();renderEditor()});
  b.querySelectorAll('[data-icov]').forEach(el=>el.onclick=()=>{const i=+el.dataset.icov;I.unshift(I.splice(i,1)[0]);markDirty();renderEditor()});
  if(window.Sortable&&$('eImgs')&&I.length>1)Sortable.create($('eImgs'),{animation:150,delay:180,delayOnTouchOnly:true,ghostClass:'sghost',filter:'button,select',preventOnFilter:false,
    onEnd:e=>{if(e.oldIndex===e.newIndex)return;I.splice(e.newIndex,0,I.splice(e.oldIndex,1)[0]);markDirty();renderEditor()}});
  const drop=$('eDrop'),fi=$('eFile');
  drop.onclick=()=>fi.click();drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click()}};
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');addPhotos(p,e.dataTransfer.files)};
  fi.onchange=()=>{addPhotos(p,fi.files);fi.value=''};
  updBar();
}
async function shrink(file){
  const url=URL.createObjectURL(file);
  try{const im=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=url});
    const s=Math.min(1,1280/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');
    c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.82).split(',')[1];}finally{URL.revokeObjectURL(url)}
}
async function addPhotos(p,list){
  const fs=[...list].filter(f=>f.type.startsWith('image/'));if(!fs.length||busy)return;
  busy=true;let n=0,ok=0;
  for(const f of fs){const m=$('eMsg');if(m)m.textContent=`上傳照片 ${++n}/${fs.length}…`;
    try{const j=await api('uploadPhoto',{data:await shrink(f),type:'image/jpeg',name:(p.id||'photo')+'-'+Date.now()+'.jpg'});(p.images||(p.images=[])).push({src:j.url});ok++}
    catch(e){toast('有一張照片上傳失敗：'+e.message,4000)}}
  busy=false;if(ok)markDirty();renderEditor();const m=$('eMsg');if(m)m.textContent=ok?`已加入 ${ok} 張，記得按「儲存」。`:'';
}
function renderShopSettings(){
  const S=clone(ADM.shop),b=$('aBody');
  b.innerHTML=`<section class="apanel"><h2>商店設定</h2><div class="afields">
      <label class="f">商店名稱<input data-k="name" value="${esc(S.name)}"></label>
      <label class="f">IG 帳號（不含 @）<input data-k="ig" value="${esc(S.ig)}"></label>
      <label class="f">LINE ID（選填）<input data-k="line" value="${esc(S.line)}"></label>
      <label class="f">到貨時間說明<input data-k="eta" value="${esc(S.eta)}"></label>
      <label class="f wide">代購須知（一行一條）<textarea id="aNotice" rows="6">${esc((S.notice||[]).join('\n'))}</textarea></label>
    </div><div class="btnrow"><button type="button" id="sSave">儲存商店設定</button></div></section>`;
  b.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{S[el.dataset.k]=el.value}));
  $('aNotice').addEventListener('input',e=>{S.notice=e.target.value.split('\n').map(x=>x.trim()).filter(Boolean)});
  $('sSave').onclick=()=>run('儲存中',async()=>{const j=await api('saveShop',{shop:S});takeData(j.data);toast('已儲存');renderShopSettings()});
}
const OST=['待付款','已付款','已向日本下單','已到台灣','已出貨','完成','取消'];
function renderOrders(){
  const b=$('aBody');
  if(!orders){b.innerHTML='<p class="empty">訂單載入中…</p>';run('載入訂單',async()=>{orders=(await api('listOrders')).orders;renderOrders()});return}
  b.innerHTML=`<section class="apanel"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2>訂單（${orders.length}）</h2><button type="button" class="ghost sm" id="oRe">重新整理</button></div>
    ${orders.length?orders.map((o,i)=>`<div class="slip" style="display:grid;gap:6px">
      <div class="hd"><b>${esc(o.name)}${o.phone?'／'+esc(o.phone):''}</b><span class="no">${esc(o.no)}</span></div>
      <div class="who">${esc(o.date)}　合計 ${money(o.total)}</div>
      <div style="white-space:pre-wrap;font-size:13px">${esc(o.items)}</div>${o.note?`<div class="who">客人備註：${esc(o.note)}</div>`:''}
      <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center"><select class="f" data-os="${i}" style="width:auto">${OST.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select>
      <input data-om="${i}" value="${esc(o.memo)}" placeholder="內部備註（客人看不到）" style="font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);min-width:0">
      <button type="button" class="sm" data-osv="${i}">更新</button></div></div>`).join(''):'<p class="empty">還沒有訂單。客人在商店按「產生訂單」後就會出現在這裡。</p>'}</section>`;
  $('oRe').onclick=()=>{orders=null;renderOrders()};
  b.querySelectorAll('[data-osv]').forEach(x=>x.onclick=()=>{const i=+x.dataset.osv;const o=orders[i];
    run('更新中',async()=>{orders=(await api('setOrder',{no:o.no,status:b.querySelector(`[data-os="${i}"]`).value,memo:b.querySelector(`[data-om="${i}"]`).value})).orders;toast('已更新');renderOrders()})});
}

(async()=>{
  let first=true;
  try{const c=JSON.parse(localStorage.getItem('pj_cat')||'null');if(c&&c.products){apply(c,'first');first=false}}catch(e){}
  if(first){$('view').innerHTML='<p class="empty">商品載入中…</p>'}
  try{apply(await loadLive(),first?'first':'')}
  catch(e){console.warn('讀取試算表失敗，改用備份資料',e);
    if(first){try{apply(await (await fetch('catalog.json',{cache:'no-store'})).json(),'first')}catch(e2){$('view').innerHTML='<p class="empty">商品暫時載入失敗，請稍後重新整理。</p>'}}}
  setInterval(async()=>{if(document.hidden)return;try{apply(await loadLive())}catch(e){}},CONFIG.REFRESH_MS);
  document.addEventListener('visibilitychange',async()=>{if(!document.hidden){try{apply(await loadLive())}catch(e){}}});
})();

/* PinginJp 商店：商品資料即時讀取 Google 試算表 */
const CONFIG={
  SHEET_ID:'1lduSRfviAJyvBAq1a-XE1FdDrc0GfFBy8KNEAveOFP4',
  GIDS:{商品:'',庫存:'',商店設定:''},   // 留空時改用工作表名稱讀取
  ORDER_URL:'',                         // 訂單 Apps Script 網址（設定後客人產生訂單時會自動存進訂單試算表）
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
    <p>聯絡我們：${s.ig?`IG <a href="https://www.instagram.com/${esc(s.ig)}" target="_blank" rel="noopener" style="color:var(--ai)">@${esc(s.ig)}</a>`:''}${s.line?`　LINE ID：${esc(s.line)}`:''}</p>`;
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
function buildCatalog(P,I,S){
  const shop={notice:[]};
  S.forEach(r=>{const k=r['項目'],v=r['內容']||'';if(k==='商店名稱')shop.name=v;else if(k==='IG帳號')shop.ig=v.replace(/^@/,'');else if(k==='LINE ID')shop.line=v;else if(k==='到貨說明')shop.eta=v;else if(k==='代購須知'&&v)shop.notice.push(v)});
  const inv={};
  I.forEach(r=>{const id=r['商品ID'];if(!id||!r['顏色'])return;const L=inv[id]||(inv[id]=[]);
    let c=L.find(x=>x.name===r['顏色']);if(!c){c={name:r['顏色'],swatch:/^#[0-9a-f]{3,6}$/i.test(r['色塊'])?r['色塊']:'#a39e99',sizes:{}};L.push(c)}
    if(r['尺寸'])c.sizes[r['尺寸']]=CODE[r['狀態']]||'in'});
  const products=P.filter(r=>r['商品ID']).map(r=>({id:r['商品ID'].replace(/[^A-Za-z0-9-]/g,'-'),hidden:r['上架']!=='是',brand:r['品牌'],name:r['品名'],nameJa:r['日文原名'],category:r['分類'],
    price:+String(r['售價']).replace(/[^\d.]/g,'')||0,desc:r['說明'],spec:r['規格'],note:r['提醒'],ig:r['IG連結'],
    images:(r['照片']||'').split(/\n|,(?=\s*(?:https?:|images\/))/).map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^([^|]+)\|(.+)$/);return m?{color:m[1].trim(),src:imgSrc(m[2])}:{src:imgSrc(x)}}),
    colors:(inv[r['商品ID']]||[]).filter(c=>Object.keys(c.sizes).length)}))
    .filter(p=>p.colors.length);
  return {shop,products};
}
let sig='';
function apply(c,from){
  const s=JSON.stringify(c);if(s===sig)return false;sig=s;CAT=c;
  renderChrome();cart=cart.filter(l=>CAT.products.some(p=>p.id===l.id));saveCart();
  if(from==='first')route();
  else if(!/^#item-/.test(location.hash)){if(document.activeElement&&document.activeElement.id==='q'&&$('grid'))drawGrid();else renderList()}
  return true;
}
async function loadLive(){
  const [P,I,S]=await Promise.all(['商品','庫存','商店設定'].map(fetchSheet));
  const c=buildCatalog(P,I,S);if(!c.products.length)throw new Error('empty');
  try{localStorage.setItem('pj_cat',JSON.stringify(c))}catch(e){}
  return c;
}
async function sendOrder(o){
  if(!CONFIG.ORDER_URL)return;
  try{await fetch(CONFIG.ORDER_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({no:o.no,date:o.date,name:o.buyer.name,phone:o.buyer.phone,note:o.buyer.note,total:o.total,
      items:o.lines.map(l=>`${l.brand} ${l.name}／${l.color}／${l.size} × ${l.qty}　NT$${l.price*l.qty}${l.st==='order'?'（需調貨）':''}${l.st==='pre'?'（預購）':''}`).join('\n')})})}catch(e){}
}
function route(){
  const m=location.hash.match(/^#item-([A-Za-z0-9-]+)$/);
  const p=m&&visible().find(x=>x.id===m[1]);
  if(p)renderItem(p);else renderList();
}
window.addEventListener('hashchange',route);

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

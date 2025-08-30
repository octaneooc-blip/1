// Elements
const app        = document.getElementById('app');
const chat       = document.getElementById('chat');

const npcName    = document.getElementById('npcName');
const missionTag = document.getElementById('missionTag');
const npcAvatar  = document.getElementById('npcAvatar');

const myRepEl    = document.getElementById('myRep');

const leftCol    = document.getElementById('leftCol');
const rightCol   = document.getElementById('rightCol');

const btnShop    = document.getElementById('btnShop');
const btnClose   = document.getElementById('btnClose');

const shopSheet  = document.getElementById('shopSheet');
const shopList   = document.getElementById('shopList');
const shopClose  = document.getElementById('shopClose');

const RES = (typeof GetParentResourceName === 'function') ? GetParentResourceName() : 'zat-dialog';

// State
let state = { session:null, npcIndex:null, myRep:0, haveShop:false };
let dialogCache = { buttons:[], npcIndex:null };

// Utils
function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }
function initials(name){
  if(!name) return 'NP';
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0]||'N').toUpperCase() + (p[1]?.[0]||'P').toUpperCase();
}
function addMsg(text, who){ // 'npc' | 'me'
  const m = document.createElement('div');
  m.className = `msg ${who}`;
  m.textContent = text || '';
  chat.appendChild(m);
  chat.scrollTop = chat.scrollHeight;
}

function renderChoices(buttons){
  dialogCache.buttons = Array.isArray(buttons) ? buttons : [];
  clear(leftCol); clear(rightCol);
  dialogCache.buttons.forEach((b,i)=>{
    const c = document.createElement('div'); c.className='choice';
    const num = document.createElement('div'); num.className='num'; num.textContent=String(i+1);
    const label = document.createElement('div'); label.className='label'; label.textContent = b.text || 'action';
    c.appendChild(num); c.appendChild(label);
    c.addEventListener('click', ()=> choose(i+1));
    (i%2===0 ? leftCol : rightCol).appendChild(c);
  });
}
function choose(index){
  if (!dialogCache.buttons.length) return;
  fetch(`https://${RES}/dialog:click`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ npcIndex: dialogCache.npcIndex, buttonIndex: index, path: [] })
  }).catch(console.error);
}

// Shop
function openShop(){ shopSheet.classList.add('open'); }
function closeShop(){ shopSheet.classList.remove('open'); }
function renderShop(items, npcIndex){
  clear(shopList);
  (items || []).forEach(it=>{
    const row = document.createElement('div'); row.className='item';
    const img = document.createElement('img'); img.src = it.image || '';
    const meta = document.createElement('div');
    const name = document.createElement('div'); name.className='name'; name.textContent = it.label || it.name;
    const type = document.createElement('div'); type.className='type'; type.textContent = it.type || '';
    meta.appendChild(name); meta.appendChild(type);
    const price = document.createElement('div'); price.className='price'; price.textContent = `$${it.price ?? 0}`;
    const buy = document.createElement('button'); buy.className='buy'; buy.textContent='Buy';
    const needRep = Number(it.rep ?? 0);
    if (state.myRep < needRep){ buy.setAttribute('disabled','true'); buy.title=`Requires REP ${needRep}`; }
    buy.addEventListener('click', ()=>{
      fetch(`https://${RES}/dialog:buy`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ npcIndex: npcIndex ?? state.npcIndex, itemName: it.name })
      }).catch(console.error);
    });
    row.appendChild(img); row.appendChild(meta); row.appendChild(price); row.appendChild(buy);
    shopList.appendChild(row);
  });
}

// Buttons
btnShop.addEventListener('click', ()=>{
  if (!state.haveShop){
    fetch(`https://${RES}/dialog:openShopTab`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ npcIndex: state.npcIndex })
    }).catch(console.error);
  } else {
    if (shopSheet.classList.contains('open')) closeShop(); else openShop();
  }
});
btnClose.addEventListener('click', ()=>{
  fetch(`https://${RES}/dialog:close`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })
  .catch(console.error);
});
shopClose.addEventListener('click', closeShop);

// Keyboard
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    if (shopSheet.classList.contains('open')) closeShop();
    else btnClose.click();
  } else if (/^[1-9]$/.test(e.key)){
    choose(Number(e.key));
  }
});

// NUI messages
window.addEventListener('message', (e)=>{
  const d = e.data || {};

  if (d.action === 'open'){
    state.session = d.session || null;
    state.npcIndex = d.npcIndex;
    state.myRep    = Number(d.myRep ?? 0);
    state.haveShop = Array.isArray(d.items) && d.items.length > 0;

    app.classList.remove('hidden');

    npcName.textContent = d.name || 'NPC';
    missionTag.textContent = d.mission || '';
    npcAvatar.textContent = initials(d.name || 'NPC');
    myRepEl.textContent = String(state.myRep);

    clear(chat);
    if (d.text) addMsg(d.text, 'npc');
    dialogCache.npcIndex = d.npcIndex;

    renderChoices(d.buttons || []);
    if (state.haveShop) renderShop(d.items || [], d.npcIndex);
    closeShop();
  }

  else if (d.action === 'setButtons'){
    if (d.session && d.session !== state.session) return;
    const idx = d.npcIndex ?? dialogCache.npcIndex ?? state.npcIndex;
    dialogCache.npcIndex = idx;
    renderChoices(d.buttons || []);
  }

  else if (d.action === 'answer'){
    if (d.session && d.session !== state.session) return;
    if (d.text) addMsg(d.text, 'me');
  }

  else if (d.action === 'openShop'){
    if (d.session && d.session !== state.session) return;
    renderShop(d.items || [], d.npcIndex ?? state.npcIndex);
    state.haveShop = true;
    openShop();
  }

  else if (d.action === 'forceClose'){
    if (d.session && d.session !== state.session) return;
    app.classList.add('hidden');
    state = { session:null, npcIndex:null, myRep:0, haveShop:false };
    dialogCache = { buttons:[], npcIndex:null };
    clear(chat); clear(leftCol); clear(rightCol); clear(shopList);
    closeShop();
  }
});

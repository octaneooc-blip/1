// Elements
const app = document.getElementById('app');
const chat = document.getElementById('chat');

const npcName = document.getElementById('npcName');
const missionTag = document.getElementById('missionTag');
const npcAvatar = document.getElementById('npcAvatar');
const myRepEl = document.getElementById('myRep');

const leftCol = document.getElementById('leftCol');
const rightCol = document.getElementById('rightCol');

const btnClose = document.getElementById('btnClose');

const dialogTab = document.getElementById('dialogTab');
const shopTab = document.getElementById('shopTab');
const dialogContent = document.getElementById('dialogContent');
const shopContent = document.getElementById('shopContent');
const shopList = document.getElementById('shopList');

const RES = (typeof GetParentResourceName === 'function') ? GetParentResourceName() : 'zat-dialog';

// State
let state = { session: null, npcIndex: null, myRep: 0, haveShop: false };
let dialogCache = { buttons: [], npcIndex: null };
let currentTab = 'dialog';

// Utils
function clear(el) { 
  while (el.firstChild) el.removeChild(el.firstChild); 
}

function initials(name) {
  if (!name) return 'NP';
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] || 'N').toUpperCase() + (p[1]?.[0] || 'P').toUpperCase();
}

function addMsg(text, who) {
  const m = document.createElement('div');
  m.className = `msg ${who}`;
  m.textContent = text || '';
  chat.appendChild(m);
  chat.scrollTop = chat.scrollHeight;
}

function renderChoices(buttons) {
  dialogCache.buttons = Array.isArray(buttons) ? buttons : [];
  clear(leftCol);
  clear(rightCol);
  
  dialogCache.buttons.forEach((b, i) => {
    const c = document.createElement('div');
    c.className = 'choice';
    c.tabIndex = 0;
    
    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = String(i + 1);
    
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = b.text || 'action';
    
    c.appendChild(num);
    c.appendChild(label);
    c.addEventListener('click', () => choose(i + 1));
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        choose(i + 1);
      }
    });
    
    (i % 2 === 0 ? leftCol : rightCol).appendChild(c);
  });
}

function choose(index) {
  if (!dialogCache.buttons.length) return;
  
  // Add user message
  const selectedChoice = dialogCache.buttons[index - 1];
  if (selectedChoice) {
    addMsg(selectedChoice.text, 'me');
  }
  
  fetch(`https://${RES}/dialog:click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      npcIndex: dialogCache.npcIndex, 
      buttonIndex: index, 
      path: [] 
    })
  }).catch(console.error);
}

// Tab Management
function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  dialogTab.classList.toggle('active', tab === 'dialog');
  shopTab.classList.toggle('active', tab === 'shop');
  
  // Update content visibility
  dialogContent.style.display = tab === 'dialog' ? 'grid' : 'none';
  shopContent.classList.toggle('active', tab === 'shop');
}

// Shop
function renderShop(items, npcIndex) {
  clear(shopList);
  
  (items || []).forEach(it => {
    const row = document.createElement('div');
    row.className = 'item';
    
    const img = document.createElement('img');
    img.src = it.image || '';
    img.alt = it.name || 'Item';
    
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = it.label || it.name;
    
    const type = document.createElement('div');
    type.className = 'type';
    type.textContent = it.type || '';
    
    meta.appendChild(name);
    meta.appendChild(type);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = `$${it.price ?? 0}`;
    
    const buy = document.createElement('button');
    buy.className = 'buy';
    buy.textContent = 'Buy';
    
    const needRep = Number(it.rep ?? 0);
    if (state.myRep < needRep) {
      buy.setAttribute('disabled', 'true');
      buy.title = `Requires REP ${needRep}`;
    }
    
    buy.addEventListener('click', () => {
      fetch(`https://${RES}/dialog:buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          npcIndex: npcIndex ?? state.npcIndex, 
          itemName: it.name 
        })
      }).catch(console.error);
    });
    
    actions.appendChild(price);
    actions.appendChild(buy);
    
    row.appendChild(img);
    row.appendChild(meta);
    row.appendChild(actions);
    shopList.appendChild(row);
  });
}

// Event Listeners
dialogTab.addEventListener('click', () => switchTab('dialog'));
shopTab.addEventListener('click', () => {
  if (!state.haveShop) {
    fetch(`https://${RES}/dialog:openShopTab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ npcIndex: state.npcIndex })
    }).catch(console.error);
  } else {
    switchTab('shop');
  }
});

btnClose.addEventListener('click', () => {
  fetch(`https://${RES}/dialog:close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }).catch(console.error);
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    btnClose.click();
  } else if (/^[1-9]$/.test(e.key) && currentTab === 'dialog') {
    choose(Number(e.key));
  } else if (e.key === 'Tab') {
    e.preventDefault();
    switchTab(currentTab === 'dialog' ? 'shop' : 'dialog');
  }
});

// NUI Message Handler
window.addEventListener('message', (e) => {
  const d = e.data || {};

  if (d.action === 'open') {
    state.session = d.session || null;
    state.npcIndex = d.npcIndex;
    state.myRep = Number(d.myRep ?? 0);
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
    if (state.haveShop) {
      renderShop(d.items || [], d.npcIndex);
      shopTab.style.display = 'block';
    } else {
      shopTab.style.display = 'none';
    }
    
    switchTab('dialog');
  }

  else if (d.action === 'setButtons') {
    if (d.session && d.session !== state.session) return;
    const idx = d.npcIndex ?? dialogCache.npcIndex ?? state.npcIndex;
    dialogCache.npcIndex = idx;
    renderChoices(d.buttons || []);
  }

  else if (d.action === 'answer') {
    if (d.session && d.session !== state.session) return;
    if (d.text) addMsg(d.text, 'npc');
  }

  else if (d.action === 'openShop') {
    if (d.session && d.session !== state.session) return;
    renderShop(d.items || [], d.npcIndex ?? state.npcIndex);
    state.haveShop = true;
    shopTab.style.display = 'block';
    switchTab('shop');
  }

  else if (d.action === 'forceClose') {
    if (d.session && d.session !== state.session) return;
    app.classList.add('hidden');
    state = { session: null, npcIndex: null, myRep: 0, haveShop: false };
    dialogCache = { buttons: [], npcIndex: null };
    clear(chat);
    clear(leftCol);
    clear(rightCol);
    clear(shopList);
    switchTab('dialog');
  }
});
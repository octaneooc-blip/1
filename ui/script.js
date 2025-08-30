// Elements
const app = document.getElementById('app');
const chat = document.getElementById('chat');

const npcName = document.getElementById('npcName');
const missionTag = document.getElementById('missionTag');
const npcAvatar = document.getElementById('npcAvatar');
const myRepEl = document.getElementById('myRep');

const choicesContainer = document.getElementById('choicesContainer');
const btnClose = document.getElementById('btnClose');

const dialogTab = document.getElementById('dialogTab');
const shopTab = document.getElementById('shopTab');
const dialogContent = document.getElementById('dialogContent');
const shopContent = document.getElementById('shopContent');
const shopGrid = document.getElementById('shopGrid');

const RES = (typeof GetParentResourceName === 'function') ? GetParentResourceName() : 'zat-dialog';

// State
let state = { 
  session: null, 
  npcIndex: null, 
  myRep: 0, 
  haveShop: false 
};
let dialogCache = { 
  buttons: [], 
  npcIndex: null 
};
let currentTab = 'dialog';

// Utils
function clear(el) { 
  while (el.firstChild) el.removeChild(el.firstChild); 
}

function initials(name) {
  if (!name) return 'NP';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || 'N').toUpperCase() + (parts[1]?.[0] || 'P').toUpperCase();
}

function addMsg(text, who) {
  const msg = document.createElement('div');
  msg.className = `msg ${who}`;
  msg.textContent = text || '';
  chat.appendChild(msg);
  
  // Smooth scroll to bottom
  setTimeout(() => {
    chat.scrollTo({
      top: chat.scrollHeight,
      behavior: 'smooth'
    });
  }, 100);
}

function renderChoices(buttons) {
  dialogCache.buttons = Array.isArray(buttons) ? buttons : [];
  
  // Clear existing choices (keep hint)
  const existingChoices = choicesContainer.querySelectorAll('.choice');
  existingChoices.forEach(choice => choice.remove());
  
  dialogCache.buttons.forEach((button, index) => {
    const choice = document.createElement('div');
    choice.className = 'choice';
    choice.tabIndex = 0;
    
    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = String(index + 1);
    
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = button.text || 'Action';
    
    choice.appendChild(num);
    choice.appendChild(label);
    
    choice.addEventListener('click', () => choose(index + 1));
    choice.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        choose(index + 1);
      }
    });
    
    // Insert before hint
    const hint = choicesContainer.querySelector('.hint');
    choicesContainer.insertBefore(choice, hint);
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
  dialogContent.style.display = tab === 'dialog' ? 'flex' : 'none';
  shopContent.classList.toggle('active', tab === 'shop');
}

// Shop Item Icons
const itemIcons = {
  weapon: '⚔️',
  armor: '🛡️',
  consumable: '🧪',
  tool: '🔧',
  vehicle: '🚗',
  upgrade: '⭐',
  default: '📦'
};

function getItemIcon(type) {
  return itemIcons[type?.toLowerCase()] || itemIcons.default;
}

// Shop Rendering
function renderShop(items, npcIndex) {
  clear(shopGrid);
  
  (items || []).forEach(item => {
    const shopItem = document.createElement('div');
    shopItem.className = 'shop-item';
    
    // Item Header
    const itemHeader = document.createElement('div');
    itemHeader.className = 'item-header';
    
    const itemIcon = document.createElement('div');
    itemIcon.className = 'item-icon';
    itemIcon.textContent = getItemIcon(item.type);
    
    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';
    
    const itemName = document.createElement('div');
    itemName.className = 'item-name';
    itemName.textContent = item.label || item.name || 'Unknown Item';
    
    const itemType = document.createElement('div');
    itemType.className = 'item-type';
    itemType.textContent = item.type || 'Item';
    
    itemInfo.appendChild(itemName);
    itemInfo.appendChild(itemType);
    
    itemHeader.appendChild(itemIcon);
    itemHeader.appendChild(itemInfo);
    
    // Item Footer
    const itemFooter = document.createElement('div');
    itemFooter.className = 'item-footer';
    
    const itemPrice = document.createElement('div');
    itemPrice.className = 'item-price';
    itemPrice.textContent = `$${item.price ?? 0}`;
    
    const buyBtn = document.createElement('button');
    buyBtn.className = 'buy-btn';
    buyBtn.textContent = 'Purchase';
    
    const needRep = Number(item.rep ?? 0);
    if (state.myRep < needRep) {
      buyBtn.setAttribute('disabled', 'true');
      buyBtn.title = `Requires REP ${needRep}`;
      buyBtn.textContent = `REP ${needRep}`;
    }
    
    buyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!buyBtn.disabled) {
        fetch(`https://${RES}/dialog:buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            npcIndex: npcIndex ?? state.npcIndex, 
            itemName: item.name 
          })
        }).catch(console.error);
      }
    });
    
    itemFooter.appendChild(itemPrice);
    itemFooter.appendChild(buyBtn);
    
    shopItem.appendChild(itemHeader);
    shopItem.appendChild(itemFooter);
    shopGrid.appendChild(shopItem);
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
  if (!app.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      btnClose.click();
    } else if (/^[1-9]$/.test(e.key) && currentTab === 'dialog') {
      choose(Number(e.key));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (state.haveShop) {
        switchTab(currentTab === 'dialog' ? 'shop' : 'dialog');
      }
    }
  }
});

// NUI Message Handler
window.addEventListener('message', (e) => {
  const data = e.data || {};

  if (data.action === 'open') {
    state.session = data.session || null;
    state.npcIndex = data.npcIndex;
    state.myRep = Number(data.myRep ?? 0);
    state.haveShop = Array.isArray(data.items) && data.items.length > 0;

    // Show panel with animation
    app.classList.remove('hidden');

    // Update NPC info
    npcName.textContent = data.name || 'NPC';
    missionTag.textContent = data.mission || 'Mission';
    npcAvatar.textContent = initials(data.name || 'NPC');
    myRepEl.textContent = String(state.myRep);

    // Clear and setup chat
    clear(chat);
    if (data.text) {
      addMsg(data.text, 'npc');
    }
    
    dialogCache.npcIndex = data.npcIndex;
    renderChoices(data.buttons || []);
    
    // Setup shop if available
    if (state.haveShop) {
      renderShop(data.items || [], data.npcIndex);
      shopTab.style.display = 'block';
    } else {
      shopTab.style.display = 'none';
    }
    
    switchTab('dialog');
  }

  else if (data.action === 'setButtons') {
    if (data.session && data.session !== state.session) return;
    const npcIndex = data.npcIndex ?? dialogCache.npcIndex ?? state.npcIndex;
    dialogCache.npcIndex = npcIndex;
    renderChoices(data.buttons || []);
  }

  else if (data.action === 'answer') {
    if (data.session && data.session !== state.session) return;
    if (data.text) {
      addMsg(data.text, 'npc');
    }
  }

  else if (data.action === 'openShop') {
    if (data.session && data.session !== state.session) return;
    renderShop(data.items || [], data.npcIndex ?? state.npcIndex);
    state.haveShop = true;
    shopTab.style.display = 'block';
    switchTab('shop');
  }

  else if (data.action === 'forceClose') {
    if (data.session && data.session !== state.session) return;
    
    // Hide panel with animation
    app.classList.add('hidden');
    
    // Reset state
    state = { session: null, npcIndex: null, myRep: 0, haveShop: false };
    dialogCache = { buttons: [], npcIndex: null };
    
    // Clear content
    clear(chat);
    clear(shopGrid);
    
    // Clear choices but keep hint
    const existingChoices = choicesContainer.querySelectorAll('.choice');
    existingChoices.forEach(choice => choice.remove());
    
    switchTab('dialog');
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Ensure proper initial state
  switchTab('dialog');
});
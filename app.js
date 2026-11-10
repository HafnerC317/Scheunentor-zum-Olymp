// ============================================
// SCHEUNENTOR ZUM OLYMP - APP.JS v2.7
// ============================================

const VERSION = '2.7';
const GIST_FILENAME = 'scheunentor-sync-data.json';
const SYNC_INTERVAL = 5000;

let players = JSON.parse(localStorage.getItem('scheunentor_players')) || [];
let squads = JSON.parse(localStorage.getItem('scheunentor_squads')) || [];
let currentFormation = localStorage.getItem('scheunentor_formation') || '4-3-3';
let currentSquadData = JSON.parse(localStorage.getItem('scheunentor_currentSquad')) || {};
let githubToken = localStorage.getItem('scheunentor_github_token') || '';
let gistId = localStorage.getItem('scheunentor_gist_id') || '';
let lastSyncTime = 0;
let syncIntervalId = null;

const TIERS = {
  elite: { min: 95, max: 99, color: '#9b59b6', label: 'Elite' },
  gold: { min: 90, max: 94, color: '#D4AF37', label: 'Gold' },
  silver: { min: 85, max: 89, color: '#C0C0C0', label: 'Silber' },
  bronze: { min: 80, max: 84, color: '#CD7F32', label: 'Bronze' },
  championsLeague: { min: 0, max: 79, color: '#003B7A', label: 'Champions League' }
};

const FORMATIONS = {
  '3-4-3': ['TW','LV','IV','RV','LM','ZM','ZM','RM','LF','ST','RF'],
  '3-5-2': ['TW','LV','IV','RV','LM','ZM','ZM','ZM','RM','ST','ST'],
  '4-1-2-1-2': ['TW','LV','IV','IV','RV','ZDM','LM','RM','ZOM','ST','ST'],
  '4-1-2-1-2 (2)': ['TW','LV','IV','IV','RV','ZDM','ZM','ZM','ZOM','ST','ST'],
  '4-1-3-2': ['TW','LV','IV','IV','RV','ZDM','LM','ZM','RM','ST','ST'],
  '4-1-4-1': ['TW','LV','IV','IV','RV','ZDM','LM','ZM','ZM','RM','ST'],
  '4-2-2-2': ['TW','LV','IV','IV','RV','ZDM','ZDM','LM','RM','ST','ST'],
  '4-2-3-1': ['TW','LV','IV','IV','RV','ZDM','ZDM','LF','ZOM','RF','ST'],
  '4-2-3-1 (2)': ['TW','LV','IV','IV','RV','ZDM','ZDM','LM','ZOM','RM','ST'],
  '4-2-4': ['TW','LV','IV','IV','RV','ZDM','ZDM','LF','RF','ST','ST'],
  '4-3-1-2': ['TW','LV','IV','IV','RV','ZM','ZM','ZM','ZOM','ST','ST'],
  '4-3-2-1': ['TW','LV','IV','IV','RV','ZM','ZM','ZM','LF','RF','ST'],
  '4-3-3': ['TW','LV','IV','IV','RV','ZM','ZM','ZM','LF','ST','RF'],
  '4-3-3 (2)': ['TW','LV','IV','IV','RV','ZDM','ZM','ZM','LF','ST','RF'],
  '4-3-3 (3)': ['TW','LV','IV','IV','RV','ZDM','ZM','ZM','LM','ST','RM'],
  '4-3-3 (4)': ['TW','LV','IV','IV','RV','ZM','ZM','ZOM','LF','ST','RF'],
  '4-3-3 (5)': ['TW','LV','IV','IV','RV','ZDM','ZDM','ZOM','LF','ST','RF'],
  '4-4-1-1': ['TW','LV','IV','IV','RV','LM','ZM','ZM','RM','ZOM','ST'],
  '4-4-2': ['TW','LV','IV','IV','RV','LM','ZM','ZM','RM','ST','ST'],
  '4-4-2 (2)': ['TW','LV','IV','IV','RV','LM','ZDM','ZDM','RM','ST','ST'],
  '4-5-1': ['TW','LV','IV','IV','RV','LM','ZM','ZM','ZM','RM','ST'],
  '4-5-1 (2)': ['TW','LV','IV','IV','RV','LM','ZDM','ZM','ZM','RM','ST'],
  '5-2-1-2': ['TW','LV','IV','IV','IV','RV','ZM','ZM','ZOM','ST','ST'],
  '5-2-2-1': ['TW','LV','IV','IV','IV','RV','ZM','ZM','LF','RF','ST'],
  '5-3-2': ['TW','LV','IV','IV','IV','RV','ZM','ZM','ZM','ST','ST'],
  '5-4-1': ['TW','LV','IV','IV','IV','RV','LM','ZM','ZM','RM','ST']
};

const ALL_POSITIONS = ['TW','LV','IV','RV','LM','RM','ZDM','ZM','ZOM','LF','RF','ST','LS','RS'];

const POSITION_COMPATIBILITY = {
  TW: ['TW'],
  LV: ['LV','LM','IV'],
  IV: ['IV','LV','RV'],
  RV: ['RV','RM','IV'],
  LM: ['LM','LV','LF','RM'],
  RM: ['RM','RV','RF','LM'],
  ZDM: ['ZDM','ZM','IV'],
  ZM: ['ZM','ZDM','ZOM'],
  ZOM: ['ZOM','ZM','ST','LF','RF'],
  LF: ['LF','LM','ST','LS'],
  RF: ['RF','RM','ST','RS'],
  ST: ['ST','ZOM','LF','RF','LS','RS'],
  LS: ['LS','LF','ST'],
  RS: ['RS','RF','ST']
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupTabs();
  setupAddPlayerForm();
  setupFormationSelector();
  setupBenchToggle();
  setupSquadSlots();
  setupGitHubSync();
  renderPlayers();
  renderSquadBuilder();
  renderOlymp();
  checkGitHubToken();
  startAutoSync();
}

// ============================================
// TAB NAVIGATION
// ============================================

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
}

// ============================================
// PLAYER MANAGEMENT
// ============================================

function setupAddPlayerForm() {
  const form = document.getElementById('addPlayerForm');
  const nameInput = document.getElementById('playerName');
  const suggestionsList = document.getElementById('nameSuggestions');

  // Wikipedia-Vorschläge
  nameInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
      return;
    }

    try {
      const response = await fetch(`https://de.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query + ' Fußballspieler')}&limit=5&namespace=0&format=json&origin=*`);
      const data = await response.json();
      const suggestions = data[1];

      if (suggestions.length === 0) {
        suggestionsList.innerHTML = '';
        suggestionsList.style.display = 'none';
        return;
      }

      suggestionsList.innerHTML = suggestions.map(name => 
        `<div class="suggestion-item" data-name="${name}">${name}</div>`
      ).join('');
      suggestionsList.style.display = 'block';

      document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          nameInput.value = item.dataset.name;
          suggestionsList.innerHTML = '';
          suggestionsList.style.display = 'none';
        });
      });
    } catch (error) {
      console.error('Wikipedia API Fehler:', error);
    }
  });

  // Suggestions schließen bei Klick außerhalb
  document.addEventListener('click', (e) => {
    if (!nameInput.contains(e.target) && !suggestionsList.contains(e.target)) {
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('playerName').value.trim();
    const mainPosition = document.getElementById('playerPosition').value;
    const rating = parseInt(document.getElementById('playerRating').value);
    const imageUrl = document.getElementById('playerImage').value.trim();

    // Alternative Positionen sammeln
    const altPositions = Array.from(document.querySelectorAll('.alt-position-checkbox:checked'))
      .map(cb => cb.value);

    if (!name || rating < 0 || rating > 99) {
      alert('⚠️ Bitte alle Felder korrekt ausfüllen!');
      return;
    }

    // Duplikatsprüfung
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      alert('⚠️ Dieser Spieler existiert bereits!');
      return;
    }

    const player = {
      id: Date.now().toString(),
      name,
      mainPosition,
      alternativePositions: altPositions,
      rating,
      imageUrl: imageUrl || 'https://i.imgur.com/vCwczZs.png',
      tier: getTier(rating),
      createdAt: Date.now()
    };

    players.push(player);
    savePlayers();
    renderPlayers();
    renderOlymp();
    form.reset();
    document.querySelectorAll('.alt-position-checkbox').forEach(cb => cb.checked = false);
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';
    triggerSync();
  });

  // Alternative Positionen anzeigen
  const posSelect = document.getElementById('playerPosition');
  const altContainer = document.getElementById('altPositionsContainer');

  posSelect.addEventListener('change', () => {
    const mainPos = posSelect.value;
    const compatible = POSITION_COMPATIBILITY[mainPos] || [];
    const available = ALL_POSITIONS.filter(p => p !== mainPos && !compatible.includes(p));

    altContainer.innerHTML = available.map(pos => `
      <label class="alt-pos-label">
        <input type="checkbox" class="alt-position-checkbox" value="${pos}">
        ${pos}
      </label>
    `).join('');
  });

  // Initial-Trigger
  posSelect.dispatchEvent(new Event('change'));
}

function getTier(rating) {
  for (let [key, tier] of Object.entries(TIERS)) {
    if (rating >= tier.min && rating <= tier.max) return key;
  }
  return 'championsLeague';
}

function savePlayers() {
  localStorage.setItem('scheunentor_players', JSON.stringify(players));
}

function renderPlayers() {
  const container = document.getElementById('playersList');
  
  if (players.length === 0) {
    container.innerHTML = '<p class="empty-state">🔍 Noch keine Spieler vorhanden</p>';
    return;
  }

  const sorted = [...players].sort((a, b) => b.rating - a.rating);

  container.innerHTML = sorted.map(player => {
    const tier = TIERS[player.tier];
    const allPos = [player.mainPosition, ...(player.alternativePositions || [])].join(', ');
    
    return `
      <div class="player-card" draggable="true" data-player-id="${player.id}" style="border-left: 4px solid ${tier.color}">
        <img src="${player.imageUrl}" alt="${player.name}" class="player-card-img">
        <div class="player-card-content">
          <div class="player-card-header">
            <h3>${player.name}</h3>
            <span class="player-rating" style="background: ${tier.color}">${player.rating}</span>
          </div>
          <p class="player-position">${allPos}</p>
          <span class="player-tier" style="color: ${tier.color}">${tier.label}</span>
        </div>
        <div class="player-card-actions">
          <button onclick="editPlayer('${player.id}')" class="btn-icon" title="Bearbeiten">✏️</button>
          <button onclick="deletePlayer('${player.id}')" class="btn-icon" title="Löschen">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Drag-Events für Aufstellung
  document.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('playerId', card.dataset.playerId);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
}

function editPlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;

  const newName = prompt('✏️ Neuer Name:', player.name);
  if (!newName) return;

  const newRating = parseInt(prompt('✏️ Neues Rating (0-99):', player.rating));
  if (isNaN(newRating) || newRating < 0 || newRating > 99) return;

  const newImage = prompt('✏️ Neue Bild-URL:', player.imageUrl);

  player.name = newName.trim();
  player.rating = newRating;
  player.imageUrl = newImage ? newImage.trim() : player.imageUrl;
  player.tier = getTier(newRating);

  savePlayers();
  renderPlayers();
  renderSquadBuilder();
  renderOlymp();
  triggerSync();
}

function deletePlayer(id) {
  if (!confirm('🗑️ Spieler wirklich löschen?')) return;

  players = players.filter(p => p.id !== id);
  
  // Aus aktueller Aufstellung entfernen
  for (let key in currentSquadData) {
    if (currentSquadData[key] === id) delete currentSquadData[key];
  }

  savePlayers();
  saveCurrentSquad();
  renderPlayers();
  renderSquadBuilder();
  renderOlymp();
  triggerSync();
}

// ============================================
// SQUAD BUILDER
// ============================================

function setupFormationSelector() {
  const btn = document.getElementById('formationBtn');
  const modal = document.getElementById('formationModal');
  const close = modal.querySelector('.modal-close');
  const grid = document.getElementById('formationGrid');

  btn.addEventListener('click', () => modal.classList.add('active'));
  close.addEventListener('click', () => modal.classList.remove('active'));

  grid.innerHTML = Object.keys(FORMATIONS).map(f => 
    `<div class="formation-option" data-formation="${f}">${f}</div>`
  ).join('');

  grid.querySelectorAll('.formation-option').forEach(opt => {
    opt.addEventListener('click', () => {
      currentFormation = opt.dataset.formation;
      localStorage.setItem('scheunentor_formation', currentFormation);
      currentSquadData = {};
      saveCurrentSquad();
      renderSquadBuilder();
      modal.classList.remove('active');
      triggerSync();
    });
  });
}

function setupBenchToggle() {
  const btn = document.getElementById('benchToggle');
  const bench = document.getElementById('benchSlots');

  btn.addEventListener('click', () => {
    const isOpen = bench.classList.toggle('open');
    btn.textContent = isOpen ? '🔽 Bank einklappen' : '🔼 Bank aufklappen';
  });
}

function saveCurrentSquad() {
  localStorage.setItem('scheunentor_currentSquad', JSON.stringify(currentSquadData));
}

function renderSquadBuilder() {
  const field = document.getElementById('squadField');
  const bench = document.getElementById('benchSlots');
  const formation = FORMATIONS[currentFormation];

  document.getElementById('currentFormation').textContent = currentFormation;

  // Spielfeld
  field.innerHTML = formation.map((pos, idx) => {
    const playerId = currentSquadData[`pos_${idx}`];
    const player = playerId ? players.find(p => p.id === playerId) : null;

    return `
      <div class="squad-slot" data-position="${pos}" data-index="${idx}">
        ${player ? `
          <img src="${player.imageUrl}" alt="${player.name}" class="squad-player-img">
          <div class="squad-player-name">${player.name}</div>
          <div class="squad-player-rating">${player.rating}</div>
          <button class="remove-player-btn" onclick="removeFromSquad(${idx})">✖</button>
        ` : `
          <div class="squad-slot-empty">${pos}</div>
        `}
      </div>
    `;
  }).join('');

  // Bank
  bench.innerHTML = Array.from({length: 7}, (_, i) => {
    const playerId = currentSquadData[`bench_${i}`];
    const player = playerId ? players.find(p => p.id === playerId) : null;

    return `
      <div class="squad-slot bench-slot" data-bench="${i}">
        ${player ? `
          <img src="${player.imageUrl}" alt="${player.name}" class="squad-player-img">
          <div class="squad-player-name">${player.name}</div>
          <div class="squad-player-rating">${player.rating}</div>
          <button class="remove-player-btn" onclick="removeFromBench(${i})">✖</button>
        ` : `
          <div class="squad-slot-empty">Bank ${i + 1}</div>
        `}
      </div>
    `;
  }).join('');

  setupDropZones();
}

function setupDropZones() {
  document.querySelectorAll('.squad-slot').forEach(slot => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      const playerId = e.dataTransfer.getData('playerId');
      const player = players.find(p => p.id === playerId);
      
      if (!player) return;

      const requiredPos = slot.dataset.position;
      const isBench = slot.dataset.bench !== undefined;

      if (isBench || !requiredPos) {
        slot.classList.add('drop-valid');
      } else {
        const compatible = POSITION_COMPATIBILITY[requiredPos] || [];
        const allPlayerPos = [player.mainPosition, ...(player.alternativePositions || [])];
        const isCompatible = allPlayerPos.some(p => compatible.includes(p) || p === requiredPos);
        
        slot.classList.toggle('drop-valid', isCompatible);
        slot.classList.toggle('drop-invalid', !isCompatible);
      }
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drop-valid', 'drop-invalid');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drop-valid', 'drop-invalid');

      const playerId = e.dataTransfer.getData('playerId');
      const player = players.find(p => p.id === playerId);
      
      if (!player) return;

      const benchIndex = slot.dataset.bench;
      const posIndex = slot.dataset.index;

      if (benchIndex !== undefined) {
        currentSquadData[`bench_${benchIndex}`] = playerId;
      } else if (posIndex !== undefined) {
        const requiredPos = slot.dataset.position;
        const compatible = POSITION_COMPATIBILITY[requiredPos] || [];
        const allPlayerPos = [player.mainPosition, ...(player.alternativePositions || [])];
        const isCompatible = allPlayerPos.some(p => compatible.includes(p) || p === requiredPos);

        if (!isCompatible) {
          alert(`⚠️ ${player.name} kann nicht auf ${requiredPos} spielen!`);
          return;
        }

        currentSquadData[`pos_${posIndex}`] = playerId;
      }

      saveCurrentSquad();
      renderSquadBuilder();
      triggerSync();
    });
  });
}

function removeFromSquad(index) {
  delete currentSquadData[`pos_${index}`];
  saveCurrentSquad();
  renderSquadBuilder();
  triggerSync();
}

function removeFromBench(index) {
  delete currentSquadData[`bench_${index}`];
  saveCurrentSquad();
  renderSquadBuilder();
  triggerSync();
}

// ============================================
// SQUAD SAVE SLOTS
// ============================================

function setupSquadSlots() {
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`saveSquad${i}`).addEventListener('click', () => saveSquadToSlot(i));
    document.getElementById(`loadSquad${i}`).addEventListener('click', () => loadSquadFromSlot(i));
  }
}

function saveSquadToSlot(slotNum) {
  const slotName = prompt(`💾 Name für Aufstellung ${slotNum}:`, `Aufstellung ${slotNum}`);
  if (!slotName) return;

  squads[slotNum - 1] = {
    name: slotName,
    formation: currentFormation,
    data: { ...currentSquadData }
  };

  localStorage.setItem('scheunentor_squads', JSON.stringify(squads));
  updateSlotLabels();
  triggerSync();
}

function loadSquadFromSlot(slotNum) {
  const squad = squads[slotNum - 1];
  if (!squad) {
    alert('⚠️ Slot ist leer!');
    return;
  }

  currentFormation = squad.formation;
  currentSquadData = { ...squad.data };
  
  localStorage.setItem('scheunentor_formation', currentFormation);
  saveCurrentSquad();
  renderSquadBuilder();
  triggerSync();
}

function updateSlotLabels() {
  squads.forEach((squad, i) => {
    if (squad) {
      document.getElementById(`loadSquad${i + 1}`).textContent = `📂 ${squad.name}`;
    }
  });
}

// ============================================
// DER OLYMP (HALL OF FAME)
// ============================================

function renderOlymp() {
  renderOlympRanking();
  renderOlympPositions();
}

function renderOlympRanking() {
  const container = document.getElementById('olympRanking');
  
  if (players.length === 0) {
    container.innerHTML = '<p class="empty-state">🏆 Noch keine Götter vorhanden</p>';
    return;
  }

  const sorted = [...players].sort((a, b) => b.rating - a.rating);

  container.innerHTML = sorted.map((player, index) => {
    const tier = TIERS[player.tier];
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    const allPos = [player.mainPosition, ...(player.alternativePositions || [])].join(', ');

    return `
      <div class="olymp-card" style="border-left: 4px solid ${tier.color}">
        <div class="olymp-rank">${medal}</div>
        <img src="${player.imageUrl}" alt="${player.name}" class="olymp-img">
        <div class="olymp-info">
          <h3>${player.name}</h3>
          <p>${allPos}</p>
          <span class="player-tier" style="color: ${tier.color}">${tier.label}</span>
        </div>
        <div class="olymp-rating" style="background: ${tier.color}">${player.rating}</div>
        <div class="player-card-actions">
          <button onclick="editPlayer('${player.id}')" class="btn-icon" title="Bearbeiten">✏️</button>
          <button onclick="deletePlayer('${player.id}')" class="btn-icon" title="Löschen">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderOlympPositions() {
  const container = document.getElementById('olympPositions');
  
  const byPosition = {};
  ALL_POSITIONS.forEach(pos => byPosition[pos] = []);
  
  players.forEach(player => {
    const allPos = [player.mainPosition, ...(player.alternativePositions || [])];
    allPos.forEach(pos => {
      if (byPosition[pos]) byPosition[pos].push(player);
    });
  });

  container.innerHTML = ALL_POSITIONS.map(pos => {
    const posPlayers = byPosition[pos].sort((a, b) => b.rating - a.rating);
    
    if (posPlayers.length === 0) return '';

    return `
      <div class="position-section">
        <h3 class="position-title">${pos}</h3>
        <div class="position-grid">
          ${posPlayers.map(player => {
            const tier = TIERS[player.tier];
            return `
              <div class="position-player-card" style="border-left: 4px solid ${tier.color}">
                <img src="${player.imageUrl}" alt="${player.name}" class="position-player-img">
                <div class="position-player-info">
                  <h4>${player.name}</h4>
                  <span class="player-rating" style="background: ${tier.color}">${player.rating}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// GITHUB SYNC
// ============================================

function setupGitHubSync() {
  document.getElementById('syncNowBtn').addEventListener('click', () => {
    if (!githubToken) {
      promptForToken();
    } else {
      manualSync();
    }
  });

  document.getElementById('resetTokenBtn').addEventListener('click', resetToken);
}

function checkGitHubToken() {
  const status = document.getElementById('syncStatus');
  if (githubToken) {
    status.innerHTML = '✅ <strong>Sync aktiv</strong>';
  } else {
    status.innerHTML = '⚠️ <strong>Sync inaktiv</strong>';
  }
}

function promptForToken() {
  const token = prompt('🔑 GitHub Personal Access Token eingeben:\n(Scope: "gist")');
  if (!token) return;

  githubToken = token.trim();
  localStorage.setItem('scheunentor_github_token', githubToken);
  checkGitHubToken();
  manualSync();
}

function resetToken() {
  if (!confirm('🗑️ Token wirklich löschen?')) return;
  
  localStorage.removeItem('scheunentor_github_token');
  localStorage.removeItem('scheunentor_gist_id');
  githubToken = '';
  gistId = '';
  checkGitHubToken();
  stopAutoSync();
}

async function manualSync() {
  const status = document.getElementById('syncStatus');
  status.innerHTML = '🔄 <strong>Synchronisiere...</strong>';

  try {
    await pushToGist();
    await pullFromGist();
    status.innerHTML = '✅ <strong>Sync erfolgreich</strong>';
    setTimeout(() => checkGitHubToken(), 2000);
  } catch (error) {
    console.error('Sync-Fehler:', error);
    status.innerHTML = '❌ <strong>Sync fehlgeschlagen</strong>';
  }
}

async function pushToGist() {
  if (!githubToken) return;

  const data = {
    players,
    squads,
    currentFormation,
    currentSquadData,
    lastModified: Date.now()
  };

  const payload = {
    description: 'Scheunentor zum Olymp - Sync Data',
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(data, null, 2)
      }
    }
  };

  const url = gistId 
    ? `https://api.github.com/gists/${gistId}`
    : 'https://api.github.com/gists';

  const method = gistId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `token ${githubToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Push fehlgeschlagen');

  const result = await response.json();
  
  if (!gistId) {
    gistId = result.id;
    localStorage.setItem('scheunentor_gist_id', gistId);
  }

  lastSyncTime = Date.now();
}

async function pullFromGist() {
  if (!githubToken || !gistId) return;

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${githubToken}`
    }
  });

  if (!response.ok) throw new Error('Pull fehlgeschlagen');

  const gist = await response.json();
  const fileContent = gist.files[GIST_FILENAME]?.content;

  if (!fileContent) return;

  const data = JSON.parse(fileContent);

  if (data.lastModified > lastSyncTime) {
    players = data.players || [];
    squads = data.squads || [];
    currentFormation = data.currentFormation || '4-3-3';
    currentSquadData = data.currentSquadData || {};

    savePlayers();
    localStorage.setItem('scheunentor_squads', JSON.stringify(squads));
    localStorage.setItem('scheunentor_formation', currentFormation);
    saveCurrentSquad();

    renderPlayers();
    renderSquadBuilder();
    renderOlymp();
    updateSlotLabels();

    lastSyncTime = data.lastModified;
  }
}

function triggerSync() {
  if (githubToken && gistId) {
    pushToGist().catch(err => console.error('Auto-Sync Fehler:', err));
  }
}

function startAutoSync() {
  if (syncIntervalId) return;
  
  syncIntervalId = setInterval(() => {
    if (githubToken && gistId) {
      pullFromGist().catch(err => console.error('Auto-Pull Fehler:', err));
    }
  }, SYNC_INTERVAL);
}

function stopAutoSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

// ============================================
// INITIAL RENDER
// ============================================

updateSlotLabels();

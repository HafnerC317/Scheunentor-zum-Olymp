// ==================== GLOBAL STATE ====================
let players = [];
let currentSquad = { formation: null, positions: {}, bench: [] };
let savedSquads = JSON.parse(localStorage.getItem('scheunentor_squads')) || [];
let editingPlayerId = null;
let selectedSlot = null;
let GIST_ID = localStorage.getItem('scheunentor_gist_id') || null;
let GITHUB_TOKEN = localStorage.getItem('scheunentor_github_token') || null;
let syncInterval = null;
let lastSyncTime = 0;

// ==================== FORMATIONS ====================
const formations = {
    '4-4-2': [['MS', 'MS'], ['LM', 'ZM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '4-3-3': [['MS'], ['LF', 'ZOM', 'RF'], ['LM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '4-2-3-1': [['MS'], ['LF', 'ZOM', 'RF'], ['ZDM', 'ZDM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '3-5-2': [['MS', 'MS'], ['LM', 'ZM', 'ZM', 'ZM', 'RM'], ['IV', 'IV', 'IV'], ['TW']],
    '5-3-2': [['MS', 'MS'], ['LM', 'ZM', 'RM'], ['LWB', 'IV', 'IV', 'IV', 'RWB'], ['TW']],
    '4-1-4-1': [['MS'], ['LM', 'ZOM', 'ZOM', 'RM'], ['ZDM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '4-3-2-1': [['MS'], ['LF', 'RF'], ['LM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '3-4-3': [['MS'], ['LF', 'RF'], ['LM', 'ZM', 'ZM', 'RM'], ['IV', 'IV', 'IV'], ['TW']],
    '4-1-2-1-2': [['MS', 'MS'], ['ZOM'], ['LM', 'RM'], ['ZDM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '4-4-1-1': [['MS'], ['ZOM'], ['LM', 'ZM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '5-4-1': [['MS'], ['LM', 'ZM', 'ZM', 'RM'], ['LWB', 'IV', 'IV', 'IV', 'RWB'], ['TW']],
    '3-4-2-1': [['MS'], ['LF', 'RF'], ['LM', 'ZM', 'ZM', 'RM'], ['IV', 'IV', 'IV'], ['TW']],
    '4-2-2-2': [['MS', 'MS'], ['LF', 'RF'], ['ZDM', 'ZDM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '3-1-4-2': [['MS', 'MS'], ['LM', 'ZOM', 'ZOM', 'RM'], ['ZDM'], ['IV', 'IV', 'IV'], ['TW']],
    '4-5-1': [['MS'], ['LM', 'ZM', 'ZM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '4-3-1-2': [['MS', 'MS'], ['ZOM'], ['LM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '5-2-3': [['LF', 'MS', 'RF'], ['ZM', 'ZM'], ['LWB', 'IV', 'IV', 'IV', 'RWB'], ['TW']],
    '3-4-1-2': [['MS', 'MS'], ['ZOM'], ['LM', 'ZM', 'ZM', 'RM'], ['IV', 'IV', 'IV'], ['TW']],
    '4-1-3-2': [['MS', 'MS'], ['LM', 'ZOM', 'RM'], ['ZDM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '5-2-1-2': [['MS', 'MS'], ['ZOM'], ['ZM', 'ZM'], ['LWB', 'IV', 'IV', 'IV', 'RWB'], ['TW']],
    '4-2-4': [['LF', 'MS', 'MS', 'RF'], ['ZM', 'ZM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '3-5-1-1': [['MS'], ['ZOM'], ['LM', 'ZM', 'ZM', 'ZM', 'RM'], ['IV', 'IV', 'IV'], ['TW']],
    '5-3-1-1': [['MS'], ['ZOM'], ['LM', 'ZM', 'RM'], ['LWB', 'IV', 'IV', 'IV', 'RWB'], ['TW']],
    '4-4-2 (2)': [['LS', 'RS'], ['LM', 'ZM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']],
    '3-4-3 (2)': [['LS', 'MS', 'RS'], ['LM', 'ZM', 'ZM', 'RM'], ['IV', 'IV', 'IV'], ['TW']],
    '4-3-3 (2)': [['LS', 'MS', 'RS'], ['LM', 'ZM', 'RM'], ['LV', 'IV', 'IV', 'RV'], ['TW']]
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadPlayers();
    initTabs();
    initAddPlayer();
    initFiltersAndSort();
    initFormationModal();
    initSquadManagement();
    initOlympTabs();
    initEditModal();
    initSync();
    renderPlayers();
    renderOlymp();
});

// ==================== GITHUB SYNC ====================
function initSync() {
    if (!GITHUB_TOKEN) {
        GITHUB_TOKEN = prompt('🔑 Gib deinen GitHub Personal Access Token ein (Scope: gist):');
        if (GITHUB_TOKEN) {
            localStorage.setItem('scheunentor_github_token', GITHUB_TOKEN);
        } else {
            alert('⚠️ Ohne Token kann nicht synchronisiert werden!');
            return;
        }
    }

    document.getElementById('syncBtn').addEventListener('click', () => manualSync());

    // Auto-Sync alle 5 Sekunden
    syncInterval = setInterval(() => autoSync(), 5000);
    
    // Initial sync
    loadFromGist();
}

async function manualSync() {
    const btn = document.getElementById('syncBtn');
    btn.classList.add('syncing');
    await saveToGist();
    await loadFromGist();
    btn.classList.remove('syncing');
}

async function autoSync() {
    const now = Date.now();
    if (now - lastSyncTime < 4000) return; // Verhindere zu häufige Syncs
    
    await saveToGist();
    await loadFromGist();
    lastSyncTime = now;
}

async function saveToGist() {
    if (!GITHUB_TOKEN) return;

    const data = {
        players: players,
        squads: savedSquads,
        currentSquad: currentSquad,
        timestamp: Date.now()
    };

    const gistData = {
        description: 'Scheunentor zum Olymp - Sync Data',
        public: false,
        files: {
            'scheunentor_data.json': {
                content: JSON.stringify(data, null, 2)
            }
        }
    };

    try {
        let response;
        if (GIST_ID) {
            response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });
        } else {
            response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (response.ok) {
                const result = await response.json();
                GIST_ID = result.id;
                localStorage.setItem('scheunentor_gist_id', GIST_ID);
            }
        }
    } catch (error) {
        console.error('Sync-Fehler:', error);
    }
}

async function loadFromGist() {
    if (!GITHUB_TOKEN || !GIST_ID) return;

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });

        if (response.ok) {
            const gist = await response.json();
            const content = gist.files['scheunentor_data.json'].content;
            const data = JSON.parse(content);

            // Last write wins
            const localTimestamp = parseInt(localStorage.getItem('scheunentor_timestamp') || '0');
            if (data.timestamp > localTimestamp) {
                players = data.players || [];
                savedSquads = data.squads || [];
                currentSquad = data.currentSquad || { formation: null, positions: {}, bench: [] };
                
                localStorage.setItem('scheunentor_players', JSON.stringify(players));
                localStorage.setItem('scheunentor_squads', JSON.stringify(savedSquads));
                localStorage.setItem('scheunentor_current_squad', JSON.stringify(currentSquad));
                localStorage.setItem('scheunentor_timestamp', data.timestamp.toString());

                renderPlayers();
                renderAvailablePlayers();
                renderOlymp();
                if (currentSquad.formation) renderField();
            }
        }
    } catch (error) {
        console.error('Load-Fehler:', error);
    }
}

// ==================== LOCAL STORAGE ====================
function loadPlayers() {
    const stored = localStorage.getItem('scheunentor_players');
    if (stored) {
        players = JSON.parse(stored);
        migrateOldPlayers();
    }

    const storedSquad = localStorage.getItem('scheunentor_current_squad');
    if (storedSquad) {
        currentSquad = JSON.parse(storedSquad);
    }
}

function savePlayers() {
    localStorage.setItem('scheunentor_players', JSON.stringify(players));
    localStorage.setItem('scheunentor_timestamp', Date.now().toString());
}

function saveCurrentSquad() {
    localStorage.setItem('scheunentor_current_squad', JSON.stringify(currentSquad));
    localStorage.setItem('scheunentor_timestamp', Date.now().toString());
}

function migrateOldPlayers() {
    players = players.map(p => {
        if (!p.alternativePositions) p.alternativePositions = [];
        if (!p.id) p.id = Date.now() + Math.random();
        return p;
    });
    savePlayers();
}

// ==================== TABS ====================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');

            if (btn.dataset.tab === 'olymp') renderOlymp();
            if (btn.dataset.tab === 'traumaufstellung') renderAvailablePlayers();
        });
    });
}

function initOlympTabs() {
    document.querySelectorAll('.olymp-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.olymp-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.olymp-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.olympTab).classList.add('active');
            renderOlymp();
        });
    });

    document.getElementById('positionFilter').addEventListener('change', renderOlymp);
}

// ==================== ADD PLAYER ====================
function initAddPlayer() {
    const nameInput = document.getElementById('playerName');
    const addBtn = document.getElementById('addPlayerBtn');
    const suggestionsDiv = document.getElementById('wikiSuggestions');

    let debounceTimer;
    nameInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = nameInput.value.trim();
        
        if (query.length < 2) {
            suggestionsDiv.classList.remove('show');
            return;
        }

        debounceTimer = setTimeout(() => fetchWikiSuggestions(query), 300);
    });

    addBtn.addEventListener('click', addPlayer);
}

async function fetchWikiSuggestions(query) {
    const suggestionsDiv = document.getElementById('wikiSuggestions');
    
    try {
        const response = await fetch(`https://de.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query + ' Fußballspieler')}&limit=5&format=json&origin=*`);
        const data = await response.json();
        
        if (data[1].length === 0) {
            suggestionsDiv.classList.remove('show');
            return;
        }

        suggestionsDiv.innerHTML = '';
        data[1].forEach((title, index) => {
            const item = document.createElement('div');
            item.className = 'wiki-item';
            item.textContent = title;
            item.addEventListener('click', () => {
                document.getElementById('playerName').value = title;
                suggestionsDiv.classList.remove('show');
            });
            suggestionsDiv.appendChild(item);
        });
        
        suggestionsDiv.classList.add('show');
    } catch (error) {
        console.error('Wiki-Fehler:', error);
    }
}

function addPlayer() {
    const name = document.getElementById('playerName').value.trim();
    const rating = parseInt(document.getElementById('playerRating').value);
    const image = document.getElementById('playerImage').value.trim();
    const position = document.getElementById('playerPosition').value;

    if (!name || isNaN(rating) || rating < 0 || rating > 99 || !position) {
        alert('⚠️ Bitte alle Pflichtfelder korrekt ausfüllen!');
        return;
    }

    const duplicate = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        alert('⚠️ Dieser Spieler existiert bereits!');
        return;
    }

    players.push({
        id: Date.now(),
        name,
        rating,
        image: image || 'https://via.placeholder.com/200x200/1a1410/D4AF37?text=?',
        position,
        alternativePositions: []
    });

    savePlayers();
    renderPlayers();
    renderAvailablePlayers();
    renderOlymp();

    document.getElementById('playerName').value = '';
    document.getElementById('playerRating').value = '';
    document.getElementById('playerImage').value = '';
    document.getElementById('playerPosition').value = '';
    document.getElementById('wikiSuggestions').classList.remove('show');
}

// ==================== RENDER PLAYERS ====================
function renderPlayers() {
    const container = document.getElementById('playersList');
    const filterTier = document.getElementById('filterTier').value;
    const sortMethod = document.getElementById('sortPlayers').value;

    let filtered = [...players];

    // Filter
    if (filterTier !== 'all') {
        filtered = filtered.filter(p => getTier(p.rating) === filterTier);
    }

    // Sort
    filtered.sort((a, b) => {
        if (sortMethod === 'rating-desc') return b.rating - a.rating;
        if (sortMethod === 'rating-asc') return a.rating - b.rating;
        if (sortMethod === 'name-asc') return a.name.localeCompare(b.name);
        if (sortMethod === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
    });

    container.innerHTML = filtered.map(player => `
        <div class="player-card ${getTier(player.rating)}">
            <img src="${player.image}" alt="${player.name}" class="player-img" onerror="this.src='https://via.placeholder.com/200x200/1a1410/D4AF37?text=?'">
            <div class="player-info">
                <h3>${player.name}</h3>
                <div class="player-position">${player.position}</div>
                ${player.alternativePositions && player.alternativePositions.length > 0 ? `
                    <div class="alt-positions">
                        ${player.alternativePositions.map(pos => `<span class="alt-pos-badge">${pos}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="player-rating">${player.rating}</div>
                <div class="player-actions">
                    <button class="edit-btn" onclick="openEditModal(${player.id})">✏️ Bearbeiten</button>
                    <button class="delete-btn" onclick="deletePlayer(${player.id})">🗑️ Löschen</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getTier(rating) {
    if (rating >= 95) return 'elite';
    if (rating >= 90) return 'gold';
    if (rating >= 85) return 'silver';
    if (rating >= 80) return 'bronze';
    return 'cl';
}

function deletePlayer(id) {
    if (!confirm('Spieler wirklich löschen?')) return;
    
    players = players.filter(p => p.id !== id);
    
    // Aus Squad entfernen
    Object.keys(currentSquad.positions).forEach(key => {
        if (currentSquad.positions[key]?.id === id) {
            delete currentSquad.positions[key];
        }
    });
    currentSquad.bench = currentSquad.bench.filter(pid => pid !== id);
    
    savePlayers();
    saveCurrentSquad();
    renderPlayers();
    renderAvailablePlayers();
    renderOlymp();
    if (currentSquad.formation) renderField();
}

function initFiltersAndSort() {
    document.getElementById('filterTier').addEventListener('change', renderPlayers);
    document.getElementById('sortPlayers').addEventListener('change', renderPlayers);
}

// ==================== EDIT MODAL ====================
function initEditModal() {
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
}

function openEditModal(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    editingPlayerId = playerId;

    document.getElementById('editPlayerName').value = player.name;
    document.getElementById('editPlayerRating').value = player.rating;
    document.getElementById('editPlayerImage').value = player.image;
    document.getElementById('editPlayerPosition').value = player.position;

    renderAltPositionsEdit(player);

    document.getElementById('editModal').classList.add('show');
}

function renderAltPositionsEdit(player) {
    const container = document.getElementById('editAltPositions');
    const allPositions = ['TW', 'IV', 'LV', 'RV', 'LWB', 'RWB', 'ZDM', 'ZM', 'LM', 'RM', 'ZOM', 'LF', 'RF', 'MS', 'LS', 'RS'];
    
    container.innerHTML = allPositions.filter(pos => pos !== player.position).map(pos => `
        <label class="alt-pos-checkbox">
            <input type="checkbox" value="${pos}" ${player.alternativePositions.includes(pos) ? 'checked' : ''}>
            ${pos}
        </label>
    `).join('');
}

function saveEdit() {
    const player = players.find(p => p.id === editingPlayerId);
    if (!player) return;

    const name = document.getElementById('editPlayerName').value.trim();
    const rating = parseInt(document.getElementById('editPlayerRating').value);
    const image = document.getElementById('editPlayerImage').value.trim();
    const position = document.getElementById('editPlayerPosition').value;

    if (!name || isNaN(rating) || rating < 0 || rating > 99 || !position) {
        alert('⚠️ Bitte alle Felder korrekt ausfüllen!');
        return;
    }

    const altPositions = Array.from(document.querySelectorAll('#editAltPositions input:checked')).map(cb => cb.value);

    player.name = name;
    player.rating = rating;
    player.image = image;
    player.position = position;
    player.alternativePositions = altPositions;

    savePlayers();
    renderPlayers();
    renderAvailablePlayers();
    renderOlymp();
    if (currentSquad.formation) renderField();
    closeEditModal();
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    editingPlayerId = null;
}

// ==================== FORMATION MODAL ====================
function initFormationModal() {
    const modal = document.getElementById('formationModal');
    const grid = document.getElementById('formationsGrid');

    document.getElementById('selectFormationBtn').addEventListener('click', () => {
        grid.innerHTML = Object.keys(formations).map(f => `
            <div class="formation-option" onclick="selectFormation('${f}')">${f}</div>
        `).join('');
        modal.classList.add('show');
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.classList.remove('show');
    });
}

function selectFormation(formationName) {
    currentSquad.formation = formationName;
    currentSquad.positions = {};
    document.getElementById('currentFormation').textContent = formationName;
    document.getElementById('formationModal').classList.remove('show');
    renderField();
    saveCurrentSquad();
}

// ==================== FIELD RENDERING ====================
function renderField() {
    const container = document.getElementById('fieldPositions');
    if (!currentSquad.formation) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-gray); padding: 50px;">Bitte zuerst Formation wählen</p>';
        return;
    }

    const formation = formations[currentSquad.formation];
    container.innerHTML = formation.map((row, rowIndex) => `
        <div class="field-row">
            ${row.map((pos, posIndex) => {
                const slotKey = `${rowIndex}-${posIndex}`;
                const player = currentSquad.positions[slotKey] ? players.find(p => p.id === currentSquad.positions[slotKey]) : null;
                
                return `
                    <div class="field-slot ${player ? 'filled' : ''}" onclick="selectSlot('${slotKey}', '${pos}')">
                        ${player ? `
                            <button class="remove-player" onclick="event.stopPropagation(); removeFromSlot('${slotKey}')">×</button>
                            <img src="${player.image}" alt="${player.name}" onerror="this.src='https://via.placeholder.com/60x60/1a1410/D4AF37?text=?'">
                            <div class="slot-name">${player.name}</div>
                            <div class="slot-rating">${player.rating}</div>
                        ` : `
                            <div class="slot-position">${pos}</div>
                        `}
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');

    renderBench();
}

function selectSlot(slotKey, requiredPosition) {
    selectedSlot = { key: slotKey, position: requiredPosition };
    highlightCompatiblePlayers(requiredPosition);
}

function highlightCompatiblePlayers(position) {
    document.querySelectorAll('.mini-player-card').forEach(card => {
        const playerId = parseInt(card.dataset.playerId);
        const player = players.find(p => p.id === playerId);
        
        if (!player) return;

        const isCompatible = player.position === position || (player.alternativePositions && player.alternativePositions.includes(position));
        
        if (isCompatible) {
            card.style.border = '3px solid var(--gold)';
        } else {
            card.style.border = '2px solid var(--glass-border)';
        }
    });
}

function removeFromSlot(slotKey) {
    delete currentSquad.positions[slotKey];
    saveCurrentSquad();
    renderField();
    renderAvailablePlayers();
}

// ==================== BENCH ====================
function renderBench() {
    const container = document.getElementById('benchGrid');
    const btn = document.getElementById('toggleBenchBtn');
    const filledCount = currentSquad.bench.length;
    
    btn.textContent = `${document.getElementById('benchArea').style.display === 'none' ? '🔽' : '🔼'} Ersatzbank ${filledCount > 0 ? 'zuklappen' : 'aufklappen'} (${filledCount}/7)`;

    container.innerHTML = Array.from({ length: 7 }).map((_, i) => {
        const playerId = currentSquad.bench[i];
        const player = playerId ? players.find(p => p.id === playerId) : null;

        return `
            <div class="bench-slot ${player ? 'filled' : ''}" onclick="selectBenchSlot(${i})">
                ${player ? `
                    <button class="remove-player" onclick="event.stopPropagation(); removeFromBench(${i})">×</button>
                    <img src="${player.image}" alt="${player.name}" onerror="this.src='https://via.placeholder.com/50x50/1a1410/D4AF37?text=?'">
                    <div class="slot-name">${player.name}</div>
                    <div class="slot-rating">${player.rating}</div>
                ` : `
                    <div class="slot-position">Slot ${i + 1}</div>
                `}
            </div>
        `;
    }).join('');
}

document.getElementById('toggleBenchBtn').addEventListener('click', () => {
    const area = document.getElementById('benchArea');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
    renderBench();
});

function selectBenchSlot(index) {
    selectedSlot = { benchIndex: index };
}

function removeFromBench(index) {
    currentSquad.bench.splice(index, 1);
    saveCurrentSquad();
    renderField();
    renderAvailablePlayers();
}

// ==================== AVAILABLE PLAYERS ====================
function renderAvailablePlayers() {
    const container = document.getElementById('availablePlayersList');
    const searchTerm = document.getElementById('searchSquadPlayers').value.toLowerCase();

    const usedIds = [
        ...Object.values(currentSquad.positions),
        ...currentSquad.bench
    ];

    const available = players.filter(p => 
        !usedIds.includes(p.id) && p.name.toLowerCase().includes(searchTerm)
    );

    container.innerHTML = available.map(player => `
        <div class="mini-player-card" data-player-id="${player.id}" onclick="addPlayerToSlot(${player.id})">
            <img src="${player.image}" alt="${player.name}" onerror="this.src='https://via.placeholder.com/70x70/1a1410/D4AF37?text=?'">
            <div class="name">${player.name}</div>
            <div class="rating">${player.rating}</div>
            <div style="font-size: 0.75rem; color: var(--text-gray); margin-top: 3px;">${player.position}</div>
        </div>
    `).join('');
}

document.getElementById('searchSquadPlayers').addEventListener('input', renderAvailablePlayers);

function addPlayerToSlot(playerId) {
    if (!selectedSlot) {
        alert('⚠️ Bitte zuerst einen Slot auf dem Feld oder der Bank auswählen!');
        return;
    }

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // Field slot
    if (selectedSlot.key) {
        const isCompatible = player.position === selectedSlot.position || 
                           (player.alternativePositions && player.alternativePositions.includes(selectedSlot.position));
        
        if (!isCompatible) {
            alert(`⚠️ ${player.name} kann nicht auf Position ${selectedSlot.position} spielen!`);
            return;
        }

        currentSquad.positions[selectedSlot.key] = playerId;
    }
    // Bench slot
    else if (selectedSlot.benchIndex !== undefined) {
        currentSquad.bench[selectedSlot.benchIndex] = playerId;
    }

    selectedSlot = null;
    saveCurrentSquad();
    renderField();
    renderAvailablePlayers();
}

// ==================== SQUAD MANAGEMENT ====================
function initSquadManagement() {
    document.getElementById('saveSquadBtn').addEventListener('click', openSaveSquadModal);
    document.getElementById('loadSquadBtn').addEventListener('click', openLoadSquadModal);
    document.getElementById('clearSquadBtn').addEventListener('click', clearSquad);
    document.getElementById('closeSquadModalBtn').addEventListener('click', closeSquadModal);
}

function openSaveSquadModal() {
    if (!currentSquad.formation) {
        alert('⚠️ Keine Aufstellung zum Speichern vorhanden!');
        return;
    }

    document.getElementById('squadModalTitle').textContent = 'Aufstellung speichern';
    const container = document.getElementById('squadSlots');

    container.innerHTML = Array.from({ length: 5 }).map((_, i) => {
        const squad = savedSquads[i];
        return `
            <div class="squad-slot ${squad ? 'filled' : ''}" onclick="saveToSlot(${i})">
                <h3>Slot ${i + 1}</h3>
                ${squad ? `<p>${squad.formation} (${Object.keys(squad.positions).length + squad.bench.length} Spieler)</p>` : '<p>Leer</p>'}
            </div>
        `;
    }).join('');

    document.getElementById('squadModal').classList.add('show');
}

function saveToSlot(index) {
    savedSquads[index] = JSON.parse(JSON.stringify(currentSquad));
    localStorage.setItem('scheunentor_squads', JSON.stringify(savedSquads));
    alert('✅ Aufstellung gespeichert!');
    closeSquadModal();
}

function openLoadSquadModal() {
    document.getElementById('squadModalTitle').textContent = 'Aufstellung laden';
    const container = document.getElementById('squadSlots');

    container.innerHTML = Array.from({ length: 5 }).map((_, i) => {
        const squad = savedSquads[i];
        return `
            <div class="squad-slot ${squad ? 'filled' : ''}" onclick="loadFromSlot(${i})">
                <h3>Slot ${i + 1}</h3>
                ${squad ? `
                    <p>${squad.formation}</p>
                    <p>${Object.keys(squad.positions).length + squad.bench.length} Spieler</p>
                ` : '<p>Leer</p>'}
            </div>
        `;
    }).join('');

    document.getElementById('squadModal').classList.add('show');
}

function loadFromSlot(index) {
    const squad = savedSquads[index];
    if (!squad) {
        alert('⚠️ Dieser Slot ist leer!');
        return;
    }

    currentSquad = JSON.parse(JSON.stringify(squad));
    document.getElementById('currentFormation').textContent = currentSquad.formation;
    saveCurrentSquad();
    renderField();
    renderAvailablePlayers();
    alert('✅ Aufstellung geladen!');
    closeSquadModal();
}

function clearSquad() {
    if (!confirm('Aktuelle Aufstellung wirklich löschen?')) return;
    
    currentSquad = { formation: null, positions: {}, bench: [] };
    document.getElementById('currentFormation').textContent = 'Keine Formation gewählt';
    saveCurrentSquad();
    renderField();
    renderAvailablePlayers();
}

function closeSquadModal() {
    document.getElementById('squadModal').classList.remove('show');
}

// ==================== OLYMP ====================
function renderOlymp() {
    const activeTab = document.querySelector('.olymp-tab-btn.active').dataset.olympTab;

    if (activeTab === 'ranking') {
        renderRanking();
    } else {
        renderByPosition();
    }
}

function renderRanking() {
    const container = document.getElementById('rankingList');
    const sorted = [...players].sort((a, b) => b.rating - a.rating);

    container.innerHTML = sorted.map((player, index) => `
        <div class="olymp-player ${getTier(player.rating)}">
            <div class="olymp-rank">#${index + 1}</div>
            <img src="${player.image}" alt="${player.name}" onerror="this.src='https://via.placeholder.com/80x80/1a1410/D4AF37?text=?'">
            <div class="olymp-info">
                <h3>${player.name}</h3>
                <div class="position">${player.position}</div>
            </div>
            <div class="olymp-rating">${player.rating}</div>
            <div class="olymp-actions">
                <button class="edit-btn" onclick="openEditModal(${player.id})">✏️</button>
                <button class="delete-btn" onclick="deletePlayer(${player.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderByPosition() {
    const container = document.getElementById('positionList');
    const selectedPos = document.getElementById('positionFilter').value;

    let filtered = selectedPos === 'all' ? [...players] : players.filter(p => p.position === selectedPos);
    filtered.sort((a, b) => b.rating - a.rating);

    container.innerHTML = filtered.map((player, index) => `
        <div class="olymp-player ${getTier(player.rating)}">
            <div class="olymp-rank">#${index + 1}</div>
            <img src="${player.image}" alt="${player.name}" onerror="this.src='https://via.placeholder.com/80x80/1a1410/D4AF37?text=?'">
            <div class="olymp-info">
                <h3>${player.name}</h3>
                <div class="position">${player.position}</div>
            </div>
            <div class="olymp-rating">${player.rating}</div>
            <div class="olymp-actions">
                <button class="edit-btn" onclick="openEditModal(${player.id})">✏️</button>
                <button class="delete-btn" onclick="deletePlayer(${player.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ========================================
// GITHUB GIST SYNC CONFIGURATION (SECURE)
// ========================================
const GIST_ID_KEY = 'scheunentor_gist_id';
const TOKEN_KEY = 'scheunentor_github_token';

let GIST_ID = localStorage.getItem(GIST_ID_KEY) || null;
let GITHUB_TOKEN = localStorage.getItem(TOKEN_KEY) || null;

// Token-Setup beim ersten Start
if (!GITHUB_TOKEN) {
    const token = prompt('🔐 GitHub Token eingeben (nur einmal!):\n\nGehe zu https://github.com/settings/tokens\nErstelle einen Token mit "gist" Berechtigung');
    if (token && token.trim()) {
        GITHUB_TOKEN = token.trim();
        localStorage.setItem(TOKEN_KEY, GITHUB_TOKEN);
        alert('✅ Token gespeichert! Die Synchronisation ist jetzt aktiv.');
    } else {
        alert('⚠️ Kein Token eingegeben. Synchronisation deaktiviert.');
    }
}

let syncInterval = null;
let isSyncing = false;

// ========================================
// DATA MIGRATION
// ========================================
function migrateOldPlayers() {
    const players = getPlayers();
    let updated = false;
    players.forEach(player => {
        if (!player.altPositions) {
            player.altPositions = [];
            updated = true;
        }
        if (!player.wikiLink) {
            player.wikiLink = '';
            updated = true;
        }
    });
    if (updated) {
        localStorage.setItem('players', JSON.stringify(players));
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function getPlayers() {
    const data = localStorage.getItem('players');
    return data ? JSON.parse(data) : [];
}

function savePlayers(players) {
    localStorage.setItem('players', JSON.stringify(players));
}

function getTier(rating) {
    if (rating >= 95) return { name: 'Elite', class: 'tier-elite', color: '#9b59b6' };
    if (rating >= 90) return { name: 'Gold', class: 'tier-gold', color: '#D4AF37' };
    if (rating >= 85) return { name: 'Silber', class: 'tier-silver', color: '#C0C0C0' };
    if (rating >= 80) return { name: 'Bronze', class: 'tier-bronze', color: '#CD7F32' };
    return { name: 'Champions League', class: 'tier-champions', color: '#003B7A' };
}

async function fetchWikipediaLink(playerName) {
    try {
        const url = `https://de.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(playerName)}&limit=1&format=json&origin=*`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data[3] && data[3][0]) {
            return data[3][0];
        }
    } catch (error) {
        console.error('Wikipedia Fehler:', error);
    }
    return '';
}

// ========================================
// GITHUB GIST SYNC
// ========================================
async function syncToGist() {
    if (!GITHUB_TOKEN || isSyncing) return;
    
    isSyncing = true;
    
    try {
        const syncData = {
            players: getPlayers(),
            savedSquads: JSON.parse(localStorage.getItem('savedSquads') || '[]'),
            currentSquad: JSON.parse(localStorage.getItem('currentSquad') || '{}'),
            currentFormation: localStorage.getItem('currentFormation') || '4-3-3',
            benchPlayers: JSON.parse(localStorage.getItem('benchPlayers') || '[]')
        };

        if (!GIST_ID) {
            // Erstelle neuen Gist
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: 'Scheunentor zum Olymp - Sync Data',
                    public: false,
                    files: {
                        'scheunentor-data.json': {
                            content: JSON.stringify(syncData, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gist erstellen fehlgeschlagen: ${response.status}`);
            }

            const gist = await response.json();
            GIST_ID = gist.id;
            localStorage.setItem(GIST_ID_KEY, GIST_ID);
            console.log('✅ Neuer Gist erstellt:', GIST_ID);
        } else {
            // Lade Remote-Daten und überschreibe lokal
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            });

            if (!response.ok) {
                throw new Error(`Gist laden fehlgeschlagen: ${response.status}`);
            }

            const gist = await response.json();
            const remoteContent = gist.files['scheunentor-data.json']?.content;

            if (remoteContent) {
                const remoteData = JSON.parse(remoteContent);
                
                // Überschreibe lokal mit Remote-Daten
                localStorage.setItem('players', JSON.stringify(remoteData.players || []));
                localStorage.setItem('savedSquads', JSON.stringify(remoteData.savedSquads || []));
                localStorage.setItem('currentSquad', JSON.stringify(remoteData.currentSquad || {}));
                localStorage.setItem('currentFormation', remoteData.currentFormation || '4-3-3');
                localStorage.setItem('benchPlayers', JSON.stringify(remoteData.benchPlayers || []));

                // UI neu laden
                renderPlayers();
                renderSquad();
                renderBench();
                renderOlymp();
            }

            // Update Gist mit aktuellen lokalen Daten
            const updateResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'scheunentor-data.json': {
                            content: JSON.stringify(syncData, null, 2)
                        }
                    }
                })
            });

            if (!updateResponse.ok) {
                throw new Error(`Gist update fehlgeschlagen: ${updateResponse.status}`);
            }
        }
    } catch (error) {
        console.error('❌ Sync Fehler:', error);
    } finally {
        isSyncing = false;
    }
}

function startSync() {
    if (!GITHUB_TOKEN) return;
    
    // Initiale Sync nach 1 Sekunde
    setTimeout(() => syncToGist(), 1000);
    
    // Dann alle 5 Sekunden
    syncInterval = setInterval(() => syncToGist(), 5000);
}

// ========================================
// TAB SYSTEM
// ========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

document.querySelectorAll('.olymp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.olymp;
        
        document.querySelectorAll('.olymp-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.olymp-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// ========================================
// SPIELER HINZUFÜGEN
// ========================================
document.getElementById('addPlayerBtn').addEventListener('click', async () => {
    const name = document.getElementById('playerName').value.trim();
    const rating = parseInt(document.getElementById('playerRating').value);
    const position = document.getElementById('playerPosition').value;
    const imageUrl = document.getElementById('playerImage').value.trim();

    if (!name || isNaN(rating) || rating < 0 || rating > 99 || !position) {
        alert('⚠️ Bitte alle Felder korrekt ausfüllen!');
        return;
    }

    const players = getPlayers();
    
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('⚠️ Ein Spieler mit diesem Namen existiert bereits!');
        return;
    }

    const wikiLink = await fetchWikipediaLink(name);

    const newPlayer = {
        id: Date.now(),
        name,
        rating,
        position,
        imageUrl: imageUrl || 'https://via.placeholder.com/80',
        altPositions: [],
        wikiLink
    };

    players.push(newPlayer);
    savePlayers(players);
    renderPlayers();
    renderOlymp();

    document.getElementById('playerName').value = '';
    document.getElementById('playerRating').value = '';
    document.getElementById('playerPosition').value = '';
    document.getElementById('playerImage').value = '';

    alert('✅ Spieler hinzugefügt!');
});

// ========================================
// SPIELER RENDERN
// ========================================
function renderPlayers() {
    const players = getPlayers();
    const searchTerm = document.getElementById('searchPlayer').value.toLowerCase();
    const filterTier = document.getElementById('filterTier').value;
    const filterPosition = document.getElementById('filterPosition').value;

    let filtered = players.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm);
        const matchTier = !filterTier || getTier(p.rating).name === filterTier;
        const matchPosition = !filterPosition || p.position === filterPosition || p.altPositions.includes(filterPosition);
        return matchSearch && matchTier && matchPosition;
    });

    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';

    filtered.forEach(player => {
        const tier = getTier(player.rating);
        const card = document.createElement('div');
        card.className = `player-card ${tier.class}`;
        card.innerHTML = `
            <div class="player-card-header">
                <img src="${player.imageUrl}" alt="${player.name}" class="player-card-image" onerror="this.src='https://via.placeholder.com/80'">
                <div class="player-card-info">
                    <h3>${player.name}</h3>
                    <p>${player.position}${player.altPositions.length > 0 ? ' | ' + player.altPositions.join(', ') : ''}</p>
                </div>
            </div>
            <div class="player-rating" style="color: ${tier.color}">${player.rating}</div>
            <span class="tier-badge">${tier.name}</span>
            <div class="player-card-actions">
                <button class="btn-edit" onclick="editPlayer(${player.id})">Bearbeiten</button>
                <button class="btn-delete" onclick="deletePlayer(${player.id})">Löschen</button>
                <button class="btn-alt-positions" onclick="openAltPositions(${player.id})">Alt. Positionen</button>
            </div>
        `;
        playerList.appendChild(card);
    });
}

function editPlayer(id) {
    const players = getPlayers();
    const player = players.find(p => p.id === id);
    if (!player) return;

    const newName = prompt('Neuer Name:', player.name);
    const newRating = parseInt(prompt('Neues Rating (0-99):', player.rating));
    const newPosition = prompt('Neue Position:', player.position);
    const newImage = prompt('Neue Bild-URL:', player.imageUrl);

    if (newName && !isNaN(newRating) && newRating >= 0 && newRating <= 99 && newPosition) {
        player.name = newName.trim();
        player.rating = newRating;
        player.position = newPosition;
        player.imageUrl = newImage.trim() || player.imageUrl;

        savePlayers(players);
        renderPlayers();
        renderOlymp();
        alert('✅ Spieler aktualisiert!');
    } else {
        alert('⚠️ Ungültige Eingabe!');
    }
}

function deletePlayer(id) {
    if (!confirm('❌ Spieler wirklich löschen?')) return;

    let players = getPlayers();
    players = players.filter(p => p.id !== id);
    savePlayers(players);
    renderPlayers();
    renderOlymp();
    alert('✅ Spieler gelöscht!');
}

function openAltPositions(id) {
    const players = getPlayers();
    const player = players.find(p => p.id === id);
    if (!player) return;

    const modal = document.getElementById('altPositionModal');
    const grid = document.getElementById('altPositionCheckboxes');
    grid.innerHTML = '';

    const allPositions = ['TW', 'LV', 'IV', 'RV', 'ZDM', 'ZM', 'ZOM', 'LM', 'RM', 'LF', 'ST', 'RF', 'MS', 'LS', 'RS'];

    allPositions.forEach(pos => {
        const item = document.createElement('div');
        item.className = 'alt-position-item';
        const checked = player.altPositions.includes(pos) ? 'checked' : '';
        item.innerHTML = `
            <input type="checkbox" id="alt-${pos}" value="${pos}" ${checked}>
            <label for="alt-${pos}">${pos}</label>
        `;
        grid.appendChild(item);
    });

    modal.classList.add('active');

    document.getElementById('saveAltPositionsBtn').onclick = () => {
        const selected = Array.from(grid.querySelectorAll('input:checked')).map(cb => cb.value);
        player.altPositions = selected;
        savePlayers(players);
        renderPlayers();
        modal.classList.remove('active');
        alert('✅ Alternative Positionen gespeichert!');
    };

    document.getElementById('closeAltModalBtn').onclick = () => {
        modal.classList.remove('active');
    };
}

// ========================================
// FILTER
// ========================================
document.getElementById('searchPlayer').addEventListener('input', renderPlayers);
document.getElementById('filterTier').addEventListener('change', renderPlayers);
document.getElementById('filterPosition').addEventListener('change', renderPlayers);

// ========================================
// TRAUMAUFSTELLUNG
// ========================================
const formations = {
    '4-3-3': [
        ['ST'],
        ['LF', 'RF'],
        ['ZM', 'ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-4-2': [
        ['ST', 'ST'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-2-3-1': [
        ['ST'],
        ['LF', 'ZOM', 'RF'],
        ['ZDM', 'ZDM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '3-5-2': [
        ['ST', 'ST'],
        ['LM', 'ZM', 'ZM', 'ZM', 'RM'],
        ['IV', 'IV', 'IV'],
        ['TW']
    ],
    '3-4-3': [
        ['LF', 'ST', 'RF'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['IV', 'IV', 'IV'],
        ['TW']
    ],
    '5-3-2': [
        ['ST', 'ST'],
        ['ZM', 'ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-1-2-1-2': [
        ['ST', 'ST'],
        ['ZOM'],
        ['ZM', 'ZM'],
        ['ZDM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-3-2-1': [
        ['ST'],
        ['LF', 'RF'],
        ['ZM', 'ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-3-1-2': [
        ['ST', 'ST'],
        ['ZOM'],
        ['ZM', 'ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-5-1': [
        ['ST'],
        ['LM', 'ZM', 'ZM', 'ZM', 'RM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '3-4-2-1': [
        ['ST'],
        ['LF', 'RF'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['IV', 'IV', 'IV'],
        ['TW']
    ],
    '5-4-1': [
        ['ST'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['LV', 'IV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-1-4-1': [
        ['ST'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['ZDM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-4-1-1': [
        ['ST'],
        ['ZOM'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '3-5-1-1': [
        ['ST'],
        ['ZOM'],
        ['LM', 'ZM', 'ZM', 'ZM', 'RM'],
        ['IV', 'IV', 'IV'],
        ['TW']
    ],
    '3-1-4-2': [
        ['ST', 'ST'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['ZDM'],
        ['IV', 'IV', 'IV'],
        ['TW']
    ],
    '5-2-3': [
        ['LF', 'ST', 'RF'],
        ['ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-2-2-2': [
        ['ST', 'ST'],
        ['LF', 'RF'],
        ['ZDM', 'ZDM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '3-4-1-2': [
        ['ST', 'ST'],
        ['ZOM'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['IV', 'IV', 'IV'],
        ['TW']
    ],
    '5-2-1-2': [
        ['ST', 'ST'],
        ['ZOM'],
        ['ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-3-3-Attack': [
        ['LF', 'ST', 'RF'],
        ['ZM', 'ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-3-3-Defend': [
        ['LF', 'ST', 'RF'],
        ['ZM', 'ZDM', 'ZM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-2-3-1-Wide': [
        ['ST'],
        ['LM', 'ZOM', 'RM'],
        ['ZDM', 'ZDM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '4-1-2-1-2-Wide': [
        ['ST', 'ST'],
        ['ZOM'],
        ['LM', 'RM'],
        ['ZDM'],
        ['LV', 'IV', 'IV', 'RV'],
        ['TW']
    ],
    '3-4-3-Flat': [
        ['LF', 'ST', 'RF'],
        ['LM', 'ZM', 'ZM', 'RM'],
        ['IV', 'IV', 'IV'],
        ['TW']
    ],
    '5-3-2-Flat': [
        ['ST', 'ST'],
        ['ZM', 'ZM', 'ZM'],
        ['LV', 'IV', 'IV', 'IV', 'RV'],
        ['TW']
    ]
};

let currentSquad = JSON.parse(localStorage.getItem('currentSquad') || '{}');
let currentFormation = localStorage.getItem('currentFormation') || '4-3-3';
let benchPlayers = JSON.parse(localStorage.getItem('benchPlayers') || '[]');
let activeSlot = null;

document.getElementById('formationSelect').value = currentFormation;

document.getElementById('formationSelect').addEventListener('change', (e) => {
    currentFormation = e.target.value;
    localStorage.setItem('currentFormation', currentFormation);
    currentSquad = {};
    localStorage.setItem('currentSquad', JSON.stringify(currentSquad));
    renderSquad();
});

function renderSquad() {
    const field = document.getElementById('squadField');
    field.innerHTML = '';

    const structure = formations[currentFormation];
    let slotIndex = 0;

    structure.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'squad-row';

        row.forEach(position => {
            const slot = document.createElement('div');
            slot.className = 'squad-slot';
            slot.dataset.index = slotIndex;
            slot.dataset.position = position;

            const player = currentSquad[slotIndex];

            if (player) {
                slot.classList.add('filled');
                const tier = getTier(player.rating);
                slot.innerHTML = `
                    <img src="${player.imageUrl}" class="squad-slot-image" onerror="this.src='https://via.placeholder.com/60'">
                    <div class="squad-slot-name">${player.name}</div>
                    <div class="squad-slot-rating" style="color: ${tier.color}">${player.rating}</div>
                    <div class="squad-slot-actions">
                        <button class="btn-change" onclick="changePlayer(${slotIndex})">Wechseln</button>
                        <button class="btn-remove" onclick="removePlayer(${slotIndex})">Entfernen</button>
                    </div>
                `;
            } else {
                slot.innerHTML = `
                    <div class="squad-slot-position">${position}</div>
                    <div style="font-size: 0.8rem; color: #888; margin: 10px 0;">Leer</div>
                    <div class="squad-slot-actions">
                        <button class="btn-change" onclick="changePlayer(${slotIndex})">Wählen</button>
                    </div>
                `;
            }

            rowDiv.appendChild(slot);
            slotIndex++;
        });

        field.appendChild(rowDiv);
    });
}

function changePlayer(slotIndex) {
    activeSlot = slotIndex;
    openPlayerSelectModal();
}

function removePlayer(slotIndex) {
    delete currentSquad[slotIndex];
    localStorage.setItem('currentSquad', JSON.stringify(currentSquad));
    renderSquad();
}

function openPlayerSelectModal() {
    const modal = document.getElementById('playerSelectModal');
    const list = document.getElementById('modalPlayerList');
    list.innerHTML = '';

    const slotPosition = document.querySelector(`[data-index="${activeSlot}"]`).dataset.position;
    const players = getPlayers();

    const usedPlayerIds = Object.values(currentSquad).map(p => p.id);
    const usedBenchIds = benchPlayers.map(p => p.id);
    const allUsedIds = [...usedPlayerIds, ...usedBenchIds];

    const available = players.filter(p => 
        !allUsedIds.includes(p.id) && 
        (p.position === slotPosition || p.altPositions.includes(slotPosition))
    );

    if (available.length === 0) {
        list.innerHTML = '<p style="color: #888;">Keine passenden Spieler verfügbar.</p>';
    } else {
        available.forEach(player => {
            const tier = getTier(player.rating);
            const item = document.createElement('div');
            item.className = 'modal-player-item';
            item.innerHTML = `
                <img src="${player.imageUrl}" onerror="this.src='https://via.placeholder.com/40'">
                <div class="modal-player-item-info">
                    <h4>${player.name}</h4>
                    <p>${player.position}${player.altPositions.length > 0 ? ' | ' + player.altPositions.join(', ') : ''}</p>
                </div>
                <div class="modal-player-item-rating" style="color: ${tier.color}">${player.rating}</div>
            `;
            item.addEventListener('click', () => selectPlayerForSlot(player));
            list.appendChild(item);
        });
    }

    modal.classList.add('active');
}

function selectPlayerForSlot(player) {
    currentSquad[activeSlot] = player;
    localStorage.setItem('currentSquad', JSON.stringify(currentSquad));
    renderSquad();
    document.getElementById('playerSelectModal').classList.remove('active');
}

document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('playerSelectModal').classList.remove('active');
});

document.getElementById('modalSearchPlayer').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.modal-player-item');
    items.forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        item.style.display = name.includes(searchTerm) ? 'flex' : 'none';
    });
});

// ========================================
// ERSATZBANK
// ========================================
function renderBench() {
    const benchSlots = document.getElementById('benchSlots');
    benchSlots.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const slot = document.createElement('div');
        slot.className = 'squad-slot';
        slot.dataset.benchindex = i;

        const player = benchPlayers[i];

        if (player) {
            slot.classList.add('filled');
            const tier = getTier(player.rating);
            slot.innerHTML = `
                <img src="${player.imageUrl}" class="squad-slot-image" onerror="this.src='https://via.placeholder.com/60'">
                <div class="squad-slot-name">${player.name}</div>
                <div class="squad-slot-rating" style="color: ${tier.color}">${player.rating}</div>
                <div class="squad-slot-position">${player.position}</div>
                <div class="squad-slot-actions">
                    <button class="btn-change" onclick="changeBenchPlayer(${i})">Wechseln</button>
                    <button class="btn-remove" onclick="removeBenchPlayer(${i})">Entfernen</button>
                </div>
            `;
        } else {
            slot.innerHTML = `
                <div style="font-size: 0.8rem; color: #888; margin: 10px 0;">Leer</div>
                <div class="squad-slot-actions">
                    <button class="btn-change" onclick="changeBenchPlayer(${i})">Wählen</button>
                </div>
            `;
        }

        benchSlots.appendChild(slot);
    }
}

function changeBenchPlayer(index) {
    activeSlot = `bench-${index}`;
    openBenchSelectModal(index);
}

function removeBenchPlayer(index) {
    benchPlayers[index] = null;
    benchPlayers = benchPlayers.filter((p, i) => i !== index || p !== null);
    while (benchPlayers.length < 7) benchPlayers.push(null);
    localStorage.setItem('benchPlayers', JSON.stringify(benchPlayers));
    renderBench();
}

function openBenchSelectModal(index) {
    const modal = document.getElementById('playerSelectModal');
    const list = document.getElementById('modalPlayerList');
    list.innerHTML = '';

    const players = getPlayers();
    const usedPlayerIds = Object.values(currentSquad).map(p => p.id);
    const usedBenchIds = benchPlayers.filter(p => p).map(p => p.id);
    const allUsedIds = [...usedPlayerIds, ...usedBenchIds];

    const available = players.filter(p => !allUsedIds.includes(p.id));

    if (available.length === 0) {
        list.innerHTML = '<p style="color: #888;">Keine Spieler verfügbar.</p>';
    } else {
        available.forEach(player => {
            const tier = getTier(player.rating);
            const item = document.createElement('div');
            item.className = 'modal-player-item';
            item.innerHTML = `
                <img src="${player.imageUrl}" onerror="this.src='https://via.placeholder.com/40'">
                <div class="modal-player-item-info">
                    <h4>${player.name}</h4>
                    <p>${player.position}${player.altPositions.length > 0 ? ' | ' + player.altPositions.join(', ') : ''}</p>
                </div>
                <div class="modal-player-item-rating" style="color: ${tier.color}">${player.rating}</div>
            `;
            item.addEventListener('click', () => selectBenchPlayer(player, index));
            list.appendChild(item);
        });
    }

    modal.classList.add('active');
}

function selectBenchPlayer(player, index) {
    benchPlayers[index] = player;
    localStorage.setItem('benchPlayers', JSON.stringify(benchPlayers));
    renderBench();
    document.getElementById('playerSelectModal').classList.remove('active');
}

document.getElementById('toggleBench').addEventListener('click', () => {
    const bench = document.getElementById('benchSlots');
    const btn = document.getElementById('toggleBench');
    if (bench.style.display === 'none') {
        bench.style.display = 'grid';
        btn.textContent = 'Ersatzbank einklappen ▲';
    } else {
        bench.style.display = 'none';
        btn.textContent = 'Ersatzbank aufklappen ▼';
    }
});

// ========================================
// AUFSTELLUNG SPEICHERN/LADEN
// ========================================
document.getElementById('saveSquadBtn').addEventListener('click', () => {
    const name = prompt('Name für die Aufstellung:');
    if (!name) return;

    const savedSquads = JSON.parse(localStorage.getItem('savedSquads') || '[]');
    savedSquads.push({
        name,
        formation: currentFormation,
        squad: currentSquad,
        bench: benchPlayers,
        timestamp: Date.now()
    });

    localStorage.setItem('savedSquads', JSON.stringify(savedSquads));
    alert('✅ Aufstellung gespeichert!');
});

document.getElementById('loadSquadBtn').addEventListener('click', () => {
    const savedSquads = JSON.parse(localStorage.getItem('savedSquads') || '[]');
    if (savedSquads.length === 0) {
        alert('⚠️ Keine gespeicherten Aufstellungen vorhanden.');
        return;
    }

    let choice = 'Gespeicherte Aufstellungen:\n\n';
    savedSquads.forEach((sq, i) => {
        choice += `${i + 1}. ${sq.name} (${sq.formation})\n`;
    });
    choice += '\nNummer eingeben zum Laden, oder "L" zum Löschen:';

    const input = prompt(choice);
    if (!input) return;

    if (input.toUpperCase() === 'L') {
        const delIndex = parseInt(prompt('Welche Aufstellung löschen? (Nummer):')) - 1;
        if (delIndex >= 0 && delIndex < savedSquads.length) {
            savedSquads.splice(delIndex, 1);
            localStorage.setItem('savedSquads', JSON.stringify(savedSquads));
            alert('✅ Aufstellung gelöscht!');
        }
        return;
    }

    const index = parseInt(input) - 1;
    if (index >= 0 && index < savedSquads.length) {
        const loaded = savedSquads[index];
        currentFormation = loaded.formation;
        currentSquad = loaded.squad;
        benchPlayers = loaded.bench || [];
        
        localStorage.setItem('currentFormation', currentFormation);
        localStorage.setItem('currentSquad', JSON.stringify(currentSquad));
        localStorage.setItem('benchPlayers', JSON.stringify(benchPlayers));
        
        document.getElementById('formationSelect').value = currentFormation;
        renderSquad();
        renderBench();
        alert('✅ Aufstellung geladen!');
    } else {
        alert('⚠️ Ungültige Eingabe!');
    }
});

// ========================================
// DIE GÖTTER DES FUßBALLS
// ========================================
function renderOlymp() {
    renderRanking();
    renderPosition();
}

function renderRanking() {
    const players = getPlayers().sort((a, b) => b.rating - a.rating);
    const list = document.getElementById('rankingList');
    list.innerHTML = '';

    players.forEach((player, index) => {
        const tier = getTier(player.rating);
        const item = document.createElement('div');
        item.className = `olymp-player-item ${tier.class}`;
        item.innerHTML = `
            <div style="font-size: 1.5rem; font-weight: bold; color: #D4AF37; min-width: 40px;">#${index + 1}</div>
            <img src="${player.imageUrl}" onerror="this.src='https://via.placeholder.com/50'">
            <div class="olymp-player-info">
                <h4>${player.wikiLink ? `<a href="${player.wikiLink}" target="_blank">${player.name}</a>` : player.name}</h4>
                <p>${player.position}${player.altPositions.length > 0 ? ' | ' + player.altPositions.join(', ') : ''} • ${tier.name}</p>
            </div>
            <div class="olymp-player-rating" style="color: ${tier.color}">${player.rating}</div>
        `;
        list.appendChild(item);
    });
}

function renderPosition() {
    const players = getPlayers();
    const list = document.getElementById('positionList');
    list.innerHTML = '';

    const positions = ['TW', 'LV', 'IV', 'RV', 'ZDM', 'ZM', 'ZOM', 'LM', 'RM', 'LF', 'ST', 'RF', 'MS', 'LS', 'RS'];

    positions.forEach(pos => {
        const posPlayers = players.filter(p => p.position === pos || p.altPositions.includes(pos))
                                   .sort((a, b) => b.rating - a.rating);

        if (posPlayers.length === 0) return;

        const group = document.createElement('div');
        group.className = 'position-group';
        group.innerHTML = `<h3>${pos}</h3>`;

        posPlayers.forEach((player, index) => {
            const tier = getTier(player.rating);
            const item = document.createElement('div');
            item.className = `olymp-player-item ${tier.class}`;
            item.innerHTML = `
                <div style="font-size: 1.2rem; font-weight: bold; color: #D4AF37; min-width: 35px;">#${index + 1}</div>
                <img src="${player.imageUrl}" onerror="this.src='https://via.placeholder.com/50'">
                <div class="olymp-player-info">
                    <h4>${player.wikiLink ? `<a href="${player.wikiLink}" target="_blank">${player.name}</a>` : player.name}</h4>
                    <p>${player.position}${player.altPositions.length > 0 ? ' | ' + player.altPositions.join(', ') : ''} • ${tier.name}</p>
                </div>
                <div class="olymp-player-rating" style="color: ${tier.color}">${player.rating}</div>
            `;
            group.appendChild(item);
        });

        list.appendChild(group);
    });
}

// ========================================
// INIT
// ========================================
migrateOldPlayers();
renderPlayers();
renderSquad();
renderBench();
renderOlymp();
startSync();

// 10人2ブロック制の予想ツール本体。
const blockDefinitions = [
    {
        id: 'block-a',
        title: 'Aブロック',
        className: 'red-title',
        players: Array.from({ length: 10 }, (_, index) => ({ id: `a${index + 1}`, name: `A-${index + 1}` }))
    },
    {
        id: 'block-b',
        title: 'Bブロック',
        className: 'blue-title',
        players: Array.from({ length: 10 }, (_, index) => ({ id: `b${index + 1}`, name: `B-${index + 1}` }))
    }
];

const blocks = blockDefinitions.map(block => block.id);
let confirmedResults = {};
let predictedResults = {};
let matchResults = {};
let finalResult = null;

function getBlock(blockId) {
    return blockDefinitions.find(block => block.id === blockId);
}

function getPlayer(blockId, playerId) {
    return getBlock(blockId).players.find(player => player.id === playerId);
}

function getMatchKey(blockId, player1Id, player2Id) {
    return `${blockId}-${player1Id}-${player2Id}`;
}

function getReverseKey(blockId, player1Id, player2Id) {
    return `${blockId}-${player2Id}-${player1Id}`;
}

function getResultIcon(result) {
    switch (result) {
        case 'win': return '<i class="fa-regular fa-circle"></i>';
        case 'draw': return '<i class="fa-solid fa-caret-up"></i>';
        case 'lose': return '<i class="fa-solid fa-xmark"></i>';
        default: return '';
    }
}

function mergeResults() {
    matchResults = { ...predictedResults, ...confirmedResults };
}

async function loadConfirmedResults() {
    try {
        const response = await fetch('result.json', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        applyImportedPlayers(data.players);
        confirmedResults = normalizeImportedData(data.confirmed || data.results || data);
        finalResult = data.finalResult || finalResult;
        mergeResults();
    } catch (error) {
        console.log('result.jsonの読み込みに失敗しました:', error.message);
    }
}

function applyImportedPlayers(playersByBlock) {
    if (!playersByBlock || typeof playersByBlock !== 'object') return;

    blockDefinitions.forEach(block => {
        const importedPlayers = playersByBlock[block.id] || [];
        importedPlayers.forEach(importedPlayer => {
            const player = getPlayer(block.id, importedPlayer.id);
            if (player && importedPlayer.name) player.name = importedPlayer.name;
        });
    });
}

function normalizeImportedData(data) {
    if (!data || typeof data !== 'object') return {};
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => ['win', 'draw', 'lose'].includes(value))
    );
}

function renderTabs() {
    const tabs = document.getElementById('tabs');
    tabs.innerHTML = blockDefinitions.map((block, index) =>
        `<button class="tab ${index === 0 ? 'active' : ''}" data-block="${block.id}">${block.title}</button>`
    ).join('');
}

function renderBlocks() {
    const root = document.getElementById('blocks-root');
    root.innerHTML = blockDefinitions.map(block => `
        <div id="${block.id}" class="content">
            <div class="block-title ${block.className}">${block.title}</div>
            <div id="${block.id}-status" class="block-status"></div>
            <div class="table-wrapper">
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>選手</th>
                            ${block.players.map(player => `<th data-player-id="${player.id}">${player.name}</th>`).join('')}
                            <th class="point-column">勝点</th>
                            <th class="rank-column">順位</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${block.players.map(rowPlayer => `
                            <tr>
                                <td class="player-name">
                                    <input class="player-name-input" data-block="${block.id}" data-player-id="${rowPlayer.id}" value="${rowPlayer.name}" aria-label="${rowPlayer.name}">
                                </td>
                                ${block.players.map(colPlayer => renderMatchCell(block.id, rowPlayer.id, colPlayer.id)).join('')}
                                <td class="point-column" data-player-id="${rowPlayer.id}">
                                    <span class="confirmed-points">0</span>(<span class="predicted-points">0</span>)
                                </td>
                                <td class="rank-column" data-player-id="${rowPlayer.id}">-</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

function renderMatchCell(blockId, rowPlayerId, colPlayerId) {
    if (rowPlayerId === colPlayerId) {
        return '<td class="diagonal">-</td>';
    }

    return `
        <td class="match-info clickable-cell" data-block="${blockId}" data-player1="${rowPlayerId}" data-player2="${colPlayerId}">
            <div class="match-results">
                <div class="confirmed-result"></div>
                <div class="predicted-result"></div>
            </div>
        </td>
    `;
}

function bindEvents() {
    document.querySelectorAll('.toggle-button').forEach(button => {
        button.addEventListener('click', () => switchView(button.dataset.view, button));
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => showContent(tab.dataset.block, tab));
    });

    document.querySelectorAll('.clickable-cell').forEach(cell => {
        cell.addEventListener('click', () => toggleMatchResult(cell));
    });

    document.querySelectorAll('.player-name-input').forEach(input => {
        input.addEventListener('change', () => updatePlayerName(input));
        input.addEventListener('click', event => event.stopPropagation());
    });

    document.querySelectorAll('thead th[data-player-id]').forEach(header => {
        header.addEventListener('click', () => {
            const blockId = header.closest('.content').id;
            showPlayerSchedule(blockId, header.dataset.playerId);
        });
    });

    document.getElementById('download-btn').addEventListener('click', downloadPredictions);
    document.getElementById('download-confirmed-btn').addEventListener('click', downloadConfirmed);
    document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('upload-input').click());
    document.getElementById('upload-input').addEventListener('change', uploadPredictions);
    document.getElementById('final-result-btn').addEventListener('click', toggleFinalResult);

    bindModal('schedule-modal');
    bindModal('help-modal');
    document.getElementById('help-btn').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'flex';
    });
}

function bindModal(modalId) {
    const modal = document.getElementById(modalId);
    const close = modal.querySelector('.modal-close');
    close.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', event => {
        if (event.target === modal) modal.style.display = 'none';
    });
}

function switchView(view, button) {
    const tabs = document.getElementById('tabs');
    document.querySelectorAll('.toggle-button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');

    if (view === 'tabs') {
        tabs.style.display = 'flex';
        document.querySelectorAll('.content').forEach(content => content.classList.add('hidden'));
        document.getElementById(blocks[0]).classList.remove('hidden');
        document.querySelectorAll('.tab').forEach((tab, index) => tab.classList.toggle('active', index === 0));
        return;
    }

    tabs.style.display = 'none';
    document.querySelectorAll('.content').forEach(content => content.classList.remove('hidden'));
}

function showContent(blockId, tab) {
    document.querySelectorAll('.content').forEach(content => content.classList.add('hidden'));
    document.getElementById(blockId).classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
}

function toggleMatchResult(cell) {
    const blockId = cell.dataset.block;
    const player1Id = cell.dataset.player1;
    const player2Id = cell.dataset.player2;
    const matchKey = getMatchKey(blockId, player1Id, player2Id);
    const reverseKey = getReverseKey(blockId, player1Id, player2Id);

    if (confirmedResults[matchKey]) return;

    switch (predictedResults[matchKey] || 'none') {
        case 'none':
            predictedResults[matchKey] = 'win';
            predictedResults[reverseKey] = 'lose';
            break;
        case 'win':
            predictedResults[matchKey] = 'draw';
            predictedResults[reverseKey] = 'draw';
            break;
        case 'draw':
            predictedResults[matchKey] = 'lose';
            predictedResults[reverseKey] = 'win';
            break;
        default:
            delete predictedResults[matchKey];
            delete predictedResults[reverseKey];
    }

    mergeResults();
    refreshAllTables();
}

function updateCellDisplay(cell) {
    const blockId = cell.dataset.block;
    const player1Id = cell.dataset.player1;
    const player2Id = cell.dataset.player2;
    const matchKey = getMatchKey(blockId, player1Id, player2Id);
    const confirmedResultDiv = cell.querySelector('.confirmed-result');
    const predictedResultDiv = cell.querySelector('.predicted-result');

    if (confirmedResults[matchKey]) {
        confirmedResultDiv.innerHTML = getResultIcon(confirmedResults[matchKey]);
        confirmedResultDiv.className = `confirmed-result ${confirmedResults[matchKey]}`;
        predictedResultDiv.innerHTML = '';
        predictedResultDiv.className = 'predicted-result';
        cell.classList.add('confirmed-cell');
        cell.classList.remove('clickable-cell');
        return;
    }

    confirmedResultDiv.innerHTML = '';
    confirmedResultDiv.className = 'confirmed-result';
    cell.classList.remove('confirmed-cell');
    cell.classList.add('clickable-cell');

    const predictedResult = predictedResults[matchKey];
    predictedResultDiv.innerHTML = getResultIcon(predictedResult);
    predictedResultDiv.className = `predicted-result ${predictedResult || ''}`;
}

function updatePlayerName(input) {
    const player = getPlayer(input.dataset.block, input.dataset.playerId);
    player.name = input.value.trim() || input.dataset.playerId;
    document.querySelectorAll(`#${input.dataset.block} th[data-player-id="${input.dataset.playerId}"]`).forEach(header => {
        header.textContent = player.name;
    });
    refreshAllTables();
}

function calculateStats(blockId) {
    const players = getBlock(blockId).players;
    return players.map(player => {
        let confirmedPoints = 0;
        let predictedPoints = 0;
        let completedMatches = 0;
        const opponents = {};

        players.forEach(opponent => {
            if (player.id === opponent.id) return;
            const key = getMatchKey(blockId, player.id, opponent.id);
            const result = matchResults[key];
            if (!result) return;

            completedMatches++;
            opponents[opponent.id] = result;
            if (confirmedResults[key]) confirmedPoints += result === 'win' ? 2 : result === 'draw' ? 1 : 0;
            predictedPoints += result === 'win' ? 2 : result === 'draw' ? 1 : 0;
        });

        return { ...player, confirmedPoints, predictedPoints, completedMatches, opponents };
    });
}

function rankPlayers(blockId) {
    const stats = calculateStats(blockId);
    stats.sort((a, b) => {
        if (b.predictedPoints !== a.predictedPoints) return b.predictedPoints - a.predictedPoints;
        const direct = a.opponents[b.id];
        if (direct === 'win') return -1;
        if (direct === 'lose') return 1;
        return a.name.localeCompare(b.name, 'ja');
    });
    stats.forEach((player, index) => { player.rank = index + 1; });
    return stats;
}

function updatePointsAndRanks(blockId) {
    const rankedPlayers = rankPlayers(blockId);
    const rankByPlayer = Object.fromEntries(rankedPlayers.map(player => [player.id, player]));
    const totalMatches = getBlock(blockId).players.length - 1;

    document.querySelectorAll(`#${blockId} .point-column[data-player-id]`).forEach(cell => {
        const stat = rankByPlayer[cell.dataset.playerId];
        cell.querySelector('.confirmed-points').textContent = stat.confirmedPoints;
        cell.querySelector('.predicted-points').textContent = stat.predictedPoints;
    });

    document.querySelectorAll(`#${blockId} .rank-column[data-player-id]`).forEach(cell => {
        const stat = rankByPlayer[cell.dataset.playerId];
        cell.textContent = stat.completedMatches === totalMatches ? `${stat.rank}位` : '-';
    });

    const complete = rankedPlayers.every(player => player.completedMatches === totalMatches);
    const status = document.getElementById(`${blockId}-status`);
    status.textContent = complete ? 'ブロック順位確定' : '';
    status.classList.toggle('confirmed', complete);
}

function refreshAllTables() {
    document.querySelectorAll('.match-info[data-block]').forEach(updateCellDisplay);
    blocks.forEach(updatePointsAndRanks);
    updateFinalDisplay();
}

function showPlayerSchedule(blockId, playerId) {
    const block = getBlock(blockId);
    const player = getPlayer(blockId, playerId);
    const rows = block.players
        .filter(opponent => opponent.id !== playerId)
        .map(opponent => {
            const key = getMatchKey(blockId, playerId, opponent.id);
            const confirmed = confirmedResults[key];
            const predicted = predictedResults[key];
            return `
                <tr>
                    <td>${block.title}</td>
                    <td>${opponent.name}</td>
                    <td class="result-cell ${confirmed || ''}">${getResultIcon(confirmed)}</td>
                    <td class="result-cell ${predicted || ''}">${getResultIcon(predicted)}</td>
                </tr>
            `;
        }).join('');

    document.getElementById('modal-player-name').textContent = `${player.name} の対戦予定`;
    document.getElementById('modal-schedule-body').innerHTML = `
        <table class="schedule-table modal-table">
            <thead><tr><th>ブロック</th><th>相手</th><th>確定</th><th>予想</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
    document.getElementById('schedule-modal').style.display = 'flex';
}

function getBlockWinner(blockId) {
    const rankedPlayers = rankPlayers(blockId);
    const totalMatches = getBlock(blockId).players.length - 1;
    if (!rankedPlayers.every(player => player.completedMatches === totalMatches)) return null;
    return rankedPlayers[0];
}

function toggleFinalResult() {
    if (!getBlockWinner('block-a') || !getBlockWinner('block-b')) return;
    finalResult = finalResult === 'block-a' ? 'block-b' : 'block-a';
    updateFinalDisplay();
}

function updateFinalDisplay() {
    const aWinner = getBlockWinner('block-a');
    const bWinner = getBlockWinner('block-b');
    document.getElementById('final-block-a-winner').textContent = aWinner ? aWinner.name : 'Aブロック1位';
    document.getElementById('final-block-b-winner').textContent = bWinner ? bWinner.name : 'Bブロック1位';

    const champion = finalResult === 'block-a' ? aWinner : finalResult === 'block-b' ? bWinner : null;
    const display = document.getElementById('champion-display');
    if (champion) {
        display.style.display = 'block';
        display.textContent = `優勝予想: ${champion.name}`;
    } else {
        display.style.display = 'none';
        display.textContent = '';
    }
}

function buildExportData(results) {
    return {
        format: 'two-block-10-player-prediction',
        version: '2.0',
        lastUpdate: new Date().toISOString(),
        players: Object.fromEntries(blockDefinitions.map(block => [
            block.id,
            block.players.map(player => ({ id: player.id, name: player.name }))
        ])),
        results,
        finalResult
    };
}

function downloadJson(fileName, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function downloadPredictions() {
    downloadJson('predicted-results.json', buildExportData(predictedResults));
}

function downloadConfirmed() {
    downloadJson('result.json', {
        ...buildExportData(matchResults),
        confirmed: matchResults,
        totalMatches: Object.keys(matchResults).length
    });
}

function uploadPredictions(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
        try {
            const data = JSON.parse(loadEvent.target.result);
            if (data.players) {
                applyImportedPlayers(data.players);
                renderTabs();
                renderBlocks();
                bindEvents();
            }
            predictedResults = normalizeImportedData(data.results || data.confirmed || data);
            finalResult = data.finalResult || null;
            mergeResults();
            refreshAllTables();
            alert('予想データを読み込みました。');
        } catch (error) {
            alert('ファイルの読み込み中にエラーが発生しました。');
            console.error(error);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfirmedResults();
    renderTabs();
    renderBlocks();
    bindEvents();
    refreshAllTables();
});

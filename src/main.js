import { DEFAULT_BUILDING } from './data/defaultBuilding.js';
import { validateBuildingData } from './utils/validator.js';
import { calculateEvacuationRoute } from './utils/router.js';
import { translations } from './utils/i18n.js';
import { playSuccessChime, playHazardAlert, playClickSound, setMuted, getMuted } from './utils/audio.js';
import { exportSvgToPng } from './utils/exportPng.js';

// Application State
const state = {
  buildingData: JSON.parse(JSON.stringify(DEFAULT_BUILDING)),
  startNodeId: 'R1',
  blockedNodes: new Set(),
  blockedEdges: new Set(),
  closedExits: new Set(),
  lang: localStorage.getItem('smart_escape_lang') || 'en',
  highContrast: localStorage.getItem('smart_escape_contrast') === 'true',
  soundMuted: localStorage.getItem('smart_escape_mute') === 'true',
  activeTab: 'rooms',
  searchQuery: '',
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  walkthrough: {
    running: false,
    stepIndex: 0,
    intervalId: null,
    speedMs: 1000
  },
  clickMode: 'start' // 'start' (click sets start) or 'hazard' (click toggles block)
};

// Sync audio and contrast on start
setMuted(state.soundMuted);
if (state.highContrast) {
  document.body.classList.add('high-contrast');
}
document.body.setAttribute('lang', state.lang);

// Load initial_state from building dataset and URL parameters
function applyInitialState() {
  state.blockedNodes.clear();
  state.blockedEdges.clear();
  state.closedExits.clear();

  const init = state.buildingData.initial_state || {};
  (init.blocked_nodes || []).forEach(id => state.blockedNodes.add(id));
  (init.blocked_edges || []).forEach(id => state.blockedEdges.add(id));
  (init.closed_exits || []).forEach(id => state.closedExits.add(id));

  // Support URL query parameters for direct state deep-linking (e.g. ?start=R1&block=C2)
  if (typeof window !== 'undefined' && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('start')) {
      state.startNodeId = params.get('start');
    }
    if (params.get('block')) {
      params.get('block').split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
        if (state.buildingData.nodes?.some(n => n.id === id && (n.type === 'room' || n.type === 'junction'))) {
          state.blockedNodes.add(id);
        } else if (state.buildingData.edges?.some(e => e.id === id)) {
          state.blockedEdges.add(id);
        }
      });
    }
    if (params.get('close')) {
      params.get('close').split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
        state.closedExits.add(id);
      });
    }
    if (params.get('lang') === 'bn' || params.get('lang') === 'en') {
      state.lang = params.get('lang');
    }
  }
}
applyInitialState();

// Helper for i18n string lookup
function t(key) {
  const dict = translations[state.lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

// Current route calculation result
let currentRoute = null;

function recalculateRoute() {
  currentRoute = calculateEvacuationRoute(state.buildingData, state.startNodeId, {
    blockedNodes: state.blockedNodes,
    blockedEdges: state.blockedEdges,
    closedExits: state.closedExits
  });

  // Sound feedback
  if (currentRoute.status === 'ROUTE_FOUND') {
    playSuccessChime();
  } else if (currentRoute.status === 'BLOCKED_START' || currentRoute.status === 'NO_ROUTE') {
    playHazardAlert();
  }

  // Stop walkthrough if route changes
  resetWalkthrough();
}

// Map ViewBox calculations
function getMapBounds() {
  const nodes = state.buildingData.nodes || [];
  if (nodes.length === 0) return { minX: 0, minY: 0, width: 600, height: 400 };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  const pad = 70;
  minX -= pad;
  minY -= pad;
  const width = Math.max(maxX - minX + pad * 2, 400);
  const height = Math.max(maxY - minY + pad * 2, 300);

  return { minX, minY, width, height };
}

// DOM Rendering Functions
function renderApp() {
  recalculateRoute();
  renderHeader();
  renderSubToolbar();
  renderRouteAnalysis();
  renderStartSelector();
  renderHazardPanel();
  renderWalkthroughControls();
  renderSvgMap();
}

function renderHeader() {
  const titleEl = document.getElementById('app-title');
  if (titleEl) titleEl.textContent = t('appTitle');

  const subEl = document.getElementById('app-subtitle');
  if (subEl) subEl.textContent = t('appSubtitle');

  const badgeEl = document.getElementById('badge-text');
  if (badgeEl) badgeEl.textContent = t('practiceChallenge');

  const langBtn = document.getElementById('lang-switch-btn');
  if (langBtn) {
    langBtn.textContent = state.lang === 'en' ? 'বাংলা' : 'English';
    langBtn.title = t('langToggleAria');
  }

  const contrastBtn = document.getElementById('contrast-btn');
  if (contrastBtn) {
    contrastBtn.title = state.highContrast ? t('highContrastOn') : t('highContrastOff');
    contrastBtn.innerHTML = state.highContrast
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M12 2a10 10 0 0 1 0 20"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z"/></svg>`;
  }

  const soundBtn = document.getElementById('sound-btn');
  if (soundBtn) {
    soundBtn.title = state.soundMuted ? t('soundOff') : t('soundOn');
    soundBtn.innerHTML = state.soundMuted
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  }

  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> ${t('importJson')}`;
  }

  const exportBtn = document.getElementById('export-png-btn');
  if (exportBtn) {
    exportBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> ${t('exportPng')}`;
  }

  // Update Presets Bar labels
  const presetsLabel = document.getElementById('presets-label');
  if (presetsLabel) presetsLabel.textContent = t('presetsLabel');
  const p1 = document.getElementById('preset-baseline');
  if (p1) p1.textContent = t('presetBaseline');
  const p2 = document.getElementById('preset-blocked-c2');
  if (p2) p2.textContent = t('presetBlockedC2');
  const p3 = document.getElementById('preset-exits-closed');
  if (p3) p3.textContent = t('presetExitsClosed');
  const p4 = document.getElementById('preset-start-r2');
  if (p4) p4.textContent = t('presetStartR2');
  const p5 = document.getElementById('preset-start-blocked');
  if (p5) p5.textContent = t('presetStartBlocked');
}

function renderSubToolbar() {
  const totalNodes = (state.buildingData.nodes || []).length;
  const totalEdges = (state.buildingData.edges || []).length;
  const activeHazardsCount = state.blockedNodes.size + state.blockedEdges.size + state.closedExits.size;
  const openExitsCount = (state.buildingData.nodes || []).filter(
    n => n.type === 'exit' && !state.closedExits.has(n.id)
  ).length;

  document.getElementById('sub-toolbar-content').innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 700; color: #38bdf8;">${state.buildingData.building || 'Building Map'}</span>
    </div>
    <div class="stat-pills">
      <div class="stat-pill">
        <span>${t('totalNodes')}:</span>
        <strong>${totalNodes}</strong>
      </div>
      <div class="stat-pill">
        <span>${t('totalCorridors')}:</span>
        <strong>${totalEdges}</strong>
      </div>
      <div class="stat-pill exit-pill">
        <span>${t('safeExits')}:</span>
        <strong>${openExitsCount}</strong>
      </div>
      <div class="stat-pill hazard-pill">
        <span>${t('activeHazards')}:</span>
        <strong>${activeHazardsCount}</strong>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="reset-initial-btn" class="btn-warning" style="font-size: 0.78rem; padding: 5px 10px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        ${t('resetInitial')}
      </button>
      <button id="clear-hazards-btn" style="font-size: 0.78rem; padding: 5px 10px;">
        ${t('clearAllHazards')}
      </button>
    </div>
  `;

  document.getElementById('reset-initial-btn').onclick = () => {
    playClickSound();
    applyInitialState();
    renderApp();
  };

  document.getElementById('clear-hazards-btn').onclick = () => {
    playClickSound();
    state.blockedNodes.clear();
    state.blockedEdges.clear();
    state.closedExits.clear();
    renderApp();
  };
}

function renderStartSelector() {
  const container = document.getElementById('start-selector-container');
  const validStartNodes = (state.buildingData.nodes || []).filter(
    n => n.type === 'room' || n.type === 'junction'
  );

  let optionsHtml = `<option value="">${t('startLocationPlaceholder')}</option>`;
  validStartNodes.forEach(node => {
    const isSelected = state.startNodeId === node.id;
    const isBlocked = state.blockedNodes.has(node.id);
    const blockedSuffix = isBlocked ? ` [${t('statusBlocked')}]` : '';
    const typeLabel = node.type === 'room' ? (state.lang === 'bn' ? 'কক্ষ' : 'Room') : (state.lang === 'bn' ? 'সংযোগস্থল' : 'Junction');
    optionsHtml += `
      <option value="${node.id}" ${isSelected ? 'selected' : ''}>
        ${node.id} - ${node.label} (${typeLabel})${blockedSuffix}
      </option>
    `;
  });

  container.innerHTML = `
    <label style="font-size: 0.82rem; font-weight: 700; color: #e2e8f0; display: block; margin-bottom: 6px;">
      ${t('selectStartLabel')}
    </label>
    <div class="select-wrapper">
      <select id="start-node-dropdown">
        ${optionsHtml}
      </select>
      <div class="select-arrow">▼</div>
    </div>
    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
      ${t('startLocationHint')}
    </div>
  `;

  const dropdown = document.getElementById('start-node-dropdown');
  dropdown.onchange = (e) => {
    playClickSound();
    state.startNodeId = e.target.value;
    renderApp();
  };
}

function renderRouteAnalysis() {
  const container = document.getElementById('route-analysis-container');
  const res = currentRoute;

  let statusClass = 'status-warning';
  let icon = 'ℹ️';
  let title = t('statusNoStart');
  let description = '';

  if (res.status === 'ROUTE_FOUND') {
    statusClass = 'status-success';
    icon = '🛡️';
    title = t('statusRouteFound');
  } else if (res.status === 'BLOCKED_START') {
    statusClass = 'status-danger';
    icon = '⚠️';
    // Must display exact "Starting location blocked" per mandatory requirements
    title = 'Starting location blocked';
    description = t('blockedStartDetails');
  } else if (res.status === 'NO_ROUTE') {
    statusClass = 'status-danger';
    icon = '🚫';
    // Must display exact "No route available" per mandatory requirements
    title = 'No route available';
    description = t('noRouteDetails');
  }

  let metricsHtml = '';
  let pathSequenceHtml = '';
  let altRoutesHtml = '';

  if (res.status === 'ROUTE_FOUND') {
    metricsHtml = `
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">${t('totalCost')}</div>
          <div class="metric-val cost-val">${res.cost}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">${t('destinationExit')}</div>
          <div class="metric-val exit-val">${res.exitId} <span style="font-size: 0.8rem; font-weight: 500; color: #94a3b8;">(${res.exitLabel})</span></div>
        </div>
      </div>
    `;

    const tokens = res.path.map((nodeId, idx) => {
      const isStart = idx === 0;
      const isExit = idx === res.path.length - 1;
      let tokenClass = 'node-token';
      if (isStart) tokenClass += ' is-start';
      if (isExit) tokenClass += ' is-exit';

      return `<span class="${tokenClass}">${nodeId}</span>`;
    }).join(' <span class="path-arrow">→</span> ');

    pathSequenceHtml = `
      <div class="path-sequence-box">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.78rem; font-weight: 700; color: #38bdf8;">${t('nodeSequence')}</span>
          <span style="font-size: 0.72rem; color: #94a3b8; font-family: var(--font-mono);">${res.path.length} nodes</span>
        </div>
        <div class="path-node-tokens">
          ${tokens}
        </div>
      </div>
    `;

    // Alternative routes section (Bonus Feature)
    if (res.alternativeRoutes && res.alternativeRoutes.length > 1) {
      const altItems = res.alternativeRoutes.slice(1, 4).map((alt, idx) => {
        const diff = alt.cost - res.cost;
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.75rem; margin-top: 4px; border: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="padding: 1px 6px; border-radius: 3px; background: #1e293b; color: #38bdf8; font-family: var(--font-mono); font-weight: 700;">#${idx + 2}</span>
              <span style="color: #cbd5e1;">${alt.path.join(' → ')}</span>
            </div>
            <div style="font-family: var(--font-mono); color: #fbbf24; font-weight: 600;">
              Cost: ${alt.cost} (+${diff})
            </div>
          </div>
        `;
      }).join('');

      altRoutesHtml = `
        <div style="margin-top: 10px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">
            ${t('altRoutesTitle')}
          </div>
          ${altItems}
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="route-status-card ${statusClass}">
      <div class="status-header-row">
        <div class="status-icon-badge">${icon}</div>
        <div class="status-title-box">
          <h3 style="color: ${res.status === 'ROUTE_FOUND' ? '#34d399' : (res.status === 'NO_ROUTE' || res.status === 'BLOCKED_START') ? '#f87171' : '#fbbf24'};">
            ${title}
          </h3>
          ${description ? `<p>${description}</p>` : ''}
        </div>
      </div>
      ${metricsHtml}
      ${pathSequenceHtml}
      ${altRoutesHtml}
    </div>
  `;
}

function renderHazardPanel() {
  const container = document.getElementById('hazard-management-container');
  const { nodes = [], edges = [] } = state.buildingData;

  const rooms = nodes.filter(n => n.type === 'room');
  const junctions = nodes.filter(n => n.type === 'junction');
  const exits = nodes.filter(n => n.type === 'exit');

  let activeList = [];
  if (state.activeTab === 'rooms') activeList = rooms;
  else if (state.activeTab === 'junctions') activeList = junctions;
  else if (state.activeTab === 'exits') activeList = exits;
  else if (state.activeTab === 'corridors') activeList = edges;

  // Filter with query
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    activeList = activeList.filter(item => {
      const idMatch = item.id.toLowerCase().includes(q);
      const labelMatch = (item.label || '').toLowerCase().includes(q);
      const edgeMatch = (item.from || '').toLowerCase().includes(q) || (item.to || '').toLowerCase().includes(q);
      return idMatch || labelMatch || edgeMatch;
    });
  }

  let rowsHtml = '';
  if (activeList.length === 0) {
    rowsHtml = `<div style="text-align: center; color: var(--text-muted); padding: 16px; font-size: 0.8rem;">No items found.</div>`;
  } else {
    rowsHtml = activeList.map(item => {
      if (state.activeTab === 'corridors') {
        const isBlocked = state.blockedEdges.has(item.id);
        return `
          <div class="hazard-item-row ${isBlocked ? 'is-blocked' : ''}">
            <div class="hazard-item-info">
              <span class="badge-id">${item.id}</span>
              <span style="color: #e2e8f0; font-family: var(--font-mono); font-size: 0.78rem;">${item.from} ↔ ${item.to}</span>
              <span style="font-size: 0.7rem; color: #94a3b8;">(Cost: ${item.cost})</span>
            </div>
            <button class="${isBlocked ? 'btn-danger' : ''}" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.toggleEdgeBlocked('${item.id}')">
              ${isBlocked ? t('btnUnblock') : t('btnBlock')}
            </button>
          </div>
        `;
      } else if (state.activeTab === 'exits') {
        const isClosed = state.closedExits.has(item.id);
        return `
          <div class="hazard-item-row ${isClosed ? 'is-blocked' : ''}">
            <div class="hazard-item-info">
              <span class="badge-id">${item.id}</span>
              <span style="color: #e2e8f0;">${item.label}</span>
            </div>
            <button class="${isClosed ? 'btn-danger' : ''}" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.toggleExitClosed('${item.id}')">
              ${isClosed ? t('btnOpen') : t('btnClose')}
            </button>
          </div>
        `;
      } else {
        const isBlocked = state.blockedNodes.has(item.id);
        return `
          <div class="hazard-item-row ${isBlocked ? 'is-blocked' : ''}">
            <div class="hazard-item-info">
              <span class="badge-id">${item.id}</span>
              <span style="color: #e2e8f0;">${item.label}</span>
            </div>
            <button class="${isBlocked ? 'btn-danger' : ''}" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.toggleNodeBlocked('${item.id}')">
              ${isBlocked ? t('btnUnblock') : t('btnBlock')}
            </button>
          </div>
        `;
      }
    }).join('');
  }

  container.innerHTML = `
    <div class="hazard-panel-container">
      <div class="tabs-nav">
        <button class="tab-btn ${state.activeTab === 'rooms' ? 'active' : ''}" onclick="window.setHazardTab('rooms')">${t('roomsTab')} (${rooms.length})</button>
        <button class="tab-btn ${state.activeTab === 'junctions' ? 'active' : ''}" onclick="window.setHazardTab('junctions')">${t('junctionsTab')} (${junctions.length})</button>
        <button class="tab-btn ${state.activeTab === 'exits' ? 'active' : ''}" onclick="window.setHazardTab('exits')">${t('exitsTab')} (${exits.length})</button>
        <button class="tab-btn ${state.activeTab === 'corridors' ? 'active' : ''}" onclick="window.setHazardTab('corridors')">${t('corridorsTab')} (${edges.length})</button>
      </div>
      <input type="text" id="hazard-search-input" value="${state.searchQuery}" placeholder="${t('searchPlaceholder')}" style="width: 100%; padding: 6px 10px; font-size: 0.78rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: 4px; color: #fff;" />
      <div class="hazard-list">
        ${rowsHtml}
      </div>
    </div>
  `;

  const searchInput = document.getElementById('hazard-search-input');
  searchInput.oninput = (e) => {
    state.searchQuery = e.target.value;
    renderHazardPanel();
  };
}

function renderWalkthroughControls() {
  const container = document.getElementById('walkthrough-controls-container');
  const res = currentRoute;
  const hasRoute = res.status === 'ROUTE_FOUND' && res.path.length > 0;

  if (!hasRoute) {
    container.innerHTML = `
      <div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 6px;">
        ${t('simulatorTitle')} available when a valid route is found.
      </div>
    `;
    return;
  }

  const stepMax = res.path.length - 1;
  const currNodeId = res.path[state.walkthrough.stepIndex] || res.path[0];
  const isFinished = state.walkthrough.stepIndex === stepMax;

  container.innerHTML = `
    <div class="walkthrough-panel">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 0.78rem; font-weight: 700; color: #38bdf8;">${t('simulatorTitle')}</span>
        <span style="font-size: 0.72rem; color: #cbd5e1; font-family: var(--font-mono);">
          ${t('simCurrentStep')} ${state.walkthrough.stepIndex} / ${stepMax}
        </span>
      </div>
      <div class="walkthrough-btns">
        <button class="btn-primary" style="font-size: 0.75rem; padding: 5px 10px;" id="sim-play-pause-btn">
          ${state.walkthrough.running ? `⏸ ${t('simPause')}` : `▶ ${t('simStart')}`}
        </button>
        <button style="font-size: 0.75rem; padding: 5px 10px;" id="sim-step-btn" ${isFinished ? 'disabled' : ''}>
          ⏭ ${t('simStep')}
        </button>
        <button style="font-size: 0.75rem; padding: 5px 10px;" id="sim-reset-btn">
          ↺ ${t('simReset')}
        </button>
      </div>
      <div class="walkthrough-status-msg">
        ${isFinished ? `🎉 ${t('simEvacuated')}: ${currNodeId}` : `🏃 ${t('simAtLocation')}: ${currNodeId}`}
      </div>
    </div>
  `;

  document.getElementById('sim-play-pause-btn').onclick = () => {
    if (state.walkthrough.running) pauseWalkthrough();
    else startWalkthrough();
  };

  document.getElementById('sim-step-btn').onclick = () => {
    stepWalkthrough();
  };

  document.getElementById('sim-reset-btn').onclick = () => {
    resetWalkthrough();
    renderApp();
  };
}

// Walkthrough Animation Controls
function startWalkthrough() {
  if (state.walkthrough.running) return;
  state.walkthrough.running = true;

  if (state.walkthrough.stepIndex >= currentRoute.path.length - 1) {
    state.walkthrough.stepIndex = 0;
  }

  state.walkthrough.intervalId = setInterval(() => {
    if (state.walkthrough.stepIndex < currentRoute.path.length - 1) {
      state.walkthrough.stepIndex++;
      playClickSound();
      renderWalkthroughControls();
      renderSvgMap();
    } else {
      pauseWalkthrough();
      playSuccessChime();
    }
  }, state.walkthrough.speedMs);

  renderWalkthroughControls();
}

function pauseWalkthrough() {
  state.walkthrough.running = false;
  if (state.walkthrough.intervalId) {
    clearInterval(state.walkthrough.intervalId);
    state.walkthrough.intervalId = null;
  }
  renderWalkthroughControls();
}

function stepWalkthrough() {
  if (state.walkthrough.stepIndex < currentRoute.path.length - 1) {
    state.walkthrough.stepIndex++;
    playClickSound();
    renderWalkthroughControls();
    renderSvgMap();
  }
}

function resetWalkthrough() {
  pauseWalkthrough();
  state.walkthrough.stepIndex = 0;
}

// Render SVG Map
function renderSvgMap() {
  const svg = document.getElementById('blueprint-svg');
  if (!svg) return;

  const { minX, minY, width, height } = getMapBounds();
  svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

  const nodeMap = new Map((state.buildingData.nodes || []).map(n => [n.id, n]));
  const activeRouteEdges = new Set(currentRoute.edgeIds || []);

  let edgesHtml = '';
  (state.buildingData.edges || []).forEach(edge => {
    const u = nodeMap.get(edge.from);
    const v = nodeMap.get(edge.to);
    if (!u || !v) return;

    const isBlocked = state.blockedEdges.has(edge.id);
    const isActive = activeRouteEdges.has(edge.id);

    let edgeClass = 'edge-line';
    if (isBlocked) edgeClass += ' blocked';
    else if (isActive) edgeClass += ' active-route';

    const midX = (u.x + v.x) / 2;
    const midY = (u.y + v.y) / 2;

    edgesHtml += `
      <g class="edge-group" data-edge-id="${edge.id}">
        <line class="${edgeClass}" x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}" onclick="window.toggleEdgeBlocked('${edge.id}')" onmouseenter="window.showEdgeInspector('${edge.id}')" onmouseleave="window.hideInspector()" />
        ${isActive && !isBlocked ? `<line class="edge-flow-dash" x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}" />` : ''}
        <g class="edge-cost-pill ${isBlocked ? 'blocked' : ''} ${isActive ? 'active-route' : ''}" transform="translate(${midX}, ${midY})" onclick="window.toggleEdgeBlocked('${edge.id}')" onmouseenter="window.showEdgeInspector('${edge.id}')" onmouseleave="window.hideInspector()">
          <rect class="edge-cost-bg" x="-14" y="-9" width="28" height="18" />
          <text class="edge-cost-text">${edge.cost}</text>
        </g>
      </g>
    `;
  });

  let nodesHtml = '';
  (state.buildingData.nodes || []).forEach(node => {
    const isStart = state.startNodeId === node.id;
    const isBlocked = state.blockedNodes.has(node.id);
    const isClosed = node.type === 'exit' && state.closedExits.has(node.id);
    const isOnRoute = currentRoute.path.includes(node.id);

    let nodeClass = `node-group type-${node.type}`;
    if (isBlocked) nodeClass += ' blocked';
    if (isClosed) nodeClass += ' closed-exit';
    if (isStart) nodeClass += ' is-start';
    if (isOnRoute) nodeClass += ' on-route';

    // Different geometry shapes for distinct node types
    let shapeSvg = '';
    if (node.type === 'room') {
      shapeSvg = `<rect class="node-shape" x="${node.x - 22}" y="${node.y - 22}" width="44" height="44" rx="8" ry="8" />`;
    } else if (node.type === 'junction') {
      shapeSvg = `<circle class="node-shape" cx="${node.x}" cy="${node.y}" r="20" />`;
    } else if (node.type === 'exit') {
      shapeSvg = `<rect class="node-shape" x="${node.x - 26}" y="${node.y - 18}" width="52" height="36" rx="10" ry="10" />`;
    }

    // Hazard symbol overlay
    let hazardSymbol = '';
    if (isBlocked) {
      hazardSymbol = `
        <line x1="${node.x - 12}" y1="${node.y - 12}" x2="${node.x + 12}" y2="${node.y + 12}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <line x1="${node.x + 12}" y1="${node.y - 12}" x2="${node.x - 12}" y2="${node.y + 12}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
      `;
    } else if (isClosed) {
      hazardSymbol = `
        <circle cx="${node.x}" cy="${node.y}" r="8" fill="none" stroke="#ffffff" stroke-width="2" />
        <line x1="${node.x - 6}" y1="${node.y + 6}" x2="${node.x + 6}" y2="${node.y - 6}" stroke="#ffffff" stroke-width="2" />
      `;
    }

    nodesHtml += `
      <g class="${nodeClass}" data-node-id="${node.id}" onclick="window.handleNodeClick('${node.id}', '${node.type}')" onmouseenter="window.showNodeInspector('${node.id}')" onmouseleave="window.hideInspector()">
        ${isStart ? `<circle class="start-pulse-ring" cx="${node.x}" cy="${node.y}" />` : ''}
        ${shapeSvg}
        ${hazardSymbol}
        <text class="node-label-text" x="${node.x}" y="${node.type === 'exit' ? node.y - 3 : node.y - 4}">${node.id}</text>
        <text class="node-id-subtext" x="${node.x}" y="${node.type === 'exit' ? node.y + 8 : node.y + 8}">${node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label}</text>
      </g>
    `;
  });

  // Walkthrough Animated Beacon
  let beaconHtml = '';
  if (currentRoute.status === 'ROUTE_FOUND' && currentRoute.path.length > 0) {
    const walkerNodeId = currentRoute.path[state.walkthrough.stepIndex] || currentRoute.path[0];
    const walkerNode = nodeMap.get(walkerNodeId);
    if (walkerNode) {
      beaconHtml = `
        <g class="walkthrough-beacon" transform="translate(${walkerNode.x}, ${walkerNode.y})">
          <circle r="12" fill="#06b6d4" opacity="0.3">
            <animate attributeName="r" values="8;18;8" dur="1.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0;0.6" dur="1.2s" repeatCount="indefinite"/>
          </circle>
          <circle r="7" fill="#ffffff" stroke="#0891b2" stroke-width="2" />
        </g>
      `;
    }
  }

  svg.innerHTML = `
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g class="zoom-layer" transform="translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})">
      <g class="edges-layer">${edgesHtml}</g>
      <g class="nodes-layer">${nodesHtml}</g>
      <g class="beacon-layer">${beaconHtml}</g>
    </g>
  `;
}

// Global Window Event Handlers for SVG & UI Interactions
window.handleNodeClick = (nodeId, type) => {
  playClickSound();

  if (state.clickMode === 'hazard') {
    if (type === 'exit') window.toggleExitClosed(nodeId);
    else window.toggleNodeBlocked(nodeId);
    return;
  }

  // In Start Select mode:
  if (type === 'room' || type === 'junction') {
    state.startNodeId = nodeId;
    renderApp();
  } else if (type === 'exit') {
    // Clicking exit toggles open/closed
    window.toggleExitClosed(nodeId);
  }
};

window.toggleNodeBlocked = (nodeId) => {
  playClickSound();
  if (state.blockedNodes.has(nodeId)) {
    state.blockedNodes.delete(nodeId);
  } else {
    state.blockedNodes.add(nodeId);
  }
  renderApp();
};

window.toggleExitClosed = (exitId) => {
  playClickSound();
  if (state.closedExits.has(exitId)) {
    state.closedExits.delete(exitId);
  } else {
    state.closedExits.add(exitId);
  }
  renderApp();
};

window.toggleEdgeBlocked = (edgeId) => {
  playClickSound();
  if (state.blockedEdges.has(edgeId)) {
    state.blockedEdges.delete(edgeId);
  } else {
    state.blockedEdges.add(edgeId);
  }
  renderApp();
};

window.setHazardTab = (tab) => {
  playClickSound();
  state.activeTab = tab;
  renderHazardPanel();
};

// Map Inspector Tooltip logic
window.showNodeInspector = (nodeId) => {
  const pill = document.getElementById('map-inspector-pill');
  const titleEl = document.getElementById('inspector-title');
  const descEl = document.getElementById('inspector-desc');
  const iconEl = document.getElementById('inspector-icon');
  if (!pill || !titleEl || !descEl || !iconEl) return;

  const node = state.buildingData.nodes?.find(n => n.id === nodeId);
  if (!node) return;

  const isBlocked = state.blockedNodes.has(node.id);
  const isClosed = node.type === 'exit' && state.closedExits.has(node.id);
  const isStart = state.startNodeId === node.id;
  const isOnRoute = currentRoute.path.includes(node.id);

  let icon = '📍';
  let statusText = 'Clear';
  if (isBlocked) { icon = '🔥'; statusText = 'Blocked / Hazard'; }
  else if (isClosed) { icon = '🚫'; statusText = 'Closed Exit'; }
  else if (isStart) { icon = '🎯'; statusText = 'Selected Start'; }
  else if (isOnRoute) { icon = '🛡️'; statusText = 'Evacuation Route'; }

  iconEl.textContent = icon;
  titleEl.textContent = `${node.label} (${node.id})`;
  descEl.textContent = `Type: ${node.type.toUpperCase()} • Pos: (${node.x}, ${node.y}) • Status: ${statusText}`;
  pill.classList.add('visible');
};

window.showEdgeInspector = (edgeId) => {
  const pill = document.getElementById('map-inspector-pill');
  const titleEl = document.getElementById('inspector-title');
  const descEl = document.getElementById('inspector-desc');
  const iconEl = document.getElementById('inspector-icon');
  if (!pill || !titleEl || !descEl || !iconEl) return;

  const edge = state.buildingData.edges?.find(e => e.id === edgeId);
  if (!edge) return;

  const isBlocked = state.blockedEdges.has(edge.id);
  const isActive = (currentRoute.edgeIds || []).includes(edge.id);

  iconEl.textContent = isBlocked ? '⚠️' : (isActive ? '⚡' : '🛣️');
  titleEl.textContent = `Corridor ${edge.id}`;
  descEl.textContent = `Connects: ${edge.from} ↔ ${edge.to} • Cost: ${edge.cost} • Status: ${isBlocked ? 'BLOCKED' : (isActive ? 'ACTIVE ROUTE' : 'OPEN')}`;
  pill.classList.add('visible');
};

window.hideInspector = () => {
  const pill = document.getElementById('map-inspector-pill');
  if (pill) pill.classList.remove('visible');
};

// Scenario Presets Switcher
function setupPresetsBar() {
  const presets = [
    {
      id: 'preset-baseline',
      apply: () => {
        state.startNodeId = 'R1';
        state.blockedNodes.clear();
        state.blockedEdges.clear();
        state.closedExits.clear();
      }
    },
    {
      id: 'preset-blocked-c2',
      apply: () => {
        state.startNodeId = 'R1';
        state.blockedNodes.clear();
        state.blockedEdges.clear();
        state.closedExits.clear();
        state.blockedNodes.add('C2');
      }
    },
    {
      id: 'preset-exits-closed',
      apply: () => {
        state.startNodeId = 'R1';
        state.blockedNodes.clear();
        state.blockedEdges.clear();
        state.closedExits.clear();
        state.closedExits.add('E1');
        state.closedExits.add('E2');
      }
    },
    {
      id: 'preset-start-r2',
      apply: () => {
        state.startNodeId = 'R2';
        state.blockedNodes.clear();
        state.blockedEdges.clear();
        state.closedExits.clear();
      }
    },
    {
      id: 'preset-start-blocked',
      apply: () => {
        state.startNodeId = 'R1';
        state.blockedNodes.clear();
        state.blockedEdges.clear();
        state.closedExits.clear();
        state.blockedNodes.add('R1');
      }
    }
  ];

  presets.forEach(p => {
    const btn = document.getElementById(p.id);
    if (!btn) return;
    btn.onclick = () => {
      playClickSound();
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      p.apply();
      renderApp();
    };
  });
}

// Global Keyboard Shortcuts
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Avoid triggering when user is typing in search input
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;

    if (e.code === 'KeyR') {
      // Reset initial state
      playClickSound();
      applyInitialState();
      renderApp();
    } else if (e.code === 'KeyH') {
      // Toggle high contrast
      playClickSound();
      state.highContrast = !state.highContrast;
      localStorage.setItem('smart_escape_contrast', String(state.highContrast));
      if (state.highContrast) document.body.classList.add('high-contrast');
      else document.body.classList.remove('high-contrast');
      renderHeader();
    } else if (e.code === 'KeyL') {
      // Toggle language
      playClickSound();
      state.lang = state.lang === 'en' ? 'bn' : 'en';
      localStorage.setItem('smart_escape_lang', state.lang);
      document.body.setAttribute('lang', state.lang);
      renderApp();
    } else if (e.code === 'KeyM') {
      // Toggle audio mute
      state.soundMuted = !state.soundMuted;
      localStorage.setItem('smart_escape_mute', String(state.soundMuted));
      setMuted(state.soundMuted);
      playClickSound();
      renderHeader();
    } else if (e.code === 'Space') {
      // Toggle walkthrough
      e.preventDefault();
      if (currentRoute.status === 'ROUTE_FOUND' && currentRoute.path.length > 0) {
        if (state.walkthrough.running) pauseWalkthrough();
        else startWalkthrough();
      }
    }
  });
}

// Setup Zoom & Pan for SVG Canvas
function setupPanZoom() {
  const container = document.getElementById('map-canvas-container');

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    state.zoom = Math.min(Math.max(0.4, state.zoom * zoomFactor), 4.0);
    renderSvgMap();
  }, { passive: false });

  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.node-group') || e.target.closest('.edge-cost-pill') || e.target.closest('.edge-line')) return;
    state.isDragging = true;
    state.dragStart = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    state.pan = { x: e.clientX - state.dragStart.x, y: e.clientY - state.dragStart.y };
    renderSvgMap();
  });

  window.addEventListener('mouseup', () => {
    state.isDragging = false;
  });

  document.getElementById('zoom-in-btn').onclick = () => {
    state.zoom = Math.min(4.0, state.zoom * 1.2);
    renderSvgMap();
  };

  document.getElementById('zoom-out-btn').onclick = () => {
    state.zoom = Math.max(0.4, state.zoom / 1.2);
    renderSvgMap();
  };

  document.getElementById('zoom-reset-btn').onclick = () => {
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    renderSvgMap();
  };
}

// Setup Import Modal & File Drag-and-Drop
function setupImportModal() {
  const modal = document.getElementById('import-modal');
  const openBtn = document.getElementById('import-btn');
  const closeBtn = document.getElementById('close-modal-btn');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const sampleBtn = document.getElementById('load-sample-btn');
  const errorContainer = document.getElementById('modal-error-container');

  function showModal() {
    modal.style.display = 'flex';
    errorContainer.innerHTML = '';
  }

  function hideModal() {
    modal.style.display = 'none';
  }

  openBtn.onclick = showModal;
  closeBtn.onclick = hideModal;

  modal.onclick = (e) => {
    if (e.target === modal) hideModal();
  };

  function processJsonText(text) {
    try {
      const data = JSON.parse(text);
      const validation = validateBuildingData(data);
      if (!validation.valid) {
        errorContainer.innerHTML = `
          <div class="validation-error-list">
            <strong>${t('validationFailed')} (${validation.errors.length} ${t('validationErrorsCount')})</strong>
            <ul>${validation.errors.map(err => `<li>${err}</li>`).join('')}</ul>
          </div>
        `;
        playHazardAlert();
        return;
      }

      state.buildingData = data;
      // Default start to first available room/junction
      const firstValid = (data.nodes || []).find(n => n.type === 'room' || n.type === 'junction');
      state.startNodeId = firstValid ? firstValid.id : null;
      applyInitialState();
      state.zoom = 1;
      state.pan = { x: 0, y: 0 };
      hideModal();
      playSuccessChime();
      renderApp();
    } catch (e) {
      errorContainer.innerHTML = `
        <div class="validation-error-list">
          <strong>Syntax Error:</strong> The file is not a valid JSON document (${e.message}).
        </div>
      `;
      playHazardAlert();
    }
  }

  dropZone.onclick = () => fileInput.click();

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => processJsonText(ev.target.result);
      reader.readAsText(file);
    }
  });

  fileInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => processJsonText(ev.target.result);
      reader.readAsText(file);
    }
  };

  sampleBtn.onclick = () => {
    state.buildingData = JSON.parse(JSON.stringify(DEFAULT_BUILDING));
    state.startNodeId = 'R1';
    applyInitialState();
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    hideModal();
    playSuccessChime();
    renderApp();
  };
}

// Setup Header Buttons
function setupHeaderActions() {
  document.getElementById('lang-switch-btn').onclick = () => {
    playClickSound();
    state.lang = state.lang === 'en' ? 'bn' : 'en';
    localStorage.setItem('smart_escape_lang', state.lang);
    document.body.setAttribute('lang', state.lang);
    renderApp();
  };

  document.getElementById('contrast-btn').onclick = () => {
    playClickSound();
    state.highContrast = !state.highContrast;
    localStorage.setItem('smart_escape_contrast', String(state.highContrast));
    if (state.highContrast) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');
    renderHeader();
  };

  document.getElementById('sound-btn').onclick = () => {
    state.soundMuted = !state.soundMuted;
    localStorage.setItem('smart_escape_mute', String(state.soundMuted));
    setMuted(state.soundMuted);
    playClickSound();
    renderHeader();
  };

  document.getElementById('export-png-btn').onclick = () => {
    playClickSound();
    const svg = document.getElementById('blueprint-svg');
    exportSvgToPng(svg, `smart-escape-${state.buildingData.building || 'map'}.png`, state.buildingData.building);
  };

  // Map Click Mode Toggle (Start Select vs Hazard Toggle)
  const modeStartBtn = document.getElementById('mode-start-btn');
  const modeHazardBtn = document.getElementById('mode-hazard-btn');
  if (modeStartBtn && modeHazardBtn) {
    modeStartBtn.onclick = () => {
      playClickSound();
      state.clickMode = 'start';
      modeStartBtn.classList.add('btn-primary');
      modeHazardBtn.classList.remove('btn-primary');
    };
    modeHazardBtn.onclick = () => {
      playClickSound();
      state.clickMode = 'hazard';
      modeHazardBtn.classList.add('btn-primary');
      modeStartBtn.classList.remove('btn-primary');
    };
  }
}

// Setup Sample Checks Runner Modal (Bonus / Quality Assurance)
function setupSampleChecksModal() {
  const btn = document.getElementById('run-sample-checks-btn');
  if (!btn) return;

  btn.onclick = () => {
    playClickSound();
    const building = DEFAULT_BUILDING;
    const checks = [
      {
        scenario: 'Baseline',
        action: 'Select R1',
        expected: 'R1 - C1 - C2 - E1; cost 7',
        run: () => calculateEvacuationRoute(building, 'R1', { blockedNodes: new Set(), blockedEdges: new Set(), closedExits: new Set() }),
        check: (res) => res.path.join(' - ') === 'R1 - C1 - C2 - E1' && res.cost === 7 && res.status === 'ROUTE_FOUND'
      },
      {
        scenario: 'Blocked junction',
        action: 'Select R1; block C2',
        expected: 'R1 - C1 - C3 - C4 - E2; cost 11',
        run: () => calculateEvacuationRoute(building, 'R1', { blockedNodes: new Set(['C2']), blockedEdges: new Set(), closedExits: new Set() }),
        check: (res) => res.path.join(' - ') === 'R1 - C1 - C3 - C4 - E2' && res.cost === 11 && res.status === 'ROUTE_FOUND'
      },
      {
        scenario: 'Exits closed',
        action: 'Select R1; close E1 and E2',
        expected: 'No route available',
        run: () => calculateEvacuationRoute(building, 'R1', { blockedNodes: new Set(), blockedEdges: new Set(), closedExits: new Set(['E1', 'E2']) }),
        check: (res) => res.status === 'NO_ROUTE' && res.message === 'No route available'
      },
      {
        scenario: 'Different start',
        action: 'Select R2',
        expected: 'R2 - C3 - C4 - E2; cost 7',
        run: () => calculateEvacuationRoute(building, 'R2', { blockedNodes: new Set(), blockedEdges: new Set(), closedExits: new Set() }),
        check: (res) => res.path.join(' - ') === 'R2 - C3 - C4 - E2' && res.cost === 7 && res.status === 'ROUTE_FOUND'
      },
      {
        scenario: 'Blocked start',
        action: 'Select R1; then block R1',
        expected: 'Starting location blocked',
        run: () => calculateEvacuationRoute(building, 'R1', { blockedNodes: new Set(['R1']), blockedEdges: new Set(), closedExits: new Set() }),
        check: (res) => res.status === 'BLOCKED_START' && res.message === 'Starting location blocked'
      }
    ];

    const results = checks.map(c => {
      const res = c.run();
      const passed = c.check(res);
      const actual = res.status === 'ROUTE_FOUND' ? `${res.path.join(' - ')}; cost ${res.cost}` : res.message;
      return { ...c, passed, actual };
    });

    const allPassed = results.every(r => r.passed);
    const modal = document.getElementById('import-modal');
    const errorContainer = document.getElementById('modal-error-container');
    modal.style.display = 'flex';

    errorContainer.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-top: 14px;">
        <h3 style="color: #34d399; font-size: 1rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          ${allPassed ? '✅ 100% Passed: All Section 4.1 Sample Checks Verified' : '❌ Sample Checks Discrepancy'}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.76rem; color: #cbd5e1; margin-top: 10px;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left;">
              <th style="padding: 6px;">Scenario</th>
              <th style="padding: 6px;">Expected</th>
              <th style="padding: 6px;">Actual Result</th>
              <th style="padding: 6px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 6px; font-weight: 600;">${r.scenario}</td>
                <td style="padding: 6px; font-family: var(--font-mono); color: #94a3b8;">${r.expected}</td>
                <td style="padding: 6px; font-family: var(--font-mono); color: #38bdf8;">${r.actual}</td>
                <td style="padding: 6px; font-weight: 700; color: ${r.passed ? '#34d399' : '#f87171'};">${r.passed ? 'PASSED' : 'FAILED'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };
}

// Initial Bootstrapping
function init() {
  try {
    setupPanZoom();
    setupImportModal();
    setupHeaderActions();
    setupPresetsBar();
    setupKeyboardShortcuts();
    setupSampleChecksModal();
    renderApp();
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


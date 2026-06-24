import { GRID_DATA, ROWS, TOTAL_CANNONS } from './grid-data';

export function getDebugHTML(simulatorUrl?: string): string {
  const wsUrl = simulatorUrl || 'ws://localhost:3000';
  // Build grid rows with headers
  let gridInner = '';
  // Column headers
  gridInner += '<div class="corner"></div>';
  for (let c = 1; c <= 7; c++) gridInner += `<div class="col-header">${c}</div>`;

  // Data rows
  for (let r = 0; r < 7; r++) {
    gridInner += `<div class="row-header">${ROWS[r]}</div>`;
    for (let c = 0; c < 7; c++) {
      const cell = GRID_DATA[r * 7 + c];
      const pcClass = cell.pc === 1 ? 'pc1' : 'pc2';
      const options = Array.from({ length: TOTAL_CANNONS }, (_, i) =>
        `<option value="${i}">zone ${i}</option>`
      ).join('');
      gridInner += `
        <div class="cell ${pcClass}" id="cell-${cell.gridIndex}" data-index="${cell.gridIndex}" onclick="toggleCell(${cell.gridIndex})">
          <div class="cell-name">${cell.name}</div>
          <div class="cell-serial">${cell.serial}</div>
          <div class="cell-projector">p${cell.projectorIndex}</div>
          <select class="zone-select" id="zone-${cell.gridIndex}" onchange="assignZone(${cell.gridIndex}, this.value)" onclick="event.stopPropagation()">
            <option value="-1">\u2014</option>
            ${options}
          </select>
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wavegrid Debug \u2014 Zone Mapper</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #0a0a12;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Fira Code', monospace;
  min-height: 100vh;
  padding: 20px;
}
h1 {
  text-align: center;
  font-size: 1.4rem;
  margin-bottom: 12px;
  color: #fff;
}
.toolbar {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.toolbar button, .toolbar select {
  background: #1a1a2e;
  border: 1px solid #333;
  color: #e0e0e0;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}
.toolbar button:hover { background: #2a2a4e; }

.orientation-bar {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.orientation-bar label { font-size: 0.8rem; color: #888; }
.orientation-bar select {
  background: #1a1a2e;
  border: 1px solid #333;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.grid-container {
  display: grid;
  grid-template-columns: 40px repeat(7, 1fr);
  grid-template-rows: 40px repeat(7, 1fr);
  gap: 4px;
  max-width: 900px;
  margin: 0 auto;
}
.col-header, .row-header {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
  color: #888;
}
.corner { }

.cell {
  border-radius: 8px;
  padding: 8px 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.cell.pc1 { background: #2d4a3a; border: 1px solid #3a6a4a; }
.cell.pc2 { background: #2a3050; border: 1px solid #3a4a6a; }
.cell.on { box-shadow: 0 0 20px rgba(255, 255, 255, 0.6); }
.cell.on.pc1 { background: #4a8a5a; border-color: #6aba7a; }
.cell.on.pc2 { background: #4a5a8a; border-color: #6a7aba; }
.cell:hover { transform: scale(1.03); }
.cell.flash { animation: flash-pulse 0.5s ease-in-out; }

@keyframes flash-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 30px rgba(255, 255, 0, 0.9); background: #ffd700 !important; }
}

.cell-name { font-weight: bold; font-size: 1rem; }
.cell-serial { font-size: 0.65rem; color: #aaa; }
.cell-projector { font-size: 0.7rem; color: #7a9; }
.zone-select {
  width: 70px;
  font-size: 0.65rem;
  background: #111;
  border: 1px solid #444;
  color: #ccc;
  border-radius: 3px;
  padding: 2px;
  margin-top: 2px;
}
.zone-select:focus { border-color: #6af; outline: none; }

.status-bar {
  text-align: center;
  margin-top: 16px;
  font-size: 0.8rem;
  color: #666;
}
.status-bar .connected { color: #5a5; }
.status-bar .disconnected { color: #a55; }

.export-panel {
  max-width: 900px;
  margin: 20px auto 0;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  display: none;
}
.export-panel.visible { display: block; }
.export-panel textarea {
  width: 100%;
  height: 200px;
  background: #0a0a0a;
  color: #6f6;
  border: 1px solid #333;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75rem;
  padding: 8px;
  resize: vertical;
}
.legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 12px;
  font-size: 0.75rem;
}
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-swatch { width: 12px; height: 12px; border-radius: 3px; }
.legend-swatch.pc1 { background: #2d4a3a; border: 1px solid #3a6a4a; }
.legend-swatch.pc2 { background: #2a3050; border: 1px solid #3a4a6a; }
</style>
</head>
<body>
<h1>Wavegrid Debug \u2014 Zone Mapper</h1>

<div class="legend">
  <div class="legend-item"><div class="legend-swatch pc1"></div> PC1 (cols 1\u20133)</div>
  <div class="legend-item"><div class="legend-swatch pc2"></div> PC2 (cols 4\u20137)</div>
</div>

<div class="toolbar">
  <button onclick="allOn()">All On</button>
  <button onclick="allOff()">All Off</button>
  <button onclick="flashSequence()">Flash Sequence</button>
  <button onclick="toggleExport()">Export JSON</button>
  <button onclick="importJSON()">Import JSON</button>
  <button onclick="autoAssignIdentity()">Auto-Assign (Identity)</button>
</div>

<div class="orientation-bar">
  <label>Origin corner:</label>
  <select id="origin-select" onchange="setOrigin(this.value)">
    <option value="top-left">Top-Left (A1)</option>
    <option value="top-right">Top-Right (A7)</option>
    <option value="bottom-left">Bottom-Left (G1)</option>
    <option value="bottom-right">Bottom-Right (G7)</option>
  </select>
  <label style="margin-left: 16px;">Order:</label>
  <select id="order-select" onchange="setOrder(this.value)">
    <option value="row-major">Row-major (across rows)</option>
    <option value="col-major">Column-major (down columns)</option>
  </select>
</div>

<div class="grid-container">
  ${gridInner}
</div>

<div class="status-bar">
  <span id="ws-status" class="disconnected">\u25cf Disconnected</span>
  <span style="margin-left: 16px;">Simulator: <span id="sim-url">${wsUrl}</span></span>
</div>

<div class="export-panel" id="export-panel">
  <textarea id="export-json" readonly></textarea>
</div>

<script>
const TOTAL = ${TOTAL_CANNONS};
const gridData = ${JSON.stringify(GRID_DATA)};
const cellStates = new Array(TOTAL).fill(false);
const zoneMap = new Array(TOTAL).fill(-1);

let ws = null;
let origin = 'top-left';
let order = 'row-major';

function connectWS() {
  const url = document.getElementById('sim-url').textContent;
  try {
    ws = new WebSocket(url);
    ws.onopen = () => {
      document.getElementById('ws-status').textContent = '\\u25cf Connected';
      document.getElementById('ws-status').className = 'connected';
    };
    ws.onclose = () => {
      document.getElementById('ws-status').textContent = '\\u25cf Disconnected';
      document.getElementById('ws-status').className = 'disconnected';
      setTimeout(connectWS, 2000);
    };
    ws.onerror = () => ws.close();
  } catch(e) {
    setTimeout(connectWS, 2000);
  }
}
connectWS();

function sendCommand(msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function toggleCell(index) {
  cellStates[index] = !cellStates[index];
  updateCellUI(index);
  if (cellStates[index]) {
    sendCommand({ type: 'cannon', index, h: 0, s: 0, b: 100 });
  } else {
    sendCommand({ type: 'cannon', index, h: 0, s: 0, b: 0 });
  }
}

function updateCellUI(index) {
  const el = document.getElementById('cell-' + index);
  if (cellStates[index]) el.classList.add('on');
  else el.classList.remove('on');
}

function assignZone(gridIndex, zoneValue) {
  zoneMap[gridIndex] = parseInt(zoneValue);
}

function allOn() {
  for (let i = 0; i < TOTAL; i++) { cellStates[i] = true; updateCellUI(i); }
  sendCommand({ type: 'scene', name: 'white' });
}

function allOff() {
  for (let i = 0; i < TOTAL; i++) { cellStates[i] = false; updateCellUI(i); }
  sendCommand({ type: 'scene', name: 'off' });
}

async function flashSequence() {
  for (let i = 0; i < TOTAL; i++) {
    sendCommand({ type: 'scene', name: 'off' });
    await sleep(100);
    sendCommand({ type: 'cannon', index: i, h: 60, s: 100, b: 100 });
    const el = document.getElementById('cell-' + i);
    el.classList.add('flash');
    cellStates[i] = true; updateCellUI(i);
    await sleep(500);
    el.classList.remove('flash');
    cellStates[i] = false; updateCellUI(i);
  }
  sendCommand({ type: 'scene', name: 'off' });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setOrigin(val) { origin = val; }
function setOrder(val) { order = val; }

function getTraversalOrder() {
  const rOrder = [0,1,2,3,4,5,6];
  const cOrder = [0,1,2,3,4,5,6];
  if (origin === 'bottom-left' || origin === 'bottom-right') rOrder.reverse();
  if (origin === 'top-right' || origin === 'bottom-right') cOrder.reverse();
  const indices = [];
  if (order === 'row-major') {
    for (const r of rOrder) for (const c of cOrder) indices.push(r * 7 + c);
  } else {
    for (const c of cOrder) for (const r of rOrder) indices.push(r * 7 + c);
  }
  return indices;
}

function autoAssignIdentity() {
  const traversal = getTraversalOrder();
  for (let zone = 0; zone < TOTAL; zone++) {
    const gridIndex = traversal[zone];
    zoneMap[gridIndex] = zone;
    const select = document.getElementById('zone-' + gridIndex);
    if (select) select.value = String(zone);
  }
}

function toggleExport() {
  const panel = document.getElementById('export-panel');
  panel.classList.toggle('visible');
  if (panel.classList.contains('visible')) {
    const mapping = gridData.map((cell, i) => ({
      gridIndex: cell.gridIndex,
      name: cell.name,
      row: cell.row,
      col: cell.col,
      serial: cell.serial,
      projectorIndex: cell.projectorIndex,
      pc: cell.pc,
      assignedZone: zoneMap[i],
    }));
    const exportObj = {
      version: 1,
      origin,
      order,
      totalCannons: TOTAL,
      gridColumns: 7,
      gridRows: 7,
      mapping,
    };
    document.getElementById('export-json').value = JSON.stringify(exportObj, null, 2);
  }
}

function importJSON() {
  const json = prompt('Paste mapping JSON:');
  if (!json) return;
  try {
    const obj = JSON.parse(json);
    if (obj.origin) { origin = obj.origin; document.getElementById('origin-select').value = origin; }
    if (obj.order) { order = obj.order; document.getElementById('order-select').value = order; }
    if (Array.isArray(obj.mapping)) {
      for (const entry of obj.mapping) {
        if (typeof entry.gridIndex === 'number' && typeof entry.assignedZone === 'number') {
          zoneMap[entry.gridIndex] = entry.assignedZone;
          const select = document.getElementById('zone-' + entry.gridIndex);
          if (select) select.value = String(entry.assignedZone);
        }
      }
    }
  } catch(e) {
    alert('Invalid JSON: ' + e.message);
  }
}
</script>
</body>
</html>`;
}

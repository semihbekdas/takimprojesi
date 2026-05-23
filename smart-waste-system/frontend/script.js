const API_BASE = 'http://127.0.0.1:5001/api';
const EEM_BIN_ID = 'B01';

// ─── DÜZ KOORDİNAT HARİTASI ─────────────────────────────────────
const map = document.getElementById('map');
let markers = {};
let roadNodeMarkers = {};
let routeLayer = null;
let roadLayer = null;
let activeMapPopup = null;

function clampCoord(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
}

function mapLeft(x) {
    return `${clampCoord(x)}%`;
}

function mapTop(y) {
    return `${100 - clampCoord(y)}%`;
}

function lineAttrs(a, b) {
    return `x1="${clampCoord(a.x)}" y1="${100 - clampCoord(a.y)}" x2="${clampCoord(b.x)}" y2="${100 - clampCoord(b.y)}"`;
}

function setupCoordinateMap() {
    if (!map) return;
    map.classList.add('coord-map');
    map.innerHTML = `
        <div class="coord-map-title">X/Y Koordinat Haritası</div>
        <div class="axis-label x-axis">X →</div>
        <div class="axis-label y-axis">Y ↑</div>
        <div class="tick tick-x-0">0</div>
        <div class="tick tick-x-50">50</div>
        <div class="tick tick-x-100">100</div>
        <div class="tick tick-y-0">0</div>
        <div class="tick tick-y-50">50</div>
        <div class="tick tick-y-100">100</div>
        <svg class="map-svg" id="road-layer" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
        <svg class="map-svg" id="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
        <div id="road-node-layer"></div>
        <div id="bin-marker-layer"></div>
        <div id="truck-marker-layer"></div>
        <div id="map-popup" class="map-popup hidden"></div>
    `;
    roadLayer = document.getElementById('road-layer');
    routeLayer = document.getElementById('route-layer');
    activeMapPopup = document.getElementById('map-popup');
}

function clearRouteLayer() {
    if (routeLayer) routeLayer.innerHTML = '';
}

function setMapPosition(el, x, y) {
    el.style.left = mapLeft(x);
    el.style.top = mapTop(y);
}

function showMapPopup(html, x, y) {
    if (!activeMapPopup) return;
    activeMapPopup.innerHTML = html;
    activeMapPopup.classList.remove('hidden');
    activeMapPopup.style.left = mapLeft(x);
    activeMapPopup.style.top = mapTop(y);
}

function hideMapPopup() {
    if (!activeMapPopup) return;
    activeMapPopup.classList.add('hidden');
    activeMapPopup.innerHTML = '';
}

setupCoordinateMap();

// ─── GÖREVLİ FİLOSU ──────────────────────────────────────────────
let trucks = []; // [{id, pos:{x,y}, el, busy, completed:Set, color}]
let workerStepDelayMs = 60;

const TRUCK_COLORS = ['#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63'];

function setTruckStatus(truck, text) {
    truck.status = text;
    if (truck.el) truck.el.setAttribute('title', `Araç ${truck.id}: ${text}`);
}

function createTrucks(count) {
    const layer = document.getElementById('truck-marker-layer');
    if (!layer) return;
    layer.innerHTML = '';
    trucks = [];
    for (let i = 0; i < count; i++) {
        const color = TRUCK_COLORS[i % TRUCK_COLORS.length];
        const el = document.createElement('div');
        el.className = 'truck-marker';
        el.innerHTML = `<span class="truck-icon">🚛</span><span class="truck-badge" style="background:${color}">${i + 1}</span>`;
        setMapPosition(el, 0, 0);
        layer.appendChild(el);

        const truck = {
            id: i + 1,
            pos: { x: 0, y: 0 },
            el,
            busy: false,
            completed: new Set(),
            color,
            status: 'Depoda bekliyor',
        };
        el.addEventListener('click', () => {
            showMapPopup(`<b>🚛 Araç ${truck.id}</b><br>${truck.status}`, truck.pos.x, truck.pos.y);
        });
        setTruckStatus(truck, 'Depoda bekliyor');
        trucks.push(truck);
    }
}

createTrucks(1);

function anyTruckBusy() {
    return trucks.some(t => t.busy);
}

// ─── LOG ──────────────────────────────────────────────────────────
const logs = [];
function log(msg) {
    const t = new Date().toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    logs.unshift(`[${t}] ${msg}`);
    if (logs.length > 30) logs.pop();
    const el = document.getElementById('log-panel');
    if (el) el.innerHTML = logs.map(l => `<div class="log-entry">${l}</div>`).join('');
}

// ─── ANİMASYON ───────────────────────────────────────────────────
function moveTruck(truck, toX, toY, steps = 40) {
    return new Promise(resolve => {
        const [fromX, fromY] = [truck.pos.x, truck.pos.y];
        let i = 0;
        const timer = setInterval(() => {
            i++;
            const p = i / steps;
            const cx = fromX + (toX - fromX) * p;
            const cy = fromY + (toY - fromY) * p;
            setMapPosition(truck.el, cx, cy);
            if (i >= steps) {
                clearInterval(timer);
                truck.pos = { x: toX, y: toY };
                resolve();
            }
        }, workerStepDelayMs);
    });
}

async function moveTruckAlongNodes(truck, nodes) {
    for (const node of nodes || []) {
        if (!node) continue;
        if (Math.abs(node.x - truck.pos.x) < 0.01 && Math.abs(node.y - truck.pos.y) < 0.01) continue;
        await moveTruck(truck, node.x, node.y);
    }
}

async function moveTruckToRoadNode(truck, targetNode) {
    try {
        const url = `${API_BASE}/road-path?start_x=${truck.pos.x}&start_y=${truck.pos.y}&target_node=${targetNode}`;
        const r = await fetch(url);
        const data = await r.json();
        await moveTruckAlongNodes(truck, data.path_coordinates || []);
    } catch (e) {
        console.error(`Araç ${truck.id} yol dönüş hatası:`, e);
    }
}

function appendRoutePolyline(points, color = '#3498db', extraClass = '') {
    if (!routeLayer || points.length < 2) return;
    const polylinePoints = points
        .map(p => `${clampCoord(p.x)},${100 - clampCoord(p.y)}`)
        .join(' ');
    routeLayer.insertAdjacentHTML(
        'beforeend',
        `<polyline class="route-line ${extraClass}" style="stroke:${color}" points="${polylinePoints}"></polyline>`
    );
}

function buildRoutePoints(data, start) {
    const nodeMap = {};
    (data.road_path || []).forEach(n => { nodeMap[n.node_id] = n; });

    const routePoints = [{ x: start.x, y: start.y }];
    (data.route || []).forEach((step, idx) => {
        const pathNodes = step.path_nodes_from_previous || [];
        const startIdx = idx === 0 ? 0 : 1;
        for (let i = startIdx; i < pathNodes.length; i++) {
            const node = nodeMap[pathNodes[i]];
            if (!node) continue;
            const last = routePoints[routePoints.length - 1];
            if (last && Math.abs(last.y - node.y) < 0.01 && Math.abs(last.x - node.x) < 0.01) continue;
            routePoints.push({ x: node.x, y: node.y });
        }
    });
    return routePoints;
}

function drawRoutePolyline(points, color = '#3498db') {
    clearRouteLayer();
    appendRoutePolyline(points, color);
}

async function drawAssignmentRoutes(assignments) {
    clearRouteLayer();
    await Promise.all(assignments.map(async (ids, i) => {
        if (!ids.length) return;
        const truck = trucks[i];
        const idsStr = ids.join(',');
        try {
            const url = `${API_BASE}/route/road?start_x=${truck.pos.x}&start_y=${truck.pos.y}&start_name=Ara%C3%A7%20${truck.id}&bin_ids=${idsStr}`;
            const r = await fetch(url);
            const route = await r.json();
            const points = buildRoutePoints(route, truck.pos);
            appendRoutePolyline(points, truck.color, 'truck-route-line');
        } catch (e) {
            console.error(`Araç ${truck?.id || i + 1} rota çizim hatası:`, e);
        }
    }));
}

// ─── ROTA HESAPLAMA ──────────────────────────────────────────────
async function calculateRoute() {
    try {
        const start = trucks.length > 0 ? trucks[0].pos : { x: 0, y: 0 };
        const startName = (start.x === 0 && start.y === 0) ? 'Depo' : `Araç%201`;
        const url = `${API_BASE}/route/road?start_x=${start.x}&start_y=${start.y}&start_name=${startName}`;
        const response = await fetch(url);
        const data = await response.json();

        clearRouteLayer();
        const infoDiv = document.getElementById('route-panel');

        if (!data.route || data.route.length === 0) {
            infoDiv.innerHTML = `<p>✅ Toplanması gereken kutu yok.</p>`;
            return;
        }

        const routePoints = buildRoutePoints(data, start);
        drawRoutePolyline(routePoints);

        let html = `<h3>Rota Özeti</h3>`;
        html += `<p>📍 Başlangıç: <b>${data.start.name}</b> <span class="muted">(${data.start.road_node})</span></p>`;
        html += `<p>📏 Toplam Yol Mesafesi: <b>${data.total_distance}</b> m</p>`;
        html += `<p class="muted" style="font-size:0.75rem">${data.message || ''}</p><ul>`;

        data.route.forEach((step, i) => {
            const s = step.current_status === 'critical' ? '🔴 Kritik' : '🟡 Toplanmalı';
            const seg = step.road_distance_from_previous != null ? ` <span class="muted">+${step.road_distance_from_previous}m</span>` : '';
            const pickupTag = step.picked_up_on_route ? ' <span class="muted">(yol üstü)</span>' : '';
            html += `<li>${i + 1}. ${step.bin_id} – ${step.name} (${s})${pickupTag}${seg}</li>`;
        });

        html += `</ul>`;
        infoDiv.innerHTML = html;

    } catch (err) {
        console.error('Rota hatası:', err);
    }
}

// ─── FİLO DÖNGÜSÜ ────────────────────────────────────────────────
function pointDistance(a, b) {
    const dx = Number(a.x || 0) - Number(b.x || 0);
    const dy = Number(a.y || 0) - Number(b.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
}

function nearestAssignedDistance(assignedBins, candidate) {
    if (!assignedBins.length) return pointDistance({ x: 0, y: 0 }, candidate);
    return Math.min(...assignedBins.map(bin => pointDistance(bin, candidate)));
}

function buildBalancedAssignments(routeBins, truckCount) {
    const assignments = Array.from({ length: truckCount }, () => []);
    if (!routeBins.length || truckCount === 0) return assignments;

    const activeTruckCount = Math.min(truckCount, routeBins.length);
    const maxLoad = Math.ceil(routeBins.length / activeTruckCount);
    const minLoad = Math.floor(routeBins.length / activeTruckCount);
    const remaining = routeBins.slice();

    // Seed trucks with geographically separated bins. Nearby bins then tend
    // to stay with the same truck instead of being split just by list order.
    for (let truckIndex = 0; truckIndex < activeTruckCount; truckIndex++) {
        let pickIndex = 0;
        if (truckIndex > 0) {
            const seeded = assignments.flat();
            let bestScore = -Infinity;
            remaining.forEach((bin, idx) => {
                const distanceFromSeeds = Math.min(...seeded.map(seed => pointDistance(seed, bin)));
                const priorityBoost = bin.current_status === 'critical' ? 8 : 0;
                const score = distanceFromSeeds + priorityBoost;
                if (score > bestScore) {
                    bestScore = score;
                    pickIndex = idx;
                }
            });
        }
        assignments[truckIndex].push(remaining.splice(pickIndex, 1)[0]);
    }

    remaining.forEach(bin => {
        let bestTruck = 0;
        let bestScore = Infinity;

        for (let i = 0; i < activeTruckCount; i++) {
            if (assignments[i].length >= maxLoad) continue;

            const proximity = nearestAssignedDistance(assignments[i], bin);
            const loadPenalty = assignments[i].length * 16;
            const underloadedBonus = assignments[i].length < minLoad ? -12 : 0;
            const score = proximity + loadPenalty + underloadedBonus;

            if (score < bestScore) {
                bestScore = score;
                bestTruck = i;
            }
        }

        assignments[bestTruck].push(bin);
    });

    return assignments.map(group => group.map(bin => bin.bin_id));
}

async function runFleetCycle() {
    if (anyTruckBusy()) { log('⚠️ Araçlar zaten çalışıyor!'); return; }
    const statusEl = document.getElementById('worker-status-val');
    if (statusEl) statusEl.textContent = trucks.length > 1 ? `${trucks.length} araç turda` : 'Turda';

    let globalRoute;
    try {
        const r = await fetch(`${API_BASE}/route/road?start_x=0&start_y=0&start_name=Depo`);
        globalRoute = await r.json();
    } catch (e) {
        console.error('Global rota hatası:', e);
        if (statusEl) statusEl.textContent = 'Depoda';
        return;
    }

    const uniqueRoute = [];
    const seenBins = new Set();
    (globalRoute.route || []).forEach(bin => {
        if (!bin.bin_id || seenBins.has(bin.bin_id)) return;
        seenBins.add(bin.bin_id);
        uniqueRoute.push(bin);
    });

    if (uniqueRoute.length === 0) {
        log('✅ Toplanacak kutu yok.');
        if (statusEl) statusEl.textContent = 'Depoda';
        return;
    }

    const assignments = buildBalancedAssignments(uniqueRoute, trucks.length);

    const assignedIds = assignments.flat();
    if (new Set(assignedIds).size !== assignedIds.length) {
        log('⚠️ Tekrarlı görev ataması engellendi.');
    }

    log(`🚛 ${trucks.length} araç ${uniqueRoute.length} farklı kutuyu dengeli paylaşıyor`);
    assignments.forEach((ids, i) => {
        if (ids.length) log(`   Araç ${i + 1}: ${ids.join(', ')}`);
    });

    await drawAssignmentRoutes(assignments);

    await Promise.all(trucks.map((truck, i) => runSingleTruckCycle(truck, assignments[i])));

    try { await fetch(`${API_BASE}/worker/reset`, { method: 'POST' }); } catch {}

    log('🏁 Tüm araçlar depoda. Tur tamamlandı.');
    document.getElementById('route-panel').innerHTML = `<p>✅ Tur tamamlandı.</p>`;
    if (statusEl) statusEl.textContent = 'Depoda';
}

async function runSingleTruckCycle(truck, assignedBinIds) {
    truck.completed = new Set();
    const assigned = Array.from(new Set(assignedBinIds || []));
    if (assigned.length === 0) {
        setTruckStatus(truck, 'Bu turda iş yok');
        return;
    }
    truck.busy = true;
    const idsStr = assigned.join(',');
    const MAX_ITER = 20;

    for (let iter = 0; iter < MAX_ITER; iter++) {
        let route;
        try {
            const url = `${API_BASE}/route/road?start_x=${truck.pos.x}&start_y=${truck.pos.y}&start_name=Ara%C3%A7%20${truck.id}&bin_ids=${idsStr}`;
            const r = await fetch(url);
            route = await r.json();
        } catch (e) {
            console.error(`Araç ${truck.id} rota hatası:`, e);
            break;
        }

        if (!route.route || route.route.length === 0) break;
        const target = route.route.find(b => assigned.includes(b.bin_id) && !truck.completed.has(b.bin_id));
        if (!target) break;

        log(`🚛${truck.id} → ${target.bin_id} (${target.name}) %${target.current_fill_level}`);
        setTruckStatus(truck, `Hedef: ${target.bin_id} – ${target.name}`);

        const nodeMap = {};
        (route.road_path || []).forEach(n => { nodeMap[n.node_id] = n; });

        const waypoints = (target.path_nodes_from_previous || [])
            .map(nodeId => nodeMap[nodeId])
            .filter(Boolean);
        await moveTruckAlongNodes(truck, waypoints);

        truck.completed.add(target.bin_id);
        log(`🚛${truck.id} ✅ ${target.bin_id} toplandı`);
        setTruckStatus(truck, `${target.road_node} yol noktasında topluyor: ${target.bin_id}`);

        try {
            await fetch(`${API_BASE}/worker/collect/${target.bin_id}`, { method: 'POST' });
        } catch { /* sessiz */ }

        await new Promise(r => setTimeout(r, 400));
        lastBinData = null;
        await fetchBins();
    }

    if (Math.abs(truck.pos.x) >= 0.01 || Math.abs(truck.pos.y) >= 0.01) {
        await moveTruckToRoadNode(truck, 'DEPOT');
    }
    setTruckStatus(truck, 'Depoda bekliyor');
    truck.busy = false;
    log(`🏠 Araç ${truck.id} depoya döndü`);
}

// ─── VERİ GÜNCELLEME ─────────────────────────────────────────────
let lastBinData = null;

async function fetchBins() {
    try {
        const r = await fetch(`${API_BASE}/bins`);
        const bins = await r.json();

        const signature = JSON.stringify(bins.map(b => ({ id: b.bin_id, s: b.current_status, f: b.current_fill_level })));
        if (signature === lastBinData) return;
        lastBinData = signature;

        updateMap(bins);
        updateBinList(bins);
        await fetchDashboard();
    } catch (err) {
        // sessiz
    }
}

function statusColor(status) {
    return {
        normal: '#2ecc71',
        needs_collection: '#f39c12',
        critical: '#e74c3c',
    }[status] || '#2ecc71';
}

function updateMap(bins) {
    const layer = document.getElementById('bin-marker-layer');
    if (!layer) return;
    layer.innerHTML = '';
    markers = {};

    bins.forEach(bin => {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = `bin-marker ${bin.current_status}`;
        marker.style.setProperty('--bin-color', statusColor(bin.current_status));
        marker.innerHTML = `<span>${bin.bin_id}</span>`;
        setMapPosition(marker, bin.x, bin.y);

        const statusLabel = { critical: '🔴 Kritik', needs_collection: '🟡 Toplanmalı', normal: '🟢 Normal' };
        const eemBadge = bin.bin_id === EEM_BIN_ID ? '<span class="eem-badge">⚡ EEM</span>' : '';
        const resetControl = bin.bin_id === EEM_BIN_ID
            ? '<span class="eem-note">B01 sadece EEM sinyaliyle değişir</span>'
            : `<button class="btn-reset-bin" data-bin-id="${bin.bin_id}">Bu kutuyu sıfırla</button>`;
        const progress = `
            <div class="progress">
                <div class="progress-bar" style="width:${bin.current_fill_level}%"></div>
            </div>
        `;
        const popup = `
            <b>📦 ${bin.bin_id} – ${bin.name}</b> ${eemBadge}<br>
            📍 ${bin.location}<br>
            🧭 X:${bin.x} / Y:${bin.y}<br>
            🗑️ Doluluk: <b>%${bin.current_fill_level}</b><br>
            ${progress}
            ⚡ Voltaj: ${bin.current_voltage}V<br>
            📊 Durum: ${statusLabel[bin.current_status] || bin.current_status}<br>
            🕐 ${bin.last_updated}<br>
            ${resetControl}
        `;

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            showMapPopup(popup, bin.x, bin.y);
        });

        markers[bin.bin_id] = marker;
        layer.appendChild(marker);
    });
}

function updateStatsFromDashboard(dashboard) {
    document.getElementById('total-bins').innerText = dashboard.total_bins ?? 0;
    document.getElementById('normal-bins').innerText = dashboard.normal ?? 0;
    document.getElementById('warning-bins').innerText = dashboard.needs_collection ?? 0;
    document.getElementById('critical-bins').innerText = dashboard.critical ?? 0;

    const badge = document.getElementById('status-badge');
    if (!badge || !dashboard.last_measurement_at) return;
    const last = new Date(dashboard.last_measurement_at);
    if (Number.isNaN(last.getTime())) return;

    const ageSec = (Date.now() - last.getTime()) / 1000;
    badge.classList.remove('live', 'stale');
    badge.classList.add(ageSec > 30 ? 'stale' : 'live');
}

function updateBinList(bins) {
    const container = document.getElementById('bin-list');
    if (!container) return;
    const statusLabel = { critical: 'Kritik', needs_collection: 'Toplanmalı', normal: 'Normal' };
    const statusClass = { critical: 'status red', needs_collection: 'status yellow', normal: 'status green' };
    container.innerHTML = bins.map(bin => `
        <div class="bin-item">
            <div class="bin-title">${bin.bin_id} – ${bin.name}</div>
            <div class="bin-meta">
                <span>X:${bin.x} Y:${bin.y} · %${bin.current_fill_level}</span>
                <span class="${statusClass[bin.current_status] || 'status'}">${statusLabel[bin.current_status] || bin.current_status}</span>
            </div>
        </div>
    `).join('');
}

async function fetchDashboard() {
    try {
        const r = await fetch(`${API_BASE}/dashboard`);
        const dashboard = await r.json();
        updateStatsFromDashboard(dashboard);
    } catch {
        // sessiz
    }
}

async function runRandomSimulation() {
    try {
        await fetch(`${API_BASE}/simulate/random`, { method: 'POST' });
        lastBinData = null;
        await fetchBins();
        log('⚡ Random simülasyon çalıştırıldı.');
    } catch (e) { console.error(e); }
}

async function runDemoSimulation() {
    try {
        await fetch(`${API_BASE}/simulate/demo`, { method: 'POST' });
        lastBinData = null;
        await fetchBins();
        log('🎬 Demo verisi üretildi.');
    } catch (e) { console.error(e); }
}

async function runStepSimulation() {
    try {
        await fetch(`${API_BASE}/simulate/step`, { method: 'POST' });
        lastBinData = null;
        await fetchBins();
        log('⬆️ Step simülasyonu çalıştırıldı.');
    } catch (e) { console.error(e); }
}

async function resetSystem() {
    try {
        await fetch(`${API_BASE}/reset`, { method: 'POST' });
        await fetch(`${API_BASE}/worker/reset`, { method: 'POST' });
        lastBinData = null;
        clearRouteLayer();
        hideMapPopup();
        const routePanel = document.getElementById('route-panel');
        if (routePanel) routePanel.innerHTML = `<p>Rota bekleniyor...</p>`;
        await fetchBins();
        log('↺ Sistem sıfırlandı.');
    } catch (e) { console.error(e); }
}

function setWorkerSpeed(value) {
    const speedVal = Number(value);
    const delays = { 1: 120, 2: 90, 3: 60, 4: 45, 5: 30 };
    workerStepDelayMs = delays[speedVal] || 60;
    const labels = { 1: 'Yavaş', 2: 'Yavaş', 3: 'Normal', 4: 'Hızlı', 5: 'Çok Hızlı' };
    const label = document.getElementById('speed-label');
    if (label) label.textContent = labels[speedVal] || 'Normal';
}

// ─── YOL AĞI ARKA PLANI ──────────────────────────────────────────
async function drawRoadNetworkBackground() {
    try {
        const r = await fetch(`${API_BASE}/roads`);
        const data = await r.json();
        const nodes = data.nodes || {};
        const edges = data.edges || {};

        if (roadLayer) {
            const drawn = new Set();
            const lines = [];
            Object.entries(edges).forEach(([from, neighbors]) => {
                neighbors.forEach(to => {
                    const key = [from, to].sort().join('|');
                    if (drawn.has(key)) return;
                    drawn.add(key);
                    const a = nodes[from];
                    const b = nodes[to];
                    if (!a || !b) return;
                    lines.push(`<line class="road-line" ${lineAttrs(a, b)}></line>`);
                });
            });
            roadLayer.innerHTML = lines.join('');
        }

        const nodeLayer = document.getElementById('road-node-layer');
        if (!nodeLayer) return;
        nodeLayer.innerHTML = '';
        roadNodeMarkers = {};
        Object.entries(nodes).forEach(([nid, node]) => {
            const el = document.createElement('div');
            el.className = nid === 'DEPOT' ? 'road-node depot-node' : 'road-node';
            el.textContent = nid === 'DEPOT' ? '🏭' : '';
            el.title = `${node.name} (${nid}) X:${node.x} Y:${node.y}`;
            setMapPosition(el, node.x, node.y);
            nodeLayer.appendChild(el);
            roadNodeMarkers[nid] = el;
        });
    } catch (e) {
        console.error('Yol ağı çizim hatası:', e);
    }
}

// ─── OTOMATİK GÜNCELLEME ─────────────────────────────────────────
drawRoadNetworkBackground();
fetchBins();
setInterval(() => { lastBinData = null; fetchBins(); }, 3000);
log('🟢 Sistem hazır. Veriler bekleniyor...');

if (map) {
    map.addEventListener('click', (e) => {
        if (e.target.closest('.map-popup') || e.target.closest('.bin-marker') || e.target.closest('.truck-marker')) return;
        hideMapPopup();
    });
    map.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-reset-bin');
        if (!btn) return;
        const binId = btn.getAttribute('data-bin-id');
        if (!binId) return;
        await resetBin(binId);
    });
}

async function resetBin(binId) {
    try {
        await fetch(`${API_BASE}/external-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bin_id: binId,
                fill_level: 0,
                timestamp: new Date().toISOString().slice(0, 19)
            })
        });
        lastBinData = null;
        await fetchBins();
        hideMapPopup();
        log(`🧹 ${binId} sıfırlandı.`);
    } catch (e) {
        console.error(e);
    }
}

async function fetchEemSignal(samples = 51) {
    try {
        const r = await fetch(`${API_BASE}/electronics-signal?samples=${samples}`);
        const data = await r.json();
        renderEemChart(data);
        initEemSlider(data);
    } catch (e) {
        console.error(e);
    }
}

function renderEemChart(data) {
    const canvas = document.getElementById('eem-chart');
    if (!canvas || !data || !data.samples) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 260;
    const height = canvas.height || 120;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const samples = data.samples;
    const tMin = data.t_min ?? 0;
    const tMax = data.t_max ?? 10;
    const vMax = 5;

    ctx.clearRect(0, 0, width, height);

    const thresholdV = data.threshold_voltage ?? 2.5;
    const thY = height - (thresholdV / vMax) * (height - 10) - 5;
    ctx.strokeStyle = '#f39c12';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, thY);
    ctx.lineTo(width, thY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((p, i) => {
        const x = ((p.t - tMin) / (tMax - tMin)) * (width - 10) + 5;
        const y = height - (p.voltage / vMax) * (height - 10) - 5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

function initEemSlider(data) {
    const slider = document.getElementById('eem-slider');
    const meta = document.getElementById('eem-meta');
    if (!slider || !meta || !data) return;

    const tMin = data.t_min ?? 0;
    const tMax = data.t_max ?? 10;
    slider.min = tMin;
    slider.max = tMax;
    slider.step = 0.1;

    let debounce = null;
    slider.addEventListener('input', () => {
        const t = Number(slider.value);
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(async () => {
            try {
                const r = await fetch(`${API_BASE}/electronics-signal/apply?bin_id=${EEM_BIN_ID}&t=${t}` , { method: 'POST' });
                const res = await r.json();
                const dataPoint = res.data || {};
                meta.textContent = `t=${t.toFixed(1)}s · V=${(dataPoint.voltage ?? 0).toFixed(2)}V · %${dataPoint.fill_level ?? 0}`;
                lastBinData = null;
                await fetchBins();
            } catch (e) {
                console.error(e);
            }
        }, 150);
    });
}

async function applyFullEemSignal() {
    try {
        await fetch(`${API_BASE}/simulate/electronics?bin_id=${EEM_BIN_ID}&samples=21`, { method: 'POST' });
        lastBinData = null;
        await fetchBins();
        log('⚡ EEM sinyali B01 için uygulandı.');
    } catch (e) {
        console.error(e);
    }
}

const eemApplyAllBtn = document.getElementById('btn-eem-apply-all');
if (eemApplyAllBtn) eemApplyAllBtn.addEventListener('click', applyFullEemSignal);

fetchEemSignal();

// ─── BUTONLAR ────────────────────────────────────────────────────
const demoBtn = document.getElementById('btn-demo');
if (demoBtn) demoBtn.addEventListener('click', runDemoSimulation);

const randomBtn = document.getElementById('btn-random');
if (randomBtn) randomBtn.addEventListener('click', runRandomSimulation);

const stepBtn = document.getElementById('btn-step');
if (stepBtn) stepBtn.addEventListener('click', runStepSimulation);

const routeBtn = document.getElementById('btn-route');
if (routeBtn) routeBtn.addEventListener('click', calculateRoute);

const workerBtn = document.getElementById('btn-worker');
if (workerBtn) workerBtn.addEventListener('click', () => runFleetCycle());

const resetBtn = document.getElementById('btn-reset');
if (resetBtn) resetBtn.addEventListener('click', resetSystem);

const speedSlider = document.getElementById('speed-slider');
if (speedSlider) {
    setWorkerSpeed(speedSlider.value);
    speedSlider.addEventListener('input', (e) => setWorkerSpeed(e.target.value));
}

const truckCountInput = document.getElementById('truck-count');
if (truckCountInput) {
    truckCountInput.addEventListener('change', (e) => {
        if (anyTruckBusy()) {
            log('⚠️ Araçlar çalışırken sayı değiştirilemez.');
            e.target.value = trucks.length;
            return;
        }
        let n = parseInt(e.target.value, 10);
        if (!Number.isFinite(n) || n < 1) n = 1;
        if (n > 5) n = 5;
        e.target.value = n;
        createTrucks(n);
        log(`🚛 Filo ${n} araç olarak yapılandırıldı.`);
    });
}

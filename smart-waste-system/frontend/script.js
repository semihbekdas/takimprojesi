const API_BASE = 'http://127.0.0.1:5001/api';
const EEM_BIN_ID = 'B01';

// ─── HARİTA KURULUMU ─────────────────────────────────────────────
const map = L.map('map', { crs: L.CRS.Simple, minZoom: -2 });
const bounds = [[0, 0], [100, 100]];
map.fitBounds(bounds);
L.imageOverlay('campus_map.png', bounds).addTo(map);

let markers   = {};
let routeLayer = null;

// ─── İKONLAR ─────────────────────────────────────────────────────
function makeDot(color, size = 20, extraClass = '') {
    return L.divIcon({
        className: '',
        html: `<div class="marker-dot ${extraClass}" style="width:${size}px;height:${size}px;background:${color};box-shadow:0 0 8px ${color}88;"></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

const icons = {
    normal:           makeDot('#2ecc71', 20, 'normal'),
    needs_collection: makeDot('#f39c12', 20, 'needs'),
    critical:         makeDot('#e74c3c', 26, 'critical')
};

// Depo markeri
L.marker([0, 0], {
    icon: L.divIcon({
        className: '',
        html: `<div style="
            width:26px;height:26px;background:#34495e;
            border-radius:5px;border:3px solid #ecf0f1;
            box-shadow:0 2px 8px rgba(0,0,0,0.6);
            display:flex;align-items:center;justify-content:center;
            font-size:14px;
        ">🏭</div>`,
        iconSize: [26,26], iconAnchor:[13,13]
    })
}).bindPopup('<b>🏭 Depo</b><br>Başlangıç / Bitiş Noktası').addTo(map);

// ─── GÖREVLİ FİLOSU ──────────────────────────────────────────────
// Birden çok araç destekleniyor. UI'daki "Araç Sayısı" input'u bu listeyi
// yeniden oluşturur. Tüm araçlar (0,0) depodan başlar; runFleetCycle()
// rotadaki kutuları round-robin olarak araçlara böler ve hepsini paralel
// çalıştırır.
let trucks = []; // [{id, pos:{x,y}, marker, busy, completed:Set}]
let workerStepDelayMs = 60;

const TRUCK_COLORS = ['#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63'];

function createTrucks(count) {
    trucks.forEach(t => map.removeLayer(t.marker));
    trucks = [];
    for (let i = 0; i < count; i++) {
        const color = TRUCK_COLORS[i % TRUCK_COLORS.length];
        const marker = L.marker([0, 0], {
            icon: L.divIcon({
                className: '',
                html: `<div style="position:relative;font-size:28px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.7))">🚛<span style="position:absolute;top:-6px;right:-8px;background:${color};color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #0f1117;">${i+1}</span></div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            }),
            zIndexOffset: 1000 + i
        }).addTo(map);
        marker.bindPopup(`<b>🚛 Araç ${i+1}</b><br>Depoda bekliyor`);
        trucks.push({
            id: i + 1,
            pos: { x: 0, y: 0 },
            marker,
            busy: false,
            completed: new Set(),
            color,
        });
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
        const t = setInterval(() => {
            i++;
            const p = i / steps;
            const cx = fromX + (toX - fromX) * p;
            const cy = fromY + (toY - fromY) * p;
            truck.marker.setLatLng([cy, cx]);
            if (i >= steps) {
                clearInterval(t);
                truck.pos = { x: toX, y: toY };
                resolve();
            }
        }, workerStepDelayMs);
    });
}

// ─── ROTA HESAPLAMA (yol ağı üzerinden, depodan önizleme) ────────
// /api/route/road çağırır. Polyline saf yol ağı traversalını gösterir;
// kutuya off-road hop polyline'da çizilmez (zigzag/V efekti olmasın diye).
// Bin'lerin nerede toplandığı zaten marker'lar üzerinden görünüyor.
async function calculateRoute() {
    try {
        // Filo varsa ilk aracın pozisyonundan, yoksa depodan
        const start = trucks.length > 0 ? trucks[0].pos : { x: 0, y: 0 };
        const startName = (start.x === 0 && start.y === 0) ? 'Depo' : `Araç%201`;
        const url = `${API_BASE}/route/road?start_x=${start.x}&start_y=${start.y}&start_name=${startName}`;
        const response = await fetch(url);
        const data = await response.json();

        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

        const infoDiv = document.getElementById('route-panel');

        if (!data.route || data.route.length === 0) {
            infoDiv.innerHTML = `<p>✅ Toplanması gereken kutu yok.</p>`;
            return;
        }

        // road_path waypoints'ten node id → koordinat lookup'ı
        const nodeMap = {};
        (data.road_path || []).forEach(n => { nodeMap[n.node_id] = n; });

        // Polyline: sadece yol ağı waypoints'leri. Tekrar eden node'ları atla.
        const latlngs = [[start.y, start.x]];
        data.route.forEach((step, idx) => {
            const pathNodes = step.path_nodes_from_previous || [];
            // İlk durağın ilk node'u start_node (workerPos'a en yakın), onu da dahil et.
            // Sonraki durakların ilk node'u = önceki durağın road_node'u = duplicate, atla.
            const startIdx = idx === 0 ? 0 : 1;
            for (let i = startIdx; i < pathNodes.length; i++) {
                const node = nodeMap[pathNodes[i]];
                if (!node) continue;
                const last = latlngs[latlngs.length - 1];
                if (last && Math.abs(last[0] - node.y) < 0.01 && Math.abs(last[1] - node.x) < 0.01) continue;
                latlngs.push([node.y, node.x]);
            }
        });

        let html = `<h3>Rota Özeti</h3>`;
        html += `<p>📍 Başlangıç: <b>${data.start.name}</b> <span class="muted">(${data.start.road_node})</span></p>`;
        html += `<p>📏 Toplam Yol Mesafesi: <b>${data.total_distance}</b> m</p>`;
        html += `<p class="muted" style="font-size:0.75rem">${data.message || ''}</p><ul>`;

        data.route.forEach((step, i) => {
            const s = step.current_status === 'critical' ? '🔴 Kritik' : '🟡 Toplanmalı';
            const seg = step.road_distance_from_previous != null ? ` <span class="muted">+${step.road_distance_from_previous}m</span>` : '';
            html += `<li>${i+1}. ${step.bin_id} – ${step.name} (${s})${seg}</li>`;
        });

        html += `</ul>`;
        infoDiv.innerHTML = html;

        routeLayer = L.polyline(latlngs, {
            color: '#3498db', weight: 4, opacity: 0.9
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });

    } catch (err) {
        console.error('Rota hatası:', err);
    }
}

// ─── FİLO DÖNGÜSÜ ────────────────────────────────────────────────
// Çoklu araç. Önce global rota çekilir (depodan, tüm kutular için);
// kutular round-robin olarak araçlara bölünür; her araç kendi
// `bin_ids` filtresi ile /api/route/road çağırıp kendi rotasını
// yürür. Tüm araçlar Promise.all ile paralel.
async function runFleetCycle() {
    if (anyTruckBusy()) { log('⚠️ Araçlar zaten çalışıyor!'); return; }
    const statusEl = document.getElementById('worker-status-val');
    if (statusEl) statusEl.textContent = trucks.length > 1 ? `${trucks.length} araç turda` : 'Turda';

    // Global rotadan kutu listesi çek (önceliklendirme buradan geliyor: critical-first)
    let globalRoute;
    try {
        const r = await fetch(`${API_BASE}/route/road?start_x=0&start_y=0&start_name=Depo`);
        globalRoute = await r.json();
    } catch (e) {
        console.error('Global rota hatası:', e);
        if (statusEl) statusEl.textContent = 'Depoda';
        return;
    }

    if (!globalRoute.route || globalRoute.route.length === 0) {
        log('✅ Toplanacak kutu yok.');
        if (statusEl) statusEl.textContent = 'Depoda';
        return;
    }

    // Round-robin: kritik kutular ilk araçlara dağıtılır
    const assignments = trucks.map(() => []);
    globalRoute.route.forEach((bin, i) => {
        assignments[i % trucks.length].push(bin.bin_id);
    });

    log(`🚛 ${trucks.length} araç ${globalRoute.route.length} kutu paylaşıyor`);
    assignments.forEach((ids, i) => {
        if (ids.length) log(`   Araç ${i+1}: ${ids.join(', ')}`);
    });

    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

    // Paralel
    await Promise.all(trucks.map((truck, i) => runSingleTruckCycle(truck, assignments[i])));

    // Hepsi bittiğinde worker_service state'ini temizle
    try { await fetch(`${API_BASE}/worker/reset`, { method: 'POST' }); } catch {}

    log('🏁 Tüm araçlar depoda. Tur tamamlandı.');
    document.getElementById('route-panel').innerHTML = `<p>✅ Tur tamamlandı.</p>`;
    if (statusEl) statusEl.textContent = 'Depoda';
}

async function runSingleTruckCycle(truck, assignedBinIds) {
    truck.completed = new Set();
    if (assignedBinIds.length === 0) {
        truck.marker.setPopupContent(`<b>🚛 Araç ${truck.id}</b><br>Bu turda iş yok`);
        return;
    }
    truck.busy = true;
    const idsStr = assignedBinIds.join(',');
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
        const target = route.route.find(b => !truck.completed.has(b.bin_id));
        if (!target) break;

        log(`🚛${truck.id} → ${target.bin_id} (${target.name}) %${target.current_fill_level}`);
        truck.marker.setPopupContent(`<b>🚛 Araç ${truck.id}</b><br>Hedef: ${target.bin_id} – ${target.name}`);

        const nodeMap = {};
        (route.road_path || []).forEach(n => { nodeMap[n.node_id] = n; });

        // Yol ağı waypoint'lerini sırayla yürü
        const waypoints = target.path_nodes_from_previous || [];
        for (let i = 0; i < waypoints.length; i++) {
            const node = nodeMap[waypoints[i]];
            if (!node) continue;
            if (Math.abs(node.x - truck.pos.x) < 0.01 && Math.abs(node.y - truck.pos.y) < 0.01) continue;
            await moveTruck(truck, node.x, node.y);
        }

        // Off-road hop: kutunun fiili konumuna
        if (Math.abs(target.x - truck.pos.x) >= 0.01 || Math.abs(target.y - truck.pos.y) >= 0.01) {
            await moveTruck(truck, target.x, target.y);
        }

        truck.completed.add(target.bin_id);
        log(`🚛${truck.id} ✅ ${target.bin_id} toplandı`);
        truck.marker.setPopupContent(`<b>🚛 Araç ${truck.id}</b><br>Toplama yapılıyor: ${target.bin_id}`);

        try {
            await fetch(`${API_BASE}/worker/collect/${target.bin_id}`, { method: 'POST' });
        } catch { /* sessiz */ }

        // Toplama sonrası kutunun road_node'una geri dön — sonraki iterasyon
        // find_nearest_node tutarlılığı için (aksi halde aynı road_node'a geri
        // dönmek yerine farklı en yakın node bulup zigzag yapabilir).
        if (target.road_node && nodeMap[target.road_node]) {
            const rn = nodeMap[target.road_node];
            if (Math.abs(rn.x - truck.pos.x) >= 0.01 || Math.abs(rn.y - truck.pos.y) >= 0.01) {
                await moveTruck(truck, rn.x, rn.y);
            }
        }

        await new Promise(r => setTimeout(r, 400));
        lastBinData = null;
        await fetchBins();
    }

    // Depoya dön
    if (Math.abs(truck.pos.x) >= 0.01 || Math.abs(truck.pos.y) >= 0.01) {
        await moveTruck(truck, 0, 0);
    }
    truck.marker.setPopupContent(`<b>🚛 Araç ${truck.id}</b><br>Depoda bekliyor`);
    truck.busy = false;
    log(`🏠 Araç ${truck.id} depoya döndü`);
}

// ─── VERİ GÜNCELLEME ─────────────────────────────────────────────
let lastBinData = null; // değişim kontrolü için

async function fetchBins() {
    try {
        const r = await fetch(`${API_BASE}/bins`);
        const bins = await r.json();

        const signature = JSON.stringify(bins.map(b => ({ id: b.bin_id, s: b.current_status, f: b.current_fill_level })));
        if (signature === lastBinData) return; // değişim yoksa haritayı yeniden çizme
        lastBinData = signature;

        updateMap(bins);
        updateBinList(bins);
        await fetchDashboard();
    } catch (err) {
        // sessiz
    }
}

function updateMap(bins) {
    Object.values(markers).forEach(m => map.removeLayer(m));
    markers = {};

    bins.forEach(bin => {
        const icon = icons[bin.current_status] || icons['normal'];
        const statusLabel = { critical: '🔴 Kritik', needs_collection: '🟡 Toplanmalı', normal: '🟢 Normal' };
        const eemBadge = bin.bin_id === EEM_BIN_ID ? '<span class="eem-badge">⚡ EEM</span>' : '';
        const progress = `
            <div class="progress">
                <div class="progress-bar" style="width:${bin.current_fill_level}%"></div>
            </div>
        `;

        const popup = `
            <b>📦 ${bin.bin_id} – ${bin.name}</b> ${eemBadge}<br>
            📍 ${bin.location}<br>
            🗑️ Doluluk: <b>%${bin.current_fill_level}</b><br>
            ${progress}
            ⚡ Voltaj: ${bin.current_voltage}V<br>
            📊 Durum: ${statusLabel[bin.current_status] || bin.current_status}<br>
            🕐 ${bin.last_updated}<br>
            <button class="btn-reset-bin" data-bin-id="${bin.bin_id}">Bu kutuyu sıfırla</button>
        `;
        markers[bin.bin_id] = L.marker([bin.y, bin.x], { icon }).bindPopup(popup).addTo(map);
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
                <span>%${bin.current_fill_level} doluluk</span>
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
        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
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
// Ulaş'ın road_network'ünü gri çizgilerle göster — worker'ın neden
// belirli güzergahları izlediği görsel olarak anlaşılır olsun diye.
async function drawRoadNetworkBackground() {
    try {
        const r = await fetch(`${API_BASE}/roads`);
        const data = await r.json();
        const nodes = data.nodes || {};
        const edges = data.edges || {};

        const drawn = new Set();
        Object.entries(edges).forEach(([from, neighbors]) => {
            neighbors.forEach(to => {
                const key = [from, to].sort().join('|');
                if (drawn.has(key)) return;
                drawn.add(key);
                const a = nodes[from];
                const b = nodes[to];
                if (!a || !b) return;
                L.polyline([[a.y, a.x], [b.y, b.x]], {
                    color: '#7a7f8e', weight: 2, opacity: 0.35
                }).addTo(map);
            });
        });

        Object.entries(nodes).forEach(([nid, node]) => {
            if (nid === 'DEPOT') return; // depo zaten ayrı marker
            L.circleMarker([node.y, node.x], {
                radius: 3, color: '#888', fillColor: '#555',
                fillOpacity: 0.55, weight: 1
            }).bindTooltip(`${node.name} (${nid})`, { permanent: false }).addTo(map);
        });
    } catch (e) {
        console.error('Yol ağı çizim hatası:', e);
    }
}

// ─── OTOMATİK GÜNCELLEME ─────────────────────────────────────────
drawRoadNetworkBackground();
fetchBins();
setInterval(() => { lastBinData = null; fetchBins(); }, 3000); // her 3sn zorla kontrol
log('🟢 Sistem hazır. Veriler bekleniyor...');

map.on('popupopen', (e) => {
    const root = e.popup.getElement();
    if (!root) return;
    const btn = root.querySelector('.btn-reset-bin');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const binId = btn.getAttribute('data-bin-id');
        if (!binId) return;
        await resetBin(binId);
    });
});

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

    // Threshold line
    const thresholdV = data.threshold_voltage ?? 2.5;
    const thY = height - (thresholdV / vMax) * (height - 10) - 5;
    ctx.strokeStyle = '#f39c12';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, thY);
    ctx.lineTo(width, thY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Signal line
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

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

// ─── GÖREVLİ ARAÇ ────────────────────────────────────────────────
let workerPos = { x: 0, y: 0 }; // latlng = [y, x]

const workerMarker = L.marker([0, 0], {
    icon: L.divIcon({
        className: '',
        html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.7))">🚛</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    }),
    zIndexOffset: 1000
}).addTo(map);
workerMarker.bindPopup('<b>🚛 Atık Toplama Aracı</b><br>Depoda bekliyor');

let workerBusy = false;
let workerStepDelayMs = 60;

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
function moveWorker(toX, toY, steps = 40) {
    return new Promise(resolve => {
        const [fromX, fromY] = [workerPos.x, workerPos.y];
        let i = 0;
        const t = setInterval(() => {
            i++;
            const p = i / steps;
            const cx = fromX + (toX - fromX) * p;
            const cy = fromY + (toY - fromY) * p;
            workerMarker.setLatLng([cy, cx]);
            if (i >= steps) {
                clearInterval(t);
                workerPos = { x: toX, y: toY };
                resolve();
            }
        }, workerStepDelayMs);
    });
}

// ─── ROTA HESAPLAMA (görevli konumundan) ─────────────────────────
async function calculateRoute() {
    try {
        const url = `${API_BASE}/route?start_x=${workerPos.x}&start_y=${workerPos.y}&start_name=${workerPos.x===0&&workerPos.y===0?'Depo':'Araç+Konumu'}`;
        const response = await fetch(url);
        const data = await response.json();

        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

        const infoDiv = document.getElementById('route-panel');

        if (!data.route || data.route.length === 0) {
            infoDiv.innerHTML = `<p>✅ Toplanması gereken kutu yok.</p>`;
            return;
        }

        // Çizgi: araç konumu → kutular
        const latlngs = [[workerPos.y, workerPos.x]];
        let html = `<h3>Rota Özeti</h3>`;
        html += `<p>📍 Başlangıç: <b>${data.start.name}</b></p>`;
        html += `<p>📏 Toplam Mesafe: <b>${data.total_distance}</b></p><ul>`;

        data.route.forEach((step, i) => {
            latlngs.push([step.y, step.x]);
            const s = step.current_status === 'critical' ? '🔴 Kritik' : '🟡 Toplanmalı';
            html += `<li>${i+1}. ${step.bin_id} – ${step.name} (${s})</li>`;
        });

        html += `</ul>`;
        infoDiv.innerHTML = html;

        routeLayer = L.polyline(latlngs, {
            color: '#3498db', weight: 3, opacity: 0.85, dashArray: '8, 6'
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });

    } catch (err) {
        console.error('Rota hatası:', err);
    }
}

// ─── GÖREVLİ DÖNGÜSÜ ─────────────────────────────────────────────
async function runWorkerCycle() {
    if (workerBusy) { log('⚠️ Araç zaten çalışıyor!'); return; }
    workerBusy = true;
    const statusEl = document.getElementById('worker-status-val');
    if (statusEl) statusEl.textContent = 'Turda';

    // Güncel kutuları çek
    let bins;
    try {
        const r = await fetch(`${API_BASE}/bins`);
        bins = await r.json();
    } catch { workerBusy = false; return; }

    const toCollect = bins
        .filter(b => b.current_status === 'critical' || b.current_status === 'needs_collection')
        .sort((a, b) => {
            const p = { critical: 0, needs_collection: 1 };
            return p[a.current_status] - p[b.current_status];
        });

    if (toCollect.length === 0) {
        log('✅ Toplanacak kutu yok. Depoya dönülüyor...');
        await moveWorker(0, 0);
        workerMarker.setPopupContent('<b>🚛 Atık Toplama Aracı</b><br>Depoda bekliyor');
        if (statusEl) statusEl.textContent = 'Depoda';
        workerBusy = false;
        return;
    }

    log(`📋 ${toCollect.length} kutu sıralandı. Tur başlıyor...`);

    const visited = new Set();

    for (let i = 0; i < toCollect.length; i++) {
        const bin = toCollect[i];
        if (visited.has(bin.bin_id)) continue;

        // Yolda yeni kritik kutu ekle
        if (i > 0) {
            try {
                const r = await fetch(`${API_BASE}/bins`);
                const fresh = await r.json();
                fresh.filter(b =>
                    b.current_status === 'critical' &&
                    !visited.has(b.bin_id) &&
                    !toCollect.some(tc => tc.bin_id === b.bin_id)
                ).forEach(b => {
                    toCollect.splice(i, 0, b);
                    log(`🚨 Yeni kritik: ${b.bin_id} (${b.name}) sıraya eklendi!`);
                });
            } catch { /* sessiz */ }
        }

        log(`🚛 → ${bin.bin_id} (${bin.name}) %${bin.current_fill_level} doluluk`);
        workerMarker.setPopupContent(`<b>🚛 Hareket Ediyor</b><br>Hedef: ${bin.bin_id} – ${bin.name}`);

        await moveWorker(bin.x, bin.y);
        visited.add(bin.bin_id);

        // Rotayı anlık güncelle (araç yeni konumdan)
        await calculateRoute();

        log(`✅ ${bin.bin_id} toplandı! Kutu sıfırlanıyor...`);
        workerMarker.setPopupContent(`<b>🚛 Toplama Yapılıyor</b><br>${bin.bin_id} – ${bin.name}`);

        // Kutuyu sıfırla
        try {
            await fetch(`${API_BASE}/external-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bin_id: bin.bin_id,
                    fill_level: 0,
                    timestamp: new Date().toISOString().slice(0, 19)
                })
            });
        } catch { /* sessiz */ }

        await new Promise(r => setTimeout(r, 800));
        await fetchBins();
    }

    // Depoya dön
    log(`🏁 Tüm kutular toplandı. Depoya dönülüyor...`);
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    await moveWorker(0, 0);
    workerMarker.setPopupContent('<b>🚛 Atık Toplama Aracı</b><br>Depoda bekliyor. Sonraki tur için hazır.');
    log('🏠 Araç depoya döndü.');

    document.getElementById('route-panel').innerHTML = `<p>✅ Tur tamamlandı.</p>`;
    if (statusEl) statusEl.textContent = 'Depoda';
    workerBusy = false;
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

// ─── OTOMATİK GÜNCELLEME ─────────────────────────────────────────
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
let autoSimTimer = null;
const autoToggleBtn = document.getElementById('btn-auto-toggle');
if (autoToggleBtn) {
    autoToggleBtn.addEventListener('click', async () => {
        if (autoSimTimer) {
            clearInterval(autoSimTimer);
            autoSimTimer = null;
            autoToggleBtn.textContent = '▶ Oto Simülasyon Başlat';
            log('⏸ Oto simülasyon durduruldu.');
            return;
        }
        await runRandomSimulation();
        autoSimTimer = setInterval(runRandomSimulation, 3000);
        autoToggleBtn.textContent = '⏸ Oto Simülasyon Durdur';
        log('▶ Oto simülasyon başlatıldı (3 sn).');
    });
}

const demoBtn = document.getElementById('btn-demo');
if (demoBtn) demoBtn.addEventListener('click', runDemoSimulation);

const randomBtn = document.getElementById('btn-random');
if (randomBtn) randomBtn.addEventListener('click', runRandomSimulation);

const stepBtn = document.getElementById('btn-step');
if (stepBtn) stepBtn.addEventListener('click', runStepSimulation);

const routeBtn = document.getElementById('btn-route');
if (routeBtn) routeBtn.addEventListener('click', calculateRoute);

const workerBtn = document.getElementById('btn-worker');
if (workerBtn) workerBtn.addEventListener('click', () => runWorkerCycle());

const resetBtn = document.getElementById('btn-reset');
if (resetBtn) resetBtn.addEventListener('click', resetSystem);

const speedSlider = document.getElementById('speed-slider');
if (speedSlider) {
    setWorkerSpeed(speedSlider.value);
    speedSlider.addEventListener('input', (e) => setWorkerSpeed(e.target.value));
}


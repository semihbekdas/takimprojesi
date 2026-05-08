const API_BASE = 'http://127.0.0.1:5001/api';

// ─── HARİTA KURULUMU ─────────────────────────────────────────────
const map = L.map('map', { crs: L.CRS.Simple, minZoom: -2 });
const bounds = [[0, 0], [100, 100]];
map.fitBounds(bounds);
L.imageOverlay('campus_map.png', bounds).addTo(map);

let markers   = {};
let routeLayer = null;

// ─── İKONLAR ─────────────────────────────────────────────────────
function makeDot(color, size = 20) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:${size}px;height:${size}px;
            background:${color};
            border-radius:50%;
            border:3px solid rgba(255,255,255,0.9);
            box-shadow:0 0 8px ${color}88;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

const icons = {
    normal:           makeDot('#2ecc71'),
    needs_collection: makeDot('#f39c12'),
    critical:         makeDot('#e74c3c', 26)
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

// ─── LOG ──────────────────────────────────────────────────────────
const logs = [];
function log(msg) {
    const t = new Date().toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    logs.unshift(`[${t}] ${msg}`);
    if (logs.length > 30) logs.pop();
    const el = document.getElementById('worker-log');
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
        }, 60);
    });
}

// ─── ROTA HESAPLAMA (görevli konumundan) ─────────────────────────
async function calculateRoute() {
    try {
        const url = `${API_BASE}/route?start_x=${workerPos.x}&start_y=${workerPos.y}&start_name=${workerPos.x===0&&workerPos.y===0?'Depo':'Araç+Konumu'}`;
        const response = await fetch(url);
        const data = await response.json();

        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

        const infoDiv = document.getElementById('route-info');

        if (!data.route || data.route.length === 0) {
            infoDiv.innerHTML = `<h3>Rota Özeti</h3><p>✅ Toplanması gereken kutu yok.</p>`;
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

    document.getElementById('route-info').innerHTML = `<h3>Rota Özeti</h3><p>✅ Tur tamamlandı.</p>`;
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
        updateStats(bins);
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

        const popup = `
            <b>📦 ${bin.bin_id} – ${bin.name}</b><br>
            📍 ${bin.location}<br>
            🗑️ Doluluk: <b>%${bin.current_fill_level}</b><br>
            ⚡ Voltaj: ${bin.current_voltage}V<br>
            📊 Durum: ${statusLabel[bin.current_status] || bin.current_status}<br>
            🕐 ${bin.last_updated}
        `;
        markers[bin.bin_id] = L.marker([bin.y, bin.x], { icon }).bindPopup(popup).addTo(map);
    });
}

function updateStats(bins) {
    let n = 0, w = 0, c = 0;
    bins.forEach(b => {
        if (b.current_status === 'normal') n++;
        else if (b.current_status === 'needs_collection') w++;
        else if (b.current_status === 'critical') c++;
    });
    document.getElementById('total-bins').innerText = bins.length;
    document.getElementById('normal-bins').innerText = n;
    document.getElementById('warning-bins').innerText = w;
    document.getElementById('critical-bins').innerText = c;
}

async function runSimulation() {
    try {
        await fetch(`${API_BASE}/simulate`, { method: 'POST' });
        lastBinData = null; // zorla yenile
        await fetchBins();
        log('⚡ Simülasyon çalıştırıldı. Veriler güncellendi.');
    } catch (e) { console.error(e); }
}

// ─── BUTONLAR ────────────────────────────────────────────────────
document.getElementById('btn-simulate').addEventListener('click', runSimulation);
document.getElementById('btn-route').addEventListener('click', calculateRoute);
document.getElementById('btn-worker').addEventListener('click', () => runWorkerCycle());

// ─── OTOMATİK GÜNCELLEME ─────────────────────────────────────────
fetchBins();
setInterval(() => { lastBinData = null; fetchBins(); }, 3000); // her 3sn zorla kontrol
log('🟢 Sistem hazır. Veriler bekleniyor...');

# Smart Campus Waste Management System

## Project Description
Akıllı Kampüs Atık Yönetim ve Takip Sistemi yazılım prototipi. Random/mock sensör verisi ile çalışır.

## Technologies
- Backend: Flask
- Database: SQLite
- Frontend: HTML, CSS, JS, Leaflet.js

## Folder Structure
```text
smart-waste-system/
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── sensor_simulator.py
│   ├── route_optimizer.py
│   ├── seed_data.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── database/
│   └── waste.db
├── docs/
│   ├── api_documentation.md
│   ├── test_plan.md
│   └── report_notes.md
└── README.md
```

## Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running Backend
```bash
cd backend
python app.py
# → http://127.0.0.1:5001
```

İlk çalıştırmada `smart-waste-system/database/waste.db` otomatik oluşturulur ve 8 kutu seed edilir. Sonraki çalıştırmalarda mevcut veriler korunur.

## Running Frontend
Cache sorunlarını önlemek için statik sunucu kullanın:
```bash
cd frontend
python3 -m http.server 8000
# → http://localhost:8000
```

## API Endpoints
Tam endpoint listesi ve örnek yanıtlar için bkz. [docs/api_documentation.md](docs/api_documentation.md).

Kısa özet:
- `GET /api/health`, `GET /api/bins`, `GET /api/measurements`, `GET /api/dashboard`, `GET /api/collection-bins`
- `POST /api/simulate/random | step | demo`, `POST /api/simulate/<bin_id>`, `POST /api/external-data`, `POST /api/reset`
- `GET /api/route?start_x=&start_y=&start_name=`

## Takım Görevleri
Frontend (İshak) ve rota/yol-ağı (Ulaş) için açık iş listesi: [docs/TAKIM_GOREVLERI.md](docs/TAKIM_GOREVLERI.md).

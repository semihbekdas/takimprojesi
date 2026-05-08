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
```

## Running Frontend
Open `frontend/index.html` in your browser.

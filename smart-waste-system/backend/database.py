import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'waste.db')

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bins (
        bin_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        location TEXT,
        current_fill_level INTEGER DEFAULT 0,
        current_voltage REAL DEFAULT 0,
        current_alarm INTEGER DEFAULT 0,
        current_status TEXT DEFAULT 'normal',
        last_updated TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bin_id TEXT NOT NULL,
        fill_level INTEGER NOT NULL,
        voltage REAL NOT NULL,
        alarm INTEGER NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (bin_id) REFERENCES bins(bin_id)
    )
    ''')
    
    conn.commit()
    conn.close()

def get_all_bins():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bins')
    bins = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return bins

def get_measurements():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM measurements ORDER BY timestamp DESC LIMIT 100')
    measurements = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return measurements

def get_bins_for_collection():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bins WHERE current_fill_level >= 50')
    bins = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return bins

def save_measurement(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO measurements (bin_id, fill_level, voltage, alarm, status, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['bin_id'], data['fill_level'], data['voltage'], data['alarm'], data['status'], data['timestamp']))
    
    conn.commit()
    conn.close()
    
def update_bin_status(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    UPDATE bins 
    SET current_fill_level = ?, current_voltage = ?, current_alarm = ?, current_status = ?, last_updated = ?
    WHERE bin_id = ?
    ''', (data['fill_level'], data['voltage'], data['alarm'], data['status'], data['timestamp'], data['bin_id']))
    
    conn.commit()
    conn.close()

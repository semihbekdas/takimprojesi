BINS = [
    ('B01', 'Mühendislik Fakültesi', 'Academic',  25, 75),
    ('B02', 'Kütüphane',             'Library',   50, 75),
    ('B03', 'Yemekhane',             'Cafeteria', 75, 50),
    ('B04', 'Spor Salonu',           'Sports',    75, 25),
    ('B05', 'Rektörlük',             'Admin',     50, 25),
    ('B06', 'Kız Yurdu',             'Dormitory', 25, 25),
    ('B07', 'Erkek Yurdu',           'Dormitory', 75, 75),
    ('B08', 'Otopark / Merkez',      'Parking',   50, 50),
]

import database

def insert_initial_bins():
    import sqlite3
    conn = sqlite3.connect('waste.db')
    c = conn.cursor()
    c.execute("DELETE FROM bins")
    c.execute("DELETE FROM measurements")
    for bin_id, name, location, x, y in BINS:
        c.execute("""
            INSERT INTO bins (bin_id, name, location, x, y,
                current_fill_level, current_voltage, current_alarm, current_status, last_updated)
            VALUES (?, ?, ?, ?, ?, 10, 0.5, 0, 'normal', datetime('now'))
        """, (bin_id, name, location, x, y))
    conn.commit()
    conn.close()

if __name__ == '__main__':
    database.init_db()
    insert_initial_bins()
    print("Bins inserted with new campus coordinates.")

import random
from datetime import datetime

def calculate_status(fill_level):
    if fill_level >= 80:
        return "critical"
    elif fill_level >= 50:
        return "needs_collection"
    return "normal"

def generate_sensor_data(bin_id):
    fill_level = random.randint(0, 100)
    voltage = round((fill_level / 100) * 5, 2)
    alarm = 1 if fill_level >= 50 else 0
    status = calculate_status(fill_level)

    return {
        "bin_id": bin_id,
        "fill_level": fill_level,
        "voltage": voltage,
        "alarm": alarm,
        "status": status,
        "timestamp": datetime.now().isoformat(timespec="seconds")
    }

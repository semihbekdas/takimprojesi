import random
from datetime import datetime


def calculate_status(fill_level):
    if fill_level >= 80:
        return "critical"
    elif fill_level >= 50:
        return "needs_collection"
    return "normal"


def _build_data(bin_id, fill_level):
    fill_level = max(0, min(100, int(fill_level)))
    voltage = round((fill_level / 100) * 5, 2)
    alarm = 1 if fill_level >= 50 else 0
    return {
        "bin_id": bin_id,
        "fill_level": fill_level,
        "voltage": voltage,
        "alarm": alarm,
        "status": calculate_status(fill_level),
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    }


def generate_sensor_data(bin_id):
    return generate_random_data(bin_id)


def generate_random_data(bin_id):
    return _build_data(bin_id, random.randint(0, 100))


def generate_step_data(bin_id, current_fill_level, min_step=3, max_step=12):
    increment = random.randint(min_step, max_step)
    return _build_data(bin_id, current_fill_level + increment)


def generate_demo_distribution(bins):
    """Return a list of sensor payloads guaranteeing at least one critical and
    two needs_collection bins, with the rest normal. Order is shuffled so the
    same physical bins don't always land in the same bucket."""
    if not bins:
        return []

    shuffled = bins.copy()
    random.shuffle(shuffled)

    payloads = []
    for index, bin_row in enumerate(shuffled):
        if index == 0:
            fill = random.randint(85, 100)
        elif index in (1, 2):
            fill = random.randint(55, 75)
        else:
            fill = random.randint(5, 40)
        payloads.append(_build_data(bin_row["bin_id"], fill))
    return payloads

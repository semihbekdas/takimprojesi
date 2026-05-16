"""EEM ekibinin LTspice transient çıkışını okuyup voltage <-> fill_level
dönüşümleri sağlayan modül. Sinyal `backend/data/electronics_signal.tsv`
dosyasındadır; ilk istekte bellek içine yüklenir ve tekrar okunmaz.
"""

import bisect
import os
from typing import List, Tuple

SIGNAL_PATH = os.path.join(os.path.dirname(__file__), 'data', 'electronics_signal.tsv')

VOLTAGE_TO_FILL = 20  # 5V tam doluluk → fill_level = round(V * 20)
THRESHOLD_V = 2.5     # EEM tasarımındaki referans gerilimi

_samples: List[Tuple[float, float]] | None = None
_times: List[float] | None = None


def _load() -> None:
    global _samples, _times
    if _samples is not None:
        return
    samples: List[Tuple[float, float]] = []
    with open(SIGNAL_PATH, 'r') as fh:
        for line in fh:
            parts = line.split()
            if len(parts) != 2:
                continue
            try:
                t = float(parts[0])
                v = float(parts[1])
            except ValueError:
                continue
            samples.append((t, v))
    if not samples:
        raise RuntimeError(f"electronics signal empty or unreadable: {SIGNAL_PATH}")
    samples.sort(key=lambda p: p[0])
    _samples = samples
    _times = [t for t, _ in samples]


def time_bounds() -> Tuple[float, float]:
    _load()
    return _samples[0][0], _samples[-1][0]


def get_voltage_at(t: float) -> float:
    """Verilen t saniyesinde sinyalin voltajını lineer interpolasyonla döndürür."""
    _load()
    t_min, t_max = _samples[0][0], _samples[-1][0]
    if t <= t_min:
        return _samples[0][1]
    if t >= t_max:
        return _samples[-1][1]
    idx = bisect.bisect_left(_times, t)
    t0, v0 = _samples[idx - 1]
    t1, v1 = _samples[idx]
    if t1 == t0:
        return v1
    return v0 + (v1 - v0) * (t - t0) / (t1 - t0)


def to_fill_level(voltage: float) -> int:
    fill = round(voltage * VOLTAGE_TO_FILL)
    return max(0, min(100, fill))


def get_series(num_samples: int = 21) -> List[dict]:
    """Sinyalden eşit aralıklı num_samples kadar nokta döndürür. Grafik için.
    `above_threshold` fill_level >= 50 kuralı ile belirlenir; bu, sistemin
    geri kalanındaki `alarm = 1 if fill_level >= 50` mantığıyla aynıdır ve
    eşik geçişinde 2.5V floating-point hassasiyet farkını ortadan kaldırır.
    """
    _load()
    if num_samples < 2:
        num_samples = 2
    t_min, t_max = _samples[0][0], _samples[-1][0]
    step = (t_max - t_min) / (num_samples - 1)
    points = []
    for i in range(num_samples):
        t = t_min + step * i
        v = get_voltage_at(t)
        fill = to_fill_level(v)
        points.append({
            "t": round(t, 3),
            "voltage": round(v, 3),
            "fill_level": fill,
            "above_threshold": fill >= 50,
        })
    return points


def sample_count() -> int:
    _load()
    return len(_samples)

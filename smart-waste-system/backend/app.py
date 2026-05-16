from datetime import datetime, timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS
import database
import electronics_signal
import seed_data
import sensor_simulator
import route_optimizer

ELECTRONICS_DEFAULT_BIN = "B01"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

database.init_db()
seed_data.insert_initial_bins()


def _persist(data):
    database.save_measurement(data)
    database.update_bin_status(data)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})


@app.route('/api/bins', methods=['GET'])
def get_bins():
    return jsonify(database.get_all_bins())


@app.route('/api/measurements', methods=['GET'])
def get_measurements():
    return jsonify(database.get_measurements())


@app.route('/api/collection-bins', methods=['GET'])
def collection_bins():
    return jsonify(database.get_bins_for_collection())


@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    stats = database.get_status_counts()
    stats["collection_queue"] = len(database.get_bins_for_collection())
    return jsonify(stats)


@app.route('/api/simulate', methods=['POST'])
def simulate_all():
    return _simulate_random()


@app.route('/api/simulate/random', methods=['POST'])
def simulate_random():
    return _simulate_random()


def _simulate_random():
    bins = database.get_all_bins()
    generated = []
    for bin_row in bins:
        data = sensor_simulator.generate_random_data(bin_row['bin_id'])
        _persist(data)
        generated.append(data)
    return jsonify({"mode": "random", "count": len(generated), "data": generated})


@app.route('/api/simulate/step', methods=['POST'])
def simulate_step():
    bins = database.get_all_bins()
    generated = []
    for bin_row in bins:
        data = sensor_simulator.generate_step_data(
            bin_row['bin_id'],
            bin_row.get('current_fill_level', 0) or 0,
        )
        _persist(data)
        generated.append(data)
    return jsonify({"mode": "step", "count": len(generated), "data": generated})


@app.route('/api/simulate/demo', methods=['POST'])
def simulate_demo():
    bins = database.get_all_bins()
    payloads = sensor_simulator.generate_demo_distribution(bins)
    for data in payloads:
        _persist(data)
    return jsonify({"mode": "demo", "count": len(payloads), "data": payloads})


@app.route('/api/simulate/<bin_id>', methods=['POST'])
def simulate_one(bin_id):
    if database.get_bin(bin_id) is None:
        return jsonify({"error": f"bin_id '{bin_id}' not found"}), 404
    data = sensor_simulator.generate_random_data(bin_id)
    _persist(data)
    return jsonify({"message": f"Simulation completed for {bin_id}", "data": data})


@app.route('/api/external-data', methods=['POST'])
def receive_external_data():
    content = request.get_json(silent=True) or {}
    bin_id = content.get('bin_id')
    fill_level = content.get('fill_level')
    timestamp = content.get('timestamp')

    if not bin_id or fill_level is None or not timestamp:
        return jsonify({"error": "Missing required fields: bin_id, fill_level, timestamp"}), 400

    try:
        fill_level = int(fill_level)
    except (TypeError, ValueError):
        return jsonify({"error": "fill_level must be an integer"}), 400

    if fill_level < 0 or fill_level > 100:
        return jsonify({"error": "fill_level must be between 0 and 100"}), 400

    if database.get_bin(bin_id) is None:
        return jsonify({"error": f"bin_id '{bin_id}' not found"}), 404

    voltage = round((fill_level / 100) * 5, 2)
    alarm = 1 if fill_level >= 50 else 0
    status = sensor_simulator.calculate_status(fill_level)

    data = {
        "bin_id": bin_id,
        "fill_level": fill_level,
        "voltage": voltage,
        "alarm": alarm,
        "status": status,
        "timestamp": timestamp,
    }
    _persist(data)
    return jsonify({"message": "External data received successfully", "data": data})


@app.route('/api/reset', methods=['POST'])
def reset_system():
    seed_data.reset_bins()
    return jsonify({"message": "System reset to initial state"})


@app.route('/api/electronics-signal', methods=['GET'])
def electronics_signal_series():
    """EEM LTspice ramp sinyalinin eşit aralıklı örneklerini döndürür.
    Yan etkisiz; grafik veya slider için kullanılır."""
    try:
        samples = int(request.args.get('samples', 21))
    except (TypeError, ValueError):
        return jsonify({"error": "samples must be an integer"}), 400
    if samples < 2 or samples > 1000:
        return jsonify({"error": "samples must be between 2 and 1000"}), 400

    t_min, t_max = electronics_signal.time_bounds()
    return jsonify({
        "source": "LTspice transient (Op-Amp comparator input)",
        "threshold_voltage": electronics_signal.THRESHOLD_V,
        "voltage_to_fill_factor": electronics_signal.VOLTAGE_TO_FILL,
        "t_min": t_min,
        "t_max": t_max,
        "sample_count_in_file": electronics_signal.sample_count(),
        "samples": electronics_signal.get_series(samples),
    })


@app.route('/api/electronics-signal/apply', methods=['POST'])
def electronics_signal_apply():
    """Belirtilen t anındaki sinyali tek bir kutuya uygular (default B01).
    Slider modu: frontend t'yi değiştirir, biz DB'ye nokta nokta yazarız."""
    payload = request.get_json(silent=True) or {}
    bin_id = (payload.get('bin_id') or request.args.get('bin_id') or ELECTRONICS_DEFAULT_BIN)
    raw_t = payload.get('t', request.args.get('t'))
    if raw_t is None:
        return jsonify({"error": "t (seconds) is required"}), 400
    try:
        t = float(raw_t)
    except (TypeError, ValueError):
        return jsonify({"error": "t must be a number"}), 400

    t_min, t_max = electronics_signal.time_bounds()
    if t < t_min or t > t_max:
        return jsonify({"error": f"t must be between {t_min} and {t_max}"}), 400

    if database.get_bin(bin_id) is None:
        return jsonify({"error": f"bin_id '{bin_id}' not found"}), 404

    voltage = electronics_signal.get_voltage_at(t)
    fill_level = electronics_signal.to_fill_level(voltage)
    data = {
        "bin_id": bin_id,
        "fill_level": fill_level,
        "voltage": round(voltage, 3),
        "alarm": 1 if fill_level >= 50 else 0,
        "status": sensor_simulator.calculate_status(fill_level),
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    }
    _persist(data)
    return jsonify({"mode": "electronics-apply", "t": t, "data": data})


@app.route('/api/simulate/electronics', methods=['POST'])
def simulate_electronics():
    """Tüm 0–10 sn LTspice serisini tek seferde DB'ye yazar. Tek kutuya
    uygulanır (default B01). Diğer kutular değişmez. Ölçüm geçmişine
    samples kadar nokta düşer, kutunun mevcut durumu son örnek olur."""
    payload = request.get_json(silent=True) or {}
    bin_id = (payload.get('bin_id') or request.args.get('bin_id') or ELECTRONICS_DEFAULT_BIN)
    try:
        samples = int(payload.get('samples', request.args.get('samples', 21)))
    except (TypeError, ValueError):
        return jsonify({"error": "samples must be an integer"}), 400
    if samples < 2 or samples > 200:
        return jsonify({"error": "samples must be between 2 and 200"}), 400

    if database.get_bin(bin_id) is None:
        return jsonify({"error": f"bin_id '{bin_id}' not found"}), 404

    series = electronics_signal.get_series(samples)
    t_min, t_max = electronics_signal.time_bounds()
    base = datetime.now() - timedelta(seconds=t_max - t_min)

    written = []
    for point in series:
        timestamp = (base + timedelta(seconds=point["t"] - t_min)).isoformat(timespec="seconds")
        data = {
            "bin_id": bin_id,
            "fill_level": point["fill_level"],
            "voltage": point["voltage"],
            "alarm": 1 if point["above_threshold"] else 0,
            "status": sensor_simulator.calculate_status(point["fill_level"]),
            "timestamp": timestamp,
        }
        _persist(data)
        written.append(data)

    return jsonify({
        "mode": "electronics-bulk",
        "bin_id": bin_id,
        "count": len(written),
        "final_state": written[-1],
    })


@app.route('/api/route', methods=['GET'])
def get_route():
    try:
        start_x = float(request.args.get('start_x', 0))
        start_y = float(request.args.get('start_y', 0))
    except (TypeError, ValueError):
        return jsonify({"error": "start_x and start_y must be numbers"}), 400
    start_name = request.args.get('start_name', 'Depo')

    start = {"x": start_x, "y": start_y, "name": start_name}
    bins = database.get_bins_for_collection()
    return jsonify(route_optimizer.calculate_route(bins, start=start))


if __name__ == '__main__':
    app.run(debug=True, port=5001)

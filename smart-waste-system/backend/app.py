from flask import Flask, jsonify, request
from flask_cors import CORS
import database
import seed_data
import sensor_simulator
import route_optimizer

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize DB and seed data
database.init_db()
seed_data.insert_initial_bins()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

@app.route('/api/bins', methods=['GET'])
def get_bins():
    bins = database.get_all_bins()
    return jsonify(bins)

@app.route('/api/measurements', methods=['GET'])
def get_measurements():
    measurements = database.get_measurements()
    return jsonify(measurements)

@app.route('/api/simulate', methods=['POST'])
def simulate_all():
    bins = database.get_all_bins()
    simulated_data = []
    for b in bins:
        data = sensor_simulator.generate_sensor_data(b['bin_id'])
        database.save_measurement(data)
        database.update_bin_status(data)
        simulated_data.append(data)
    return jsonify({"message": "Simulation completed", "data": simulated_data})

@app.route('/api/simulate/<bin_id>', methods=['POST'])
def simulate_one(bin_id):
    data = sensor_simulator.generate_sensor_data(bin_id)
    database.save_measurement(data)
    database.update_bin_status(data)
    return jsonify({"message": f"Simulation completed for {bin_id}", "data": data})

@app.route('/api/external-data', methods=['POST'])
def receive_external_data():
    content = request.json
    bin_id = content.get('bin_id')
    fill_level = content.get('fill_level')
    timestamp = content.get('timestamp')
    
    if not all([bin_id, fill_level is not None, timestamp]):
        return jsonify({"error": "Missing required fields: bin_id, fill_level, timestamp"}), 400
        
    voltage = round((fill_level / 100) * 5, 2)
    alarm = 1 if fill_level >= 50 else 0
    status = sensor_simulator.calculate_status(fill_level)
    
    data = {
        "bin_id": bin_id,
        "fill_level": fill_level,
        "voltage": voltage,
        "alarm": alarm,
        "status": status,
        "timestamp": timestamp
    }
    
    database.save_measurement(data)
    database.update_bin_status(data)
    
    return jsonify({"message": "External data received successfully", "data": data})

@app.route('/api/collection-bins', methods=['GET'])
def collection_bins():
    bins = database.get_bins_for_collection()
    return jsonify(bins)

@app.route('/api/route', methods=['GET'])
def get_route():
    # Görevlinin anlık konumunu query param olarak al
    start_x = float(request.args.get('start_x', 0))
    start_y = float(request.args.get('start_y', 0))
    start_name = request.args.get('start_name', 'Depo')

    start = {"x": start_x, "y": start_y, "name": start_name}
    bins = database.get_bins_for_collection()
    route = route_optimizer.calculate_route(bins, start=start)
    return jsonify(route)

if __name__ == '__main__':
    app.run(debug=True, port=5001)

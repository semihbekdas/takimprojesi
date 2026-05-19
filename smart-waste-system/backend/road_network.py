import heapq
from math import sqrt


ROAD_NODES = {
    "DEPOT": {"x": 0, "y": 0, "name": "Depo"},
    "GATE": {"x": 10, "y": 10, "name": "Ana Giriş"},
    "ENGINEERING": {"x": 20, "y": 25, "name": "Mühendislik"},
    "LIBRARY": {"x": 35, "y": 40, "name": "Kütüphane"},
    "CAFETERIA": {"x": 55, "y": 35, "name": "Yemekhane"},
    "SPORTS": {"x": 70, "y": 55, "name": "Spor Salonu"},
    "DORM": {"x": 85, "y": 70, "name": "Yurtlar"},
    "PARKING": {"x": 60, "y": 15, "name": "Otopark"},
    "CENTER": {"x": 45, "y": 60, "name": "Öğrenci Merkezi"},
}


ROAD_EDGES = {
    "DEPOT": ["GATE"],
    "GATE": ["DEPOT", "ENGINEERING", "PARKING"],
    "ENGINEERING": ["GATE", "LIBRARY"],
    "LIBRARY": ["ENGINEERING", "CAFETERIA", "CENTER"],
    "CAFETERIA": ["LIBRARY", "SPORTS", "PARKING"],
    "SPORTS": ["CAFETERIA", "DORM", "CENTER"],
    "DORM": ["SPORTS"],
    "PARKING": ["GATE", "CAFETERIA"],
    "CENTER": ["LIBRARY", "SPORTS"],
}


BIN_NODE_MAP = {
    "B01": "ENGINEERING",
    "B02": "LIBRARY",
    "B03": "CAFETERIA",
    "B04": "SPORTS",
    "B05": "CENTER",
    "B06": "PARKING",
    "B07": "DORM",
    "B08": "GATE",
}


def euclidean_distance(a, b):
    return sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


def road_distance(node_a, node_b):
    point_a = ROAD_NODES[node_a]
    point_b = ROAD_NODES[node_b]
    return euclidean_distance(point_a, point_b)


def find_nearest_node(x, y):
    target = {"x": float(x), "y": float(y)}

    nearest_node = None
    nearest_distance = float("inf")

    for node_id, node in ROAD_NODES.items():
        distance = euclidean_distance(target, node)

        if distance < nearest_distance:
            nearest_distance = distance
            nearest_node = node_id

    return nearest_node


def dijkstra_shortest_path(start_node, target_node):
    if start_node not in ROAD_NODES:
        raise ValueError(f"Başlangıç node bulunamadı: {start_node}")

    if target_node not in ROAD_NODES:
        raise ValueError(f"Hedef node bulunamadı: {target_node}")

    queue = [(0, start_node, [])]
    visited = set()

    while queue:
        current_distance, current_node, path = heapq.heappop(queue)

        if current_node in visited:
            continue

        visited.add(current_node)
        path = path + [current_node]

        if current_node == target_node:
            return {
                "distance": round(current_distance, 2),
                "path_nodes": path,
                "path_coordinates": nodes_to_coordinates(path),
            }

        for neighbor in ROAD_EDGES.get(current_node, []):
            if neighbor not in visited:
                distance = road_distance(current_node, neighbor)
                heapq.heappush(
                    queue,
                    (current_distance + distance, neighbor, path)
                )

    return {
        "distance": float("inf"),
        "path_nodes": [],
        "path_coordinates": [],
    }


def nodes_to_coordinates(path_nodes):
    coordinates = []

    for node_id in path_nodes:
        node = ROAD_NODES[node_id]
        coordinates.append({
            "node_id": node_id,
            "name": node["name"],
            "x": node["x"],
            "y": node["y"],
        })

    return coordinates


def normalize_bin(bin_data):
    fill_level = bin_data.get("current_fill_level", bin_data.get("fill_level", 0))
    status = bin_data.get("current_status", bin_data.get("status", "normal"))

    return {
        "bin_id": bin_data.get("bin_id"),
        "name": bin_data.get("name", ""),
        "location": bin_data.get("location", ""),
        "x": float(bin_data.get("x", 0)),
        "y": float(bin_data.get("y", 0)),
        "current_fill_level": int(fill_level or 0),
        "current_status": status,
    }


def get_bin_road_node(bin_data):
    bin_id = bin_data.get("bin_id")

    if bin_id in BIN_NODE_MAP:
        return BIN_NODE_MAP[bin_id]

    return find_nearest_node(bin_data.get("x", 0), bin_data.get("y", 0))


def filter_bins_for_collection(bins):
    result = []

    for bin_data in bins:
        bin_item = normalize_bin(bin_data)

        if (
            bin_item["current_fill_level"] >= 50
            or bin_item["current_status"] in ["needs_collection", "critical"]
        ):
            result.append(bin_item)

    return result


def calculate_real_road_route(bins, start_x=0, start_y=0, start_name="Depo"):
    collection_bins = filter_bins_for_collection(bins)

    start_node = find_nearest_node(start_x, start_y)

    if not collection_bins:
        return {
            "start": {
                "x": float(start_x),
                "y": float(start_y),
                "name": start_name,
                "road_node": start_node,
            },
            "route": [],
            "road_path": [],
            "total_distance": 0,
            "message": "Toplanması gereken kutu yok.",
        }

    remaining = collection_bins.copy()
    current_node = start_node

    route = []
    full_road_path = []
    total_distance = 0

    while remaining:
        best_bin = None
        best_path = None
        best_distance = float("inf")

        for bin_item in remaining:
            target_node = get_bin_road_node(bin_item)
            path_result = dijkstra_shortest_path(current_node, target_node)

            if path_result["distance"] < best_distance:
                best_distance = path_result["distance"]
                best_path = path_result
                best_bin = bin_item

        target_node = get_bin_road_node(best_bin)

        route.append({
            **best_bin,
            "road_node": target_node,
            "road_distance_from_previous": round(best_distance, 2),
            "path_nodes_from_previous": best_path["path_nodes"],
        })

        full_road_path.extend(best_path["path_coordinates"])
        total_distance += best_distance

        current_node = target_node
        remaining.remove(best_bin)

    return {
        "start": {
            "x": float(start_x),
            "y": float(start_y),
            "name": start_name,
            "road_node": start_node,
        },
        "route": route,
        "road_path": remove_duplicate_path_points(full_road_path),
        "total_distance": round(total_distance, 2),
        "message": "Gerçek yol ağına göre rota hesaplandı.",
    }


def remove_duplicate_path_points(points):
    cleaned = []
    seen = set()

    for point in points:
        key = (point["node_id"], point["x"], point["y"])

        if key not in seen:
            cleaned.append(point)
            seen.add(key)

    return cleaned


if __name__ == "__main__":
    test_bins = [
        {
            "bin_id": "B01",
            "name": "Mühendislik",
            "x": 20,
            "y": 25,
            "current_fill_level": 30,
            "current_status": "normal",
        },
        {
            "bin_id": "B03",
            "name": "Yemekhane",
            "x": 55,
            "y": 35,
            "current_fill_level": 82,
            "current_status": "critical",
        },
        {
            "bin_id": "B05",
            "name": "Öğrenci Merkezi",
            "x": 45,
            "y": 60,
            "current_fill_level": 64,
            "current_status": "needs_collection",
        },
    ]

    result = calculate_real_road_route(test_bins)
    print(result)

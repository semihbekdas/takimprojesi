import heapq
from math import sqrt


ROAD_NODES = {
    "DEPOT": {"x": 0, "y": 0, "name": "Depo"},
    "GATE": {"x": 10, "y": 10, "name": "Ana Giriş"},
    "B01_NODE": {"x": 25, "y": 75, "name": "Mühendislik Fakültesi"},
    "B02_NODE": {"x": 50, "y": 75, "name": "Kütüphane"},
    "B03_NODE": {"x": 75, "y": 50, "name": "Yemekhane"},
    "B04_NODE": {"x": 75, "y": 25, "name": "Spor Salonu"},
    "B05_NODE": {"x": 50, "y": 25, "name": "Rektörlük"},
    "B06_NODE": {"x": 25, "y": 25, "name": "Kız Yurdu"},
    "B07_NODE": {"x": 75, "y": 75, "name": "Erkek Yurdu"},
    "B08_NODE": {"x": 50, "y": 50, "name": "Otopark / Merkez"},
    "B09_NODE": {"x": 25, "y": 50, "name": "Sağlık Merkezi"},
    "B10_NODE": {"x": 40, "y": 90, "name": "Laboratuvar Bloğu"},
    "B11_NODE": {"x": 90, "y": 60, "name": "Sosyal Alan"},
    "B12_NODE": {"x": 90, "y": 30, "name": "Bakım Birimi"},
}


ROAD_EDGES = {
    "DEPOT": ["GATE"],
    "GATE": ["DEPOT", "B06_NODE"],
    "B06_NODE": ["GATE", "B09_NODE", "B05_NODE", "B08_NODE"],
    "B09_NODE": ["B06_NODE", "B01_NODE", "B08_NODE"],
    "B01_NODE": ["B09_NODE", "B02_NODE", "B08_NODE", "B10_NODE"],
    "B10_NODE": ["B01_NODE", "B02_NODE"],
    "B05_NODE": ["B06_NODE", "B04_NODE", "B08_NODE", "B03_NODE"],
    "B04_NODE": ["B05_NODE", "B12_NODE", "B03_NODE", "B08_NODE"],
    "B12_NODE": ["B04_NODE", "B03_NODE", "B11_NODE"],
    "B08_NODE": ["B06_NODE", "B09_NODE", "B01_NODE", "B05_NODE", "B04_NODE", "B02_NODE", "B03_NODE", "B07_NODE", "B11_NODE"],
    "B03_NODE": ["B05_NODE", "B04_NODE", "B12_NODE", "B07_NODE", "B08_NODE", "B11_NODE"],
    "B02_NODE": ["B01_NODE", "B10_NODE", "B07_NODE", "B08_NODE"],
    "B07_NODE": ["B02_NODE", "B03_NODE", "B08_NODE", "B11_NODE"],
    "B11_NODE": ["B08_NODE", "B03_NODE", "B07_NODE", "B12_NODE"],
}


BIN_NODE_MAP = {
    "B01": "B01_NODE",
    "B02": "B02_NODE",
    "B03": "B03_NODE",
    "B04": "B04_NODE",
    "B05": "B05_NODE",
    "B06": "B06_NODE",
    "B07": "B07_NODE",
    "B08": "B08_NODE",
    "B09": "B09_NODE",
    "B10": "B10_NODE",
    "B11": "B11_NODE",
    "B12": "B12_NODE",
}


def euclidean_distance(a, b):
    return sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


def road_distance(node_a, node_b):
    point_a = ROAD_NODES[node_a]
    point_b = ROAD_NODES[node_b]
    return euclidean_distance(point_a, point_b)


def bin_access_distance(node_id, bin_data):
    return euclidean_distance(ROAD_NODES[node_id], bin_data)


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


def find_bins_on_path(path_nodes, remaining_bins, exclude_bin):
    """Return collection bins whose road node is already on the chosen path.

    The last node is excluded because it belongs to the selected target. The
    order follows the vehicle's travel direction so route insertion stays
    visually natural.
    """
    if not path_nodes or len(path_nodes) < 2:
        return []

    path_order = {node_id: idx for idx, node_id in enumerate(path_nodes[:-1])}
    on_path = []

    for bin_item in remaining_bins:
        if bin_item is exclude_bin:
            continue

        bin_node = get_bin_road_node(bin_item)
        if bin_node in path_order:
            on_path.append((path_order[bin_node], bin_item))

    on_path.sort(key=lambda pair: pair[0])
    return [bin_item for _, bin_item in on_path]


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
    status_priority = {"critical": 0, "needs_collection": 1, "normal": 2}

    while remaining:
        best_bin = None
        best_path = None
        best_distance = float("inf")
        best_priority = float("inf")

        for bin_item in remaining:
            target_node = get_bin_road_node(bin_item)
            path_result = dijkstra_shortest_path(current_node, target_node)
            priority = status_priority.get(bin_item["current_status"], 99)
            access_distance = bin_access_distance(target_node, bin_item)
            candidate_distance = path_result["distance"] + access_distance * 2

            if (
                priority < best_priority
                or (priority == best_priority and candidate_distance < best_distance)
            ):
                best_priority = priority
                best_distance = candidate_distance
                best_path = path_result
                best_bin = bin_item

        target_node = get_bin_road_node(best_bin)

        on_path_bins = find_bins_on_path(
            best_path["path_nodes"],
            remaining,
            exclude_bin=best_bin,
        )

        for passing_bin in on_path_bins:
            passing_node = get_bin_road_node(passing_bin)
            sub_path = dijkstra_shortest_path(current_node, passing_node)
            access_distance = bin_access_distance(passing_node, passing_bin)
            segment_distance = sub_path["distance"] + access_distance * 2

            route.append({
                **passing_bin,
                "road_node": passing_node,
                "road_distance_from_previous": round(segment_distance, 2),
                "road_only_distance_from_previous": sub_path["distance"],
                "access_distance": round(access_distance, 2),
                "path_nodes_from_previous": sub_path["path_nodes"],
                "picked_up_on_route": True,
            })

            full_road_path.extend(sub_path["path_coordinates"])
            total_distance += segment_distance
            current_node = passing_node
            remaining.remove(passing_bin)

        final_path = dijkstra_shortest_path(current_node, target_node)
        final_access_distance = bin_access_distance(target_node, best_bin)
        final_distance = final_path["distance"] + final_access_distance * 2

        route.append({
            **best_bin,
            "road_node": target_node,
            "road_distance_from_previous": round(final_distance, 2),
            "road_only_distance_from_previous": final_path["distance"],
            "access_distance": round(final_access_distance, 2),
            "path_nodes_from_previous": final_path["path_nodes"],
        })

        full_road_path.extend(final_path["path_coordinates"])
        total_distance += final_distance

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
    last_key = None

    for point in points:
        key = (point["node_id"], point["x"], point["y"])

        if key != last_key:
            cleaned.append(point)
            last_key = key

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

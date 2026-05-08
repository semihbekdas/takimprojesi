def manhattan_distance(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])

def calculate_route(bins, start={"x": 0, "y": 0, "name": "Depo"}):
    if not bins:
        return {
            "start": start,
            "route": [],
            "total_distance": 0
        }
        
    remaining = bins.copy()
    current = start
    route = []
    total_distance = 0

    while remaining:
        nearest = min(remaining, key=lambda b: manhattan_distance(current, b))
        distance = manhattan_distance(current, nearest)
        total_distance += distance
        route.append(nearest)
        current = nearest
        remaining.remove(nearest)

    return {
        "start": start,
        "route": route,
        "total_distance": total_distance
    }

from datetime import datetime

from road_network import calculate_real_road_route


class WorkerService:
    def __init__(self):
        self.worker = {
            "id": "W01",
            "name": "Atık Toplama Aracı",
            "x": 0,
            "y": 0,
            "status": "idle",
            "current_target": None,
            "completed_bins": [],
            "last_route": None,
            "last_updated": datetime.now().isoformat(timespec="seconds"),
        }

    def get_status(self):
        return self.worker

    def reset_worker(self):
        self.worker = {
            "id": "W01",
            "name": "Atık Toplama Aracı",
            "x": 0,
            "y": 0,
            "status": "idle",
            "current_target": None,
            "completed_bins": [],
            "last_route": None,
            "last_updated": datetime.now().isoformat(timespec="seconds"),
        }

        return {
            "success": True,
            "message": "Worker depoya sıfırlandı.",
            "worker": self.worker,
        }

    def create_route(self, bins):
        route_result = calculate_real_road_route(
            bins=bins,
            start_x=self.worker["x"],
            start_y=self.worker["y"],
            start_name="Worker Konumu"
        )

        self.worker["last_route"] = route_result
        self.worker["status"] = "route_ready"
        self.worker["last_updated"] = datetime.now().isoformat(timespec="seconds")

        return route_result

    def start_route(self, bins):
        route_result = self.create_route(bins)

        if not route_result["route"]:
            self.worker["status"] = "idle"
            self.worker["current_target"] = None

            return {
                "success": True,
                "message": "Toplanması gereken kutu yok.",
                "worker": self.worker,
                "route": route_result,
            }

        first_target = route_result["route"][0]

        self.worker["status"] = "working"
        self.worker["current_target"] = first_target
        self.worker["last_updated"] = datetime.now().isoformat(timespec="seconds")

        return {
            "success": True,
            "message": "Worker rotaya başladı.",
            "worker": self.worker,
            "route": route_result,
        }

    def move_to_bin(self, bin_data):
        self.worker["x"] = float(bin_data.get("x", 0))
        self.worker["y"] = float(bin_data.get("y", 0))
        self.worker["current_target"] = bin_data
        self.worker["status"] = "collecting"
        self.worker["last_updated"] = datetime.now().isoformat(timespec="seconds")

        return {
            "success": True,
            "message": f"Worker {bin_data.get('bin_id')} kutusuna ulaştı.",
            "worker": self.worker,
        }

    def complete_bin(self, bin_id):
        if bin_id not in self.worker["completed_bins"]:
            self.worker["completed_bins"].append(bin_id)

        self.worker["current_target"] = None
        self.worker["status"] = "working"
        self.worker["last_updated"] = datetime.now().isoformat(timespec="seconds")

        return {
            "success": True,
            "message": f"{bin_id} kutusu toplandı olarak işaretlendi.",
            "worker": self.worker,
        }

    def finish_route(self):
        self.worker["x"] = 0
        self.worker["y"] = 0
        self.worker["status"] = "idle"
        self.worker["current_target"] = None
        self.worker["last_updated"] = datetime.now().isoformat(timespec="seconds")

        return {
            "success": True,
            "message": "Worker rotayı tamamladı ve depoya döndü.",
            "worker": self.worker,
        }

    def simulate_full_worker_cycle(self, bins):
        route_result = self.create_route(bins)

        if not route_result["route"]:
            self.worker["status"] = "idle"
            self.worker["current_target"] = None

            return {
                "success": True,
                "message": "Toplanması gereken kutu yok.",
                "worker": self.worker,
                "route": route_result,
                "visited_bins": [],
            }

        visited_bins = []

        self.worker["status"] = "working"

        for bin_item in route_result["route"]:
            self.move_to_bin(bin_item)

            visited_bins.append({
                "bin_id": bin_item.get("bin_id"),
                "name": bin_item.get("name"),
                "x": bin_item.get("x"),
                "y": bin_item.get("y"),
                "status": bin_item.get("current_status"),
                "fill_level": bin_item.get("current_fill_level"),
                "visited_at": datetime.now().isoformat(timespec="seconds"),
            })

            self.complete_bin(bin_item.get("bin_id"))

        self.finish_route()

        return {
            "success": True,
            "message": "Worker tüm toplama turunu simüle etti.",
            "worker": self.worker,
            "route": route_result,
            "visited_bins": visited_bins,
        }


worker_service = WorkerService()

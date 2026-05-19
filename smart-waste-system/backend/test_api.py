import requests
import json


BASE_URL = "http://127.0.0.1:5001/api"


def print_title(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def print_response(response):
    print("Status Code:", response.status_code)

    try:
        data = response.json()
        print(json.dumps(data, indent=4, ensure_ascii=False))
    except Exception:
        print(response.text)


def test_health():
    print_title("TEST 1 - Health Check")

    response = requests.get(f"{BASE_URL}/health")
    print_response(response)

    assert response.status_code == 200


def test_get_bins():
    print_title("TEST 2 - Get All Bins")

    response = requests.get(f"{BASE_URL}/bins")
    print_response(response)

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_simulate():
    print_title("TEST 3 - Run Simulation")

    response = requests.post(f"{BASE_URL}/simulate")
    print_response(response)

    assert response.status_code in [200, 201]


def test_route():
    print_title("TEST 4 - Basic Route")

    response = requests.get(f"{BASE_URL}/route")
    print_response(response)

    assert response.status_code == 200

    data = response.json()
    assert "route" in data
    assert "total_distance" in data


def test_road_route():
    print_title("TEST 5 - Real Road Route")

    response = requests.get(
        f"{BASE_URL}/route/road",
        params={
            "start_x": 0,
            "start_y": 0,
            "start_name": "Depo"
        }
    )

    print_response(response)

    assert response.status_code == 200

    data = response.json()
    assert "route" in data
    assert "road_path" in data
    assert "total_distance" in data


def test_worker_status():
    print_title("TEST 6 - Worker Status")

    response = requests.get(f"{BASE_URL}/worker/status")
    print_response(response)

    assert response.status_code == 200


def test_worker_route():
    print_title("TEST 7 - Worker Route")

    response = requests.get(f"{BASE_URL}/worker/route")
    print_response(response)

    assert response.status_code == 200


def test_worker_start():
    print_title("TEST 8 - Worker Start")

    response = requests.post(f"{BASE_URL}/worker/start")
    print_response(response)

    assert response.status_code == 200


def test_worker_reset():
    print_title("TEST 9 - Worker Reset")

    response = requests.post(f"{BASE_URL}/worker/reset")
    print_response(response)

    assert response.status_code == 200


def run_all_tests():
    test_health()
    test_get_bins()
    test_simulate()
    test_get_bins()
    test_route()
    test_road_route()
    test_worker_status()
    test_worker_route()
    test_worker_start()
    test_worker_reset()

    print_title("TÜM TESTLER TAMAMLANDI")
    print("Başarılı: API temel testleri geçti.")


if __name__ == "__main__":
    try:
        run_all_tests()

    except requests.exceptions.ConnectionError:
        print("Backend çalışmıyor olabilir.")
        print("Önce şu komutu çalıştır:")
        print("python app.py")

    except AssertionError:
        print("Bir test başarısız oldu. Yukarıdaki çıktıyı kontrol et.")

    except Exception as error:
        print("Beklenmeyen hata:", error)

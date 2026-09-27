from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("Testing /api/health ...")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code}"
    print(" -> Health check OK:", r.json())

    print("Testing /api/sensors/overview ...")
    r = client.get("/api/sensors/overview")
    assert r.status_code == 200, f"Sensors overview failed: {r.status_code}"
    data = r.json()
    print(" -> Sensors overview OK: Zones count:", len(data.get("zones", [])))

    print("Testing /api/controls ...")
    r = client.get("/api/controls")
    assert r.status_code == 200, f"Controls failed: {r.status_code}"
    print(" -> Controls status OK:", r.json())

    print("Testing /api/market ...")
    r = client.get("/api/market")
    assert r.status_code == 200, f"Market failed: {r.status_code}"
    print(" -> Market items count:", len(r.json()))

    print("Testing /api/community/posts ...")
    r = client.get("/api/community/posts")
    assert r.status_code == 200, f"Community failed: {r.status_code}"
    print(" -> Community posts count:", len(r.json()))

    print("Testing /api/finance/summary ...")
    r = client.get("/api/finance/summary")
    assert r.status_code == 200, f"Finance failed: {r.status_code}"
    print(" -> Finance summary OK:", r.json())

    print("Testing /api/weather ...")
    r = client.get("/api/weather")
    assert r.status_code == 200, f"Weather failed: {r.status_code}"
    print(" -> Weather OK: Location:", r.json().get("location"))

    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY! ?")

if __name__ == "__main__":
    test_endpoints()

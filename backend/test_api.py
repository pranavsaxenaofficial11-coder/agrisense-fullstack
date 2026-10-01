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

    print("Testing /api/mongodb/status ...")
    r = client.get("/api/mongodb/status")
    assert r.status_code == 200, f"MongoDB status failed: {r.status_code}"
    print(" -> MongoDB status endpoint OK:", r.json())

    print("Testing /api/analytics/live-agroclimatic ...")
    r = client.get("/api/analytics/live-agroclimatic")
    assert r.status_code == 200, f"Agroclimatic failed: {r.status_code}"
    print(" -> Agroclimatic OK. Source:", r.json().get("source"))

    print("Testing /api/analytics/live-soil-taxonomy ...")
    r = client.get("/api/analytics/live-soil-taxonomy")
    assert r.status_code == 200, f"Soil taxonomy failed: {r.status_code}"
    print(" -> Soil Taxonomy OK. pH:", r.json().get("ph_water"), "SOC:", r.json().get("organic_carbon_g_kg"))

    print("Testing /api/analytics/live-reservoir-storage ...")
    r = client.get("/api/analytics/live-reservoir-storage")
    assert r.status_code == 200, f"Reservoir storage failed: {r.status_code}"
    print(" -> Reservoir Storage OK. Reservoirs:", len(r.json().get("reservoirs", [])))

    print("Testing /api/market/live-mandi-rates ...")
    r = client.get("/api/market/live-mandi-rates")
    assert r.status_code == 200, f"Mandi rates failed: {r.status_code}"
    print(" -> Live Mandi Rates OK. Count:", len(r.json().get("live_mandi_rates", [])))

    print("Testing /api/control-plane/state ...")
    r = client.get("/api/control-plane/state")
    assert r.status_code == 200, f"Control plane state failed: {r.status_code}"
    state = r.json()
    print(" -> Control Plane State OK. Total Pipelines:", len(state.get("pipelines", {})))

    print("Testing /api/control-plane/ai-workload ...")
    r = client.get("/api/control-plane/ai-workload")
    assert r.status_code == 200, f"AI workload failed: {r.status_code}"
    print(" -> AI Workload OK. Active Engine:", r.json().get("active_engine"))

    print("Testing /api/control-plane/pipelines/trigger ...")
    r = client.post("/api/control-plane/pipelines/trigger", json={"pipeline_id": "telemetry_ingest"})
    assert r.status_code == 200, f"Pipeline trigger failed: {r.status_code}"
    print(" -> Pipeline Trigger OK:", r.json().get("message"))

    print("\nALL BACKEND API TESTS (SQLITE + MONGODB + LIVE OPEN DATASETS + CONTROL PLANE) PASSED SUCCESSFULLY! [OK]")

if __name__ == "__main__":
    test_endpoints()



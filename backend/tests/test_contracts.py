"""Integration tests for Contract Planning Engine API."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import SessionLocal
from app.seed.seed_data import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    db = SessionLocal()
    seed_database(db)
    db.close()


def test_contract_plan_creation_and_comparison():
    # 1. Create a recommendation first
    rec_payload = {
        "cargo_type": "COKING_COAL",
        "cargo_quantity_mt": 75000,
        "origin_port_id": "NEWCASTLE_AU",
        "destination_port_id": "PARADIP_IN",
        "arrival_start_date": "2026-10-10",
        "arrival_end_date": "2026-10-20",
        "contract_preference": "SHORT_TERM_MULTIPLE_VOYAGE",
        "contract_duration_days": 90,
        "urgency": "HIGH"
    }
    rec_res = client.post("/v1/recommendations", json=rec_payload)
    rec_id = rec_res.json()["recommendation_id"]

    # 2. Create contract plan
    plan_payload = {
        "recommendation_id": rec_id,
        "contract_duration_days": 90,
        "voyage_count": 4,
        "total_cargo_quantity_mt": 300000,
        "preferred_vessel_type": "PANAMAX"
    }
    plan_res = client.post("/v1/contract-plans", json=plan_payload)
    assert plan_res.status_code == 200
    plan_data = plan_res.json()

    assert plan_data["duration_days"] == 90
    assert plan_data["voyage_count"] == 4
    assert len(plan_data["voyages_schedule"]) == 4
    assert plan_data["spot_scenario"]["total_cost_usd"] > plan_data["contract_scenario"]["total_cost_usd"]
    assert plan_data["estimated_savings_usd"] > 0
    assert plan_data["estimated_savings_percent"] > 0

    # 3. Retrieve saved plan
    get_res = client.get(f"/v1/contract-plans/{plan_data['contract_plan_id']}")
    assert get_res.status_code == 200
    assert get_res.json()["contract_plan_id"] == plan_data["contract_plan_id"]

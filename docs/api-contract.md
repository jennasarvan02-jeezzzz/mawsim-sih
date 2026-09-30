# API Contract Specification — FreightIQ

Base URL: `http://localhost:8000`  
Protocol: HTTP / JSON  
CORS: Enabled for all origins  

---

## 1. Health Check

### `GET /health`
Returns system status.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "FreightIQ API"
}
```

---

## 2. Reference Data Endpoints

### `GET /v1/ports`
Returns all ports with berth dimensions and operational handling rates.

**Response `200 OK`:**
```json
[
  {
    "id": "PARADIP_IN",
    "name": "Paradip Port",
    "country": "India",
    "port_code": "INPRP",
    "port_role": "DESTINATION",
    "latitude": 20.2644,
    "longitude": 86.6947,
    "is_mvp_supported": true,
    "source_label": "Official-source Prototype Configuration",
    "source_note": "Official-source prototype configuration — validate current berth-level operational notices before deployment.",
    "berths": [
      {
        "id": "PARADIP_B1",
        "port_id": "PARADIP_IN",
        "name": "Mechanized Coal Berth (MCB)",
        "cargo_type": "COKING_COAL",
        "max_draft_m": 14.5,
        "max_loa_m": 300.0,
        "max_beam_m": 46.0,
        "handling_rate_mt_per_day": 45000.0,
        "source_label": "Official-source Prototype Configuration",
        "last_verified_date": "2026-08-01"
      }
    ]
  }
]
```

### `GET /v1/vessel-types`
Returns dry bulk vessel categories and operational specifications.

**Response `200 OK`:**
```json
[
  {
    "id": "PANAMAX",
    "name": "Panamax / Kamsarmax",
    "min_capacity_mt": 65000.0,
    "max_capacity_mt": 85000.0,
    "typical_draft_m": 13.5,
    "typical_loa_m": 230.0,
    "typical_beam_m": 32.2,
    "speed_knots": 13.0,
    "source_label": "Prototype Assumption"
  }
]
```

---

## 3. Decision Recommendation Endpoints

### `POST /v1/recommendations`
Generates an explainable vessel charter recommendation based on parcel volume, ports, and laycan.

**Request Body:**
```json
{
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
```

**Response `200 OK`:**
```json
{
  "recommendation_id": "rec_a1b2c3d4",
  "cargo_requirement": { ... },
  "recommended_vessel_type_id": "PANAMAX",
  "recommended_vessel_name": "Panamax / Kamsarmax",
  "recommended_contract_strategy": "SHORT_TERM_MULTIPLE_VOYAGE",
  "overall_risk": "MODERATE",
  "overall_risk_score": 45.0,
  "entry_window_start": "2026-09-15",
  "entry_window_end": "2026-09-22",
  "expected_freight_rate_usd_per_mt": 28.40,
  "freight_rate_low_usd_per_mt": 26.05,
  "freight_rate_high_usd_per_mt": 30.75,
  "expected_total_cost_usd": 2320280.0,
  "freight_cost_usd": 2130000.0,
  "congestion_buffer_usd": 106500.0,
  "operational_buffer_usd": 85200.0,
  "reasons": [
    "1. Vessel Compatibility: Panamax operates with a 13.5m draft, comfortably complying with the 14.5m maximum draft limit at Paradip Port Mechanized Coal Berth.",
    "2. Capacity Optimization: The requested 75,000 MT parcel perfectly matches the 65,000–85,000 MT payload band.",
    "3. Contract Strategy: Deploying a Short-Term Multiple Voyage captures volume stability.",
    "4. Timing & Laycan: Market entry between 2026-09-15 and 2026-09-22 ensures timely positioning."
  ],
  "trend_label": "STABLE",
  "uncertainty_level": "MODERATE",
  "chart_data": [ ... ],
  "vessel_options": [
    {
      "vessel_type_id": "PANAMAX",
      "vessel_name": "Panamax / Kamsarmax",
      "feasible": true,
      "feasibility_status": "FEASIBLE",
      "estimated_rate_usd_per_mt": 28.40,
      "estimated_total_cost_usd": 2320280.0,
      "recommendation_rank": 1,
      "reasons": [ ... ]
    },
    {
      "vessel_type_id": "CAPESIZE",
      "vessel_name": "Capesize",
      "feasible": false,
      "feasibility_status": "REJECTED",
      "estimated_rate_usd_per_mt": null,
      "estimated_total_cost_usd": null,
      "recommendation_rank": null,
      "reasons": [
        "Typical draft (17.5m) exceeds destination berth limit (14.5m) at Paradip Port — vessel cannot berth fully laden."
      ]
    }
  ],
  "risk_alerts": [ ... ],
  "data_provenance": { ... },
  "created_at": "2026-08-28T12:00:00"
}
```

### `GET /v1/recommendations/{recommendation_id}`
Returns saved recommendation by ID.

### `GET /v1/recommendations/{recommendation_id}/feasibility`
Returns comprehensive port constraints, vessel geometric clearances, and transit time breakdowns.

### `GET /v1/recommendations/{recommendation_id}/risks`
Returns 0–100 risk score breakdown, risk category weightings, and structured alert cards.

---

## 4. Multi-Voyage Contract Planning Endpoints

### `POST /v1/contract-plans`
Generates a multi-voyage schedule and evaluates Repeated Spot vs Multi-Voyage Contract (COA).

**Request Body:**
```json
{
  "recommendation_id": "rec_a1b2c3d4",
  "contract_duration_days": 90,
  "voyage_count": 4,
  "total_cargo_quantity_mt": 300000,
  "preferred_vessel_type": "PANAMAX"
}
```

**Response `200 OK`:**
```json
{
  "contract_plan_id": "plan_9f8e7d6c",
  "recommendation_id": "rec_a1b2c3d4",
  "duration_days": 90,
  "voyage_count": 4,
  "total_cargo_quantity_mt": 300000.0,
  "cargo_quantity_per_voyage_mt": 75000.0,
  "vessel_type_id": "PANAMAX",
  "vessel_name": "Panamax / Kamsarmax",
  "voyages_schedule": [
    {
      "voyage_number": 1,
      "departure_window_start": "2026-09-01",
      "departure_window_end": "2026-09-06",
      "origin_port_id": "NEWCASTLE_AU",
      "destination_port_id": "PARADIP_IN",
      "cargo_quantity_mt": 75000.0,
      "estimated_cost_usd": 2044800.0,
      "risk_level": "LOW"
    }
  ],
  "spot_scenario": {
    "scenario_name": "Repeated Spot Booking",
    "total_cost_usd": 9031200.0,
    "average_rate_usd_per_mt": 30.10,
    "volatility_risk_level": "HIGH",
    "operational_reliability_pct": 65,
    "freight_buffer_applied_pct": 6.0,
    "berth_priority_guarantee": false
  },
  "contract_scenario": {
    "scenario_name": "Structured Multi-Voyage Contract (COA)",
    "total_cost_usd": 8179200.0,
    "average_rate_usd_per_mt": 27.26,
    "volatility_risk_level": "LOW",
    "operational_reliability_pct": 88,
    "freight_buffer_applied_pct": -4.0,
    "berth_priority_guarantee": true
  },
  "estimated_savings_usd": 852000.0,
  "estimated_savings_percent": 9.43,
  "reasons": [ ... ],
  "assumptions": [ ... ],
  "disclaimer": "All values are prototype scenario estimates, not commercial quotations or guaranteed savings.",
  "created_at": "2026-08-28T12:00:00"
}
```

### `GET /v1/contract-plans/{contract_plan_id}`
Returns saved contract plan by ID.

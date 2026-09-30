-- ============================================================================
-- FreightIQ — Supabase (PostgreSQL) Database Schema & Initial Reference Data
-- Smart India Hackathon 2026
-- ============================================================================

-- Drop existing placeholder tables if they were created with default UUID types
DROP TABLE IF EXISTS contract_voyages CASCADE;
DROP TABLE IF EXISTS contract_plans CASCADE;
DROP TABLE IF EXISTS risk_alerts CASCADE;
DROP TABLE IF EXISTS recommendation_options CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS cargo_requirements CASCADE;
DROP TABLE IF EXISTS port_congestion CASCADE;
DROP TABLE IF EXISTS freight_rate_history CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS vessel_types CASCADE;
DROP TABLE IF EXISTS berths CASCADE;
DROP TABLE IF EXISTS ports CASCADE;

-- 1. Ports Table
CREATE TABLE ports (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    port_code VARCHAR(32) NOT NULL,
    port_role VARCHAR(32) NOT NULL, -- 'ORIGIN' or 'DESTINATION'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_mvp_supported BOOLEAN DEFAULT TRUE,
    source_label VARCHAR(255) DEFAULT 'Official-source Prototype Configuration',
    source_note TEXT
);

-- 2. Berths Table
CREATE TABLE berths (
    id VARCHAR(64) PRIMARY KEY,
    port_id VARCHAR(64) NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cargo_type VARCHAR(64) DEFAULT 'COKING_COAL',
    max_draft_m DOUBLE PRECISION NOT NULL,
    max_loa_m DOUBLE PRECISION NOT NULL,
    max_beam_m DOUBLE PRECISION NOT NULL,
    handling_rate_mt_per_day DOUBLE PRECISION NOT NULL,
    source_label VARCHAR(255) DEFAULT 'Official-source Prototype Configuration',
    last_verified_date VARCHAR(32) DEFAULT '2026-08-01'
);

-- 3. Vessel Types Table
CREATE TABLE vessel_types (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    min_capacity_mt DOUBLE PRECISION NOT NULL,
    max_capacity_mt DOUBLE PRECISION NOT NULL,
    typical_draft_m DOUBLE PRECISION NOT NULL,
    typical_loa_m DOUBLE PRECISION NOT NULL,
    typical_beam_m DOUBLE PRECISION NOT NULL,
    speed_knots DOUBLE PRECISION NOT NULL,
    source_label VARCHAR(255) DEFAULT 'Prototype Assumption'
);

-- 4. Routes Table
CREATE TABLE routes (
    id VARCHAR(128) PRIMARY KEY,
    origin_port_id VARCHAR(64) NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
    destination_port_id VARCHAR(64) NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
    distance_nm DOUBLE PRECISION NOT NULL,
    typical_sailing_days DOUBLE PRECISION NOT NULL,
    source_label VARCHAR(255) DEFAULT 'Official-source Prototype Configuration'
);

-- 5. Freight Rate History Table
CREATE TABLE freight_rate_history (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(128) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    vessel_type_id VARCHAR(64) NOT NULL REFERENCES vessel_types(id) ON DELETE CASCADE,
    date VARCHAR(32) NOT NULL,
    rate_usd_per_mt DOUBLE PRECISION NOT NULL,
    source_label VARCHAR(255) DEFAULT 'Sample Historical Prototype Data'
);
CREATE INDEX idx_freight_history_lookup ON freight_rate_history(route_id, vessel_type_id, date);

-- 6. Port Congestion Table
CREATE TABLE port_congestion (
    id SERIAL PRIMARY KEY,
    port_id VARCHAR(64) NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
    date VARCHAR(32) NOT NULL,
    congestion_level VARCHAR(32) NOT NULL, -- 'LOW', 'MODERATE', 'HIGH'
    estimated_wait_hours DOUBLE PRECISION NOT NULL,
    source_label VARCHAR(255) DEFAULT 'Simulated Scenario Data'
);
CREATE INDEX idx_port_congestion_lookup ON port_congestion(port_id, date);

-- 7. Cargo Requirements Table
CREATE TABLE cargo_requirements (
    id VARCHAR(64) PRIMARY KEY,
    cargo_type VARCHAR(64) DEFAULT 'COKING_COAL',
    cargo_quantity_mt DOUBLE PRECISION NOT NULL,
    origin_port_id VARCHAR(64) NOT NULL REFERENCES ports(id),
    destination_port_id VARCHAR(64) NOT NULL REFERENCES ports(id),
    arrival_start_date VARCHAR(32) NOT NULL,
    arrival_end_date VARCHAR(32) NOT NULL,
    contract_preference VARCHAR(64) NOT NULL,
    contract_duration_days INTEGER DEFAULT 90,
    urgency VARCHAR(32) DEFAULT 'HIGH',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Recommendations Table
CREATE TABLE recommendations (
    id VARCHAR(64) PRIMARY KEY,
    cargo_requirement_id VARCHAR(64) NOT NULL REFERENCES cargo_requirements(id) ON DELETE CASCADE,
    recommended_vessel_type_id VARCHAR(64) NOT NULL REFERENCES vessel_types(id),
    recommended_contract_strategy VARCHAR(64) NOT NULL,
    overall_risk VARCHAR(32) NOT NULL,
    overall_risk_score DOUBLE PRECISION DEFAULT 45.0,
    entry_window_start VARCHAR(32) NOT NULL,
    entry_window_end VARCHAR(32) NOT NULL,
    expected_freight_rate_usd_per_mt DOUBLE PRECISION NOT NULL,
    freight_rate_low_usd_per_mt DOUBLE PRECISION NOT NULL,
    freight_rate_high_usd_per_mt DOUBLE PRECISION NOT NULL,
    expected_total_cost_usd DOUBLE PRECISION NOT NULL,
    reasons_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Recommendation Options Table
CREATE TABLE recommendation_options (
    id SERIAL PRIMARY KEY,
    recommendation_id VARCHAR(64) NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    vessel_type_id VARCHAR(64) NOT NULL REFERENCES vessel_types(id),
    feasible BOOLEAN NOT NULL,
    feasibility_status VARCHAR(32) NOT NULL, -- 'FEASIBLE', 'CONDITIONALLY_FEASIBLE', 'REJECTED'
    estimated_rate_usd_per_mt DOUBLE PRECISION,
    estimated_total_cost_usd DOUBLE PRECISION,
    risk_level VARCHAR(32) NOT NULL,
    recommendation_rank INTEGER,
    reasons_json TEXT NOT NULL
);

-- 10. Risk Alerts Table
CREATE TABLE risk_alerts (
    id SERIAL PRIMARY KEY,
    recommendation_id VARCHAR(64) NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    risk_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    impact TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    source_label VARCHAR(255) DEFAULT 'Simulated Scenario Data'
);

-- 11. Contract Plans Table
CREATE TABLE contract_plans (
    id VARCHAR(64) PRIMARY KEY,
    recommendation_id VARCHAR(64) NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    duration_days INTEGER DEFAULT 90,
    voyage_count INTEGER DEFAULT 4,
    total_cargo_quantity_mt DOUBLE PRECISION NOT NULL,
    vessel_type_id VARCHAR(64) NOT NULL REFERENCES vessel_types(id),
    spot_total_cost_usd DOUBLE PRECISION NOT NULL,
    contract_total_cost_usd DOUBLE PRECISION NOT NULL,
    estimated_savings_usd DOUBLE PRECISION NOT NULL,
    estimated_savings_percent DOUBLE PRECISION NOT NULL,
    spot_reliability_pct INTEGER DEFAULT 65,
    contract_reliability_pct INTEGER DEFAULT 88,
    reasons_json TEXT NOT NULL,
    assumptions_json TEXT NOT NULL,
    disclaimer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Contract Voyages Table
CREATE TABLE contract_voyages (
    id SERIAL PRIMARY KEY,
    contract_plan_id VARCHAR(64) NOT NULL REFERENCES contract_plans(id) ON DELETE CASCADE,
    voyage_number INTEGER NOT NULL,
    departure_window_start VARCHAR(32) NOT NULL,
    departure_window_end VARCHAR(32) NOT NULL,
    origin_port_id VARCHAR(64) NOT NULL,
    destination_port_id VARCHAR(64) NOT NULL,
    cargo_quantity_mt DOUBLE PRECISION NOT NULL,
    estimated_cost_usd DOUBLE PRECISION NOT NULL,
    risk_level VARCHAR(32) DEFAULT 'LOW'
);

-- ============================================================================
-- Initial Reference Seed Records
-- ============================================================================

INSERT INTO ports (id, name, country, port_code, port_role, latitude, longitude, is_mvp_supported, source_label, source_note)
VALUES 
    ('NEWCASTLE_AU', 'Port of Newcastle', 'Australia', 'AUNCW', 'ORIGIN', -32.9267, 151.7817, TRUE, 'Official-source Prototype Configuration', 'Official-source prototype configuration — validate current berth-level operational notices before deployment.'),
    ('KALIMANTAN_ID', 'Kalimantan Port (Taboneo/Balikpapan)', 'Indonesia', 'IDTBN', 'ORIGIN', -0.5022, 117.1537, TRUE, 'Official-source Prototype Configuration', 'Official-source prototype configuration — validate current berth-level operational notices before deployment.'),
    ('PARADIP_IN', 'Paradip Port', 'India', 'INPRP', 'DESTINATION', 20.2644, 86.6947, TRUE, 'Official-source Prototype Configuration', 'Official-source prototype configuration — validate current berth-level operational notices before deployment.'),
    ('VIZAG_IN', 'Visakhapatnam Port (Vizag)', 'India', 'INVTZ', 'DESTINATION', 17.6868, 83.2185, TRUE, 'Official-source Prototype Configuration', 'Official-source prototype configuration — validate current berth-level operational notices before deployment.');

INSERT INTO berths (id, port_id, name, cargo_type, max_draft_m, max_loa_m, max_beam_m, handling_rate_mt_per_day, source_label, last_verified_date)
VALUES
    ('NEWCASTLE_B1', 'NEWCASTLE_AU', 'PWCS / NCIG Coal Terminal', 'COKING_COAL', 19.0, 300.0, 50.0, 60000.0, 'Official-source Prototype Configuration', '2026-08-01'),
    ('KALIMANTAN_B1', 'KALIMANTAN_ID', 'Taboneo Offshore Anchorage Coal Terminal', 'COKING_COAL', 15.0, 250.0, 40.0, 40000.0, 'Official-source Prototype Configuration', '2026-08-01'),
    ('PARADIP_B1', 'PARADIP_IN', 'Mechanized Coal Berth (MCB)', 'COKING_COAL', 14.5, 300.0, 46.0, 45000.0, 'Official-source Prototype Configuration', '2026-08-01'),
    ('VIZAG_B1', 'VIZAG_IN', 'Outer Harbour General Cargo Berth (GCB)', 'COKING_COAL', 18.1, 300.0, 50.0, 50000.0, 'Official-source Prototype Configuration', '2026-08-01');

INSERT INTO vessel_types (id, name, min_capacity_mt, max_capacity_mt, typical_draft_m, typical_loa_m, typical_beam_m, speed_knots, source_label)
VALUES
    ('HANDYSIZE', 'Handysize', 25000.0, 40000.0, 10.5, 180.0, 30.0, 12.0, 'Prototype Assumption'),
    ('SUPRAMAX', 'Supramax', 50000.0, 60000.0, 12.5, 200.0, 32.0, 13.0, 'Prototype Assumption'),
    ('PANAMAX', 'Panamax / Kamsarmax', 65000.0, 85000.0, 13.5, 230.0, 32.2, 13.0, 'Prototype Assumption'),
    ('CAPESIZE', 'Capesize', 120000.0, 180000.0, 17.5, 290.0, 45.0, 13.0, 'Prototype Assumption');

INSERT INTO routes (id, origin_port_id, destination_port_id, distance_nm, typical_sailing_days, source_label)
VALUES
    ('NEWCASTLE_AU__PARADIP_IN', 'NEWCASTLE_AU', 'PARADIP_IN', 5600.0, 17.9, 'Official-source Prototype Configuration'),
    ('NEWCASTLE_AU__VIZAG_IN', 'NEWCASTLE_AU', 'VIZAG_IN', 5450.0, 17.5, 'Official-source Prototype Configuration'),
    ('KALIMANTAN_ID__PARADIP_IN', 'KALIMANTAN_ID', 'PARADIP_IN', 3000.0, 9.6, 'Official-source Prototype Configuration'),
    ('KALIMANTAN_ID__VIZAG_IN', 'KALIMANTAN_ID', 'VIZAG_IN', 2850.0, 9.1, 'Official-source Prototype Configuration');

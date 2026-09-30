"""Deterministic seed data generator for FreightIQ."""

import math
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.models.database import (
    Base, engine, Port, Berth, VesselType, Route, FreightRateHistory, PortCongestion
)


def init_db():
    Base.metadata.create_all(bind=engine)


def seed_database(db: Session):
    """Seed initial prototype data if tables are empty."""
    init_db()

    if db.query(Port).first():
        return  # Already seeded

    # 1. Ports
    ports_data = [
        # MVP Supported Origins
        Port(
            id="NEWCASTLE_AU",
            name="Port of Newcastle",
            country="Australia",
            port_code="AUNCW",
            port_role="ORIGIN",
            latitude=-32.9267,
            longitude=151.7817,
            is_mvp_supported=True,
            source_label=settings.PROVENANCE_OFFICIAL,
            source_note="Official-source prototype configuration — validate current berth-level operational notices before deployment."
        ),
        Port(
            id="KALIMANTAN_ID",
            name="Kalimantan Port (Taboneo/Balikpapan)",
            country="Indonesia",
            port_code="IDTBN",
            port_role="ORIGIN",
            latitude=-0.5022,
            longitude=117.1537,
            is_mvp_supported=True,
            source_label=settings.PROVENANCE_OFFICIAL,
            source_note="Official-source prototype configuration — validate current berth-level operational notices before deployment."
        ),
        # MVP Supported Destinations
        Port(
            id="PARADIP_IN",
            name="Paradip Port",
            country="India",
            port_code="INPRP",
            port_role="DESTINATION",
            latitude=20.2644,
            longitude=86.6947,
            is_mvp_supported=True,
            source_label=settings.PROVENANCE_OFFICIAL,
            source_note="Official-source prototype configuration — validate current berth-level operational notices before deployment."
        ),
        Port(
            id="VIZAG_IN",
            name="Visakhapatnam Port (Vizag)",
            country="India",
            port_code="INVTZ",
            port_role="DESTINATION",
            latitude=17.6868,
            longitude=83.2185,
            is_mvp_supported=True,
            source_label=settings.PROVENANCE_OFFICIAL,
            source_note="Official-source prototype configuration — validate current berth-level operational notices before deployment."
        ),
        # Future Coverage Ports (for prototype UI demonstration)
        Port(
            id="MAPUTO_MZ",
            name="Port of Maputo (Matola)",
            country="Mozambique",
            port_code="MZMPM",
            port_role="ORIGIN",
            latitude=-25.9692,
            longitude=32.5732,
            is_mvp_supported=False,
            source_label=settings.PROVENANCE_ASSUMPTION,
            source_note="Future Coverage — not included in active MVP analytical corridors."
        ),
        Port(
            id="HAMPTON_ROADS_US",
            name="Norfolk / Hampton Roads",
            country="United States",
            port_code="USORF",
            port_role="ORIGIN",
            latitude=36.9472,
            longitude=-76.3283,
            is_mvp_supported=False,
            source_label=settings.PROVENANCE_ASSUMPTION,
            source_note="Future Coverage — not included in active MVP analytical corridors."
        ),
        Port(
            id="VOSTOCHNY_RU",
            name="Port of Vostochny",
            country="Russia",
            port_code="RUVYP",
            port_role="ORIGIN",
            latitude=42.7333,
            longitude=133.0833,
            is_mvp_supported=False,
            source_label=settings.PROVENANCE_ASSUMPTION,
            source_note="Future Coverage — not included in active MVP analytical corridors."
        ),
        Port(
            id="HALDIA_IN",
            name="Haldia Port",
            country="India",
            port_code="INHAL",
            port_role="DESTINATION",
            latitude=22.0667,
            longitude=88.1000,
            is_mvp_supported=False,
            source_label=settings.PROVENANCE_ASSUMPTION,
            source_note="Future Coverage — draft restricted (~11.5m)."
        ),
        Port(
            id="DHAMRA_IN",
            name="Dhamra Port",
            country="India",
            port_code="INDHM",
            port_role="DESTINATION",
            latitude=20.8333,
            longitude=86.9667,
            is_mvp_supported=False,
            source_label=settings.PROVENANCE_ASSUMPTION,
            source_note="Future Coverage — deep water terminal."
        ),
    ]
    for p in ports_data:
        db.add(p)
    db.flush()

    # 2. Berths
    berths_data = [
        Berth(
            id="NEWCASTLE_B1",
            port_id="NEWCASTLE_AU",
            name="PWCS / NCIG Coal Terminal",
            cargo_type="COKING_COAL",
            max_draft_m=19.0,
            max_loa_m=300.0,
            max_beam_m=50.0,
            handling_rate_mt_per_day=60000.0,
            source_label=settings.PROVENANCE_OFFICIAL,
            last_verified_date="2026-08-01"
        ),
        Berth(
            id="KALIMANTAN_B1",
            port_id="KALIMANTAN_ID",
            name="Taboneo Offshore Anchorage Coal Terminal",
            cargo_type="COKING_COAL",
            max_draft_m=15.0,
            max_loa_m=250.0,
            max_beam_m=40.0,
            handling_rate_mt_per_day=40000.0,
            source_label=settings.PROVENANCE_OFFICIAL,
            last_verified_date="2026-08-01"
        ),
        Berth(
            id="PARADIP_B1",
            port_id="PARADIP_IN",
            name="Mechanized Coal Berth (MCB)",
            cargo_type="COKING_COAL",
            max_draft_m=14.5,
            max_loa_m=300.0,
            max_beam_m=46.0,
            handling_rate_mt_per_day=45000.0,
            source_label=settings.PROVENANCE_OFFICIAL,
            last_verified_date="2026-08-01"
        ),
        Berth(
            id="VIZAG_B1",
            port_id="VIZAG_IN",
            name="Outer Harbour General Cargo Berth (GCB)",
            cargo_type="COKING_COAL",
            max_draft_m=18.1,
            max_loa_m=300.0,
            max_beam_m=50.0,
            handling_rate_mt_per_day=50000.0,
            source_label=settings.PROVENANCE_OFFICIAL,
            last_verified_date="2026-08-01"
        ),
    ]
    for b in berths_data:
        db.add(b)
    db.flush()

    # 3. Vessel Types
    vessel_types_data = [
        VesselType(
            id="HANDYSIZE",
            name="Handysize",
            min_capacity_mt=25000.0,
            max_capacity_mt=40000.0,
            typical_draft_m=10.5,
            typical_loa_m=180.0,
            typical_beam_m=30.0,
            speed_knots=12.0,
            source_label=settings.PROVENANCE_ASSUMPTION
        ),
        VesselType(
            id="SUPRAMAX",
            name="Supramax",
            min_capacity_mt=50000.0,
            max_capacity_mt=60000.0,
            typical_draft_m=12.5,
            typical_loa_m=200.0,
            typical_beam_m=32.0,
            speed_knots=13.0,
            source_label=settings.PROVENANCE_ASSUMPTION
        ),
        VesselType(
            id="PANAMAX",
            name="Panamax / Kamsarmax",
            min_capacity_mt=65000.0,
            max_capacity_mt=85000.0,
            typical_draft_m=13.5,
            typical_loa_m=230.0,
            typical_beam_m=32.2,
            speed_knots=13.0,
            source_label=settings.PROVENANCE_ASSUMPTION
        ),
        VesselType(
            id="CAPESIZE",
            name="Capesize",
            min_capacity_mt=120000.0,
            max_capacity_mt=180000.0,
            typical_draft_m=17.5,
            typical_loa_m=290.0,
            typical_beam_m=45.0,
            speed_knots=13.0,
            source_label=settings.PROVENANCE_ASSUMPTION
        ),
    ]
    for vt in vessel_types_data:
        db.add(vt)
    db.flush()

    # 4. Routes
    routes_data = [
        Route(
            id="NEWCASTLE_AU__PARADIP_IN",
            origin_port_id="NEWCASTLE_AU",
            destination_port_id="PARADIP_IN",
            distance_nm=5600.0,
            typical_sailing_days=17.9,
            source_label=settings.PROVENANCE_OFFICIAL
        ),
        Route(
            id="NEWCASTLE_AU__VIZAG_IN",
            origin_port_id="NEWCASTLE_AU",
            destination_port_id="VIZAG_IN",
            distance_nm=5450.0,
            typical_sailing_days=17.5,
            source_label=settings.PROVENANCE_OFFICIAL
        ),
        Route(
            id="KALIMANTAN_ID__PARADIP_IN",
            origin_port_id="KALIMANTAN_ID",
            destination_port_id="PARADIP_IN",
            distance_nm=3000.0,
            typical_sailing_days=9.6,
            source_label=settings.PROVENANCE_OFFICIAL
        ),
        Route(
            id="KALIMANTAN_ID__VIZAG_IN",
            origin_port_id="KALIMANTAN_ID",
            destination_port_id="VIZAG_IN",
            distance_nm=2850.0,
            typical_sailing_days=9.1,
            source_label=settings.PROVENANCE_OFFICIAL
        ),
    ]
    for r in routes_data:
        db.add(r)
    db.flush()

    # 5. Deterministic Historical Freight Rates (60 days)
    rng = random.Random(42)
    base_date = datetime(2026, 8, 28)

    base_rates = {
        ("NEWCASTLE_AU__PARADIP_IN", "HANDYSIZE"): 38.50,
        ("NEWCASTLE_AU__PARADIP_IN", "SUPRAMAX"): 33.20,
        ("NEWCASTLE_AU__PARADIP_IN", "PANAMAX"): 28.40,
        ("NEWCASTLE_AU__PARADIP_IN", "CAPESIZE"): 21.80,

        ("NEWCASTLE_AU__VIZAG_IN", "HANDYSIZE"): 37.90,
        ("NEWCASTLE_AU__VIZAG_IN", "SUPRAMAX"): 32.70,
        ("NEWCASTLE_AU__VIZAG_IN", "PANAMAX"): 27.90,
        ("NEWCASTLE_AU__VIZAG_IN", "CAPESIZE"): 21.30,

        ("KALIMANTAN_ID__PARADIP_IN", "HANDYSIZE"): 23.50,
        ("KALIMANTAN_ID__PARADIP_IN", "SUPRAMAX"): 19.80,
        ("KALIMANTAN_ID__PARADIP_IN", "PANAMAX"): 16.40,
        ("KALIMANTAN_ID__PARADIP_IN", "CAPESIZE"): 12.80,

        ("KALIMANTAN_ID__VIZAG_IN", "HANDYSIZE"): 22.90,
        ("KALIMANTAN_ID__VIZAG_IN", "SUPRAMAX"): 19.20,
        ("KALIMANTAN_ID__VIZAG_IN", "PANAMAX"): 15.90,
        ("KALIMANTAN_ID__VIZAG_IN", "CAPESIZE"): 12.40,
    }

    # Generate 60 days of historical data leading up to base_date
    for route in routes_data:
        for vt in vessel_types_data:
            base_rate = base_rates.get((route.id, vt.id), 25.0)
            current_rate = base_rate

            for i in range(60, 0, -1):
                day_date = base_date - timedelta(days=i)
                date_str = day_date.strftime("%Y-%m-%d")

                # Realistic market oscillation: sine wave + small noise
                cycle = math.sin(i / 7.0) * 1.2
                noise = rng.uniform(-0.45, 0.45)
                rate = round(base_rate + cycle + noise, 2)

                fr = FreightRateHistory(
                    route_id=route.id,
                    vessel_type_id=vt.id,
                    date=date_str,
                    rate_usd_per_mt=rate,
                    source_label=settings.PROVENANCE_HISTORICAL
                )
                db.add(fr)

    # 6. Congestion Data (30 days of simulated history)
    ports_for_congestion = ["NEWCASTLE_AU", "KALIMANTAN_ID", "PARADIP_IN", "VIZAG_IN"]
    congestion_profiles = {
        "PARADIP_IN": {"base_wait": 26.0, "var": 8.0, "level": "MODERATE"},
        "VIZAG_IN": {"base_wait": 14.0, "var": 5.0, "level": "LOW"},
        "NEWCASTLE_AU": {"base_wait": 18.0, "var": 6.0, "level": "MODERATE"},
        "KALIMANTAN_ID": {"base_wait": 12.0, "var": 4.0, "level": "LOW"},
    }

    for port_id in ports_for_congestion:
        prof = congestion_profiles[port_id]
        for i in range(30, -1, -1):
            day_date = base_date - timedelta(days=i)
            date_str = day_date.strftime("%Y-%m-%d")
            wait_hours = max(2.0, round(prof["base_wait"] + rng.uniform(-prof["var"], prof["var"]), 1))
            
            level = "LOW"
            if wait_hours > 30.0:
                level = "HIGH"
            elif wait_hours > 16.0:
                level = "MODERATE"

            pc = PortCongestion(
                port_id=port_id,
                date=date_str,
                congestion_level=level,
                estimated_wait_hours=wait_hours,
                source_label=settings.PROVENANCE_SIMULATED
            )
            db.add(pc)

    db.commit()

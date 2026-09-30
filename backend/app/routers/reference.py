"""Reference data API router (ports, berths, vessel types)."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.repositories.repository import PortRepository, VesselTypeRepository
from app.schemas.schemas import PortSchema, VesselTypeSchema

router = APIRouter(prefix="/v1", tags=["Reference Data"])


@router.get("/ports", response_model=List[PortSchema])
def get_ports(db: Session = Depends(get_db)):
    """Return all supported and future-coverage ports with berth configurations."""
    return PortRepository.get_all(db)


@router.get("/vessel-types", response_model=List[VesselTypeSchema])
def get_vessel_types(db: Session = Depends(get_db)):
    """Return dry bulk vessel categories and operational specifications."""
    return VesselTypeRepository.get_all(db)

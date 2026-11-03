from fastapi import APIRouter, HTTPException

from database import get_connection
from schemas import Property

router = APIRouter(prefix="/api/properties", tags=["properties"])

PROPERTY_COLUMNS = (
    "id, name, location, property_type, bedrooms, max_guests, nightly_rate, currency"
)


@router.get("")
def list_properties() -> dict[str, list[Property]]:
    with get_connection() as connection:
        rows = connection.execute(
            f"SELECT {PROPERTY_COLUMNS} FROM properties ORDER BY id"
        ).fetchall()
    return {"properties": [Property(**dict(row)) for row in rows]}


@router.get("/{property_id}")
def get_property(property_id: int) -> Property:
    with get_connection() as connection:
        row = connection.execute(
            f"SELECT {PROPERTY_COLUMNS} FROM properties WHERE id = ?", (property_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return Property(**dict(row))

import sqlite3

from fastapi import APIRouter, HTTPException, Query

from database import get_connection
from schemas import Reservation, ReservationCreate, ReservationUpdate, Status

router = APIRouter(prefix="/api/reservations", tags=["reservations"])

SELECT_RESERVATION = """
    SELECT
        r.id, r.property_id, p.name AS property_name, r.guest_name, r.channel,
        r.check_in, r.check_out,
        CAST(julianday(r.check_out) - julianday(r.check_in) AS INTEGER) AS nights,
        r.guests, r.status, r.total_amount, r.currency, r.created_at
    FROM reservations r
    JOIN properties p ON p.id = r.property_id
"""

# Allowed status changes. Cancelled is final.
TRANSITIONS: dict[str, set[str]] = {
    "Pending": {"Confirmed", "Cancelled"},
    "Confirmed": {"Cancelled"},
    "Cancelled": set(),
}


def _fetch(connection: sqlite3.Connection, reservation_id: int) -> Reservation | None:
    row = connection.execute(
        SELECT_RESERVATION + " WHERE r.id = ?", (reservation_id,)
    ).fetchone()
    return Reservation(**dict(row)) if row else None


@router.get("")
def list_reservations(
    status: Status | None = Query(default=None),
    property_id: int | None = Query(default=None),
) -> dict[str, list[Reservation]]:
    clauses, params = [], []
    if status:
        clauses.append("r.status = ?")
        params.append(status)
    if property_id:
        clauses.append("r.property_id = ?")
        params.append(property_id)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""

    with get_connection() as connection:
        rows = connection.execute(
            SELECT_RESERVATION + where + " ORDER BY r.check_in DESC, r.id DESC", params
        ).fetchall()
    return {"reservations": [Reservation(**dict(row)) for row in rows]}


@router.get("/{reservation_id}")
def get_reservation(reservation_id: int) -> Reservation:
    with get_connection() as connection:
        reservation = _fetch(connection, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.post("", status_code=201)
def create_reservation(payload: ReservationCreate) -> Reservation:
    with get_connection() as connection:
        # Take the write lock before checking availability so two requests
        # can't both pass the overlap check and double-book the same nights.
        connection.execute("BEGIN IMMEDIATE")

        prop = connection.execute(
            "SELECT id, name, max_guests, nightly_rate, currency FROM properties WHERE id = ?",
            (payload.property_id,),
        ).fetchone()
        if prop is None:
            raise HTTPException(status_code=404, detail="Property not found")

        if payload.guests > prop["max_guests"]:
            raise HTTPException(
                status_code=422,
                detail=f"{prop['name']} sleeps at most {prop['max_guests']} guests",
            )

        # Two stays overlap when each starts before the other ends.
        # Check-out day is free for the next arrival.
        conflict = connection.execute(
            """
            SELECT id, check_in, check_out FROM reservations
            WHERE property_id = ?
              AND status != 'Cancelled'
              AND check_in < ?
              AND check_out > ?
            ORDER BY check_in
            LIMIT 1
            """,
            (payload.property_id, payload.check_out.isoformat(), payload.check_in.isoformat()),
        ).fetchone()
        if conflict:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": f"{prop['name']} is already booked for some of these nights",
                    "conflicting_reservation_id": conflict["id"],
                    "conflicting_dates": [conflict["check_in"], conflict["check_out"]],
                },
            )

        nights = (payload.check_out - payload.check_in).days
        cursor = connection.execute(
            """
            INSERT INTO reservations
                (property_id, guest_name, channel, check_in, check_out,
                 guests, status, total_amount, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.property_id,
                payload.guest_name,
                payload.channel,
                payload.check_in.isoformat(),
                payload.check_out.isoformat(),
                payload.guests,
                payload.status,
                nights * prop["nightly_rate"],
                prop["currency"],
            ),
        )
        return _fetch(connection, cursor.lastrowid)


@router.patch("/{reservation_id}")
def update_reservation(reservation_id: int, payload: ReservationUpdate) -> Reservation:
    with get_connection() as connection:
        reservation = _fetch(connection, reservation_id)
        if reservation is None:
            raise HTTPException(status_code=404, detail="Reservation not found")

        if payload.status == reservation.status:
            return reservation

        if payload.status not in TRANSITIONS[reservation.status]:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot change a {reservation.status.lower()} reservation to {payload.status.lower()}",
            )

        connection.execute(
            "UPDATE reservations SET status = ? WHERE id = ?",
            (payload.status, reservation_id),
        )
        return _fetch(connection, reservation_id)

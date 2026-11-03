"""Dashboard numbers, computed from the reservations table.

Revenue and occupancy are counted per night: a stay from 30 Oct to 2 Nov puts
two nights (and two nights of revenue) in October and one in November.
Only confirmed reservations count toward revenue and occupancy.
"""

import calendar
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from database import get_connection

router = APIRouter(prefix="/api/stats", tags=["stats"])

CHANNELS = ("Airbnb", "Vrbo", "Direct")
TREND_MONTHS = 6


def _month_start(value: str | None) -> date:
    if value is None:
        return date.today().replace(day=1)
    try:
        year, month = (int(part) for part in value.split("-"))
        return date(year, month, 1)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="month must look like YYYY-MM")


def _shift_month(start: date, months: int) -> date:
    index = start.year * 12 + start.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)


def _month_end(start: date) -> date:
    return _shift_month(start, 1)


def _nights_in(check_in: date, check_out: date, start: date, end: date) -> int:
    return max(0, (min(check_out, end) - max(check_in, start)).days)


def _summarize(rows, property_count: int, start: date) -> dict:
    end = _month_end(start)
    days = calendar.monthrange(start.year, start.month)[1]
    booked_nights = 0
    revenue = 0.0
    for row in rows:
        if row["status"] != "Confirmed":
            continue
        nights_total = (row["check_out"] - row["check_in"]).days
        nights = _nights_in(row["check_in"], row["check_out"], start, end)
        booked_nights += nights
        revenue += row["total_amount"] * nights / nights_total
    capacity = property_count * days
    return {
        "revenue": round(revenue),
        "booked_nights": booked_nights,
        "available_nights": capacity,
        "occupancy_rate": round(100 * booked_nights / capacity, 1) if capacity else 0.0,
    }


def _change(current: float, previous: float) -> float | None:
    if not previous:
        return None
    return round(100 * (current - previous) / previous, 1)


@router.get("")
def get_stats(month: str | None = Query(default=None, description="YYYY-MM, defaults to this month")):
    start = _month_start(month)
    end = _month_end(start)
    previous_start = _shift_month(start, -1)
    trend_start = _shift_month(start, -(TREND_MONTHS - 1))
    today = date.today()

    with get_connection() as connection:
        property_count = connection.execute("SELECT COUNT(*) FROM properties").fetchone()[0]
        raw = connection.execute(
            """
            SELECT channel, check_in, check_out, status, total_amount
            FROM reservations
            WHERE check_out > ? AND check_in < ?
            """,
            (min(trend_start, previous_start).isoformat(), end.isoformat()),
        ).fetchall()
        active = connection.execute(
            "SELECT COUNT(*) FROM reservations WHERE status = 'Confirmed' AND check_out >= ?",
            (today.isoformat(),),
        ).fetchone()[0]
        pending = connection.execute(
            "SELECT COUNT(*) FROM reservations WHERE status = 'Pending'"
        ).fetchone()[0]

    rows = [
        {
            **dict(row),
            "check_in": date.fromisoformat(row["check_in"]),
            "check_out": date.fromisoformat(row["check_out"]),
        }
        for row in raw
    ]

    current = _summarize(rows, property_count, start)
    previous = _summarize(rows, property_count, previous_start)

    trend = []
    for offset in range(TREND_MONTHS):
        month_start = _shift_month(trend_start, offset)
        trend.append({
            "month": month_start.strftime("%Y-%m"),
            "label": month_start.strftime("%b"),
            "revenue": _summarize(rows, property_count, month_start)["revenue"],
        })

    # Channel mix: non-cancelled bookings with at least one night this month.
    channel_counts = {channel: 0 for channel in CHANNELS}
    for row in rows:
        if row["status"] != "Cancelled" and _nights_in(row["check_in"], row["check_out"], start, end):
            channel_counts[row["channel"]] += 1
    channel_total = sum(channel_counts.values())
    channels = [
        {
            "channel": channel,
            "bookings": count,
            "share": round(100 * count / channel_total, 1) if channel_total else 0.0,
        }
        for channel, count in channel_counts.items()
    ]

    return {
        "month": start.strftime("%Y-%m"),
        "properties": property_count,
        "active_reservations": active,
        "pending_reservations": pending,
        "occupancy_rate": current["occupancy_rate"],
        "occupancy_change": _change(current["occupancy_rate"], previous["occupancy_rate"]),
        "booked_nights": current["booked_nights"],
        "available_nights": current["available_nights"],
        "revenue": current["revenue"],
        "revenue_change": _change(current["revenue"], previous["revenue"]),
        "revenue_trend": trend,
        "channels": channels,
        "channel_bookings": channel_total,
    }

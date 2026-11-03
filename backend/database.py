"""SQLite connection handling, schema and demo seed data."""

import random
import sqlite3
from contextlib import contextmanager
from datetime import date, timedelta

from config import get_settings

# Bump this when the schema changes. A database with a different version is
# rebuilt from scratch (development seed data only, so nothing is lost).
SCHEMA_VERSION = 2

SCHEMA = """
CREATE TABLE IF NOT EXISTS properties (
    id            INTEGER PRIMARY KEY,
    name          TEXT    NOT NULL UNIQUE,
    location      TEXT    NOT NULL,
    property_type TEXT    NOT NULL,
    bedrooms      INTEGER NOT NULL CHECK (bedrooms > 0),
    max_guests    INTEGER NOT NULL CHECK (max_guests > 0),
    nightly_rate  INTEGER NOT NULL CHECK (nightly_rate > 0),
    currency      TEXT    NOT NULL DEFAULT 'INR'
);

CREATE TABLE IF NOT EXISTS reservations (
    id           INTEGER PRIMARY KEY,
    property_id  INTEGER NOT NULL REFERENCES properties(id),
    guest_name   TEXT    NOT NULL,
    channel      TEXT    NOT NULL CHECK (channel IN ('Airbnb', 'Vrbo', 'Direct')),
    check_in     TEXT    NOT NULL,
    check_out    TEXT    NOT NULL,
    guests       INTEGER NOT NULL CHECK (guests > 0),
    status       TEXT    NOT NULL CHECK (status IN ('Pending', 'Confirmed', 'Cancelled')),
    total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
    currency     TEXT    NOT NULL DEFAULT 'INR',
    created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_reservations_property_dates
    ON reservations (property_id, check_in, check_out);
"""

DEMO_PROPERTIES = [
    # id, name, location, type, bedrooms, max_guests, nightly_rate
    (1, "Coastal Haven", "Goa, India", "Villa", 2, 4, 4500),
    (2, "Mountain View Retreat", "Coorg, India", "Cottage", 3, 6, 6200),
    (3, "City Comfort Apartment", "Bengaluru, India", "Apartment", 1, 2, 2800),
]

DEMO_GUESTS = [
    "Aarav Sharma", "Priya Nair", "Rohan Mehta", "Ananya Rao", "Maya Patel",
    "Kabir Singh", "Isha Kulkarni", "Vikram Iyer", "Neha Gupta", "Arjun Menon",
    "Sara Thomas", "Dev Malhotra", "Riya Joshi", "Karan Bhatia", "Meera Pillai",
]


def connect() -> sqlite3.Connection:
    settings = get_settings()
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def get_connection():
    """Yield a connection, commit on success, roll back on error, always close."""
    connection = connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database(seed: bool | None = None) -> None:
    if seed is None:
        seed = get_settings().seed_demo_data

    with get_connection() as connection:
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        if version != SCHEMA_VERSION:
            connection.executescript(
                "DROP TABLE IF EXISTS reservations; DROP TABLE IF EXISTS properties;"
            )
        connection.executescript(SCHEMA)
        connection.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")

        is_empty = connection.execute("SELECT COUNT(*) FROM properties").fetchone()[0] == 0
        if seed and is_empty:
            _seed_demo_data(connection)


def _seed_demo_data(connection: sqlite3.Connection, today: date | None = None) -> None:
    """Insert demo properties and ~6 months of non-overlapping bookings around today.

    Dates are relative to today so the dashboard always has current data.
    A fixed random seed keeps the output the same for a given day.
    """
    today = today or date.today()
    rng = random.Random(42)

    connection.executemany(
        """
        INSERT INTO properties
            (id, name, location, property_type, bedrooms, max_guests, nightly_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        DEMO_PROPERTIES,
    )

    rows = []
    for property_id, _, _, _, _, max_guests, rate in DEMO_PROPERTIES:
        cursor = today - timedelta(days=170)
        while cursor < today + timedelta(days=35):
            cursor += timedelta(days=rng.randint(1, 8))
            nights = rng.randint(2, 5)
            check_in, check_out = cursor, cursor + timedelta(days=nights)
            cursor = check_out

            channel = rng.choices(["Airbnb", "Vrbo", "Direct"], weights=[55, 28, 17])[0]
            roll = rng.random()
            if roll < 0.08:
                status = "Cancelled"
            elif check_in > today and roll < 0.35:
                status = "Pending"
            else:
                status = "Confirmed"

            rows.append((
                property_id,
                rng.choice(DEMO_GUESTS),
                channel,
                check_in.isoformat(),
                check_out.isoformat(),
                rng.randint(1, max_guests),
                status,
                nights * rate,
            ))

    connection.executemany(
        """
        INSERT INTO reservations
            (property_id, guest_name, channel, check_in, check_out, guests, status, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


if __name__ == "__main__":
    initialize_database()
    with get_connection() as conn:
        properties = conn.execute("SELECT COUNT(*) FROM properties").fetchone()[0]
        reservations = conn.execute("SELECT COUNT(*) FROM reservations").fetchone()[0]
    print(f"Database ready at: {get_settings().database_path}")
    print(f"Properties: {properties}")
    print(f"Reservations: {reservations}")

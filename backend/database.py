
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).resolve().parent / "vacation_rental.db"


def initialize_database():
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON")

        connection.execute("""
            CREATE TABLE IF NOT EXISTS properties (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                bedrooms INTEGER NOT NULL,
                nightly_rate INTEGER NOT NULL,
                currency TEXT NOT NULL DEFAULT 'INR'
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY,
                guest_name TEXT NOT NULL,
                property_id INTEGER NOT NULL,
                property_name TEXT NOT NULL,
                check_in TEXT NOT NULL,
                check_out TEXT NOT NULL,
                guests INTEGER NOT NULL,
                status TEXT NOT NULL,
                total_amount INTEGER NOT NULL,
                currency TEXT NOT NULL DEFAULT 'INR',
                FOREIGN KEY (property_id) REFERENCES properties(id)
            )
        """)

        properties = [
            (1, "Coastal Haven", "Goa, India", 2, 4500, "INR"),
            (2, "Mountain View Retreat", "Coorg, India", 3, 6200, "INR"),
            (3, "City Comfort Apartment", "Bengaluru, India", 1, 2800, "INR"),
        ]

        connection.executemany("""
            INSERT OR IGNORE INTO properties
            (id, name, location, bedrooms, nightly_rate, currency)
            VALUES (?, ?, ?, ?, ?, ?)
        """, properties)

        reservations = [
            (
                1, "Aarav Sharma", 1, "Coastal Haven",
                "2026-10-22", "2026-10-26",
                2, "Confirmed", 18000, "INR"
            ),
            (
                2, "Priya Nair", 2, "Mountain View Retreat",
                "2026-10-24", "2026-10-27",
                4, "Confirmed", 18600, "INR"
            ),
            (
                3, "Rohan Mehta", 3, "City Comfort Apartment",
                "2026-10-28", "2026-10-30",
                2, "Pending", 5600, "INR"
            ),
        ]

        connection.executemany("""
            INSERT OR IGNORE INTO reservations
            (
                id, guest_name, property_id, property_name,
                check_in, check_out, guests, status,
                total_amount, currency
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, reservations)

        property_count = connection.execute(
            "SELECT COUNT(*) FROM properties"
        ).fetchone()[0]

        reservation_count = connection.execute(
            "SELECT COUNT(*) FROM reservations"
        ).fetchone()[0]

    print(f"Database created at: {DATABASE_PATH}")
    print(f"Properties: {property_count}")
    print(f"Reservations: {reservation_count}")


if __name__ == "__main__":
    initialize_database()

import pytest
from fastapi.testclient import TestClient

import database
from main import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """API client backed by a fresh database holding the demo properties and no bookings."""
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("SEED_DEMO_DATA", "false")

    with TestClient(create_app()) as test_client:  # runs startup, which creates the schema
        with database.get_connection() as connection:
            connection.executemany(
                """
                INSERT INTO properties
                    (id, name, location, property_type, bedrooms, max_guests, nightly_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                database.DEMO_PROPERTIES,
            )
        yield test_client


@pytest.fixture
def seeded_client(tmp_path, monkeypatch):
    """API client backed by a database with the full demo seed."""
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "seeded.db"))
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    with TestClient(create_app()) as test_client:
        yield test_client


def booking(**overrides):
    payload = {
        "property_id": 1,
        "guest_name": "Test Guest",
        "channel": "Airbnb",
        "check_in": "2027-01-10",
        "check_out": "2027-01-14",
        "guests": 2,
    }
    payload.update(overrides)
    return payload

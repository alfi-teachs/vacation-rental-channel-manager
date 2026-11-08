"""Test fixtures.

The tests run against a real PostgreSQL database, set with TEST_DATABASE_URL.
Every test drops and recreates the tables, so never point it at a database whose
data you want to keep.

Start one locally with:  docker compose up -d db
"""

import os

import pytest
from fastapi.testclient import TestClient

import database
from main import create_app

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql://vrcm:vrcm@localhost:5432/vrcm_test"
)


@pytest.fixture
def fresh_database(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    with database.get_connection() as connection:
        database.drop_tables(connection)


@pytest.fixture
def client(fresh_database, monkeypatch):
    """API client backed by a fresh database holding the demo properties and no bookings."""
    monkeypatch.setenv("SEED_DEMO_DATA", "false")

    with TestClient(create_app()) as test_client:  # runs startup, which creates the schema
        with database.get_connection() as connection:
            database.insert_properties(connection, database.DEMO_PROPERTIES)
        yield test_client


@pytest.fixture
def seeded_client(fresh_database, monkeypatch):
    """API client backed by a database with the full demo seed."""
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

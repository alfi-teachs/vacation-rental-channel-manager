from datetime import date

import pytest

from tests.conftest import booking


def test_health_reports_database(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "vacation-rental-backend",
        "database": "ok",
    }


def test_list_properties(client):
    properties = client.get("/api/properties").json()["properties"]
    assert [p["name"] for p in properties] == [
        "Coastal Haven", "Mountain View Retreat", "City Comfort Apartment",
    ]
    assert client.get("/api/properties/99").status_code == 404


def test_create_reservation_prices_from_nightly_rate(client):
    response = client.post("/api/reservations", json=booking())
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "Pending"
    assert body["nights"] == 4
    assert body["total_amount"] == 4 * 4500
    assert body["property_name"] == "Coastal Haven"

    listed = client.get("/api/reservations").json()["reservations"]
    assert [r["id"] for r in listed] == [body["id"]]


@pytest.mark.parametrize(
    "check_in, check_out",
    [
        ("2027-01-12", "2027-01-16"),  # starts inside existing stay
        ("2027-01-08", "2027-01-11"),  # ends inside existing stay
        ("2027-01-09", "2027-01-15"),  # covers existing stay
        ("2027-01-11", "2027-01-13"),  # inside existing stay
    ],
)
def test_overlapping_booking_is_rejected(client, check_in, check_out):
    first = client.post("/api/reservations", json=booking()).json()

    response = client.post(
        "/api/reservations",
        json=booking(check_in=check_in, check_out=check_out, guest_name="Second Guest"),
    )
    assert response.status_code == 409
    assert response.json()["detail"]["conflicting_reservation_id"] == first["id"]


def test_back_to_back_and_other_property_bookings_are_allowed(client):
    client.post("/api/reservations", json=booking())
    # Arrive on the previous guest's check-out day.
    assert client.post(
        "/api/reservations", json=booking(check_in="2027-01-14", check_out="2027-01-16")
    ).status_code == 201
    # Same nights at a different property.
    assert client.post("/api/reservations", json=booking(property_id=2)).status_code == 201


def test_cancelled_booking_frees_the_dates(client):
    first = client.post("/api/reservations", json=booking()).json()

    cancelled = client.patch(f"/api/reservations/{first['id']}", json={"status": "Cancelled"})
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "Cancelled"

    assert client.post("/api/reservations", json=booking()).status_code == 201


def test_status_transitions(client):
    reservation = client.post("/api/reservations", json=booking()).json()
    url = f"/api/reservations/{reservation['id']}"

    assert client.patch(url, json={"status": "Confirmed"}).json()["status"] == "Confirmed"
    assert client.patch(url, json={"status": "Cancelled"}).status_code == 200
    # Cancelled is final.
    assert client.patch(url, json={"status": "Confirmed"}).status_code == 409
    assert client.patch("/api/reservations/999", json={"status": "Cancelled"}).status_code == 404


@pytest.mark.parametrize(
    "overrides, expected_status",
    [
        ({"check_out": "2027-01-10"}, 422),  # zero nights
        ({"check_out": "2027-01-05"}, 422),  # check-out before check-in
        ({"guest_name": "   "}, 422),
        ({"channel": "Booking.com"}, 422),
        ({"guests": 5}, 422),               # Coastal Haven sleeps 4
        ({"property_id": 99}, 404),
    ],
)
def test_invalid_bookings_are_rejected(client, overrides, expected_status):
    assert client.post("/api/reservations", json=booking(**overrides)).status_code == expected_status


def test_stats_count_nights_per_month(client):
    # 30 Jan to 2 Feb: two nights in January, one in February.
    reservation = client.post(
        "/api/reservations",
        json=booking(check_in="2027-01-30", check_out="2027-02-02", status="Confirmed"),
    ).json()
    assert reservation["total_amount"] == 3 * 4500

    january = client.get("/api/stats", params={"month": "2027-01"}).json()
    assert january["booked_nights"] == 2
    assert january["revenue"] == 2 * 4500
    assert january["available_nights"] == 3 * 31
    assert january["channels"][0] == {"channel": "Airbnb", "bookings": 1, "share": 100.0}

    february = client.get("/api/stats", params={"month": "2027-02"}).json()
    assert february["booked_nights"] == 1
    assert february["revenue_trend"][-2] == {"month": "2027-01", "label": "Jan", "revenue": 9000}

    assert client.get("/api/stats", params={"month": "January"}).status_code == 422


def test_pending_bookings_do_not_count_as_revenue(client):
    client.post("/api/reservations", json=booking())  # Pending by default
    stats = client.get("/api/stats", params={"month": "2027-01"}).json()
    assert stats["revenue"] == 0
    assert stats["pending_reservations"] == 1


def test_demo_seed_has_no_double_bookings(seeded_client):
    reservations = seeded_client.get("/api/reservations").json()["reservations"]
    assert len(reservations) > 30

    active = sorted(
        (r for r in reservations if r["status"] != "Cancelled"),
        key=lambda r: (r["property_id"], r["check_in"]),
    )
    for previous, current in zip(active, active[1:]):
        if previous["property_id"] == current["property_id"]:
            assert current["check_in"] >= previous["check_out"], (previous, current)

    stats = seeded_client.get("/api/stats").json()
    assert stats["month"] == date.today().strftime("%Y-%m")
    assert stats["properties"] == 3


def test_concurrent_requests_cannot_double_book(client):
    """Fire the same booking 10 times at once: exactly one may succeed.

    Without the row lock (SELECT ... FOR UPDATE) several requests can pass the
    overlap check before any of them inserts, and the property gets double-booked.
    """
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = list(pool.map(
            lambda i: client.post("/api/reservations", json=booking(guest_name=f"Guest {i}")).status_code,
            range(10),
        ))

    assert sorted(codes) == [201] + [409] * 9
    assert len(client.get("/api/reservations").json()["reservations"]) == 1

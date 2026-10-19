

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Vacation Rental Channel Manager API",
    description="API for managing vacation rental properties and reservations.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Welcome to the Vacation Rental Channel Manager API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "vacation-rental-backend",
    }


@app.get("/api/properties")
def get_properties():
    return {
        "properties": [
            {
                "id": 1,
                "name": "Coastal Haven",
                "location": "Goa, India",
                "bedrooms": 2,
                "nightly_rate": 4500,
                "currency": "INR",
            },
            {
                "id": 2,
                "name": "Mountain View Retreat",
                "location": "Coorg, India",
                "bedrooms": 3,
                "nightly_rate": 6200,
                "currency": "INR",
            },
            {
                "id": 3,
                "name": "City Comfort Apartment",
                "location": "Bengaluru, India",
                "bedrooms": 1,
                "nightly_rate": 2800,
                "currency": "INR",
            },
        ]
    }
@app.get("/api/reservations")
def get_reservations():
    return {
        "reservations": [
            {
                "id": 1,
                "guest_name": "Aarav Sharma",
                "property_id": 1,
                "property_name": "Coastal Haven",
                "check_in": "2026-10-22",
                "check_out": "2026-10-26",
                "guests": 2,
                "status": "Confirmed",
                "total_amount": 18000,
                "currency": "INR",
            },
            {
                "id": 2,
                "guest_name": "Priya Nair",
                "property_id": 2,
                "property_name": "Mountain View Retreat",
                "check_in": "2026-10-24",
                "check_out": "2026-10-27",
                "guests": 4,
                "status": "Confirmed",
                "total_amount": 18600,
                "currency": "INR",
            },
            {
                "id": 3,
                "guest_name": "Rohan Mehta",
                "property_id": 3,
                "property_name": "City Comfort Apartment",
                "check_in": "2026-10-28",
                "check_out": "2026-10-30",
                "guests": 2,
                "status": "Pending",
                "total_amount": 5600,
                "currency": "INR",
            },
        ]
    }


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import DATABASE_PATH, initialize_database

initialize_database()

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
    import sqlite3

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row

        rows = connection.execute("""
            SELECT id, name, location, bedrooms, nightly_rate, currency
            FROM properties
            ORDER BY id
        """).fetchall()

        properties = [dict(row) for row in rows]

    return {"properties": properties}


@app.get("/api/reservations")
def get_reservations():
    import sqlite3

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row

        rows = connection.execute("""
            SELECT
                id,
                guest_name,
                property_id,
                property_name,
                check_in,
                check_out,
                guests,
                status,
                total_amount,
                currency
            FROM reservations
            ORDER BY id
        """).fetchall()

        reservations = [dict(row) for row in rows]

    return {"reservations": reservations}

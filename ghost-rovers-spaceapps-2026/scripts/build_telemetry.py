import json
from datetime import date

# Constants
SPEED_OF_LIGHT_KM_S = 299792.458
EARTH_MOON_AVG_KM = 384400
AU_IN_KM = 149597870.7

def compute_space_math():
    today = date(2026, 11, 15)

    # 1. Apollo 11 Retroreflector active years & laser round-trip
    apollo_landing = date(1969, 7, 20)
    apollo_years = round((today - apollo_landing).days / 365.25, 1)
    laser_round_trip_sec = round((EARTH_MOON_AVG_KM * 2) / SPEED_OF_LIGHT_KM_S, 2)

    # 2. Opportunity Rover lifespan multiplier
    oppy_planned_sols = 90
    oppy_actual_sols = 5111
    oppy_multiplier = round(oppy_actual_sols / oppy_planned_sols, 1)

    # 3. Ingenuity Helicopter flight multiplier
    ingenuity_planned = 5
    ingenuity_actual = 72
    ingenuity_multiplier = round(ingenuity_actual / ingenuity_planned, 1)

    # 4. Voyager 1 distance in AU
    voyager_km = 24_300_000_000
    voyager_au = round(voyager_km / AU_IN_KM, 1)

    telemetry_summary = {
        "apollo_11_active_years": apollo_years,
        "apollo_11_laser_round_trip_seconds": laser_round_trip_sec,
        "opportunity_lifespan_multiplier": f"{oppy_multiplier}x",
        "ingenuity_flight_multiplier": f"{ingenuity_multiplier}x",
        "voyager_1_distance_au": voyager_au,
    }

    with open("src/data/telemetry_verified.json", "w", encoding="utf-8") as f:
        json.dump(telemetry_summary, f, indent=2)

    print("Verified NASA Space Math Telemetry:")
    print(json.dumps(telemetry_summary, indent=2))

if __name__ == "__main__":
    compute_space_math()
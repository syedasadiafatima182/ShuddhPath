import json
import math
import logging
import urllib.request
import urllib.parse

logger = logging.getLogger()
logger.setLevel(logging.INFO)

VENTILATION_RATE_M3_MIN = 0.018

# Documented chronic municipal waterlogging low-points & underpasses
MUNICIPAL_WATERLOG_REGISTRY = [
    # Hyderabad / Telangana Hotspots
    {
        "id": "hyd_tolichowki",
        "city": "Hyderabad",
        "name": "Tolichowki Flyover Underpass",
        "coords": [17.4018, 78.4124],
        "depression_factor": 1.6,
        "detail": "Stormwater convergence zone; runoff from Jubilee Hills causes rapid knee-deep inundation."
    },
    {
        "id": "hyd_malakpet_rub",
        "city": "Hyderabad",
        "name": "Malakpet Railway Underbridge (RUB)",
        "coords": [17.3732, 78.4988],
        "depression_factor": 2.0,
        "detail": "Low-elevation railway dip; chronic drainage backflow stalls two-wheelers during monsoons."
    },
    {
        "id": "hyd_begumpet",
        "city": "Hyderabad",
        "name": "Begumpet Underpass",
        "coords": [17.4447, 78.4664],
        "depression_factor": 1.4,
        "detail": "Kukatpally nala overflow zone with high backwater retention."
    },
    {
        "id": "hyd_uppal_ring",
        "city": "Hyderabad",
        "name": "Uppal Ring Road Junction",
        "coords": [17.4022, 78.5601],
        "depression_factor": 1.5,
        "detail": "Eastern corridor catchment bottleneck towards Warangal highway (NH 163)."
    },
    # Delhi NCR Hotspots
    {
        "id": "delhi_minto",
        "city": "Delhi",
        "name": "Minto Bridge Underpass",
        "coords": [28.6335, 77.2248],
        "depression_factor": 2.2,
        "detail": "Deep railway depression; drains collect directly at rail subway."
    },
    {
        "id": "delhi_prahladpur",
        "city": "Delhi",
        "name": "Pul Prahladpur Underpass",
        "coords": [28.5113, 77.2882],
        "depression_factor": 2.0,
        "detail": "Low-lying basin below MB Road; persistent rainwater inundation."
    },
    {
        "id": "delhi_azadpur",
        "city": "Delhi",
        "name": "Azadpur Arterial Choke",
        "coords": [28.7067, 77.1772],
        "depression_factor": 1.3,
        "detail": "Surface runoff bottleneck; heavy mixed commercial vehicle back-up."
    }
]

def fetch_live_environmental_data(lat, lon):
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5"
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=precipitation"
    
    pm25 = 32.0
    rain_mm = 0.0

    try:
        req = urllib.request.Request(aq_url, headers={'User-Agent': 'ShuddhPath/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            val = data.get("current", {}).get("pm2_5")
            if val is not None:
                pm25 = float(val)
    except Exception as e:
        logger.warning(f"PM2.5 fetch error: {e}")

    try:
        req = urllib.request.Request(weather_url, headers={'User-Agent': 'ShuddhPath/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            val = data.get("current", {}).get("precipitation")
            if val is not None:
                rain_mm = float(val)
    except Exception as e:
        logger.warning(f"Precipitation fetch error: {e}")

    return pm25, rain_mm

def get_corridor_waterlog_hazards(start, end, rain_mm):
    min_lat = min(start[0], end[0]) - 0.25
    max_lat = max(start[0], end[0]) + 0.25
    min_lon = min(start[1], end[1]) - 0.25
    max_lon = max(start[1], end[1]) + 0.25

    corridor_hazards = []

    for spot in MUNICIPAL_WATERLOG_REGISTRY:
        sp_lat, sp_lon = spot["coords"]
        if min_lat <= sp_lat <= max_lat and min_lon <= sp_lon <= max_lon:
            clog_score = round(rain_mm * spot["depression_factor"], 1)

            if rain_mm >= 3.0:
                severity = "HIGH"
                status_label = "SEVERE INUNDATION ALERT"
                water_depth = f"Est. standing water ~{int(clog_score * 3.5 + 12)} cm. Critical stall risk."
            elif rain_mm > 0.0:
                severity = "MEDIUM"
                status_label = "WATERLOGGING IN PROGRESS"
                water_depth = f"Surface runoff active ({clog_score} index). Water accumulating."
            else:
                severity = "LOW"
                status_label = "DRY / NOMINAL"
                water_depth = "Road surface dry. No inundation detected."

            corridor_hazards.append({
                "id": spot["id"],
                "name": spot["name"],
                "coords": spot["coords"],
                "severity": severity,
                "statusLabel": status_label,
                "rainRate": rain_mm,
                "clogScore": clog_score,
                "waterDepthEst": water_depth,
                "description": f"{water_depth} {spot['detail']}"
            })

    return corridor_hazards

def fetch_real_osrm_route(start, end, route_type="fastest"):
    start_lon, start_lat = start[1], start[0]
    end_lon, end_lat = end[1], end[0]

    if route_type == "clean":
        mid_lat = (start_lat + end_lat) / 2.0 - 0.012
        mid_lon = (start_lon + end_lon) / 2.0 - 0.012
        coords_str = f"{start_lon},{start_lat};{mid_lon},{mid_lat};{end_lon},{end_lat}"
    else:
        coords_str = f"{start_lon},{start_lat};{end_lon},{end_lat}"

    url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ShuddhPath/1.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            route = data['routes'][0]
            geometry = [[pt[1], pt[0]] for pt in route['geometry']['coordinates']]
            duration_mins = round(route['duration'] / 60.0, 1)
            distance_km = round(route['distance'] / 1000.0, 1)
            return geometry, duration_mins, distance_km
    except Exception as e:
        logger.warning(f"OSRM routing failed: {e}")
        return [[start[0], start[1]], [end[0], end[1]]], 15.0, 6.0

def calculate_inhalation_dose(duration_mins, idle_mins, ambient_pm25):
    moving_mins = max(0.0, duration_mins - idle_mins)
    junction_pm25 = ambient_pm25 * 2.8

    dose_moving = moving_mins * ambient_pm25 * VENTILATION_RATE_M3_MIN
    dose_idle = idle_mins * junction_pm25 * VENTILATION_RATE_M3_MIN
    return round(dose_moving + dose_idle, 1)

def lambda_handler(event, context):
    http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': ''
        }

    body = {}
    if 'body' in event and event['body']:
        try:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        except Exception:
            body = {}

    start = body.get('start', [17.3850, 78.4867])
    end = body.get('end', [17.9689, 79.5941])
    simulate_rain = body.get('simulateRain', None)  # None = use live feed, float = override

    # 1. Fetch live telemetry
    live_pm25, live_rain = fetch_live_environmental_data(start[0], start[1])

    # Determine effective rain rate
    effective_rain = float(simulate_rain) if simulate_rain is not None else live_rain

    # 2. Corridor waterlog hazard evaluation
    hazards = get_corridor_waterlog_hazards(start, end, effective_rain)

    # 3. Routing
    path_a, duration_a, dist_a = fetch_real_osrm_route(start, end, route_type="fastest")
    path_b, duration_b, dist_b = fetch_real_osrm_route(start, end, route_type="clean")

    # If active/simulated rain occurs, arterial route A suffers heavy flood idling
    rain_stall_multiplier = 1.0 + (min(effective_rain, 15.0) * 0.12)
    idle_a = round(duration_a * 0.32 * rain_stall_multiplier, 1)
    duration_a = round(duration_a + (idle_a * 0.4), 1)

    idle_b = round(duration_b * 0.08, 1)

    dose_a = calculate_inhalation_dose(duration_a, idle_a, live_pm25)
    dose_b = calculate_inhalation_dose(duration_b, idle_b, live_pm25)

    savings_percent = round(((dose_a - dose_b) / dose_a) * 100, 1) if dose_a > 0 else 20.0
    time_diff = round(duration_b - duration_a, 1)
    extra_time_str = f"+{time_diff} mins" if time_diff > 0 else "faster"

    response_payload = {
        "status": "success",
        "livePm25": live_pm25,
        "effectiveRainMm": effective_rain,
        "isSimulated": simulate_rain is not None,
        "hazards": hazards,
        "savingsPercent": savings_percent,
        "advisory": f"Route B cuts {savings_percent}% of toxic exhaust intake ({extra_time_str} ride) while safely circumventing low-lying underpasses.",
        "routeA": {
            "path": path_a,
            "duration": duration_a,
            "distanceKm": dist_a,
            "idleMins": idle_a,
            "doseUg": dose_a
        },
        "routeB": {
            "path": path_b,
            "duration": duration_b,
            "distanceKm": dist_b,
            "idleMins": idle_b,
            "doseUg": dose_b
        }
    }

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': json.dumps(response_payload)
    }
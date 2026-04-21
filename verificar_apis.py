"""
Verifica disponibilidad de datos en Open-Meteo y WorldTides para spots SUP de Chile.
Uso: WORLDTIDES_API_KEY=xxx python verificar_apis.py
"""

import requests
import os
import json
from datetime import datetime

SPOTS = [
    {"id": "herradura",   "nombre": "La Herradura (Coquimbo)", "lat": -29.983059, "lng": -71.365225},
    {"id": "vina",        "nombre": "Viña del Mar",            "lat": -33.0243,   "lng": -71.5516},
    {"id": "pichilemu",   "nombre": "Pichilemu",               "lat": -34.3869,   "lng": -72.0045},
    {"id": "iquique",     "nombre": "Iquique",                  "lat": -20.2133,   "lng": -70.1503},
    {"id": "bahia_inglesa","nombre": "Bahía Inglesa",           "lat": -27.1058,   "lng": -70.8571},
    {"id": "puerto_montt","nombre": "Puerto Montt",             "lat": -41.4693,   "lng": -72.9424},
    {"id": "arica",       "nombre": "Arica",                   "lat": -18.4783,   "lng": -70.3126},
]

WT_KEY = os.environ.get("WORLDTIDES_API_KEY", "")
HOY = datetime.now().date().isoformat()

def check_openmeteo(spot):
    lat, lon = spot["lat"], spot["lng"]
    results = {}

    # Marine (oleaje)
    try:
        r = requests.get(
            f"https://marine-api.open-meteo.com/v1/marine"
            f"?latitude={lat}&longitude={lon}"
            f"&hourly=wave_height,wave_direction&timezone=auto&forecast_days=2",
            timeout=10
        )
        d = r.json()
        if "hourly" in d and d["hourly"].get("wave_height"):
            vals = [v for v in d["hourly"]["wave_height"] if v is not None]
            results["marine"] = f"✅  {len(vals)} puntos | olas ejemplo: {vals[:3]}"
        else:
            results["marine"] = f"⚠️  Sin datos de oleaje — {d.get('reason', d.get('error', 'respuesta vacía'))}"
    except Exception as e:
        results["marine"] = f"❌  Error: {e}"

    # Forecast (viento, temp)
    try:
        r = requests.get(
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&hourly=wind_speed_10m,wind_direction_10m,temperature_2m&timezone=auto&forecast_days=2",
            timeout=10
        )
        d = r.json()
        if "hourly" in d and d["hourly"].get("wind_speed_10m"):
            vals = [v for v in d["hourly"]["wind_speed_10m"] if v is not None]
            results["wind"] = f"✅  {len(vals)} puntos | viento ejemplo: {vals[:3]} km/h"
        else:
            results["wind"] = f"⚠️  Sin datos de viento — {d.get('reason', d.get('error', 'respuesta vacía'))}"
    except Exception as e:
        results["wind"] = f"❌  Error: {e}"

    return results

def check_worldtides(spot):
    if not WT_KEY:
        return "⚠️  WORLDTIDES_API_KEY no definida — saltando"
    lat, lon = spot["lat"], spot["lng"]
    try:
        r = requests.get(
            f"https://www.worldtides.info/api/v2?extremes"
            f"&lat={lat}&lon={lon}&days=2&key={WT_KEY}",
            timeout=10
        )
        d = r.json()
        if d.get("status") == 200 and d.get("extremes"):
            mareas = d["extremes"][:4]
            resumen = ", ".join(f"{m['type']} {m['date'][11:16]}" for m in mareas)
            return f"✅  {len(d['extremes'])} eventos | próximas: {resumen}"
        else:
            return f"⚠️  {d.get('error', d.get('status', 'sin datos'))}"
    except Exception as e:
        return f"❌  Error: {e}"

print(f"\n{'='*65}")
print(f"  VERIFICACIÓN DE APIs PARA SPOTS SUP — {HOY}")
print(f"{'='*65}\n")

for spot in SPOTS:
    print(f"📍 {spot['nombre']} ({spot['lat']}, {spot['lng']})")
    om = check_openmeteo(spot)
    wt = check_worldtides(spot)
    print(f"   Open-Meteo  Marine : {om['marine']}")
    print(f"   Open-Meteo  Viento : {om['wind']}")
    print(f"   WorldTides  Mareas : {wt}")
    print()

print("Listo. Si un spot muestra ✅ en las 3 líneas, está listo para el pipeline.")
if not WT_KEY:
    print("\n⚠️  Para verificar WorldTides ejecuta:")
    print("   WORLDTIDES_API_KEY=tu_clave python verificar_apis.py\n")

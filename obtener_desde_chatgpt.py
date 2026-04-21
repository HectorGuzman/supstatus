"""
Genera data-{id}.json para cada spot definido en spots-config.json.
Usa Open-Meteo (viento + oleaje) y OpenAI para interpretar las condiciones.

Uso:
  OPENAI_API_KEY=xxx python obtener_desde_chatgpt.py
  OPENAI_API_KEY=xxx python obtener_desde_chatgpt.py --spot herradura
"""

import openai
import json
import sys
import os
import requests
import pytz
from datetime import datetime, timedelta

HORAS_OBJETIVO = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
ZONA_CHILE = pytz.timezone("America/Santiago")


def direccion_cardinal(grados):
    dirs = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste']
    return dirs[int((grados + 22.5) % 360 / 45)]


def obtener_datos_openmeteo(lat, lon):
    hoy = datetime.now().date().isoformat()
    manana = (datetime.now().date() + timedelta(days=1)).isoformat()

    print(f"  📡 Open-Meteo marine ({lat}, {lon})...")
    r_marine = requests.get(
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wave_height,wave_direction&timezone=auto&forecast_days=2",
        timeout=15
    )
    data_marine = r_marine.json()

    print(f"  🌬️ Open-Meteo forecast ({lat}, {lon})...")
    r_forecast = requests.get(
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wind_speed_10m,wind_direction_10m,temperature_2m&timezone=auto&forecast_days=2",
        timeout=15
    )
    data_forecast = r_forecast.json()

    if "hourly" not in data_marine:
        raise ValueError(f"Open-Meteo marine sin datos: {data_marine.get('reason', 'sin razón')}")
    if "hourly" not in data_forecast:
        raise ValueError(f"Open-Meteo forecast sin datos: {data_forecast.get('reason', 'sin razón')}")

    horarios = {"hoy": [], "mañana": []}
    for i, fecha in enumerate([hoy, manana]):
        for hora in HORAS_OBJETIVO:
            ts = f"{fecha}T{hora}"
            times_f = data_forecast["hourly"]["time"]
            times_m = data_marine["hourly"]["time"]
            if ts not in times_f or ts not in times_m:
                continue
            idx_f = times_f.index(ts)
            idx_m = times_m.index(ts)
            dir_viento = int(data_forecast["hourly"]["wind_direction_10m"][idx_f] or 0)
            dir_oleaje = int(data_marine["hourly"]["wave_direction"][idx_m] or 0)
            horarios["hoy" if i == 0 else "mañana"].append({
                "hora": hora,
                "viento": f"{data_forecast['hourly']['wind_speed_10m'][idx_f]} km/h",
                "oleaje": f"{data_marine['hourly']['wave_height'][idx_m]} m",
                "direccionOleaje": direccion_cardinal(dir_oleaje),
                "temperatura": f"{data_forecast['hourly']['temperature_2m'][idx_f]}°C",
                "direccionViento": direccion_cardinal(dir_viento),
                "direccionVientoGrados": dir_viento,
            })

    return horarios


def generar_con_openai(spot, horarios, fecha_generacion, api_key):
    clima_ctx = json.dumps(horarios, indent=2, ensure_ascii=False)
    prompt = f"""
Actúa como un asistente experto en SUP (stand up paddle) para {spot['nombre']}, Chile.
Tienes datos REALES de clima horario extraídos de Open-Meteo:

{clima_ctx}

Genera un JSON con esta estructura exacta:

{{
  "hoy": [
    {{
      "hora": "06:00",
      "viento": "5 km/h",
      "direccionViento": "Noreste",
      "direccionVientoGrados": 45,
      "oleaje": "0.3 m",
      "direccionOleaje": "Suroeste",
      "temperatura": "17°C",
      "condiciones": "Tranquilo y seguro para principiantes.",
      "nivel": "Principiante"
    }}
  ],
  "mañana": [...],
  "mareas": [],
  "generado": "{fecha_generacion}"
}}

Reglas:
- Responde ÚNICAMENTE con JSON válido, sin texto adicional.
- Conserva exactamente los valores de viento, oleaje, temperatura y direcciones del input.
- "condiciones": frase útil sobre si es buen momento para SUP en {spot['nombre']} y por qué.
- "nivel" basado SOLO en velocidad del viento:
    Principiante: ≤ 8 km/h
    Intermedio: 9–15 km/h
    Avanzado: > 15 km/h
- "mareas" debe ser siempre un array vacío [].
- No repitas frases de condiciones entre bloques.
- "generado" debe ser exactamente: "{fecha_generacion}"
"""

    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "Responde solo con JSON válido."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4,
        max_tokens=2000
    )
    content = response.choices[0].message.content.strip()
    # Quitar bloques ```json si los hay
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content.strip())


def procesar_spot(spot, api_key, fecha_generacion):
    print(f"\n🏄 Procesando: {spot['nombre']} ({spot['id']})")
    try:
        horarios = obtener_datos_openmeteo(spot["lat"], spot["lng"])
        print(f"  🤖 Generando interpretación con OpenAI...")
        data = generar_con_openai(spot, horarios, fecha_generacion, api_key)
        # Aseguramos que mareas sea array vacío si no viene
        data.setdefault("mareas", [])
        filename = f"data-{spot['id']}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  ✅ Guardado: {filename}")
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY no está definida.")

    with open("spots-config.json", encoding="utf-8") as f:
        spots = json.load(f)

    # Filtro opcional por --spot id
    filtro = None
    if "--spot" in sys.argv:
        idx = sys.argv.index("--spot")
        filtro = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else None

    if filtro:
        spots = [s for s in spots if s["id"] == filtro]
        if not spots:
            print(f"❌ Spot '{filtro}' no encontrado en spots-config.json")
            sys.exit(1)

    fecha_generacion = datetime.now(ZONA_CHILE).strftime("%Y-%m-%d %H:%M:%S")
    print(f"🗓  Fecha: {fecha_generacion} | {len(spots)} spot(s) a procesar")

    resultados = {s["id"]: procesar_spot(s, api_key, fecha_generacion) for s in spots}

    ok = sum(resultados.values())
    print(f"\n{'='*50}")
    print(f"Resultado: {ok}/{len(spots)} spots generados correctamente")
    if ok < len(spots):
        fallidos = [k for k, v in resultados.items() if not v]
        print(f"Fallidos: {', '.join(fallidos)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

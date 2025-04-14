import openai
import json
from datetime import datetime, timedelta
import os
import requests

# Coordenadas de La Herradura
LAT = -29.9696
LON = -71.3553

# Obtener datos reales desde Open-Meteo
print("📡 Consultando Open-Meteo...")
meteo_url = (
    f"https://marine-api.open-meteo.com/v1/marine?latitude={LAT}&longitude={LON}"
    f"&hourly=wave_height,wind_speed,wind_direction,water_temperature,wave_direction"
    f"&timezone=auto"
)
response_meteo = requests.get(meteo_url)
data_meteo = response_meteo.json()

# Validar respuesta de Open-Meteo
print("🔎 Respuesta Open-Meteo:", json.dumps(data_meteo, indent=2))
if "hourly" not in data_meteo:
    raise ValueError("❌ Open-Meteo no devolvió datos 'hourly'. Revisa la URL o parámetros.")

# Filtrar solo las horas relevantes (06:00 a 21:00 cada 3h)
horas_objetivo = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
hoy = datetime.now().date().isoformat()
manana = (datetime.now().date() + timedelta(days=1)).isoformat()

horarios = {"hoy": [], "mañana": []}

for i, fecha in enumerate([hoy, manana]):
    bloques = []
    for hora in horas_objetivo:
        timestamp = f"{fecha}T{hora}"
        if timestamp in data_meteo["hourly"]["time"]:
            idx = data_meteo["hourly"]["time"].index(timestamp)
            bloques.append({
                "hora": hora,
                "viento": f"{data_meteo['hourly']['wind_speed'][idx]} km/h",
                "oleaje": f"{data_meteo['hourly']['wave_height'][idx]} m",
                "direccionOleaje": f"{int(data_meteo['hourly']['wave_direction'][idx])}°",
                "temperatura": f"{data_meteo['hourly']['water_temperature'][idx]}°C"
            })
    horarios["hoy" if i == 0 else "mañana"] = bloques

# Obtener mareas desde WorldTides (requiere API key)
print("🌊 Consultando WorldTides...")
WT_API_KEY = os.environ.get("WORLDTIDES_API_KEY")
if not WT_API_KEY:
    raise ValueError("❌ WORLDTIDES_API_KEY no está definido en el entorno.")

worldtides_url = f"https://www.worldtides.info/api/v2?extremes&lat={LAT}&lon={LON}&days=1&key={WT_API_KEY}"
response_mareas = requests.get(worldtides_url)
mareas_data = response_mareas.json()

mareas_formateadas = []
for m in mareas_data.get("extremes", [])[:4]:
    tipo = "alta" if m["type"].lower() == "high" else "baja"
    hora = datetime.fromisoformat(m["date"]).strftime("%H:%M")
    mareas_formateadas.append({"tipo": tipo, "hora": hora})

# Preparar prompt usando los datos reales
clima_contexto = json.dumps(horarios, indent=2, ensure_ascii=False)
marea_contexto = json.dumps(mareas_formateadas, indent=2, ensure_ascii=False)

prompt = f"""
Actúa como un asistente experto en SUP (stand up paddle) para La Herradura, Coquimbo.
A continuación tienes datos REALES de clima y condiciones horarias extraídas de Open-Meteo, y horarios reales de mareas desde WorldTides:

CLIMA:
{clima_contexto}

MAREAS:
{marea_contexto}

Usando exclusivamente esta información como base, genera un JSON estructurado como este ejemplo:

{{
  "hoy": [...],
  "mañana": [...],
  "mareas": [...]
}}

Reglas:
- Responde únicamente con JSON válido.
- Las condiciones deben ser coherentes con los datos reales (viento, oleaje, temperatura).
- Asigna "nivel" según criterios como viento (>10 km/h = Avanzado, <5 = Principiante), oleaje (>0.7 m = Avanzado, <0.4 m = Principiante).
- No repitas descripciones.
"""

print("🤖 Generando JSON con datos reales desde ChatGPT...")

api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    raise ValueError("❌ OPENAI_API_KEY no está definido en el entorno.")
client = openai.OpenAI(api_key=api_key)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "Eres un asistente que responde solo con JSON válido."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.4,
    max_tokens=2000
)

try:
    content = response.choices[0].message.content.strip()
    parsed = json.loads(content)
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)
    print("✅ Archivo data.json generado exitosamente con datos reales.")
except Exception as e:
    print("❌ Error al guardar el JSON:", e)
    print("Respuesta cruda:", response.choices[0].message.content)

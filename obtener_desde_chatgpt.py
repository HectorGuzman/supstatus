import openai
import json
from datetime import datetime, timedelta
import os
import requests

# Coordenadas de La Herradura (Club de Yates)
LAT = -29.983059
LON = -71.365225

# Función para convertir grados a dirección cardinal
def direccion_cardinal(grados):
    direcciones = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste']
    idx = int((grados + 22.5) % 360 / 45)
    return direcciones[idx]

# Obtener datos marinos desde Open-Meteo (oleaje y temperatura del agua)
print("\U0001F4E1 Consultando Open-Meteo (marine)...")
marine_url = (
    f"https://marine-api.open-meteo.com/v1/marine?latitude={LAT}&longitude={LON}"
    f"&hourly=wave_height,wave_direction"
    f"&timezone=auto"
)
response_marine = requests.get(marine_url)
data_marine = response_marine.json()

# Obtener datos atmosféricos desde Open-Meteo (viento, temperatura ambiente)
print("\U0001F32C️ Consultando Open-Meteo (forecast)...")

forecast_url = (
    f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}"
    f"&hourly=wind_speed_10m,wind_direction_10m,temperature_2m"
    f"&timezone=auto"
)
response_forecast = requests.get(forecast_url)
print("\U0001F50E Respuesta Open-Meteo (forecast):", response_forecast.text)
data_forecast = response_forecast.json()

# Validar respuestas
print("\U0001F50E Respuesta Open-Meteo (marine):", json.dumps(data_marine, indent=2))
if "hourly" not in data_marine:
    raise ValueError("❌ Open-Meteo (marine) no devolvió datos 'hourly'.")
if "hourly" not in data_forecast:
    raise ValueError("❌ Open-Meteo (forecast) no devolvió datos 'hourly'.")

# Filtrar solo las horas relevantes (06:00 a 21:00 cada 3h)
horas_objetivo = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
hoy = datetime.now().date().isoformat()
manana = (datetime.now().date() + timedelta(days=1)).isoformat()

horarios = {"hoy": [], "mañana": []}

for i, fecha in enumerate([hoy, manana]):
    bloques = []
    for hora in horas_objetivo:
        timestamp = f"{fecha}T{hora}"
        if timestamp in data_forecast["hourly"]["time"] and timestamp in data_marine["hourly"]["time"]:
            idx_f = data_forecast["hourly"]["time"].index(timestamp)
            idx_m = data_marine["hourly"]["time"].index(timestamp)
            direccion_grados = int(data_marine['hourly']['wave_direction'][idx_m])
            direccion_texto = direccion_cardinal(direccion_grados)
            bloques.append({
                "hora": hora,
                "viento": f"{data_forecast['hourly']['wind_speed_10m'][idx_f]} km/h",
                "oleaje": f"{data_marine['hourly']['wave_height'][idx_m]} m",
                "direccionOleaje": direccion_texto,
                "temperatura": f"{data_forecast['hourly']['temperature_2m'][idx_f]}°C"
            })
    horarios["hoy" if i == 0 else "mañana"] = bloques

# Obtener mareas desde WorldTides (requiere API key)
print("\U0001F30A Consultando WorldTides...")
WT_API_KEY = os.environ.get("WORLDTIDES_API_KEY")
if not WT_API_KEY:
    raise ValueError("❌ WORLDTIDES_API_KEY no está definido en el entorno.")

worldtides_url = f"https://www.worldtides.info/api/v2?extremes&lat={LAT}&lon={LON}&days=2&key={WT_API_KEY}"
response_mareas = requests.get(worldtides_url)
mareas_data = response_mareas.json()

# Agrupar próximas mareas (máximo 6 eventos)
mareas_proximas = []
for m in mareas_data.get("extremes", [])[:6]:
    tipo = "alta" if m["type"].lower() == "high" else "baja"
    fecha_evento = datetime.fromisoformat(m["date"].replace("+0000", ""))
    hora = fecha_evento.strftime("%H:%M")
    mareas_proximas.append({"tipo": tipo, "hora": hora})

# Fecha de generación
fecha_generacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Preparar prompt usando los datos reales
clima_contexto = json.dumps(horarios, indent=2, ensure_ascii=False)
marea_contexto = json.dumps(mareas_proximas, indent=2, ensure_ascii=False)

prompt = f"""
Actúa como un asistente experto en SUP (stand up paddle) para La Herradura, Coquimbo.
A continuación tienes datos REALES de clima y condiciones horarias extraídas de Open-Meteo, y horarios reales de mareas desde WorldTides:

CLIMA:
{clima_contexto}

PRÓXIMAS MAREAS:
{marea_contexto}

Usando exclusivamente esta información como base, genera un JSON estructurado como este ejemplo:

{{
  "hoy": [
    {{
      "hora": "06:00",
      "viento": "5 km/h",
      "oleaje": "0.3 m",
      "direccionOleaje": "Suroeste",
      "temperatura": "17°C",
      "condiciones": "Tranquilo y seguro para principiantes.",
      "nivel": "Principiante"
    }}
  ],
  "mañana": [...],
  "mareas": [
    {{"tipo": "alta", "hora": "03:00"}},
    {{"tipo": "baja", "hora": "09:00"}}
  ],
  "generado": "{fecha_generacion}"
}}

Reglas:
- Responde únicamente con JSON válido.
- Las condiciones deben ser coherentes con los datos reales (viento, temperatura, oleaje solo como apoyo).
- Cada bloque horario debe incluir SIEMPRE: viento, oleaje, dirección del oleaje (en palabras), temperatura, condiciones y nivel.
- Las "condiciones" deben ser una frase útil para el usuario sobre si es un buen momento para hacer SUP y por qué. Ej: "Muy tranquilo y seguro, ideal para aprender."
- Asigna "nivel" de SUP **solo en base al viento**:
  - Principiante: ≤ 8 km/h
  - Intermedio: entre 9 y 15 km/h
  - Avanzado: > 15 km/h
- No repitas descripciones entre bloques horarios.
- La clave "mareas" debe ser una lista con las próximas 4 a 6 mareas (alta y baja).
- Agrega la clave "generado" con la fecha y hora actual (formato yyyy-mm-dd HH:MM:SS).
"""

print("\U0001F916 Generando JSON con datos reales desde ChatGPT...")

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

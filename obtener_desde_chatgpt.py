import openai
import json
from datetime import datetime, timedelta
import os

# Requiere que definas OPENAI_API_KEY como secreto en GitHub
print("🔍 OPENAI_API_KEY presente:", "OPENAI_API_KEY" in os.environ)
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    raise ValueError("❌ OPENAI_API_KEY no está definido en el entorno.")
client = openai.OpenAI(api_key=api_key)

prompt = """
Actúa como un asistente experto en condiciones marítimas para SUP en La Herradura, Coquimbo. Genera datos para hoy y mañana con la siguiente estructura JSON:
{
  "hoy": [
    {
      "hora": "06:00",
      "viento": "X km/h (dirección)",
      "oleaje": "X.X m",
      "direccionOleaje": "Norte/Sureste/etc",
      "marea": "baja/media/alta",
      "temperatura": "X°C",
      "condiciones": "Breve descripción",
      "nivel": "Principiante/Intermedio/Avanzado"
    },
    ...
  ],
  "mañana": [ ... ],
  "mareas": [
    { "tipo": "alta", "hora": "02:30" },
    { "tipo": "baja", "hora": "08:45" },
    { "tipo": "alta", "hora": "14:30" },
    { "tipo": "baja", "hora": "20:45" }
  ]
}
Debe incluir 6 bloques por día (06:00 a 21:00 cada 3h), de forma natural, realista y útil. Las mareas deben representar horarios estimados típicos del lugar.
"""

print("Generando datos desde ChatGPT...")

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "Eres un asistente que responde solo con JSON válido."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.4,
    max_tokens=2000
)

# Parsear respuesta (asegura formato válido)
try:
    content = response.choices[0].message.content.strip()
    parsed = json.loads(content)
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)
    print("✅ Archivo data.json generado exitosamente.")
except Exception as e:
    print("❌ Error al generar o guardar el JSON:", e)
    print("Respuesta:", response.choices[0].message.content)

import openai
import json
from datetime import datetime, timedelta
import os

# Requiere que definas OPENAI_API_KEY como secreto en GitHub
openai.api_key = os.getenv("OPENAI_API_KEY")

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
  "mañana": [ ... ]
}
Debe incluir 6 bloques por día (06:00 a 21:00 cada 3h), de forma natural, realista y útil. Consulta esta data donde estimes conveniente pero en paginas de surf y meterologia
"""

print("Generando datos desde ChatGPT...")

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Eres un asistente que responde solo con JSON válido."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.4,
    max_tokens=2000
)

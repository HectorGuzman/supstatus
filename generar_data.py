
import json
import random
from datetime import datetime, timedelta

def direccion_aleatoria():
    return random.choice([
        "Norte", "Noreste", "Este", "Sureste",
        "Sur", "Suroeste", "Oeste", "Noroeste"
    ])

def generar_datos_dia():
    horas = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
    condiciones = [
        ("Muy tranquilo, ideal para comenzar el día.", "Principiante"),
        ("Tranquilo, buen momento para SUP.", "Principiante"),
        ("Algo más movido, atención al viento.", "Intermedio"),
        ("Condiciones algo intensas, precaución.", "Avanzado"),
        ("Ideal para una última sesión suave.", "Intermedio"),
        ("Tranquilo al atardecer.", "Principiante")
    ]
    datos = []
    for i, hora in enumerate(horas):
        datos.append({
            "hora": hora,
            "viento": f"{random.randint(3, 12)} km/h ({direccion_aleatoria()[:2]})",
            "oleaje": f"{round(random.uniform(0.3, 0.9), 1)} m",
            "direccionOleaje": direccion_aleatoria(),
            "marea": random.choice(["baja", "subiendo", "media", "alta", "bajando"]),
            "temperatura": f"{random.randint(17, 25)}°C",
            "condiciones": condiciones[i][0],
            "nivel": condiciones[i][1]
        })
    return datos

def main():
    hoy = datetime.now()
    manana = hoy + timedelta(days=1)

    data = {
        "fecha_generacion": hoy.strftime("%Y-%m-%d"),
        "hoy": generar_datos_dia(),
        "mañana": generar_datos_dia()
    }

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()

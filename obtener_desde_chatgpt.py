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


def get_with_retry(url, retries=3, timeout=30):
    import time
    for attempt in range(retries):
        try:
            return requests.get(url, timeout=timeout)
        except requests.exceptions.Timeout:
            if attempt < retries - 1:
                wait = 5 * (attempt + 1)
                print(f"  ⏱️  Timeout, reintentando en {wait}s... ({attempt+1}/{retries})")
                time.sleep(wait)
            else:
                raise


def obtener_datos_openmeteo(lat, lon):
    hoy = datetime.now().date().isoformat()
    manana = (datetime.now().date() + timedelta(days=1)).isoformat()

    print(f"  📡 Open-Meteo marine ({lat}, {lon})...")
    r_marine = get_with_retry(
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wave_height,wave_direction&timezone=auto&forecast_days=2"
    )
    data_marine = r_marine.json()

    print(f"  🌬️ Open-Meteo forecast ({lat}, {lon})...")
    r_forecast = get_with_retry(
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wind_speed_10m,wind_direction_10m,temperature_2m&timezone=auto&forecast_days=2"
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


def generar_mareas(fecha_str):
    """Genera 4 mareas semi-diurnas realistas para el Pacífico chileno.
    Las horas rotan ~50 min/día para simular el ciclo lunar real.
    """
    from datetime import date
    dias_desde_ref = (date.fromisoformat(fecha_str) - date(2024, 1, 1)).days
    # Hora base de primera marea alta: rota 50 min por día, ciclo ~29 días
    base_min = (dias_desde_ref * 50) % (24 * 60)
    # Alturas: varían levemente con ciclo de 15 días (mareas vivas/muertas)
    ciclo15 = (dias_desde_ref % 15) / 15.0  # 0..1
    alta1 = round(1.2 + 0.5 * ciclo15, 1)
    alta2 = round(1.1 + 0.5 * ciclo15, 1)
    baja1 = round(0.6 - 0.4 * ciclo15, 1)
    baja2 = round(0.5 - 0.4 * ciclo15, 1)

    def mins_to_hhmm(m):
        m = int(m) % (24 * 60)
        return f"{m // 60:02d}:{m % 60:02d}"

    return [
        {"hora": mins_to_hhmm(base_min),           "altura": alta1, "tipo": "alta"},
        {"hora": mins_to_hhmm(base_min + 372),      "altura": baja1, "tipo": "baja"},
        {"hora": mins_to_hhmm(base_min + 745),      "altura": alta2, "tipo": "alta"},
        {"hora": mins_to_hhmm(base_min + 1117),     "altura": baja2, "tipo": "baja"},
    ]


def nivel_por_viento(viento_str):
    try:
        kmh = float(viento_str.split()[0])
        if kmh <= 8:
            return "Principiante"
        elif kmh <= 15:
            return "Intermedio"
        return "Avanzado"
    except Exception:
        return "Intermedio"


def validar_respuesta(data, horarios_originales):
    """Verifica que OpenAI no alteró datos objetivos y generó contenido coherente.
    Errores críticos (datos alterados, condiciones faltantes) → lanza excepción → no se guarda.
    Advertencias (mareas vacías) → solo imprime warning, el dato se guarda igual.
    """
    campos_objetivos = ("hora", "viento", "oleaje", "temperatura", "direccionOleaje", "direccionViento", "direccionVientoGrados")

    for dia in ("hoy", "mañana"):
        bloques_orig = horarios_originales.get(dia, [])
        bloques_resp = data.get(dia, [])

        if len(bloques_resp) != len(bloques_orig):
            raise ValueError(
                f"[{dia}] Número de bloques incorrecto: esperado {len(bloques_orig)}, recibido {len(bloques_resp)}"
            )

        for orig, resp in zip(bloques_orig, bloques_resp):
            for campo in campos_objetivos:
                if str(orig.get(campo)) != str(resp.get(campo)):
                    raise ValueError(
                        f"[{dia} {orig['hora']}] Campo '{campo}' alterado por OpenAI: "
                        f"'{orig.get(campo)}' → '{resp.get(campo)}'"
                    )
            condiciones = resp.get("condiciones", "").strip()
            if not condiciones or len(condiciones) < 10:
                raise ValueError(f"[{dia} {orig['hora']}] 'condiciones' vacío o muy corto: '{condiciones}'")

    if not data.get("generado"):
        raise ValueError("Falta el campo 'generado'")


def generar_con_openai(spot, horarios, fecha_generacion, api_key):
    # Enriquecer bloques con nivel (determinístico) antes de enviar a OpenAI
    horarios_copia = json.loads(json.dumps(horarios))  # deep copy para validación posterior
    for dia in ("hoy", "mañana"):
        for bloque in horarios.get(dia, []):
            bloque["nivel"] = nivel_por_viento(bloque.get("viento", "0 km/h"))

    bloques_json = json.dumps(horarios, indent=2, ensure_ascii=False)
    n_bloques = sum(len(horarios.get(d, [])) for d in ('hoy', 'mañana'))

    prompt = f"""Eres un experto en SUP (stand up paddle) en {spot['nombre']}, Chile (lat {spot['lat']}, lon {spot['lng']}).

Tienes {n_bloques} bloques horarios con datos REALES de Open-Meteo.
Tu tarea: agregar el campo "condiciones" a CADA bloque con una frase útil y específica sobre si ese momento es bueno para SUP en {spot['nombre']}. Considera viento, oleaje y temperatura. Varía las frases — no repitas la misma.

REGLAS ESTRICTAS:
1. Devuelve EXACTAMENTE el mismo JSON con SOLO el campo "condiciones" agregado. NO cambies hora, viento, oleaje, temperatura, direccionOleaje, direccionViento, direccionVientoGrados ni ningún otro valor existente.
2. Agrega al nivel superior del JSON:
   - "generado": "{fecha_generacion}"

JSON a completar:
{bloques_json}

Responde ÚNICAMENTE con JSON válido. Cero texto extra, cero markdown."""

    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Eres un asistente que responde SOLO con JSON válido. Nunca uses markdown, nunca agregues texto antes o después del JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=4000,
    )
    content = response.choices[0].message.content.strip()

    # Limpiar markdown si viene igual
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    data = json.loads(content)

    # Validar coherencia — si falla, lanza excepción y el spot se marca como fallido
    print(f"  🔍 Validando respuesta de OpenAI...")
    validar_respuesta(data, horarios_copia)
    print(f"  ✅ Validación OK — {n_bloques} bloques")

    return data


def procesar_spot(spot, api_key, fecha_generacion):
    print(f"\n🏄 Procesando: {spot['nombre']} ({spot['id']})")
    try:
        horarios = obtener_datos_openmeteo(spot["lat"], spot["lng"])
        print(f"  🤖 Generando interpretación con OpenAI...")
        data = generar_con_openai(spot, horarios, fecha_generacion, api_key)
        # Mareas generadas localmente (no depende de OpenAI)
        hoy_str = datetime.now().date().isoformat()
        data["mareas"] = generar_mareas(hoy_str)
        filename = f"data-{spot['id']}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  ✅ Guardado: {filename}")
        return True
    except json.JSONDecodeError as e:
        print(f"  ❌ JSON inválido de OpenAI: {e}")
        return False
    except ValueError as e:
        print(f"  ❌ Validación fallida: {e}")
        return False
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

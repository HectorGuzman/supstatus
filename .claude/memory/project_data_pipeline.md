---
name: Pipeline de datos — pronóstico diario de spots
description: Script Python, APIs externas, GitHub Actions y estructura de los datos generados para pronóstico
type: project
originSessionId: d6c20b42-bde3-490e-b3bf-b6645603d42f
---
## Propósito

Genera pronósticos diarios de surf/SUP para 9 spots chilenos usando Open-Meteo (datos objetivos) + OpenAI gpt-4o-mini (descripción en español). Corre automáticamente cada día via GitHub Actions.

---

## Script principal: `obtener_desde_chatgpt.py`

### Flujo por spot
1. Lee `spots-config.json` (9 spots con lat/lng)
2. Llama **Open-Meteo Marine API** → wave_height, wave_direction
3. Llama **Open-Meteo Forecast API** → wind_speed_10m, wind_direction_10m, temperature_2m
4. Extrae 6 bloques horarios: 06, 09, 12, 15, 18, 21h (hoy y mañana)
5. Convierte grados → cardinal (Norte, Noreste, etc.)
6. Determina nivel: ≤8 km/h = Principiante, ≤15 = Intermedio, >15 = Avanzado
7. Envía a **OpenAI gpt-4o-mini** para agregar campo `condiciones` (descripción texto)
8. Genera mareas **localmente** (sin OpenAI) con `generar_mareas(fecha)`
9. Guarda `data-{spotId}.json`

### `generar_mareas(fecha_str)` — generación determinista
- 4 mareas semi-diurnas por día
- Rotación de 50 min/día (ciclo lunar)
- Alturas varían con ciclo de 15 días (mareas vivas/muertas)
- Referencia: días desde 2024-01-01

### Validación
- `validar_respuesta(data)`: verifica que OpenAI no alteró campos objetivos (viento, oleaje, temperatura, hora)
- Si falla: reintenta o usa datos sin descripción

### Uso
```bash
python obtener_desde_chatgpt.py                    # todos los spots
python obtener_desde_chatgpt.py --spot herradura   # spot específico
```

---

## Spots configurados (`spots-config.json`)

| id | nombre | lat | lng |
|----|--------|-----|-----|
| herradura | La Herradura | -29.98 | -71.37 |
| skate_park_coquimbo | Skatepark Coquimbo | -29.96 | -71.31 |
| guanaqueros | Guanaqueros | -30.19 | -71.43 |
| tongoy | Tongoy | -30.25 | -71.49 |
| vina | Viña del Mar | -33.02 | -71.55 |
| pichilemu | Pichilemu | -34.39 | -72.00 |
| iquique | Iquique | -20.21 | -70.15 |
| bahia_inglesa | Bahía Inglesa | -27.11 | -70.86 |
| arica | Arica | -18.48 | -70.31 |

---

## Estructura del archivo generado (`data-{spotId}.json`)

```json
{
  "hoy": [
    {
      "hora": "06:00",
      "viento": "6.4 km/h",
      "oleaje": "1.28 m",
      "direccionOleaje": "Suroeste",
      "direccionViento": "Noreste",
      "direccionVientoGrados": 65,
      "temperatura": "8.4°C",
      "nivel": "Principiante",
      "condiciones": "Excelentes condiciones para principiantes..."
    }
  ],
  "mañana": [...],
  "mareas": [
    { "hora": "03:20", "altura": 1.4, "tipo": "alta" },
    { "hora": "09:32", "altura": 0.3, "tipo": "baja" },
    { "hora": "15:45", "altura": 1.3, "tipo": "alta" },
    { "hora": "21:57", "altura": 0.2, "tipo": "baja" }
  ],
  "generado": "2025-06-04 07:15:23"
}
```

---

## GitHub Actions (`.github/workflows/generar-data.yml`)

**Trigger:** Diario a las 07:00 UTC (~3-4 AM hora Chile) + manual dispatch (con param `spot`)

**Pasos:**
1. Checkout repo
2. Python 3.10 + install openai, requests, pytz
3. Configura git (github-actions bot)
4. Corre `obtener_desde_chatgpt.py` (todos o --spot X)
5. Si falla, reintenta una vez
6. Hace commit + push de los `data-*.json` generados

**Commit automático:** "🔄 Actualización diaria de spots"

**Secretos requeridos:** `OPENAI_API_KEY` en GitHub Secrets

---

## APIs externas

| API | Uso | Costo |
|-----|-----|-------|
| Open-Meteo Marine | Oleaje + dirección | Gratis |
| Open-Meteo Forecast | Viento + temperatura | Gratis |
| OpenAI gpt-4o-mini | Descripción `condiciones` en español | Pago por token |

---

## Datos legacy

- `data.json` — Archivo consolidado legacy (todos los spots en uno), aún existe pero los archivos por spot (`data-{id}.json`) son los que usa el backend de notificaciones

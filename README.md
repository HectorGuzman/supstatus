
# SUP La Herradura 🌊

Este proyecto muestra condiciones para hacer Stand Up Paddle en La Herradura, Coquimbo.

## 🔧 Funcionalidades
- Visualización clara y responsiva de condiciones horarias.
- Botones para ver "Hoy" y "Mañana".
- Horarios de salida y puesta del sol.
- Mareas estimadas (4 por día).
- Botón para compartir condiciones.
- Datos dinámicos desde `data.json`, actualizados todos los días.

## 🔁 Actualización automática

### GitHub Actions
Este repositorio incluye un workflow que:
- Se ejecuta todos los días a las 00:00 UTC.
- Corre `generar_data.py`.
- Genera un nuevo `data.json` con datos simulados.
- Hace commit automático con los cambios.

## 📂 Archivos importantes

- `index.html`: interfaz web principal
- `data.json`: archivo con los datos de condiciones
- `generar_data.py`: script en Python que crea el `data.json`
- `.github/workflows/generar-data.yml`: automation GitHub Actions

## 🚀 Publicación
Puedes usar GitHub Pages:
1. Ve a **Settings > Pages**
2. Fuente: rama `main`, carpeta `/root`
3. Espera que se despliegue (unos segundos)

## ❤️ Créditos
Creado por [@__jokerguzman](https://instagram.com/__jokerguzman) y automatizado con GitHub Actions.

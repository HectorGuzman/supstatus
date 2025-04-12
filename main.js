const fechaEl = document.getElementById("fecha");
const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const hoyFecha = new Date();
fechaEl.textContent = hoyFecha.toLocaleDateString('es-CL', opciones);

const hoyData = [
  { hora: "06:00", viento: "5 km/h (N)", oleaje: "0.3 m", marea: "baja", condiciones: "Muy tranquilo, ideal para paseo." },
  { hora: "09:00", viento: "8 km/h (NE)", oleaje: "0.4 m", marea: "subiendo", condiciones: "Perfecto para principiantes." },
  { hora: "12:00", viento: "12 km/h (E)", oleaje: "0.5 m", marea: "alta", condiciones: "Ligeramente movido, intermedios ok." },
  { hora: "15:00", viento: "15 km/h (SE)", oleaje: "0.6 m", marea: "bajando", condiciones: "Precaución para principiantes." },
  { hora: "18:00", viento: "10 km/h (S)", oleaje: "0.4 m", marea: "baja", condiciones: "Agradable, buena luz y calma." },
  { hora: "21:00", viento: "5 km/h (SW)", oleaje: "0.3 m", marea: "subiendo", condiciones: "Tranquilo, ideal para terminar el día." }
];

const dataPorDia = {
  "hoy": hoyData,
  "mañana": [...hoyData],
  "pasado": [...hoyData]
};

const contenedor = document.getElementById("pronostico");
const mensajeDia = document.createElement("p");
mensajeDia.style.textAlign = "center";
mensajeDia.style.fontSize = "0.95em";
mensajeDia.style.color = "#555";
document.querySelector(".container").prepend(mensajeDia);

function obtenerMensaje(dia) {
  const ahora = new Date();
  const hora = ahora.getHours();
  if (dia === "hoy") {
    if (hora < 9) return "Buen día para madrugar y disfrutar del agua tranquila.";
    if (hora < 15) return "Buen momento para una sesión de SUP recreativa.";
    return "Condiciones suaves ideales para terminar el día.";
  } else if (dia === "mañana") {
    if (hora < 12) return "Mañana se espera mejor viento en la tarde.";
    return "Ideal para remar después de almuerzo.";
  } else if (dia === "pasado") {
    if (hora < 12) return "Día suave para quienes se inician temprano.";
    return "Pasado mañana se perfila como día muy tranquilo en la tarde.";
  }
  return "";
}

function renderizarPronostico(dia) {
  contenedor.innerHTML = "";
  dataPorDia[dia].forEach(item => {
    const card = document.createElement("div");
    const horaNum = parseInt(item.hora.split(":")[0]);
    let fondo = "";
    let clima = item.condiciones.toLowerCase();
    let icono = "☀️";
    let borde = "none";

    if (clima.includes("tranquilo") || clima.includes("calma")) {
      fondo = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
      icono = "🏄‍♂️";
      borde = "2px solid #00b4d8";
    } else if (clima.includes("movido") || clima.includes("viento")) {
      fondo = "https://images.unsplash.com/photo-1600185361253-fb0baf4f2f42?auto=format&fit=crop&w=800&q=80";
      icono = "🌬️";
      borde = "2px solid #f77f00";
    } else if (horaNum >= 18 && horaNum < 21) {
      fondo = "https://images.unsplash.com/photo-1592159937631-49f6efb7c559?auto=format&fit=crop&w=800&q=80";
      icono = "🌇";
      borde = "2px solid #ffb703";
    } else {
      fondo = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=60";
      icono = "☀️";
      borde = "2px solid #06d6a0";
    }

    card.className = "card";
    card.style.backgroundImage = `url('${fondo}')`;
    card.style.border = borde;
    card.innerHTML = `
      <div class="hora">${icono} ${item.hora} hrs</div>
      <div class="detalle"><strong>🌬️ Viento:</strong> ${item.viento}</div>
      <div class="detalle"><strong>🌊 Oleaje:</strong> ${item.oleaje}</div>
      <div class="detalle"><strong>🌙 Marea:</strong> ${item.marea}</div>
      <div class="detalle"><strong>🔎 Condiciones:</strong> ${item.condiciones}</div>
    `;
    contenedor.appendChild(card);
  });
}

function cambiarDia(value) {
  document.querySelectorAll("#selector-dia button").forEach(btn => {
    btn.classList.remove("activo");
    if (btn.textContent.toLowerCase().includes(value)) {
      btn.focus();
      btn.classList.add("activo");
    }
  });
  const nuevaFecha = new Date();
  if (value === "mañana") nuevaFecha.setDate(nuevaFecha.getDate() + 1);
  if (value === "pasado") nuevaFecha.setDate(nuevaFecha.getDate() + 2);
  fechaEl.textContent = nuevaFecha.toLocaleDateString('es-CL', opciones);
  mensajeDia.textContent = obtenerMensaje(value);
  renderizarPronostico(value);
}

mensajeDia.textContent = obtenerMensaje("hoy");
renderizarPronostico("hoy");

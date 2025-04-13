const contenedor = document.getElementById("pronostico");
const mensajeDia = document.createElement("p");
mensajeDia.style.textAlign = "center";
mensajeDia.style.fontSize = "0.95em";
mensajeDia.style.color = "#555";
document.querySelector(".container").prepend(mensajeDia);
const fechaEl = document.getElementById("fecha");
const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const hoyFecha = new Date();
fechaEl.textContent = hoyFecha.toLocaleDateString('es-CL', opciones);

let dataPorDia = {
  "hoy": [
    { "hora": "06:00", "temperatura": "18°C", "viento": "3 km/h (N)", "oleaje": "0.2 m", "marea": "baja", "condiciones": "Muy tranquilo, ideal para iniciar el día." }
  ],
  "mañana": [
    { "hora": "06:00", "temperatura": "17°C", "viento": "2 km/h (N)", "oleaje": "0.2 m", "marea": "baja", "condiciones": "Condiciones calmas para comenzar." }
  ]
};

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
  }
  return "";
}

function renderizarPronostico(dia) {
  contenedor.innerHTML = "";
  dataPorDia[dia].forEach(item => {
    const card = document.createElement("div");
    const horaNum = parseInt(item.hora.split(":"))[0];

    let icono = "☀️";
    let borde = "none";

    if (item.condiciones.toLowerCase().includes("tranquilo") || item.condiciones.toLowerCase().includes("calma")) {
      icono = "🏄‍♂️";
      borde = "2px solid #00b4d8";
    } else if (item.condiciones.toLowerCase().includes("movido") || item.condiciones.toLowerCase().includes("viento")) {
      icono = "🌬️";
      borde = "2px solid #f77f00";
    } else if (horaNum >= 18 && horaNum < 21) {
      icono = "🌇";
      borde = "2px solid #ffb703";
    } else {
      icono = "☀️";
      borde = "2px solid #06d6a0";
    }

    card.className = "card";
    if (horaNum >= 6 && horaNum < 9) {
      card.style.backgroundColor = '#a2d2ff';
    } else if (horaNum >= 9 && horaNum < 18) {
      card.style.backgroundColor = '#00b4d8';
    } else if (horaNum >= 18 && horaNum < 21) {
      card.style.backgroundColor = '#ffb703';
    } else {
      card.style.backgroundColor = '#023047';
    }
    card.style.border = borde;
    card.innerHTML = `
      <div class="icono-clima">${icono}</div>
      <div class="hora">${item.hora} hrs</div>
      <div class="detalle"><strong>🌬️ Viento:</strong> ${item.viento}</div>
      <div class="detalle"><strong>🌊 Oleaje:</strong> ${item.oleaje}</div>
      <div class="detalle"><strong>🌙 Marea:</strong> ${item.marea}</div>
      <div class="detalle"><strong>🌡️ Temperatura:</strong> ${item.temperatura}</div>
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
  fechaEl.textContent = nuevaFecha.toLocaleDateString('es-CL', opciones);
  mensajeDia.textContent = obtenerMensaje(value);
  renderizarPronostico(value);
}

mensajeDia.textContent = obtenerMensaje("hoy");
renderizarPronostico("hoy");
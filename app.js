import { stops, DEPARTURE, ARRIVAL, countdown, getJourneyState, greatCircle } from "./journey.js";

const $ = (id) => document.getElementById(id);
let simulatedTime = null;
let selectedStop = null;
let previousState = "";
let toastTimeout;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

stops.forEach((stop, index) => {
  const button = document.createElement("button");
  button.className = `stop${index === 7 ? " destination" : ""}`;
  button.innerHTML = `<span class="stop-top"><span>${String(index + 1).padStart(2, "0")}</span><span class="stop-marker">↗</span></span><span class="stop-code">${stop.code}</span><span class="stop-city">${stop.city}</span><span class="stop-date">${stop.date}</span><span class="stop-state"></span>`;
  button.addEventListener("click", () => { selectedStop = index; previousState = ""; update(); });
  $("timeline").append(button);
});

function update() {
  const now = simulatedTime ?? Date.now();
  const state = getJourneyState(now);
  const remaining = countdown(now);
  for (const [unit, value] of Object.entries(remaining)) $(unit).textContent = String(value).padStart(2, "0");
  document.querySelector(".countdown").setAttribute("aria-label", `${remaining.days} días, ${remaining.hours} horas, ${remaining.minutes} minutos y ${remaining.seconds} segundos para llegar a Buenos Aires`);
  $("home-clock").textContent = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(Date.now());
  $("home-clock").dateTime = new Date().toISOString();
  $("current-location").textContent = state.title;
  $("location-detail").textContent = state.detail;
  $("location-label").textContent = simulatedTime !== null ? "VISTA PREVIA · UBICACIÓN SIMULADA" : state.phase === "flying" ? "POSICIÓN ESTIMADA · NO ES GPS" : "AHORA, SEGÚN EL ITINERARIO";
  $("countdown-label").textContent = state.phase === "arrived" ? "LA ESPERA TERMINÓ · YA EN CASA" : "EL REENCUENTRO EMPIEZA EN";
  $("flight-status").textContent = state.phase === "arrived" ? "LLEGADA PREVISTA COMPLETADA" : state.phase === "flying" ? "EN VUELO · SEGÚN EL HORARIO" : state.phase === "airport" ? "ES HORA DE EMBARCAR" : "RUMBO A ESE ABRAZO";
  const { lat, lon } = state.position;
  $("coordinates").textContent = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}   ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "O"}`;
  const stateKey = `${state.index}-${state.phase}-${selectedStop}`;
  if (stateKey !== previousState) {
    previousState = stateKey;
    const selected = selectedStop ?? state.index;
    [...$("timeline").children].forEach((button, index) => {
      button.classList.toggle("current", index === state.index);
      button.classList.toggle("selected", index === selected);
      button.setAttribute("aria-pressed", String(index === selected));
      if (index === state.index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
      const label = index === state.index ? state.phase === "flying" ? "EN VUELO A EZE" : state.phase === "arrived" ? "EN CASA" : "ESTOY ACÁ" : index < state.index ? "YA ESTUVE" : index === 7 ? "CASA ♡" : "PRÓXIMAMENTE";
      button.querySelector(".stop-state").textContent = label;
      button.querySelector(".stop-marker").textContent = index === state.index ? "●" : index < state.index ? "✓" : index === 7 ? "♡" : "↗";
      button.setAttribute("aria-label", `${stops[index].city}, ${stops[index].date}. ${label}. Ver detalles`);
    });
    $("route-detail").replaceChildren();
    const name = document.createElement("strong");
    name.textContent = `${stops[selected].city} / `;
    $("route-detail").append(name, stops[selected].note);
  }
  if (reducedMotion.matches) drawGlobe(performance.now());
}

function showToast(message) {
  clearTimeout(toastTimeout);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimeout = setTimeout(() => { $("toast").hidden = true; }, 4500);
}

$("share-button").addEventListener("click", async () => {
  try {
    if (navigator.share) await navigator.share({ title: "Vuelta · Próxima parada: casa", text: "Cada vez falta menos para ese abrazo. Seguí mi camino a casa.", url: location.href });
    else { await navigator.clipboard.writeText(location.href); showToast("Enlace copiado. ¡Compartí la cuenta regresiva!"); }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("No se pudo compartir el viaje:", error);
      showToast("No se pudo compartir. Podés copiar el enlace desde la barra del navegador.");
    }
  }
});

function setSimulation(progress) {
  simulatedTime = DEPARTURE + (ARRIVAL - DEPARTURE) * progress / 100;
  $("flight-progress-label").textContent = `${progress} %`;
  $("demo-banner").hidden = false;
  $("simulation-controls").hidden = false;
  $("preview-flight").textContent = "Volver al mapa del vuelo ↑";
  selectedStop = null;
  update();
}
$("preview-flight").addEventListener("click", () => {
  setSimulation(Number($("flight-progress").value));
  $("inicio").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth" });
});
$("flight-progress").addEventListener("input", (event) => setSimulation(Number(event.target.value)));
$("exit-demo").addEventListener("click", () => {
  simulatedTime = null;
  selectedStop = null;
  $("demo-banner").hidden = true;
  $("simulation-controls").hidden = true;
  $("preview-flight").innerHTML = 'Simular el vuelo de regreso <svg class="icon"><use href="#i-arrow"/></svg>';
  update();
});

const canvas = $("globe");
const context = canvas.getContext("2d");
let land = [];
let landDots = [];
let size = { width: 0, height: 0 };
const radians = Math.PI / 180;

function project(lon, lat, centerLon, centerLat, radius, cx, cy) {
  const lambda = (lon - centerLon) * radians, phi = lat * radians, phi0 = centerLat * radians;
  return {
    x: cx + radius * Math.cos(phi) * Math.sin(lambda),
    y: cy - radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda)),
    visible: Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda) > 0.02,
  };
}

function drawGlobe(time) {
  if (!context || !size.width) return;
  const { width, height } = size;
  const cx = width / 2, cy = height * 0.445, radius = Math.min(width * 0.415, height * 0.365);
  const drift = reducedMotion.matches ? 0 : Math.sin(time / 16000) * 3;
  const projectPoint = (lon, lat, altitude = 1) => project(lon, lat, -22 + drift, 18, radius * altitude, cx, cy);
  context.clearRect(0, 0, width, height);
  for (let i = 0; i < 65; i++) {
    const x = ((i * 137.508 + 43) % width), y = ((i * 83.21 + 17) % (height * .85));
    context.fillStyle = `rgba(169,207,181,${.12 + (i % 4) * .06})`;
    context.fillRect(x, y, i % 9 === 0 ? 2 : 1, 1);
  }
  const halo = context.createRadialGradient(cx, cy, radius * .85, cx, cy, radius * 1.13);
  halo.addColorStop(0, "#75ba8c00"); halo.addColorStop(.65, "#75ba8c0b"); halo.addColorStop(1, "#75ba8c00");
  context.fillStyle = halo; context.beginPath(); context.arc(cx, cy, radius * 1.13, 0, Math.PI * 2); context.fill();
  const ocean = context.createRadialGradient(cx - radius * .4, cy - radius * .5, 0, cx, cy, radius * 1.2);
  ocean.addColorStop(0, "#172d2a"); ocean.addColorStop(.6, "#0b1c20"); ocean.addColorStop(1, "#080f15");
  context.fillStyle = ocean; context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#70977d33"; context.lineWidth = 1; context.stroke();

  function line(points, stroke, lineWidth = .5, dash = []) {
    context.beginPath(); context.strokeStyle = stroke; context.lineWidth = lineWidth; context.setLineDash(dash);
    let active = false;
    points.forEach(([lon, lat]) => {
      const p = projectPoint(lon, lat);
      if (!p.visible) { active = false; return; }
      if (!active) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
      active = true;
    });
    context.stroke(); context.setLineDash([]);
  }
  for (let lat = -60; lat <= 80; lat += 20) line(Array.from({ length: 181 }, (_, i) => [i * 2 - 180, lat]), "#7b9d8b15");
  for (let lon = -180; lon < 180; lon += 20) line(Array.from({ length: 91 }, (_, i) => [lon, i * 2 - 90]), "#7b9d8b15");

  context.save(); context.beginPath(); context.arc(cx, cy, radius - .5, 0, Math.PI * 2); context.clip();
  for (const polygon of land) {
    const outline = polygon[0];
    if (!outline.some(([lon, lat]) => projectPoint(lon, lat).visible)) continue;
    if (outline.every(([lon, lat]) => projectPoint(lon, lat).visible)) {
      context.beginPath();
      outline.forEach(([lon, lat], index) => { const p = projectPoint(lon, lat); if (index === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y); });
      context.closePath(); context.fillStyle = "#264539"; context.fill();
    }
    line(outline, "#739b7266", .65);
  }
  context.fillStyle = "#9cce8870";
  for (const [lon, lat] of landDots) {
    const p = projectPoint(lon, lat);
    if (p.visible) context.fillRect(p.x, p.y, 1, 1);
  }
  const state = getJourneyState(simulatedTime ?? Date.now());
  for (let i = 0; i < stops.length - 1; i++) {
    const points = Array.from({ length: 65 }, (_, step) => {
      const p = greatCircle(stops[i], stops[i + 1], step / 64);
      return [p.lon, p.lat];
    });
    line(points, i === 6 ? "#d2f98a88" : "#b5d98760", i === 6 ? 1.2 : .9, i === 6 ? [3, 5] : []);
  }
  if (state.phase === "flying") {
    const points = Array.from({ length: 81 }, (_, step) => { const p = greatCircle(stops[6], stops[7], state.progress * step / 80); return [p.lon, p.lat]; });
    line(points, "#d2f98a", 2);
  }
  stops.forEach((stop, i) => {
    const p = projectPoint(stop.lon, stop.lat);
    if (!p.visible) return;
    const highlighted = i === (selectedStop ?? state.index);
    context.beginPath(); context.arc(p.x, p.y, highlighted ? 4 : 2, 0, Math.PI * 2);
    context.fillStyle = highlighted || i === 7 ? "#d2f98a" : "#a8be98"; context.fill();
    if (highlighted) {
      const pulse = reducedMotion.matches ? 10 : 7 + (Math.sin(time / 650) + 1) * 3;
      context.beginPath(); context.arc(p.x, p.y, pulse, 0, Math.PI * 2); context.strokeStyle = "#d2f98a60"; context.lineWidth = 1; context.stroke();
    }
  });
  const labels = [{ stop: stops[1], text: "EUROPA", dx: 12, dy: -23 }, { stop: stops[7], text: "BUENOS AIRES", dx: 12, dy: 5 }];
  context.font = "8px Consolas, monospace";
  labels.forEach(({ stop, text, dx, dy }) => {
    const p = projectPoint(stop.lon, stop.lat);
    if (p.visible) { context.fillStyle = text === "BUENOS AIRES" ? "#d2f98a" : "#a6b9a2"; context.fillText(text, p.x + dx, p.y + dy); }
  });
  if (state.phase === "flying") {
    const p = projectPoint(state.position.lon, state.position.lat);
    const next = greatCircle(stops[6], stops[7], Math.min(1, state.progress + .005));
    const q = projectPoint(next.lon, next.lat);
    if (p.visible) {
      context.save(); context.translate(p.x, p.y); context.rotate(Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2);
      context.shadowColor = "#d2f98a"; context.shadowBlur = 12; context.fillStyle = "#e7ffb8";
      context.beginPath(); context.moveTo(0, -9); context.lineTo(3, -1); context.lineTo(9, 4); context.lineTo(9, 6); context.lineTo(2, 3); context.lineTo(2, 8); context.lineTo(4, 10); context.lineTo(0, 9); context.lineTo(-4, 10); context.lineTo(-2, 8); context.lineTo(-2, 3); context.lineTo(-9, 6); context.lineTo(-9, 4); context.lineTo(-3, -1); context.closePath(); context.fill(); context.restore();
    }
  }
  context.restore();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  size = { width: rect.width, height: rect.height };
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawGlobe(performance.now());
}
new ResizeObserver(resizeCanvas).observe(canvas);

async function loadMap() {
  if (!context) { $("map-error").textContent = "Tu navegador no admite el globo. El itinerario y el contador siguen disponibles."; $("map-error").hidden = false; return; }
  try {
    const response = await fetch("./land.geojson");
    if (!response.ok) throw new Error(`Mapa: HTTP ${response.status}`);
    const data = await response.json();
    land = data.features.flatMap(({ geometry }) => geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates]);
    // Se calcula una sola vez; la animación solo proyecta los puntos.
    const rings = land.map(([ring]) => ({
      ring,
      minLon: Math.min(...ring.map(([lon]) => lon)),
      maxLon: Math.max(...ring.map(([lon]) => lon)),
      minLat: Math.min(...ring.map(([, lat]) => lat)),
      maxLat: Math.max(...ring.map(([, lat]) => lat)),
    }));
    function inside(lon, lat, ring) {
      let result = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) result = !result;
      }
      return result;
    }
    landDots = [];
    for (let lat = -60; lat < 85; lat += 1.8) {
      for (let lon = -180; lon < 180; lon += 1.8) {
        if (rings.some((area) => lon >= area.minLon && lon <= area.maxLon && lat >= area.minLat && lat <= area.maxLat && inside(lon, lat, area.ring))) landDots.push([lon, lat]);
      }
    }
    drawGlobe(performance.now());
  } catch (error) {
    console.error("No se pudo cargar la cartografía:", error);
    $("map-error").textContent = "No se pudo cargar la cartografía. La ruta y el contador siguen disponibles.";
    $("map-error").hidden = false;
  }
}
let lastFrame = 0;
function animate(time) {
  if (!document.hidden && !reducedMotion.matches && time - lastFrame >= 40) { drawGlobe(time); lastFrame = time; }
  requestAnimationFrame(animate);
}
update();
setInterval(update, 1000);
loadMap();
requestAnimationFrame(animate);

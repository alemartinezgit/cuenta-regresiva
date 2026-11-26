export const DEPARTURE = Date.parse("2026-12-16T19:05:00+01:00");
export const ARRIVAL = Date.parse("2026-12-17T04:10:00-03:00");
export const AIRPORT = Date.parse("2026-12-16T16:00:00+01:00");

// Las fechas sin hora confirmada cambian de parada a las 12:00 locales.
export const stops = [
  { id: "madrid-start", code: "MAD", city: "Madrid", country: "España", date: "26 NOV", at: Date.parse("2026-11-26T00:00:00+01:00"), lat: 40.4168, lon: -3.7038, detail: "Donde empieza esta última aventura.", note: "Punto de partida del recorrido.", estimated: false },
  { id: "paris", code: "PAR", city: "París", country: "Francia", date: "28 NOV", at: Date.parse("2026-11-28T11:00:00+01:00"), lat: 48.8566, lon: 2.3522, detail: "Un café y un paseo por la ciudad de la luz.", note: "Vuelo a París el 28 de noviembre a las 11:00 CET. La ubicación cambia al salir; llegada no confirmada.", estimated: false },
  { id: "florence", code: "FLR", city: "Florencia", country: "Italia", date: "01 DIC", at: Date.parse("2026-12-01T12:00:00+01:00"), lat: 43.7696, lon: 11.2558, detail: "Arte, pasta y una historia en cada esquina.", note: "Vuelo el 1 de diciembre. Horario no confirmado: cambio de parada a las 12:00 CET.", estimated: true },
  { id: "rome", code: "ROM", city: "Roma", country: "Italia", date: "03 DIC", at: Date.parse("2026-12-03T12:00:00+01:00"), lat: 41.9028, lon: 12.4964, detail: "Todos los caminos llevan a Roma. Este también.", note: "Tren desde Florencia el 3 de diciembre. Horario estimado: 12:00 CET.", estimated: true },
  { id: "greece", code: "GRC", city: "Grecia", country: "Grecia", date: "09 DIC", at: Date.parse("2026-12-09T12:00:00+02:00"), lat: 37.9838, lon: 23.7275, detail: "Una pausa junto al Mediterráneo.", note: "Vuelo el 9 de diciembre. Ciudad no confirmada: Atenas se usa solo como referencia en el mapa. Horario estimado: 12:00 EET.", estimated: true },
  { id: "istanbul", code: "IST", city: "Estambul", country: "Turquía", date: "11 DIC", at: Date.parse("2026-12-11T12:00:00+03:00"), lat: 41.0082, lon: 28.9784, detail: "Entre dos continentes, sumando recuerdos.", note: "Vuelo el 11 de diciembre. Horario estimado: 12:00 TRT.", estimated: true },
  { id: "madrid-return", code: "MAD", city: "Madrid", country: "España", date: "15 DIC", at: Date.parse("2026-12-15T12:00:00+01:00"), lat: 40.4168, lon: -3.7038, detail: "Una última noche antes de cruzar el océano.", note: "Regreso a Madrid el 15 de diciembre, hora estimada: 12:00 CET. El 16, en Barajas a las 16:00; salida a las 19:05 CET.", estimated: true },
  { id: "home", code: "EZE", city: "Buenos Aires", country: "Argentina", date: "17 DIC", at: ARRIVAL, lat: -34.8222, lon: -58.5358, detail: "Al fin en casa. Ahora sí, ese abrazo.", note: "Llegada a Ezeiza el 17 de diciembre a las 04:10 ART (07:10 UTC). Vuelo AR1133.", estimated: false },
];

export function countdown(now) {
  const total = Math.max(0, Math.floor((ARRIVAL - now) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
}

export function greatCircle(from, to, progress) {
  const radians = Math.PI / 180;
  const vector = ({ lat, lon }) => [Math.cos(lat * radians) * Math.cos(lon * radians), Math.cos(lat * radians) * Math.sin(lon * radians), Math.sin(lat * radians)];
  const a = vector(from), b = vector(to);
  const angle = Math.acos(Math.max(-1, Math.min(1, a.reduce((sum, v, i) => sum + v * b[i], 0))));
  if (angle < 0.000001) return { lat: from.lat, lon: from.lon };
  const t = Math.max(0, Math.min(1, progress));
  const point = a.map((v, i) => (Math.sin((1 - t) * angle) * v + Math.sin(t * angle) * b[i]) / Math.sin(angle));
  return { lat: Math.atan2(point[2], Math.hypot(point[0], point[1])) / radians, lon: Math.atan2(point[1], point[0]) / radians };
}

export function getJourneyState(now) {
  const progress = Math.max(0, Math.min(1, (now - DEPARTURE) / (ARRIVAL - DEPARTURE)));
  if (now >= ARRIVAL) return { phase: "arrived", index: 7, position: stops[7], progress, title: "Buenos Aires, Argentina", detail: stops[7].detail };
  if (now >= DEPARTURE) return { phase: "flying", index: 6, position: greatCircle(stops[6], stops[7], progress), progress, title: "En camino a casa", detail: `AR1133 · ${Math.floor(progress * 100)} % del vuelo estimado` };
  if (now >= AIRPORT) return { phase: "airport", index: 6, position: stops[6], progress, title: "Madrid · Aeropuerto de Barajas", detail: "Todo listo. Próximo destino: casa." };
  let index = 0;
  for (let i = 1; i < stops.length; i++) if (now >= stops[i].at) index = i;
  const stop = stops[index];
  return { phase: "traveling", index, position: stop, progress, title: `${stop.city}${stop.city === stop.country ? "" : `, ${stop.country}`}`, detail: stop.detail };
}

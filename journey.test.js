import { ARRIVAL, DEPARTURE, AIRPORT, stops, countdown, getJourneyState, greatCircle } from "./journey.js";

export function runTests() {
  const passed = [];
  function test(name, assertion) {
    if (!assertion()) throw new Error(`Falló: ${name}`);
    passed.push(name);
  }
  test("La llegada usa UTC-3, independientemente de la zona del visitante", () => ARRIVAL === Date.parse("2026-12-17T07:10:00Z"));
  test("El vuelo dura 13 horas y 5 minutos", () => ARRIVAL - DEPARTURE === (13 * 60 + 5) * 60000);
  test("La cuenta regresiva inicial es exacta", () => {
    const c = countdown(Date.parse("2026-11-26T21:26:37Z"));
    return c.days === 20 && c.hours === 9 && c.minutes === 43 && c.seconds === 23;
  });
  test("El contador nunca es negativo después de llegar", () => Object.values(countdown(ARRIVAL + 100000)).every((v) => v === 0));
  test("El último segundo antes de llegar", () => countdown(ARRIVAL - 1000).seconds === 1 && getJourneyState(ARRIVAL - 1000).phase === "flying");
  test("Madrid antes de salir hacia París", () => getJourneyState(stops[1].at - 1).index === 0);
  test("París desde las 11:00 CET del 28", () => getJourneyState(stops[1].at).index === 1);
  test("Cada parada cambia exactamente en su fecha", () => stops.slice(2, 7).every((stop, i) => getJourneyState(stop.at - 1).index === i + 1 && getJourneyState(stop.at).index === i + 2));
  test("Grecia y Estambul respetan sus husos horarios", () => stops[4].at === Date.parse("2026-12-09T10:00:00Z") && stops[5].at === Date.parse("2026-12-11T09:00:00Z"));
  test("En Barajas a las 16:00 CET, no antes", () => getJourneyState(AIRPORT - 1).phase === "traveling" && getJourneyState(AIRPORT).phase === "airport");
  test("Despegue en la hora exacta", () => getJourneyState(DEPARTURE - 1).phase === "airport" && getJourneyState(DEPARTURE).phase === "flying");
  test("La ubicación avanza durante el vuelo", () => {
    const state = getJourneyState((DEPARTURE + ARRIVAL) / 2);
    return state.progress === .5 && state.position.lat < stops[6].lat && state.position.lat > stops[7].lat && state.position.lon < stops[6].lon && state.position.lon > stops[7].lon;
  });
  test("La interpolación respeta ambos extremos", () => {
    const start = greatCircle(stops[6], stops[7], 0), end = greatCircle(stops[6], stops[7], 1);
    return Math.abs(start.lat - stops[6].lat) < 1e-8 && Math.abs(end.lon - stops[7].lon) < 1e-8;
  });
  test("Llegada y fechas futuras permanecen en casa", () => [ARRIVAL, ARRIVAL + 86400000 * 100].every((now) => getJourneyState(now).index === 7 && getJourneyState(now).phase === "arrived"));
  test("Paradas con coordenadas idénticas no generan NaN", () => greatCircle(stops[0], stops[6], .5).lat === stops[0].lat);
  return { passed: passed.length, tests: passed };
}

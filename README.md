# Vuelta · Próxima parada: casa

Portada estática para GitHub Pages. HTML, CSS y JavaScript nativo, sin instalación, compilación, claves ni backend.

## Publicar en GitHub Pages

1. Crear un repositorio en GitHub y subir `index.html`, `styles.css`, `app.js`, `journey.js` y `land.geojson` a su raíz (no subir datos de reservas).
2. Ir a **Settings → Pages → Build and deployment**.
3. Elegir **Deploy from a branch**, rama `main`, carpeta **/ (root)** y guardar.
4. Abrir la URL que muestra GitHub Pages cuando termine el despliegue. Funciona también en repositorios de proyecto, sin dominio propio.

Para una vista previa local, servir esta carpeta por HTTP con el servidor estático de tu preferencia (por ejemplo, Live Server en VS Code). Abrir el HTML con `file://` no permite cargar los módulos ni la cartografía en todos los navegadores.

GitHub Pages puede conservar archivos en caché durante 10 minutos. Al modificar `app.js` o `styles.css`, actualizar el parámetro `v` de su referencia en `index.html` y publicar ambos archivos juntos para evitar mezclar versiones.

## Fechas y funcionamiento

- Año del viaje: **2026**. Las fechas incluyen sus desfases UTC para que funcionen desde cualquier país.
- Salida MAD: **16 de diciembre, 19:05 CET (UTC+1)**.
- Llegada EZE: **17 de diciembre, 04:10 ART (UTC−3)**. Duración: **13 h 05 min**.
- Presencia prevista en Barajas: 16 de diciembre, 16:00 CET.
- Las paradas sin horario confirmado cambian a las **12:00 locales**. Grecia usa **Atenas como referencia aproximada**, no como ciudad confirmada.
- El horario de París corresponde a la salida indicada. Se cambia de parada en ese momento; no se conoce la llegada.
- Editar el itinerario y las coordenadas en `journey.js`. Los códigos de las tarjetas identifican ciudades o países; no todos son códigos aeroportuarios.
- El mapa **no es GPS ni consulta el estado de vuelos**. La trayectoria MAD–EZE se interpola sobre un arco de círculo máximo entre el despegue y la llegada previstos. No representa rutas aéreas reales, retrasos ni desvíos.
- “Simular vuelo de regreso” permite previsualizar y recorrer ese arco. “Volver al presente” sale de la simulación. Los relojes de Madrid y Buenos Aires siempre muestran la hora real en sus respectivos husos horarios, incluso durante la simulación.
- Tras la llegada prevista, el contador queda en cero y el estado indica casa. No se verifica un aterrizaje real.
- La hora depende del reloj del dispositivo del visitante.

## Pruebas

Con el sitio servido por HTTP, ejecutar en la consola del navegador:

```js
const { runTests } = await import("./journey.test.js");
runTests();
```

Incluye límites del itinerario, husos horarios, duración del vuelo, trayectoria y llegada.

## Privacidad y recursos

No se publican apellidos, localizadores, documentos ni información de pasajeros. No hay analítica, cookies ni seguimiento de visitantes.

La cartografía se sirve localmente: [Natural Earth, land 110m](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), de [dominio público](https://www.naturalearthdata.com/about/terms-of-use/). Google Fonts sirve DM Sans y Space Grotesk; si no está disponible, se usan fuentes del sistema. Esa petición externa implica que Google recibe los datos normales de conexión del visitante. Eliminar el `@import` de `styles.css` permite evitarla.

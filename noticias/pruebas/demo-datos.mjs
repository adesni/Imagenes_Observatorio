// Feeds inventados para las pruebas y para la vista previa local. Los titulares son de ejemplo, no noticias reales.

export const AHORA = new Date('2026-11-17T13:00:00Z');

const hace = (horas) => new Date(AHORA.getTime() - horas * 3600 * 1000).toUTCString();
const rss = (items) =>
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Demo</title>${items
    .map(
      ([titulo, slug, horas, resumen = '']) =>
        `<item><title><![CDATA[${titulo}]]></title><link>https://demo.invalid/${slug}</link><pubDate>${hace(horas)}</pubDate><description><![CDATA[${resumen}]]></description></item>`
    )
    .join('')}</channel></rss>`;

const f = (id, nombre, orientacion, seccion, idioma = 'es') => ({
  id, nombre, orientacion, idioma, sitio: `${id}.invalid`,
  feeds: seccion ? [{ url: `https://demo.invalid/feeds/${id}.xml`, seccion }] : [],
});

export const configDemo = {
  ventana_horas: 48,
  max_por_feed: 25,
  fuentes: [
    f('jornada', 'La Jornada', 'izquierda', 'mixto'),
    f('sinembargo', 'Sin Embargo', 'izquierda', 'mixto'),
    f('animal', 'Animal Político', 'centro-izquierda', 'mixto'),
    f('elpais', 'El País', 'centro-izquierda', 'mixto'),
    f('universal', 'El Universal', 'centro', 'mixto'),
    f('bbc', 'BBC Mundo', 'centro', 'mixto'),
    f('efe', 'Agencia EFE', 'agencia', 'mixto'),
    f('financiero', 'El Financiero', 'centro-derecha', 'mixto'),
    f('economista', 'El Economista', 'centro-derecha', 'finanzas'),
    f('reforma', 'Reforma', 'centro-derecha', null),
    f('razon', 'La Razón de México', 'derecha', 'mixto'),
    f('guardian', 'The Guardian', 'centro-izquierda', 'mundo', 'en'),
    f('caida', 'Fuente caída', 'centro', 'mixto'),
  ],
};

const FEEDS = {
  jornada: rss([
    ['Banxico recorta la tasa de interés a 7.25%; analistas piden más apoyo al empleo', 'j1', 3, 'La Junta de Gobierno votó dividida. Ejemplo de resumen para la vista previa.'],
    ['Sheinbaum defiende el presupuesto 2027 con más gasto social', 'j2', 5, 'Titular de ejemplo sobre el paquete económico.'],
    ['Sindicatos exigen aumento de 15% al salario mínimo', 'j3', 8],
    ['Trump amenaza con nuevos aranceles al acero mexicano', 'j4', 6, 'Titular de ejemplo sobre comercio exterior.'],
    ['Avanza la nueva refinería con inversión del gobierno de México', 'j5', 9],
    ['Nota vieja de hace una semana sobre el Senado', 'j6', 170],
  ]),
  sinembargo: rss([
    ['Recorte de tasa de Banxico a 7.25% llega tarde, dicen economistas', 's1', 2],
    ['Presupuesto 2027: Sheinbaum prioriza gasto social y programas del Bienestar', 's2', 4],
    ['Senado aprueba en lo general la reforma electoral de Morena', 's3', 7],
  ]),
  animal: rss([
    ['Senado aprueba la reforma electoral entre protestas de la oposición', 'a1', 6, 'Ejemplo: la votación se extendió hasta la madrugada.'],
    ['Aranceles al acero: qué implica la amenaza de Trump para México', 'a2', 5],
    ['Resultados de la jornada de futbol del fin de semana', 'a3', 4],
  ]),
  elpais: rss([
    ['Banxico baja la tasa de interés a 7.25% ante una inflación que cede', 'p1', 3],
    ['La Unión Europea acuerda nuevas sanciones contra Rusia por la guerra en Ucrania', 'p2', 10],
    ['El Senado de México aprueba la reforma electoral de Morena', 'p3', 6],
  ]),
  universal: rss([
    ['Banxico recorta la tasa de interés a 7.25%, su nivel más bajo en cuatro años', 'u1', 3, 'Ejemplo: decisión dividida de la Junta de Gobierno.'],
    ['Peso mexicano se aprecia tras decisión de Banxico; dólar cierra en 18.32', 'u2', 2],
    ['Sheinbaum presenta presupuesto 2027 con énfasis en gasto social', 'u3', 5],
    ['Nuevo embajador de México presenta credenciales ante el gobierno de Brasil', 'u4', 11],
  ]),
  bbc: rss([
    ['La Unión Europea aprueba nuevas sanciones contra Rusia por la guerra en Ucrania', 'b1', 10, 'Ejemplo de resumen internacional.'],
    ['Trump amenaza a México con aranceles al acero: qué se sabe', 'b2', 6],
    ['Cumbre del G20 termina sin acuerdo sobre deuda de países pobres', 'b3', 14],
  ]),
  efe: rss([
    ['El G20 cierra su cumbre sin acuerdo sobre la deuda de los países pobres', 'e1', 14],
    ['La UE aprueba un nuevo paquete de sanciones contra Rusia por Ucrania', 'e2', 11],
    ['Wall Street cierra con ganancias y el S&P 500 marca nuevo récord', 'e3', 15],
  ]),
  financiero: rss([
    ['Banxico recorta tasa de interés a 7.25%; mercados anticipan pausa', 'f1', 3],
    ['Bolsa Mexicana sube 0.8% y el peso gana frente al dólar tras Banxico', 'f2', 2],
    ['Senado avala reforma electoral; oposición acusa retroceso democrático', 'f3', 6],
    ['Trump amaga con aranceles al acero mexicano; IP pide diálogo', 'f4', 6],
  ]),
  economista: rss([
    ['Banxico baja la tasa de interés a 7.25% con voto dividido', 'x1', 3, 'Ejemplo: un subgobernador votó por mantenerla.'],
    ['Wall Street cierra con ganancias; S&P 500 alcanza un nuevo récord', 'x2', 15],
    ['Inflación de la primera quincena de noviembre se ubica en 3.6% anual', 'x3', 20],
    ['IP advierte riesgos del presupuesto 2027 por mayor déficit', 'x4', 5],
  ]),
  razon: rss([
    ['Presupuesto 2027 eleva el déficit, advierten especialistas', 'r1', 5],
    ['Oposición acusa retroceso tras aprobarse reforma electoral en el Senado', 'r2', 6],
    ['Banxico recorta la tasa de interés a 7.25% pese a riesgos inflacionarios', 'r3', 3],
  ]),
  guardian: rss([
    ['EU agrees new sanctions on Russia over Ukraine war', 'g1', 10],
    ['G20 summit ends without deal on debt relief for poorer nations', 'g2', 14],
  ]),
  // Respaldo de Google News para Reforma (sin feed directo en la demo).
  reforma: `<rss><channel>${[
    ['Recorta Banxico tasa de interés a 7.25% - Reforma', 'rf1', 3],
    ['Alertan por déficit en Presupuesto 2027 - Reforma', 'rf2', 5],
  ]
    .map(([t, s, h]) => `<item><title>${t}</title><link>https://news.google.com/rss/articles/${s}</link><pubDate>${hace(h)}</pubDate><description>&lt;a href="#"&gt;${t}&lt;/a&gt;</description></item>`)
    .join('')}</channel></rss>`,
};

export async function descargarDemo(url) {
  const directo = url.match(/demo\.invalid\/feeds\/(\w+)\.xml/)?.[1];
  const respaldo = decodeURIComponent(url).match(/site:(\w+)\.invalid/)?.[1];
  const id = directo ?? respaldo;
  if (!id || !FEEDS[id] || (respaldo && id !== 'reforma')) throw new Error('HTTP 404');
  return FEEDS[id];
}

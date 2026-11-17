import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearFeed, textoPlano, decodificarCuerpo } from '../lib/rss.mjs';
import { tokens, clasificar, esRuido } from '../lib/texto.mjs';
import { construir } from '../lib/construir.mjs';
import { leerCotizacion } from '../lib/mercados.mjs';
import { armarResumen } from '../lib/resumen.mjs';
import { configDemo, descargarDemo, AHORA } from './demo-datos.mjs';

test('RSS 2.0: CDATA, entidades, HTML en la descripción y fechas RFC 822', () => {
  const xml = `<?xml version="1.0"?><rss><channel><title>Canal</title><link>https://ejemplo.mx</link>
    <item>
      <title><![CDATA[Banxico mantiene la tasa en 7.5% &amp; sorprende]]></title>
      <link>https://ejemplo.mx/nota-1?utm_source=rss</link>
      <description>&lt;p&gt;El banco central &lt;b&gt;decidi&amp;oacute;&lt;/b&gt; por mayor&#237;a.&lt;/p&gt;</description>
      <pubDate>Mon, 16 Nov 2026 14:30:00 -0600</pubDate>
    </item>
    <item><title>Sin enlace</title><pubDate>Mon, 16 Nov 2026 14:30:00 -0600</pubDate></item>
  </channel></rss>`;
  const items = parsearFeed(xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].titulo, 'Banxico mantiene la tasa en 7.5% & sorprende');
  assert.equal(items[0].url, 'https://ejemplo.mx/nota-1?utm_source=rss');
  assert.equal(items[0].resumen, 'El banco central decidió por mayoría.');
  assert.equal(items[0].fecha.toISOString(), '2026-11-16T20:30:00.000Z');
});

test('Atom: toma el enlace alternate y la fecha ISO', () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Feed</title>
    <entry>
      <title type="html">Cumbre del G20 &amp;quot;en vilo&amp;quot;</title>
      <link rel="self" href="https://ejemplo.org/api/1"/>
      <link rel="alternate" type="text/html" href="https://ejemplo.org/cumbre?a=1&amp;b=2"/>
      <updated>2026-11-16T10:00:00Z</updated>
      <summary>Resumen breve.</summary>
    </entry></feed>`;
  const [item] = parsearFeed(xml);
  assert.equal(item.titulo, 'Cumbre del G20 "en vilo"');
  assert.equal(item.url, 'https://ejemplo.org/cumbre?a=1&b=2');
  assert.equal(item.fecha.toISOString(), '2026-11-16T10:00:00.000Z');
});

test('Google News: quita el sufijo del medio y la descripción repetida', () => {
  const xml = `<rss><channel><item>
    <title>Senado aprueba reforma - Animal Político</title>
    <link>https://news.google.com/rss/articles/abc123?oc=5</link>
    <pubDate>Mon, 16 Nov 2026 18:00:00 GMT</pubDate>
    <description>&lt;a href="https://news.google.com/rss/articles/abc123"&gt;Senado aprueba reforma&lt;/a&gt;</description>
  </item></channel></rss>`;
  const [item] = parsearFeed(xml);
  assert.equal(item.titulo, 'Senado aprueba reforma');
  assert.equal(item.resumen, '');
});

test('textoPlano elimina scripts y colapsa espacios', () => {
  assert.equal(textoPlano('<p>Hola</p><script>alert(1)</script>\n  mundo&nbsp;!'), 'Hola mundo !');
});

test('decodificarCuerpo respeta ISO-8859-1 declarado en el XML', () => {
  const bytes = Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><t>Inflación</t>', 'latin1');
  assert.match(decodificarCuerpo(bytes, 'text/xml'), /Inflación/);
  assert.match(decodificarCuerpo(Buffer.from('<t>Inflación</t>', 'utf8'), 'text/xml; charset=UTF-8'), /Inflación/);
});

test('tokens: sin acentos, sin palabras vacías, plural recortado', () => {
  assert.deepEqual([...tokens('Los aranceles de Trump golpean a México')], ['arancel', 'trump', 'golpean', 'mexico']);
});

test('clasificar: elige la sección con más coincidencias o descarta', () => {
  const todas = ['mexico', 'mundo', 'mercados', 'macro'];
  assert.equal(clasificar('El peso mexicano cae y la Bolsa cierra con pérdidas', todas), 'mercados');
  assert.equal(clasificar('Banxico recorta la tasa de interés por menor inflación', todas), 'macro');
  assert.equal(clasificar('El Senado discute la reforma judicial de Morena', todas), 'mexico');
  assert.equal(clasificar('Putin y la OTAN elevan la tensión en Ucrania', todas), 'mundo');
  assert.equal(clasificar('Resultados de la jornada de futbol', todas), null);
  assert.equal(clasificar('Empresas reportan resultados', ['mercados', 'macro'], 'macro'), 'macro');
});

test('construir: agrupa el mismo hecho entre medios, usa respaldo y descarta lo viejo', async () => {
  const datos = await construir({ config: configDemo, descargar: descargarDemo, ahora: AHORA });

  assert.equal(datos.fuentes.reforma.estado, 'respaldo', 'Reforma no tiene feed directo en la demo');
  assert.equal(datos.fuentes.caida.estado, 'sin-datos');
  assert.ok(!datos.noticias.some((n) => /hace una semana/.test(n.t)), 'las notas viejas se descartan');
  assert.ok(!datos.noticias.some((n) => /futbol/i.test(n.t)), 'lo que no es política ni economía se descarta');

  const tasa = datos.temas.find((t) => /tasa/i.test(datos.noticias.find((n) => n.id === t.principal).t));
  assert.ok(tasa, 'debe existir un tema sobre la tasa de Banxico');
  assert.ok(tasa.fuentes >= 4, `el tema de la tasa debe juntar varios medios (tiene ${tasa.fuentes})`);
  assert.equal(tasa.lados, 3, 'cubierto por izquierda, centro y derecha');
  assert.equal(datos.fuentes[datos.noticias.find((n) => n.id === tasa.principal).f].orientacion, 'centro',
    'el titular principal sale de la fuente más neutral');

  // Dos notas que comparten solo palabras genéricas no deben terminar en el mismo tema.
  const a = datos.noticias.find((n) => /refinería/.test(n.t));
  const b = datos.noticias.find((n) => /embajador/.test(n.t));
  assert.ok(a && b);
  assert.ok(!a.g || a.g !== b.g);

  assert.equal(new Set(datos.noticias.map((n) => n.id)).size, datos.noticias.length, 'ids únicos');
  assert.equal(new Set(datos.noticias.map((n) => n.u)).size, datos.noticias.length, 'sin URLs repetidas');
});

test('leerCotizacion: último precio contra el cierre previo', () => {
  const json = { chart: { result: [{ meta: { regularMarketPrice: 18.5 }, indicators: { quote: [{ close: [18.2, null, 18.4, 18.45] }] } }] } };
  assert.deepEqual(leerCotizacion(json), { ultimo: 18.5, previo: 18.4 });
  assert.equal(leerCotizacion({ chart: { result: null } }), null);
});

test('armarResumen: mensajes dentro del límite y con enlace al sitio', async () => {
  const datos = await construir({ config: configDemo, descargar: descargarDemo, ahora: AHORA });
  datos.mercados = [{ nombre: 'USD/MXN', valor: 18.4512, decimales: 4, cambio: -0.31, unidad: '%' }];
  const mensajes = armarResumen(datos, { urlSitio: 'https://ejemplo.github.io/sitio/', ahora: AHORA, maxCaracteres: 700 });
  assert.ok(mensajes.length >= 2);
  for (const m of mensajes) assert.ok(m.length <= 700, `mensaje de ${m.length} caracteres`);
  const todo = mensajes.join('\n');
  assert.match(todo, /USD\/MXN 18\.4512 \(−0\.31%\)/);
  assert.match(todo, /Lo más cubierto/);
  assert.match(todo, /https:\/\/ejemplo\.github\.io\/sitio\//);
});

test('Google News: quita el nombre del medio aunque venga repetido en el titular', () => {
  const xml = `<rss><channel><item>
    <title>La CE celebra el acuerdo con Ruanda - EFE - EFE Noticias</title>
    <link>https://news.google.com/rss/articles/xyz</link>
    <pubDate>Mon, 16 Nov 2026 18:00:00 GMT</pubDate>
    <source url="https://efe.com">EFE Noticias</source>
  </item><item>
    <title>Peso - dólar: cierre del día - El Financiero</title>
    <link>https://news.google.com/rss/articles/abc</link>
    <pubDate>Mon, 16 Nov 2026 18:00:00 GMT</pubDate>
    <source url="https://elfinanciero.com.mx">El Financiero</source>
  </item></channel></rss>`;
  const [a, b] = parsearFeed(xml);
  assert.equal(a.titulo, 'La CE celebra el acuerdo con Ruanda');
  assert.equal(b.titulo, 'Peso - dólar: cierre del día');
});

test('esRuido: descarta notas de servicio y deja pasar noticias', () => {
  assert.ok(esRuido('¿Qué autos NO circulan HOY 17 de noviembre en CdMx y Edomex?'));
  assert.ok(esRuido('Temblor en México EN VIVO: resumen de sismos registrados por el SSN'));
  assert.ok(!esRuido('El Senado discute hoy la reforma judicial'));
  assert.ok(!esRuido('Banxico recorta la tasa de interés a 7.25%'));
});

test('armarResumen: nunca corta un enlace y prioriza lo que cubren varios medios', async () => {
  const datos = await construir({ config: configDemo, descargar: descargarDemo, ahora: AHORA });
  for (const n of datos.noticias) n.u = `https://news.google.com/rss/articles/${'x'.repeat(260)}${n.id}`;
  const mensajes = armarResumen(datos, { ahora: AHORA, maxCaracteres: 900 });
  const todo = mensajes.join('\n');
  for (const m of mensajes) assert.ok(m.length <= 900, `mensaje de ${m.length} caracteres`);
  const enlaces = todo.match(/https:\/\/\S+/g) ?? [];
  assert.equal(enlaces.length, 5);
  for (const e of enlaces) assert.ok(datos.noticias.some((n) => n.u === e), 'enlace completo');
  assert.ok(!todo.includes('…'));
  // En la demo, el G20 lo cubren dos medios: debe aparecer en Internacional marcado como compartido.
  assert.match(todo, /\*Internacional\*\n• .*G20.* y 1 más\)_/);
});

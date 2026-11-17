// Descarga todas las fuentes y arma el JSON que consume la página.

import { createHash } from 'node:crypto';
import { parsearFeed } from './rss.mjs';
import { SECCIONES, clasificar, normalizar } from './texto.mjs';
import { agruparTemas } from './temas.mjs';

const TODAS = SECCIONES.map((s) => s.id);
const FINANZAS = ['mercados', 'macro'];

function urlRespaldo(fuente) {
  const en = fuente.idioma === 'en';
  const q = encodeURIComponent(`site:${fuente.sitio} when:2d`);
  return `https://news.google.com/rss/search?q=${q}&hl=${en ? 'en-US' : 'es-419'}&gl=${en ? 'US' : 'MX'}&ceid=${en ? 'US:en' : 'MX:es-419'}`;
}

function urlCanonica(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|cmpid|ocid|at_)/i.test(k)) u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return url;
  }
}

function seccionDe(item, feed) {
  const texto = `${item.titulo} ${item.resumen}`;
  if (feed.seccion === 'mixto') return clasificar(texto, feed.secciones ?? TODAS, null);
  if (feed.seccion === 'finanzas') return clasificar(texto, FINANZAS, 'macro');
  return feed.seccion;
}

/**
 * @param config    contenido de fuentes.json
 * @param descargar async (url) => string con el XML; lanza si falla
 * @param ahora     Date
 * @param registro  (mensaje) => void
 */
export async function construir({ config, descargar, ahora = new Date(), registro = () => {} }) {
  const desde = ahora.getTime() - (config.ventana_horas ?? 48) * 3600 * 1000;
  const hasta = ahora.getTime() + 3600 * 1000; // tolera relojes adelantados
  const maxPorFeed = config.max_por_feed ?? 25;

  async function leerFeed(fuente, feed) {
    const xml = await descargar(feed.url);
    const items = parsearFeed(xml);
    const salida = [];
    let sinFecha = 0;
    for (const item of items) {
      if (!item.fecha) {
        sinFecha++;
        continue;
      }
      const ms = item.fecha.getTime();
      if (ms < desde || ms > hasta) continue;
      const seccion = seccionDe(item, feed);
      if (!seccion) continue;
      salida.push({ ...item, url: urlCanonica(item.url), seccion, fuente: fuente.id, idioma: fuente.idioma });
    }
    salida.sort((a, b) => b.fecha - a.fecha);
    return { total: items.length, sinFecha, items: salida.slice(0, maxPorFeed) };
  }

  async function leerFuente(fuente) {
    const notas = [];
    const errores = [];
    for (const feed of fuente.feeds ?? []) {
      try {
        const r = await leerFeed(fuente, feed);
        if (r.total === 0) errores.push(`${feed.url} → sin entradas`);
        else if (r.sinFecha === r.total) errores.push(`${feed.url} → entradas sin fecha`);
        notas.push(...r.items);
      } catch (e) {
        errores.push(`${feed.url} → ${e.message}`);
      }
    }
    let estado = 'ok';
    if (notas.length === 0 && fuente.sitio) {
      try {
        const r = await leerFeed(fuente, { url: urlRespaldo(fuente), seccion: 'mixto', secciones: fuente.secciones });
        notas.push(...r.items);
        estado = 'respaldo';
        if (r.items.length === 0) errores.push(`respaldo Google News → ${r.total} entradas, ninguna reciente de política o economía`);
      } catch (e) {
        errores.push(`respaldo Google News → ${e.message}`);
      }
    }
    if (notas.length === 0) estado = 'sin-datos';
    registro(`${estado === 'ok' ? '✓' : estado === 'respaldo' ? '↺' : '✗'} ${fuente.nombre}: ${notas.length} notas (${estado})`);
    for (const e of errores) registro(`    ${e}`);
    return { fuente, notas, estado };
  }

  const resultados = await Promise.all(config.fuentes.map(leerFuente));

  const fuentes = {};
  const vistas = new Set();
  const noticias = [];
  for (const { fuente, notas, estado } of resultados) {
    let n = 0;
    for (const nota of notas) {
      const claveTitulo = `${fuente.id}|${normalizar(nota.titulo)}`;
      if (vistas.has(nota.url) || vistas.has(claveTitulo)) continue;
      vistas.add(nota.url).add(claveTitulo);
      noticias.push({ ...nota, id: createHash('sha1').update(nota.url).digest('hex').slice(0, 10) });
      n++;
    }
    fuentes[fuente.id] = {
      nombre: fuente.nombre,
      orientacion: fuente.orientacion,
      idioma: fuente.idioma,
      sitio: `https://${fuente.sitio}`,
      estado,
      n,
    };
  }

  const { temas, temaDe } = agruparTemas(noticias, fuentes);
  noticias.sort((a, b) => b.fecha - a.fecha);

  return {
    generado: ahora.toISOString(),
    secciones: SECCIONES,
    fuentes,
    mercados: [],
    temas,
    noticias: noticias.map((n) => ({
      id: n.id,
      t: n.titulo,
      ...(n.resumen ? { r: n.resumen } : {}),
      u: n.url,
      f: n.fuente,
      s: n.seccion,
      d: n.fecha.toISOString(),
      ...(temaDe.has(n.id) ? { g: temaDe.get(n.id) } : {}),
    })),
  };
}

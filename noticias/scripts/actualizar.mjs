#!/usr/bin/env node
// Descarga las fuentes y escribe noticias/web/datos/noticias.json (o la ruta dada como argumento).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { construir } from '../lib/construir.mjs';
import { decodificarCuerpo } from '../lib/rss.mjs';
import { obtenerMercados } from '../lib/mercados.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(process.argv[2] ?? `${raiz}/web/datos/noticias.json`);
const MIN_FUENTES = 5;

const CABECERAS = {
  'User-Agent': 'Mozilla/5.0 (compatible; LectorDeNoticias/1.0; +https://github.com)',
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.5',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.6',
};

async function pedir(url) {
  const r = await fetch(url, { headers: CABECERAS, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
// Google News limita las ráfagas: sus consultas van de una en una y espaciadas, con dos reintentos si responde 429.
let filaGoogle = Promise.resolve();
function pedirEnFila(url) {
  const turno = filaGoogle.then(async () => {
    for (let intento = 0; ; intento++) {
      await pausa(intento === 0 ? 1500 : 15_000);
      try {
        return await pedir(url);
      } catch (e) {
        if (e.message !== 'HTTP 429' || intento === 2) throw e;
      }
    }
  });
  filaGoogle = turno.catch(() => {});
  return turno;
}
const descargar = async (url) => {
  const r = await (url.startsWith('https://news.google.com/') ? pedirEnFila(url) : pedir(url));
  return decodificarCuerpo(await r.arrayBuffer(), r.headers.get('content-type') ?? '');
};
const descargarJson = async (url) => (await pedir(url)).json();

const config = JSON.parse(await readFile(`${raiz}/fuentes.json`, 'utf8'));
const registro = (m) => console.log(m);

const [datos, mercados] = await Promise.all([
  construir({ config, descargar, registro }),
  obtenerMercados({ descargarJson, registro }),
]);
datos.mercados = mercados;

const activas = Object.values(datos.fuentes).filter((f) => f.n > 0).length;
console.log(`\n${datos.noticias.length} notas de ${activas}/${config.fuentes.length} fuentes · ${datos.temas.length} temas compartidos · ${mercados.length} indicadores`);

const porId = new Map(datos.noticias.map((n) => [n.id, n]));
console.log('\nTemas más cubiertos:');
for (const t of datos.temas.slice(0, 12)) {
  console.log(`  [${t.fuentes} medios, ${t.lados} lados, ${t.s}] ${porId.get(t.principal).t}`);
  for (const n of datos.noticias.filter((x) => x.g === t.id && x.id !== t.principal).slice(0, 6)) {
    console.log(`      ${n.f}: ${n.t}`);
  }
}
const porSeccion = {};
for (const n of datos.noticias) porSeccion[n.s] = (porSeccion[n.s] ?? 0) + 1;
console.log('\nNotas por sección:', JSON.stringify(porSeccion));

if (activas < MIN_FUENTES) {
  // No se publica una página casi vacía: se conserva la última versión buena.
  console.error(`Solo respondieron ${activas} fuentes (mínimo ${MIN_FUENTES}). No se actualiza el sitio.`);
  process.exit(1);
}

await mkdir(dirname(destino), { recursive: true });
await writeFile(destino, JSON.stringify(datos));
console.log(`Escrito ${destino}`);

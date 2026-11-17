#!/usr/bin/env node
// Genera noticias/web/datos/noticias.json con titulares de EJEMPLO para ver la página sin conexión.
// Uso: node noticias/pruebas/vista-previa.mjs && npx serve noticias/web   (o cualquier servidor estático)

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { construir } from '../lib/construir.mjs';
import { configDemo, descargarDemo, AHORA } from './demo-datos.mjs';

const destino = resolve(dirname(fileURLToPath(import.meta.url)), '../web/datos/noticias.json');
const datos = await construir({ config: configDemo, descargar: descargarDemo, ahora: AHORA });
// Las fechas de la demo son relativas a AHORA; se recorren al momento actual para que se vean recientes.
const desfase = Date.now() - AHORA.getTime();
const mover = (iso) => new Date(new Date(iso).getTime() + desfase).toISOString();
datos.generado = mover(datos.generado);
for (const n of datos.noticias) n.d = mover(n.d);
for (const t of datos.temas) t.d = mover(t.d);
datos.mercados = [
  { nombre: 'USD/MXN', valor: 18.3215, decimales: 4, cambio: -0.42, unidad: '%' },
  { nombre: 'IPC (BMV)', valor: 58214, decimales: 0, cambio: 0.81, unidad: '%' },
  { nombre: 'S&P 500', valor: 6012, decimales: 0, cambio: 0.35, unidad: '%' },
  { nombre: 'Nasdaq', valor: 19877, decimales: 0, cambio: -0.12, unidad: '%' },
  { nombre: 'WTI (USD)', valor: 71.4, decimales: 2, cambio: 1.1, unidad: '%' },
  { nombre: 'Bono EE. UU. 10a', valor: 4.21, decimales: 2, cambio: -0.03, unidad: 'pp' },
];
await mkdir(dirname(destino), { recursive: true });
await writeFile(destino, JSON.stringify(datos));
console.log(`Vista previa con datos de ejemplo escrita en ${destino}`);

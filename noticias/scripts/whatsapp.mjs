#!/usr/bin/env node
// Envía el resumen diario por WhatsApp usando CallMeBot (gratuito, para uso personal).
// Variables: WHATSAPP_TELEFONO (+52...), CALLMEBOT_APIKEY, URL_SITIO (opcional).
// Con --ver solo imprime el mensaje, sin enviarlo.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { armarResumen } from '../lib/resumen.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const soloVer = args.includes('--ver');
const origen = resolve(args.find((a) => !a.startsWith('--')) ?? `${raiz}/web/datos/noticias.json`);

const datos = JSON.parse(await readFile(origen, 'utf8'));
const mensajes = armarResumen(datos, { urlSitio: process.env.URL_SITIO ?? '' });

if (soloVer) {
  console.log(mensajes.join('\n\n────────\n\n'));
  process.exit(0);
}

const telefono = process.env.WHATSAPP_TELEFONO?.trim();
const apikey = process.env.CALLMEBOT_APIKEY?.trim();
if (!telefono || !apikey) {
  console.log('WhatsApp sin configurar (faltan WHATSAPP_TELEFONO o CALLMEBOT_APIKEY). No se envía nada.');
  process.exit(0);
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
for (const [i, texto] of mensajes.entries()) {
  if (i > 0) await pausa(4000);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const cuerpo = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${cuerpo.slice(0, 200)}`);
    console.log(`Mensaje ${i + 1}/${mensajes.length} enviado (${texto.length} caracteres).`);
  } catch (e) {
    fallos++;
    // No se imprime la URL: contiene el teléfono y la clave.
    console.error(`Mensaje ${i + 1}/${mensajes.length} falló: ${e.message}`);
  }
}
process.exit(fallos ? 1 : 0);

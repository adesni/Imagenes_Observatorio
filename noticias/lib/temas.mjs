// Agrupa titulares de distintos medios que hablan del mismo hecho.

import { tokens } from './texto.mjs';

const VENTANA_MS = 36 * 3600 * 1000;
const MAX_MIEMBROS = 25;

const LADO = {
  izquierda: 'izquierda', 'centro-izquierda': 'izquierda',
  centro: 'centro', agencia: 'centro', oficial: 'centro',
  'centro-derecha': 'derecha', derecha: 'derecha',
};
export const ladoDe = (orientacion) => LADO[orientacion] ?? 'centro';

// Orden de desempate al elegir el titular principal de un tema.
const NEUTRALIDAD = ['agencia', 'centro', 'oficial', 'centro-izquierda', 'centro-derecha', 'izquierda', 'derecha'];

// Devuelve el peso de las palabras en común si bastan para considerar que es el mismo hecho; si no, 0.
function similitud(a, b, peso) {
  let comun = 0;
  for (const t of a.tok) if (b.tok.has(t)) comun += peso(t);
  if (comun < 1.6) return 0;
  const cobertura = comun / Math.min(a.pesoTotal, b.pesoTotal);
  // Cuantas menos palabras coinciden, mayor parte del titular más corto deben cubrir.
  if (comun >= 3.2 || (comun >= 2.4 && cobertura >= 0.5) || cobertura >= 0.75) return comun;
  return 0;
}

/**
 * @param noticias [{id, titulo, fuente, seccion, fecha: Date, idioma}]
 * @param fuentes  mapa id → {orientacion}
 * @returns {{temas: object[], temaDe: Map<string,string>}}
 */
export function agruparTemas(noticias, fuentes) {
  const frecuencia = new Map();
  const items = noticias.map((n) => {
    const tok = tokens(n.titulo);
    for (const t of tok) frecuencia.set(t, (frecuencia.get(t) ?? 0) + 1);
    return { n, tok, ms: n.fecha.getTime(), pesoTotal: 0 };
  });
  const total = items.length || 1;
  // Las palabras que aparecen en muchísimos titulares ("México", "gobierno") pesan menos que 1.
  const comunDesde = Math.max(6, total * 0.04);
  const peso = (t) => {
    const df = frecuencia.get(t) ?? 1;
    if (df <= comunDesde) return 1;
    return Math.max(0.15, Math.log(total / df) / Math.log(total / comunDesde));
  };
  for (const it of items) for (const t of it.tok) it.pesoTotal += peso(t);

  items.sort((a, b) => a.ms - b.ms);
  const grupos = [];
  for (const it of items) {
    if (it.tok.size < 3) {
      grupos.push([it]);
      continue;
    }
    let mejor = null;
    let mejorS = 0;
    for (const g of grupos) {
      if (g.length >= MAX_MIEMBROS || g[0].n.idioma !== it.n.idioma) continue;
      for (const m of g) {
        if (it.ms - m.ms > VENTANA_MS) continue;
        const s = similitud(it, m, peso);
        if (s > mejorS) {
          mejorS = s;
          mejor = g;
        }
      }
    }
    if (mejor) mejor.push(it);
    else grupos.push([it]);
  }

  const temas = [];
  const temaDe = new Map();
  for (const g of grupos) {
    const medios = new Set(g.map((it) => it.n.fuente));
    if (medios.size < 2) continue;
    const lados = new Set([...medios].map((f) => ladoDe(fuentes[f]?.orientacion)));
    // Titular principal: entre las fuentes de centro o agencia (si las hay), el que más se parece al resto.
    const neutrales = g.filter((it) => ladoDe(fuentes[it.n.fuente]?.orientacion) === 'centro');
    const candidatos = neutrales.length ? neutrales : g;
    const afinidad = new Map(candidatos.map((c) => {
      let suma = 0;
      for (const m of g) if (m !== c) for (const t of c.tok) if (m.tok.has(t)) suma += peso(t);
      return [c, suma];
    }));
    const principal = [...candidatos].sort((a, b) => {
      const na = NEUTRALIDAD.indexOf(fuentes[a.n.fuente]?.orientacion);
      const nb = NEUTRALIDAD.indexOf(fuentes[b.n.fuente]?.orientacion);
      return afinidad.get(b) - afinidad.get(a) || na - nb || b.ms - a.ms;
    })[0];
    const conteo = {};
    for (const it of g) conteo[it.n.seccion] = (conteo[it.n.seccion] ?? 0) + 1;
    const seccion = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];
    const id = `t${principal.n.id}`;
    temas.push({
      id,
      fuentes: medios.size,
      lados: lados.size,
      principal: principal.n.id,
      s: seccion,
      d: new Date(Math.max(...g.map((it) => it.ms))).toISOString(),
    });
    for (const it of g) temaDe.set(it.n.id, id);
  }
  temas.sort((a, b) => b.fuentes - a.fuentes || b.lados - a.lados || b.d.localeCompare(a.d));
  return { temas, temaDe };
}

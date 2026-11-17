// Contrapeso: lee datos/noticias.json y pinta la página. Sin dependencias.

const ORIENTACION = {
  izquierda: { nombre: 'Izquierda', lado: 'izquierda', orden: 0 },
  'centro-izquierda': { nombre: 'Centro-izquierda', lado: 'izquierda', orden: 1 },
  agencia: { nombre: 'Agencia', lado: 'centro', orden: 2 },
  centro: { nombre: 'Centro', lado: 'centro', orden: 3 },
  oficial: { nombre: 'Fuente oficial', lado: 'centro', orden: 4 },
  'centro-derecha': { nombre: 'Centro-derecha', lado: 'derecha', orden: 5 },
  derecha: { nombre: 'Derecha', lado: 'derecha', orden: 6 },
};
const LADOS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'izquierda', nombre: 'Izquierda' },
  { id: 'centro', nombre: 'Centro' },
  { id: 'derecha', nombre: 'Derecha' },
];
const PAGINA = 40;
const CLAVE_LECTURAS = 'contrapeso.lecturas';
const SIETE_DIAS = 7 * 24 * 3600 * 1000;

const $ = (id) => document.getElementById(id);
const estado = { seccion: 'portada', lado: 'todos', q: '', limite: PAGINA };
let datos = null;
let porId = new Map();
let temaPorId = new Map();

function el(tag, attrs = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null) n.append(h);
  return n;
}

const sinAcentos = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const orientDe = (n) => ORIENTACION[datos.fuentes[n.f]?.orientacion] ?? ORIENTACION.centro;
const claseOrient = (n) => `o-${datos.fuentes[n.f]?.orientacion ?? 'centro'}`;
const urlSegura = (u) => (/^https?:\/\//i.test(u) ? u : '#');

function haceCuanto(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

/* ---------- Lecturas (solo en este dispositivo) ---------- */
function leerLecturas() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_LECTURAS) ?? '[]');
    const desde = Date.now() - 30 * 24 * 3600 * 1000;
    return Array.isArray(crudo) ? crudo.filter((l) => l && l.t > desde) : [];
  } catch {
    return [];
  }
}
let lecturas = leerLecturas();
const leidas = () => new Set(lecturas.map((l) => l.id));

function registrarLectura(n) {
  if (lecturas.some((l) => l.id === n.id)) return;
  lecturas.push({ id: n.id, lado: orientDe(n).lado, t: Date.now() });
  try {
    localStorage.setItem(CLAVE_LECTURAS, JSON.stringify(lecturas.slice(-500)));
  } catch { /* almacenamiento no disponible: la página funciona igual */ }
  pintarBalance();
}

/* ---------- Componentes ---------- */
function barra(conteo) {
  const total = conteo.izquierda + conteo.centro + conteo.derecha || 1;
  return el('div', { class: 'barra', 'aria-hidden': 'true' },
    ['izquierda', 'centro', 'derecha'].map((l) =>
      el('span', { class: `b-${l}`, style: `width:${(conteo[l] / total) * 100}%` })));
}

function contarLados(notas) {
  const c = { izquierda: 0, centro: 0, derecha: 0 };
  for (const n of notas) c[orientDe(n).lado]++;
  return c;
}

function enlaceNota(n, yaLeidas) {
  const a = el('a', { href: urlSegura(n.u), target: '_blank', rel: 'noopener noreferrer', text: n.t,
    class: yaLeidas.has(n.id) ? 'leida' : null });
  a.addEventListener('click', () => { a.classList.add('leida'); registrarLectura(n); });
  a.addEventListener('auxclick', () => { a.classList.add('leida'); registrarLectura(n); });
  return a;
}

function metaNota(n) {
  const f = datos.fuentes[n.f];
  const o = orientDe(n);
  return el('div', { class: 'meta' },
    el('span', { class: 'orient' }, el('span', { class: `punto ${claseOrient(n)}` }), o.nombre),
    el('span', { class: 'medio', text: f?.nombre ?? n.f }),
    el('span', { text: `· ${haceCuanto(n.d)}` }),
    f?.idioma === 'en' ? el('span', { text: '· en inglés' }) : null);
}

function tarjeta(entrada, yaLeidas, abierta) {
  const [principal, ...otras] = entrada.notas;
  const art = el('article', { class: 'nota' },
    metaNota(principal),
    el('h2', {}, enlaceNota(principal, yaLeidas)),
    principal.r ? el('p', { class: 'resumen', text: principal.r }) : null);

  if (otras.length) {
    otras.sort((a, b) => orientDe(a).orden - orientDe(b).orden || b.d.localeCompare(a.d));
    const medios = new Set(entrada.notas.map((n) => n.f)).size;
    art.append(el('details', { class: 'cobertura', open: abierta },
      el('summary', {}, barra(contarLados(entrada.notas)),
        medios > 1 ? `Así lo cuentan ${medios} medios` : `${otras.length} notas más de este medio`),
      el('ul', {}, otras.map((n) =>
        el('li', {},
          el('span', { class: `punto ${claseOrient(n)}`, title: orientDe(n).nombre }),
          el('span', {},
            el('span', { class: 'quien', text: `${datos.fuentes[n.f]?.nombre ?? n.f} · ${orientDe(n).nombre} · ${haceCuanto(n.d)}` }),
            enlaceNota(n, yaLeidas)))))));
  }
  return art;
}

/* ---------- Selección de notas ---------- */
function pasaFiltros(n) {
  if (estado.lado !== 'todos' && orientDe(n).lado !== estado.lado) return false;
  if (estado.q && !sinAcentos(`${n.t} ${n.r ?? ''} ${datos.fuentes[n.f]?.nombre ?? ''}`).includes(estado.q)) return false;
  return true;
}

/** Junta las notas en entradas: un tema compartido o una nota suelta. */
function entradas() {
  const porTema = new Map();
  const salida = [];
  for (const n of datos.noticias) {
    if (!pasaFiltros(n)) continue;
    const tema = n.g ? temaPorId.get(n.g) : null;
    if (!tema) {
      salida.push({ notas: [n], s: n.s, d: n.d, fuentes: 1, lados: 1 });
      continue;
    }
    let e = porTema.get(tema.id);
    if (!e) {
      e = { notas: [], s: tema.s, d: n.d, fuentes: tema.fuentes, lados: tema.lados, principal: tema.principal };
      porTema.set(tema.id, e);
      salida.push(e);
    }
    // El titular principal va primero si pasó los filtros.
    if (n.id === e.principal) e.notas.unshift(n);
    else e.notas.push(n);
    if (n.d > e.d) e.d = n.d;
  }
  return salida;
}

function seleccion() {
  const todas = entradas();
  if (estado.seccion !== 'portada') {
    return { lista: todas.filter((e) => e.s === estado.seccion).sort((a, b) => b.d.localeCompare(a.d)) };
  }
  const destacadas = todas
    .filter((e) => e.fuentes >= 3)
    .sort((a, b) => b.fuentes - a.fuentes || b.lados - a.lados || b.d.localeCompare(a.d))
    .slice(0, 12);
  const usadas = new Set(destacadas);
  const recientes = todas.filter((e) => !usadas.has(e)).sort((a, b) => b.d.localeCompare(a.d));
  return { destacadas, lista: recientes };
}

/* ---------- Pintado ---------- */
function pintarLista() {
  const lista = $('lista');
  const yaLeidas = leidas();
  const sel = seleccion();
  const visibles = sel.lista.slice(0, estado.limite);
  const nodos = [];

  if (sel.destacadas?.length) {
    nodos.push(el('h2', { class: 'titulo-bloque', text: 'Lo más cubierto' }));
    for (const e of sel.destacadas) nodos.push(tarjeta(e, yaLeidas, true));
    if (visibles.length) nodos.push(el('h2', { class: 'titulo-bloque', text: 'Lo más reciente' }));
  }
  for (const e of visibles) nodos.push(tarjeta(e, yaLeidas, false));
  lista.replaceChildren(...nodos);

  const mostradas = [...(sel.destacadas ?? []), ...visibles];
  $('estado').hidden = mostradas.length > 0;
  $('estado').textContent = 'No hay notas con esos filtros.';
  $('mas').hidden = sel.lista.length <= estado.limite;

  const conteo = contarLados(mostradas.flatMap((e) => e.notas));
  const total = conteo.izquierda + conteo.centro + conteo.derecha;
  const esp = $('espectro');
  esp.hidden = total === 0;
  esp.replaceChildren(barra(conteo), el('div', { class: 'leyenda' },
    el('span', { text: `En pantalla: ${total} notas` }),
    ['izquierda', 'centro', 'derecha'].map((l) =>
      el('span', {}, el('span', { class: `punto o-${l}` }), ` ${LADOS.find((x) => x.id === l).nombre} ${conteo[l]}`))));
}

function pintarPestanas() {
  const todas = [{ id: 'portada', nombre: 'Portada' }, ...datos.secciones];
  $('pestanas').replaceChildren(...todas.map((s) => {
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(s.id === estado.seccion), text: s.nombre });
    b.addEventListener('click', () => {
      estado.seccion = s.id;
      estado.limite = PAGINA;
      history.replaceState(null, '', s.id === 'portada' ? location.pathname : `#${s.id}`);
      pintarPestanas();
      pintarLista();
      window.scrollTo({ top: document.querySelector('.secciones').offsetTop });
    });
    return b;
  }));
}

function pintarLados() {
  $('lados').replaceChildren(...LADOS.map((l) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(l.id === estado.lado) },
      l.id === 'todos' ? null : el('span', { class: `punto o-${l.id}` }), l.nombre);
    b.addEventListener('click', () => {
      estado.lado = l.id;
      estado.limite = PAGINA;
      pintarLados();
      pintarLista();
    });
    return b;
  }));
}

function pintarMercados() {
  const m = datos.mercados ?? [];
  $('mercados').hidden = m.length === 0;
  const num = (v, dec) => v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  $('lista-mercados').replaceChildren(...m.map((x) => {
    const signo = x.cambio > 0 ? '▲' : x.cambio < 0 ? '▼' : '';
    return el('li', {},
      el('span', { class: 'nombre', text: x.nombre }),
      el('span', { class: 'valor', text: num(x.valor, x.decimales ?? 2) }),
      el('span', { class: `cambio ${x.cambio > 0 ? 'sube' : x.cambio < 0 ? 'baja' : ''}`,
        text: `${signo} ${num(Math.abs(x.cambio), 2)}${x.unidad === 'pp' ? ' pp' : '%'}` }));
  }));
}

function pintarFuentes() {
  const lista = Object.values(datos.fuentes).sort((a, b) =>
    (ORIENTACION[a.orientacion]?.orden ?? 3) - (ORIENTACION[b.orientacion]?.orden ?? 3) || a.nombre.localeCompare(b.nombre));
  $('lista-fuentes').replaceChildren(...lista.map((f) =>
    el('li', { class: f.n === 0 ? 'sin-datos' : null, title: f.n === 0 ? 'Sin notas en esta actualización' : null },
      el('span', { class: `punto o-${f.orientacion}` }),
      el('span', { text: f.nombre }),
      el('small', { text: ORIENTACION[f.orientacion]?.nombre ?? f.orientacion }))));
  const activas = lista.filter((f) => f.n > 0).length;
  $('actualizado').textContent =
    `Actualizado ${haceCuanto(datos.generado)} · ${datos.noticias.length} notas de ${activas} medios. ` +
    'Los titulares enlazan al medio original.';
}

function pintarBalance() {
  const recientes = lecturas.filter((l) => l.t > Date.now() - SIETE_DIAS);
  $('balance').hidden = recientes.length === 0;
  if (!recientes.length) return;
  const c = { izquierda: 0, centro: 0, derecha: 0 };
  for (const l of recientes) if (l.lado in c) c[l.lado]++;
  $('balance-barra').replaceChildren(barra(c), el('div', { class: 'leyenda' },
    ['izquierda', 'centro', 'derecha'].map((l) =>
      el('span', {}, el('span', { class: `punto o-${l}` }),
        ` ${LADOS.find((x) => x.id === l).nombre} ${Math.round((c[l] / recientes.length) * 100)}%`))));
}

async function cargar() {
  try {
    const r = await fetch('datos/noticias.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    datos = await r.json();
  } catch {
    if (!datos) $('estado').textContent = 'Todavía no hay noticias publicadas. La primera actualización tarda unos minutos.';
    return;
  }
  porId = new Map(datos.noticias.map((n) => [n.id, n]));
  temaPorId = new Map(datos.temas.map((t) => [t.id, t]));
  if (!['portada', ...datos.secciones.map((s) => s.id)].includes(estado.seccion)) estado.seccion = 'portada';
  pintarMercados();
  pintarPestanas();
  pintarLados();
  pintarLista();
  pintarFuentes();
  pintarBalance();
}

/* ---------- Arranque ---------- */
$('fecha').textContent = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
estado.seccion = location.hash.slice(1) || 'portada';

let espera;
$('buscar').addEventListener('input', (e) => {
  clearTimeout(espera);
  espera = setTimeout(() => {
    estado.q = sinAcentos(e.target.value.trim());
    estado.limite = PAGINA;
    pintarLista();
  }, 150);
});
$('mas').addEventListener('click', () => {
  estado.limite += PAGINA;
  pintarLista();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && datos && Date.now() - new Date(datos.generado).getTime() > 20 * 60 * 1000) cargar();
});

cargar();

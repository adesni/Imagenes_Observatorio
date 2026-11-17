// Arma el resumen diario para WhatsApp a partir del JSON de noticias.

const ETIQUETA = {
  izquierda: 'izq', 'centro-izquierda': 'c-izq', centro: 'centro', agencia: 'agencia',
  oficial: 'oficial', 'centro-derecha': 'c-der', derecha: 'der',
};

const fmtNum = (v, dec) => v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const signo = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');

function lineaMercados(mercados) {
  return mercados
    .map((m) => `${m.nombre} ${fmtNum(m.valor, m.decimales)} (${signo(m.cambio)}${fmtNum(Math.abs(m.cambio), 2)}${m.unidad === 'pp' ? ' pp' : '%'})`)
    .join(' · ');
}

/**
 * @returns {string[]} uno o más mensajes, cada uno de a lo sumo `maxCaracteres`.
 */
export function armarResumen(datos, { urlSitio = '', ahora = new Date(), maxCaracteres = 1400, porSeccion = 3 } = {}) {
  const porId = new Map(datos.noticias.map((n) => [n.id, n]));
  const medio = (n) => {
    const f = datos.fuentes[n.f];
    return `${f?.nombre ?? n.f} · ${ETIQUETA[f?.orientacion] ?? '?'}`;
  };
  const fechaTxt = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City',
  }).format(ahora);

  // Cada bloque es un encabezado más sus renglones; así se puede repartir sin cortar un titular ni un enlace.
  const bloques = [{ cabeza: `*Leviatana* 🐉 ${fechaTxt}`, items: [] }];
  if (datos.mercados?.length) bloques.push({ cabeza: '*Mercados hoy*', items: [lineaMercados(datos.mercados)] });

  const usados = new Set();
  const destacados = datos.temas.filter((t) => t.fuentes >= 3 && porId.has(t.principal)).slice(0, 5);
  if (destacados.length) {
    bloques.push({
      cabeza: '*Lo más cubierto*',
      items: destacados.map((t, i) => {
        const n = porId.get(t.principal);
        usados.add(t.id);
        return `${i + 1}. ${n.t}\n_${medio(n)} y ${t.fuentes - 1} medios más_\n${n.u}`;
      }),
    });
  }

  const enEspanol = (n) => datos.fuentes[n.f]?.idioma === 'es';
  for (const s of datos.secciones) {
    const items = [];
    // Primero lo que cubrieron varios medios en esta sección; después, lo más reciente.
    for (const t of datos.temas) {
      if (items.length >= porSeccion) break;
      const n = porId.get(t.principal);
      if (t.s !== s.id || usados.has(t.id) || !n || !enEspanol(n)) continue;
      usados.add(t.id);
      items.push(`• ${n.t} _(${medio(n)} y ${t.fuentes - 1} más)_`);
    }
    for (const n of datos.noticias) {
      if (items.length >= porSeccion) break;
      if (n.s !== s.id || n.g || !enEspanol(n)) continue;
      items.push(`• ${n.t} _(${medio(n)})_`);
    }
    if (items.length) bloques.push({ cabeza: `*${s.nombre}*`, items });
  }
  if (urlSitio) bloques.push({ cabeza: 'Tu feed propio, con todos los lados:', items: [urlSitio] });

  // Reparte en mensajes: un bloque completo si cabe; si no, se parte entre renglones, nunca a media línea.
  const mensajes = [];
  let actual = '';
  const cerrar = () => {
    if (actual) mensajes.push(actual);
    actual = '';
  };
  for (const b of bloques) {
    const entero = [b.cabeza, ...b.items].join('\n');
    if (actual && actual.length + 2 + entero.length > maxCaracteres) cerrar();
    if (entero.length <= maxCaracteres) {
      actual = actual ? `${actual}\n\n${entero}` : entero;
      continue;
    }
    actual = b.cabeza;
    for (const item of b.items) {
      const renglon = item.length > maxCaracteres - b.cabeza.length - 1 ? item.split('\n')[0].slice(0, maxCaracteres - b.cabeza.length - 2) : item;
      if (actual.length + 1 + renglon.length > maxCaracteres) cerrar();
      actual = actual ? `${actual}\n${renglon}` : renglon;
    }
  }
  cerrar();
  return mensajes;
}

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

  const bloques = [`*Ni Dios Ni Banxico* 🌱 ${fechaTxt}\nBestie, pasó esto:`];
  if (datos.mercados?.length) bloques.push(`*Mercados*\n${lineaMercados(datos.mercados)}`);

  const usados = new Set();
  const destacados = datos.temas.filter((t) => t.fuentes >= 3 && porId.has(t.principal)).slice(0, 5);
  if (destacados.length) {
    const lineas = destacados.map((t, i) => {
      const n = porId.get(t.principal);
      usados.add(t.id);
      return `${i + 1}. ${n.t}\n_${medio(n)} y ${t.fuentes - 1} medios más_\n${n.u}`;
    });
    bloques.push(`*Lo más cubierto*\n${lineas.join('\n')}`);
  }

  for (const s of datos.secciones) {
    const lineas = [];
    for (const n of datos.noticias) {
      if (lineas.length >= porSeccion) break;
      if (n.s !== s.id || datos.fuentes[n.f]?.idioma !== 'es') continue;
      if (n.g) {
        if (usados.has(n.g)) continue;
        usados.add(n.g);
      }
      lineas.push(`• ${n.t} _(${medio(n)})_`);
    }
    if (lineas.length) bloques.push(`*${s.nombre}*\n${lineas.join('\n')}`);
  }
  if (urlSitio) bloques.push(`El chisme completo, con todos los lados:\n${urlSitio}`);

  // Reparte los bloques en mensajes sin partir ninguno a la mitad.
  const mensajes = [];
  let actual = '';
  for (const b of bloques) {
    const bloque = b.length > maxCaracteres ? `${b.slice(0, maxCaracteres - 1)}…` : b;
    if (actual && actual.length + 2 + bloque.length > maxCaracteres) {
      mensajes.push(actual);
      actual = '';
    }
    actual = actual ? `${actual}\n\n${bloque}` : bloque;
  }
  if (actual) mensajes.push(actual);
  return mensajes;
}

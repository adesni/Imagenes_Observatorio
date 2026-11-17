// Lector tolerante de RSS 2.0, RDF y Atom, sin dependencias.

const BASE = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', euro: '€',
  deg: '°', middot: '·', bull: '•', copy: '©', reg: '®', trade: '™',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', ccedil: 'ç', Ccedil: 'Ç',
};
for (const [v, a] of [['a', 'á'], ['e', 'é'], ['i', 'í'], ['o', 'ó'], ['u', 'ú']]) {
  BASE[`${v}acute`] = a;
  BASE[`${v.toUpperCase()}acute`] = a.toUpperCase();
}

export function decodificarEntidades(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const c = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(c) && c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m;
    }
    return BASE[e] ?? m;
  });
}

/** Quita CDATA, etiquetas HTML y entidades; devuelve texto en una sola línea. */
export function textoPlano(s) {
  if (!s) return '';
  let t = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  t = decodificarEntidades(t);
  t = t.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  t = decodificarEntidades(t);
  return t.replace(/\s+/g, ' ').trim();
}

function etiqueta(bloque, nombres) {
  for (const n of nombres) {
    const m = bloque.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i'));
    if (m && m[1].trim()) return m[1];
  }
  return '';
}

function enlace(bloque) {
  let alterno = '';
  for (const m of bloque.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1];
    const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (href) {
      const rel = attrs.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!rel || rel === 'alternate') return decodificarEntidades(href[1]).trim();
      alterno ||= href[1];
      continue;
    }
    if (!attrs.trim().endsWith('/')) {
      const ini = m.index + m[0].length;
      const fin = bloque.indexOf('</link>', ini);
      if (fin > 0) {
        const t = textoPlano(bloque.slice(ini, fin));
        if (t) return t;
      }
    }
  }
  const guid = textoPlano(etiqueta(bloque, ['guid', 'id']));
  if (/^https?:\/\//i.test(guid)) return guid;
  return decodificarEntidades(alterno).trim();
}

function fecha(bloque) {
  const cruda = textoPlano(etiqueta(bloque, ['pubDate', 'dc:date', 'published', 'updated', 'date']));
  if (!cruda) return null;
  const d = new Date(cruda);
  return Number.isNaN(d.getTime()) ? null : d;
}

function recortar(s, max) {
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const esp = corte.lastIndexOf(' ');
  return `${corte.slice(0, esp > max * 0.6 ? esp : max).replace(/[\s,;:.]+$/, '')}…`;
}

/**
 * @param {string} xml
 * @returns {{titulo: string, url: string, fecha: Date|null, resumen: string}[]}
 */
export function parsearFeed(xml) {
  const salida = [];
  const bloques = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  for (const bloque of bloques) {
    let titulo = textoPlano(etiqueta(bloque, ['title']));
    const url = enlace(bloque);
    if (!titulo || !/^https?:\/\//i.test(url)) continue;

    let resumen = textoPlano(etiqueta(bloque, ['description', 'summary', 'content:encoded', 'content']));
    if (/^https?:\/\/news\.google\.com\//i.test(url)) {
      // Google News: "Titular - Medio" y una descripción que solo repite el titular.
      const medio = textoPlano(etiqueta(bloque, ['source'])).toLowerCase();
      const i = titulo.lastIndexOf(' - ');
      if (i > 0) titulo = titulo.slice(0, i).trim();
      // Algunos medios ya incluyen su nombre en el titular ("… - EFE - EFE").
      const j = titulo.lastIndexOf(' - ');
      const cola = j > 0 ? titulo.slice(j + 3).trim().toLowerCase() : '';
      if (cola && medio && (medio.includes(cola) || cola.includes(medio))) titulo = titulo.slice(0, j).trim();
      resumen = '';
    }
    if (resumen.toLowerCase().startsWith(titulo.toLowerCase())) resumen = '';

    salida.push({ titulo, url, fecha: fecha(bloque), resumen: recortar(resumen, 220) });
  }
  return salida;
}

/** Decodifica el cuerpo respetando el charset (varios medios mexicanos usan ISO-8859-1). */
export function decodificarCuerpo(buffer, contentType = '') {
  const bytes = new Uint8Array(buffer);
  const cabecera = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  const declarado =
    cabecera.match(/<\?xml[^>]*encoding\s*=\s*["']([\w-]+)["']/i)?.[1] ??
    contentType.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] ??
    'utf-8';
  try {
    return new TextDecoder(declarado).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

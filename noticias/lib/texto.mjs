// Normalización de titulares y clasificación por sección.

export const SECCIONES = [
  { id: 'mexico', nombre: 'Política nacional' },
  { id: 'mundo', nombre: 'Internacional' },
  { id: 'mercados', nombre: 'Mercados' },
  { id: 'macro', nombre: 'Macroeconomía' },
];

export function normalizar(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const VACIAS = new Set(`
a al algo ante antes asi aun aunque cada como con contra cual cuando de del desde donde dos durante el ella ellos
en entre era es esa ese eso esta estas este esto estos fue fueron ha hace hacia han hasta hay la las le les lo los
mas me mi mientras muy ni no nos o otra otro para pero por porque que quien se segun ser si sin sobre son su sus
tambien tras tiene tienen todo todos tres un una uno unos y ya dice dijo afirma asegura anuncia nuevo nueva
video fotos hoy ayer the of and to in on for with at by from as is are was were be been it its this that these
those an or but not new says said will would after over into amid his her their has have had about than who
what why how more
`.split(/\s+/).filter(Boolean));

/** Palabras significativas de un titular, sin acentos y con plural recortado. */
export function tokens(titulo) {
  const salida = new Set();
  for (let t of normalizar(titulo).replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/)) {
    if (VACIAS.has(t)) continue;
    if (t.length < 3 && !/^\d{2}$/.test(t)) continue;
    if (t.length > 4) t = t.replace(/(es|s)$/, '');
    salida.add(t);
  }
  return salida;
}

// Notas de servicio y de relleno que no son información política ni económica.
const RUIDO_EXACTO = /\b(HOY|EN VIVO|EN DIRECTO|MINUTO A MINUTO)\b/;
const RUIDO = /\b(hoy no circula|no circulan|horoscopos?|pronostico del clima|clima (hoy|para)|sismos? registrados|temblor (hoy|en)|quiniela|loteria|melate|donde ver|a que hora (juega|es|inicia)|resultados del sorteo|santoral|efemerides)\b/;

/** true si el titular es una nota de servicio (tráfico, sismos, lotería, "HOY", "EN VIVO"…). */
export function esRuido(titulo) {
  return RUIDO_EXACTO.test(titulo) || RUIDO.test(normalizar(titulo));
}

const b = (lista) => new RegExp(`\\b(?:${lista})\\b`, 'g');

const PATRONES = {
  mercados: b(
    'bolsa|bolsas|bmv|biva|wall street|s&p|nasdaq|dow jones|acciones|accionari\\w+|peso mexicano|el peso|' +
    'tipo de cambio|dolar|divisas?|bonos?|cetes|rendimientos?|petroleo|crudo|brent|wti|oro|bitcoin|cripto\\w*|' +
    'inversionistas?|mercados?|cotiza\\w*|stocks?|shares|equities|treasur\\w+|yields?|rally|sell-?off|ipo|' +
    'forex|commodit\\w+|futures|investors?'
  ),
  macro: b(
    'inflacion|banxico|banco de mexico|tasas? de interes|tasa de referencia|pib|crecimiento economico|recesion|' +
    'empleos?|desempleo|inegi|fmi|banco mundial|deficit|deuda publica|presupuesto|paquete economico|hacienda|' +
    'shcp|aranceles?|t-?mec|usmca|remesas|salario minimo|reforma fiscal|impuestos?|reserva federal|la fed|' +
    'bce|economia|economic\\w+|inflation|interest rates?|gdp|tariffs?|central banks?|jobs report|' +
    'unemployment|recession|imf|economy|fiscal'
  ),
  mexico: b(
    'sheinbaum|morena|pan|pri|pvem|movimiento ciudadano|senado|senadores|diputados|congreso de la union|scjn|' +
    'suprema corte|ine|tepjf|gobernador\\w*|fgr|fiscalia|guardia nacional|sedena|semar|marina|reforma judicial|' +
    'cdmx|ciudad de mexico|presidenta|mananera|amlo|lopez obrador|pemex|cfe|cartel\\w*|narco\\w*|' +
    'desaparecid\\w+|segob|gabinete|mexico'
  ),
  mundo: b(
    'trump|casa blanca|washington|eeuu|ee uu|estados unidos|china|rusia|putin|ucrania|israel|gaza|palestin\\w+|' +
    'iran|onu|otan|union europea|venezuela|maduro|cuba|argentina|milei|brasil|lula|colombia|petro|chile|' +
    'migrantes?|migracion|deportaci\\w+|guerra|cumbre|g20|g7|brics|europa|elections?|war|ceasefire|sanctions?|' +
    'white house|united states|russia|ukraine|european union|nato'
  ),
};

/**
 * Elige la sección de una nota de un feed que mezcla temas.
 * @returns la sección con más coincidencias entre `permitidas`, o `porDefecto` si ninguna coincide.
 */
export function clasificar(texto, permitidas, porDefecto = null) {
  const t = normalizar(texto).replace(/[.,;:()"'¿?¡!]/g, ' ');
  let mejor = porDefecto;
  let max = 0;
  for (const s of permitidas) {
    const n = t.match(PATRONES[s])?.length ?? 0;
    if (n > max) {
      max = n;
      mejor = s;
    }
  }
  return mejor;
}

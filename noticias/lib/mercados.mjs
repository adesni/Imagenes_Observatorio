// Cotizaciones de referencia (Yahoo Finance, sin clave). Es un extra: si falla, la página simplemente no las muestra.

const INDICADORES = [
  { nombre: 'USD/MXN', simbolo: 'MXN=X', decimales: 4 },
  { nombre: 'IPC (BMV)', simbolo: '^MXX', decimales: 0 },
  { nombre: 'S&P 500', simbolo: '^GSPC', decimales: 0 },
  { nombre: 'Nasdaq', simbolo: '^IXIC', decimales: 0 },
  { nombre: 'WTI (USD)', simbolo: 'CL=F', decimales: 2 },
  { nombre: 'Bono EE. UU. 10a', simbolo: '^TNX', decimales: 2, esTasa: true },
];

/** Extrae último precio y variación diaria de la respuesta de /v8/finance/chart. */
export function leerCotizacion(json) {
  const r = json?.chart?.result?.[0];
  const cierres = (r?.indicators?.quote?.[0]?.close ?? []).filter((c) => typeof c === 'number');
  const ultimo = typeof r?.meta?.regularMarketPrice === 'number' ? r.meta.regularMarketPrice : cierres.at(-1);
  const previo = cierres.length >= 2 ? cierres.at(-2) : r?.meta?.chartPreviousClose;
  if (typeof ultimo !== 'number' || typeof previo !== 'number' || previo === 0) return null;
  return { ultimo, previo };
}

export async function obtenerMercados({ descargarJson, registro = () => {} }) {
  const salida = await Promise.all(
    INDICADORES.map(async (ind) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ind.simbolo)}?range=5d&interval=1d`;
        const c = leerCotizacion(await descargarJson(url));
        if (!c) throw new Error('respuesta sin precios');
        return {
          nombre: ind.nombre,
          valor: Number(c.ultimo.toFixed(ind.decimales)),
          decimales: ind.decimales,
          // Para tasas se reporta la variación en puntos porcentuales; para lo demás, en %.
          cambio: Number((ind.esTasa ? c.ultimo - c.previo : (c.ultimo / c.previo - 1) * 100).toFixed(2)),
          unidad: ind.esTasa ? 'pp' : '%',
        };
      } catch (e) {
        registro(`✗ Mercados ${ind.nombre}: ${e.message}`);
        return null;
      }
    })
  );
  return salida.filter(Boolean);
}

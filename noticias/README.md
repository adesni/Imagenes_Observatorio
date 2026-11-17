# Contrapeso

Página de noticias de **política nacional (México), internacional, mercados y macroeconomía**, con la orientación editorial de cada medio a la vista, y un **resumen diario por WhatsApp**.

- Lee los feeds RSS de 34 medios de todo el espectro (lista en [`fuentes.json`](fuentes.json)).
- Junta los titulares que hablan del mismo hecho para que compares cómo lo cuenta cada lado ("Así lo cuentan 8 medios").
- "Lo más cubierto" son los hechos que reportan 3 o más medios; el titular principal sale siempre de la fuente más neutral disponible (agencia o centro).
- Filtros por orientación, buscador, indicadores de mercado y un "balance de lectura" que te muestra de qué lado has leído más (se guarda solo en tu dispositivo).

No usa servidores ni bases de datos: una tarea programada de GitHub Actions descarga las noticias cada hora y publica la página en GitHub Pages. Todo es gratuito.

## Puesta en marcha

1. **Lleva estos archivos a la rama principal (`main`).** Las tareas programadas de GitHub solo corren desde la rama principal.
2. **Activa GitHub Pages:** en el repositorio, *Settings → Pages → Build and deployment → Source: **GitHub Actions***. (En el plan gratuito de GitHub el repositorio debe ser público.)
3. **Primera ejecución:** pestaña *Actions → Noticias (Contrapeso) → Run workflow*. En un par de minutos la página queda en `https://<tu-usuario>.github.io/<repositorio>/`.
4. En el celular, abre la página y elige *Agregar a pantalla de inicio* para tenerla como app.

A partir de ahí se actualiza sola cada hora.

## Resumen diario por WhatsApp

El envío usa [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/), un servicio gratuito para mandarte mensajes **a ti misma**. Tu número y tu clave pasan por ese servicio; si prefieres no usarlo, omite esta sección y la página funciona igual.

1. Sigue las instrucciones de la página de CallMeBot: agregas su número a tus contactos y le envías por WhatsApp el mensaje de activación que indican. Te responde con tu **API key**.
2. En GitHub: *Settings → Secrets and variables → Actions → New repository secret*, y crea dos secretos:
   - `WHATSAPP_TELEFONO`: tu número con código de país, por ejemplo `+5215512345678` (si no llega, prueba sin el `1`: `+525512345678`).
   - `CALLMEBOT_APIKEY`: la clave que te dio CallMeBot.
3. Para probarlo: *Actions → Noticias (Contrapeso) → Run workflow* y marca **Enviar también el resumen por WhatsApp**.

El resumen llega todos los días alrededor de las **7:07 a. m. (hora de Ciudad de México)**. Para cambiar la hora, edita la línea `cron: '7 13 * * *'` en [`.github/workflows/noticias.yml`](../.github/workflows/noticias.yml) (está en hora UTC: 13:07 UTC = 7:07 CDMX) y la misma cadena en la condición del paso *Resumen por WhatsApp*.

## Cambiar las fuentes

Edita [`fuentes.json`](fuentes.json). Cada medio tiene:

| Campo | Qué es |
| --- | --- |
| `orientacion` | `izquierda`, `centro-izquierda`, `centro`, `centro-derecha`, `derecha`, `agencia` u `oficial` |
| `feeds[].url` | Dirección del RSS |
| `feeds[].seccion` | `mexico`, `mundo`, `mercados`, `macro`, `finanzas` (se reparte entre mercados y macro) o `mixto` (se clasifica por palabras clave y se descarta lo que no es política ni economía) |
| `sitio` | Dominio del medio. Si el RSS falla o no existe, se usa Google News (`site:dominio`) como respaldo |

La orientación es **una aproximación de la línea editorial**, no un veredicto sobre cada nota; ajústala si no estás de acuerdo. En los filtros, las agencias y las fuentes oficiales cuentan como centro.

En cada ejecución, el registro de *Actions* muestra qué medios respondieron (`✓` directo, `↺` respaldo, `✗` sin datos) y los temas más cubiertos.

## Para desarrollo

```bash
node --test noticias/pruebas/*.test.mjs      # pruebas
node noticias/scripts/actualizar.mjs         # descarga noticias reales a noticias/web/datos/
node noticias/pruebas/vista-previa.mjs       # o genera datos de EJEMPLO, sin conexión
python3 -m http.server -d noticias/web 8000  # abre http://localhost:8000
node noticias/scripts/whatsapp.mjs --ver     # imprime el resumen sin enviarlo
```

Requiere Node 20 o superior; no hay dependencias que instalar.

## Límites conocidos

- Los titulares enlazan al medio original; algunos (Reforma, FT, WSJ, The Economist) tienen muro de pago.
- La agrupación de temas compara palabras de los titulares, así que no cruza notas en español con notas en inglés y a veces separa un mismo hecho o junta dos parecidos.
- Los indicadores de mercado vienen de Yahoo Finance sin clave; si no responde, la franja simplemente no aparece.
- GitHub pausa las tareas programadas de un repositorio tras 60 días sin actividad; basta con reactivarlas en la pestaña *Actions*.

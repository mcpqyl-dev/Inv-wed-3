/* ============================================
   CONFIGURACION CENTRAL
   ============================================ */
(function initConfig(global) {
    const APP_CONFIG = {
        api: {
            // URL del Web App de Google Apps Script (deployment /exec)
            webAppUrl: 'https://script.google.com/macros/s/AKfycbxSLx-uuzKFpjZZRlRlKf-UeaWjla_rrbC6fN3reSkLG_T4cXSTGNklSW3t8KSB0bqX/exec',
            timeoutMs: 12000,
            // Activalo solo si no puedes habilitar respuestas JSON con CORS.
            allowNoCorsFallback: false
        },
        ui: {
            nombreDefault: '[Nombre del Invitado]',
            pasesDefault: 1,
            maxPasesAbsoluto: 10,
            ocultarCamposSiNoAsiste: true,
            // Fecha/hora del evento para cuenta regresiva (formato ISO).
            eventDateIso: '2026-09-15T16:00:00',
            // Nota: cambia estas coordenadas por las reales del local.
            maps: {
                lat: 19.432608,
                lng: -99.133209,
                zoom: 17
            }
        },
        security: {
            // Compatibilidad temporal con links antiguos ?nombre=...&pases=...
            // Recomendado mantener en false en produccion.
            allowLegacyUrlParams: false,
            acceptedCodePattern: /^[A-Za-z0-9_-]{4,30}$/
        },
        storage: {
            submitPrefix: 'rsvp_submitted_'
        }
    };

    global.APP_CONFIG = APP_CONFIG;
})(window);

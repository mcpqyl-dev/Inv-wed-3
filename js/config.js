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
            // Fecha/hora de la ceremonia para la cuenta regresiva (formato ISO).
            ceremonyDateIso: '2027-05-29T14:30:00',
            receptionTimeLabel: '5:00 PM',
            // Imagen de portada (URL o ruta local del repo). Ejemplo: 'Image/portada.jpg'.
            // Si queda vacio, se mostrara la portada sin foto.
            coverImageUrl: '',
            // URL publica DIRECTA de audio (mp3/ogg/m4a). Youtube no funciona aqui.
            // Tambien puedes usar un archivo local del repo, ejemplo: 'audio/entrada-novios.mp3'.
            musicUrl: 'audio/Audio.mp3',
            // Volumen inicial de la musica entre 0 y 1.
            musicInitialVolume: 0.2,
            // Nota: cambia estas coordenadas por las reales del local de recepcion.
            maps: {
                lat:-12.0523891567762,
                lng: -77.03573394684813,
                zoom: 17
            },
            // Coordenadas de la misa/iglesia.
            churchMaps: {
                lat: -12.049185945201359,
                lng: -77.02899672711666,
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

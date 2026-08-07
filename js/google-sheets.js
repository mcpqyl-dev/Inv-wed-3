/* ============================================
   RSVP + INTEGRACION GOOGLE APPS SCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  const config = window.APP_CONFIG || {};
  const apiConfig = config.api || {};
  const securityConfig = config.security || {};
  const storageConfig = config.storage || {};
  const ui = window.InvitationUI;

  const form = document.getElementById('rsvp-form');
  const boton = document.getElementById('rsvp-boton');
  const botonTexto = boton ? boton.querySelector('.boton-texto') : null;
  const exitoDiv = document.getElementById('rsvp-exito');
  const errorDiv = document.getElementById('rsvp-error');
  const errorMensaje = document.getElementById('error-mensaje');
  const exitoDetalles = document.getElementById('exito-detalles');

  const codigoInput = document.getElementById('rsvp-codigo');
  const cantidadInput = document.getElementById('rsvp-cantidad');
  const nombresLineasContainer = document.getElementById('rsvp-nombres-lineas');
  const mensajeInput = document.getElementById('rsvp-mensaje');

  if (!form || !ui) return;

  let isSubmitting = false;
  let validatedGuest = null;

  function getApiUrl() {
    return (apiConfig.webAppUrl || '').trim();
  }

  function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function getUrlParamInsensitive(possibleNames) {
    const params = new URLSearchParams(window.location.search);
    const names = possibleNames.map(function (item) {
      return String(item).toLowerCase();
    });

    for (const entry of params.entries()) {
      const key = String(entry[0] || '').toLowerCase();
      if (names.indexOf(key) !== -1) {
        return String(entry[1] || '').trim();
      }
    }

    return null;
  }

  function withTimeout(promise, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        reject(new Error('Tiempo de espera agotado al conectar con el servidor.'));
      }, timeoutMs);

      promise
        .then(function (value) {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(function (error) {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async function requestJson(url, options) {
    const timeoutMs = apiConfig.timeoutMs || 12000;
    const response = await withTimeout(fetch(url, options), timeoutMs);

    if (!response.ok) {
      throw new Error('El servidor respondio con estado ' + response.status + '.');
    }

    return response.json();
  }

  function setSubmitButtonState(disabled, text) {
    if (!boton || !botonTexto) return;
    boton.disabled = disabled;
    botonTexto.textContent = text;
  }

  function showError(message) {
    if (!errorDiv || !errorMensaje) return;
    errorMensaje.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  function hideError() {
    if (!errorDiv) return;
    errorDiv.classList.add('hidden');
  }

  function showSuccess(payload, serverMessage) {
    form.classList.add('hidden');
    exitoDiv.classList.remove('hidden');
    hideError();

    const lines = [];
    lines.push(payload.nombreInvitado);
    if (payload.asistencia === 'si') {
      lines.push('Asistencia confirmada para ' + payload.cantidadConfirmada + ' persona(s).');
    } else {
      lines.push('Respuesta registrada: no podra asistir.');
    }
    if (serverMessage) {
      lines.push(serverMessage);
    }
    exitoDetalles.textContent = lines.join(' ');
    exitoDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function getSubmitStorageKey(code) {
    return (storageConfig.submitPrefix || 'rsvp_submitted_') + code;
  }

  function generateRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 10);
    return 'req-' + ts + '-' + rnd;
  }

  function isValidCodeFormat(code) {
    const pattern = securityConfig.acceptedCodePattern || /^[A-Za-z0-9_-]{4,30}$/;
    return pattern.test(code);
  }

  function parseLegacyDataIfEnabled() {
    if (!securityConfig.allowLegacyUrlParams) return null;

    const legacyName = getUrlParam('nombre');
    const legacyPasses = parseInt(getUrlParam('pases'), 10);
    if (!legacyName || !Number.isFinite(legacyPasses) || legacyPasses < 1) {
      return null;
    }

    return {
      success: true,
      invitado: {
        codigo: 'legacy-link',
        nombre: legacyName,
        pasesAutorizados: legacyPasses,
        estado: 'ACTIVO'
      },
      warning: 'Modo legado activo. Se recomienda migrar a ?codigo=UNICO.'
    };
  }

  async function validateGuestByCode(code) {
    const apiUrl = getApiUrl();
    if (!apiUrl || apiUrl.includes('PEGA_AQUI')) {
      throw new Error('Debes configurar la URL del Web App en js/config.js.');
    }

    const queryUrl = apiUrl + '?action=guest&codigo=' + encodeURIComponent(code);
    return requestJson(queryUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });
  }

  function getCheckedAttendance() {
    return document.querySelector('input[name="asistencia"]:checked');
  }

  function validateFormData(guest) {
    const attendance = getCheckedAttendance();
    if (!attendance) {
      throw new Error('Selecciona si asistiras o no.');
    }

    const asistencia = attendance.value;
    if (!guest || !guest.nombre) {
      throw new Error('No se encontro un nombre valido para esta invitacion.');
    }

    const maxPasses = parseInt(String(guest.pasesAutorizados), 10) || 1;
    const hasMultiplePasses = maxPasses > 1;
    let confirmedCount = 0;

    if (asistencia === 'si') {
      const count = parseInt(cantidadInput.value, 10);
      if (!Number.isFinite(count) || count < 1) {
        throw new Error('La cantidad de asistentes debe ser al menos 1.');
      }
      if (count > maxPasses) {
        throw new Error('La cantidad confirmada no puede superar tus pases autorizados (' + maxPasses + ').');
      }
      confirmedCount = count;
    }

    if (asistencia === 'no') {
      confirmedCount = 0;
    }

    let companionNamesCsv = '';
    if (asistencia === 'si' && hasMultiplePasses) {
      const enteredNames = [];
      if (nombresLineasContainer) {
        nombresLineasContainer.querySelectorAll('input').forEach(function (input) {
          const value = (input.value || '').trim();
          if (value) {
            enteredNames.push(value);
          }
        });
      }

      if (enteredNames.length !== confirmedCount) {
        throw new Error('Debes completar ' + confirmedCount + ' nombre(s) de asistentes.');
      }

      companionNamesCsv = enteredNames.join(', ');
    }

    return {
      requestId: generateRequestId(),
      codigo: guest.codigo,
      nombreInvitado: guest.nombre,
      asistencia: asistencia,
      cantidadConfirmada: confirmedCount,
      acompanantes: asistencia === 'si' ? companionNamesCsv : '',
      mensaje: (mensajeInput.value || '').trim(),
      source: 'web-invitacion'
    };
  }

  async function sendRsvp(payload) {
    const apiUrl = getApiUrl();
    const options = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(payload)
    };

    try {
      return await requestJson(apiUrl, options);
    } catch (error) {
      if (!apiConfig.allowNoCorsFallback) {
        throw error;
      }

      await withTimeout(fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      }), apiConfig.timeoutMs || 12000);

      return {
        success: false,
        message: 'El envio fue realizado en modo no-cors y no se pudo verificar el registro. Revisa Google Sheets antes de confirmar al invitado.'
      };
    }
  }

  function applyGuestValidationResult(result, requestedCode) {
    if (!result || result.success !== true || !result.invitado) {
      validatedGuest = null;
      ui.applyGuestContext({ valido: false });
      ui.setEnvelopeState(true, false, 'Codigo invalido o inactivo.');
      showError((result && result.message) ? result.message : 'Codigo de invitacion invalido o inactivo.');
      return;
    }

    const invitado = result.invitado;
    validatedGuest = {
      codigo: invitado.codigo || requestedCode,
      nombre: invitado.nombre,
      pasesAutorizados: Number(invitado.pasesAutorizados) || 1,
      estado: invitado.estado || 'ACTIVO'
    };

    ui.applyGuestContext({
      codigo: validatedGuest.codigo,
      nombre: validatedGuest.nombre,
      pasesAutorizados: validatedGuest.pasesAutorizados,
      valido: true
    });
    ui.setEnvelopeState(true, true, 'Toca el sello para abrir la invitacion');

    hideError();

    const submitKey = getSubmitStorageKey(validatedGuest.codigo);
    const localRecord = sessionStorage.getItem(submitKey);
    if (localRecord) {
      ui.setGuestStatus('Ya registraste una confirmacion en esta sesion. Si necesitas cambiarla, puedes reenviar el formulario.', 'ok');
    }

    if (result.ultimaRespuesta && result.ultimaRespuesta.requestId) {
      ui.setGuestStatus('Ya existe una confirmacion previa para este codigo. Si envias de nuevo, se actualizara.', 'ok');
    }
  }

  async function initializeGuestFlow() {
    const codeFromUrl = (
      getUrlParamInsensitive(['codigo', 'code', 'id', 'invitado', 'guest', 'cod']) ||
      getUrlParam('codigo') ||
      ''
    ).trim();

    if (!codeFromUrl) {
      const legacy = parseLegacyDataIfEnabled();
      if (legacy) {
        applyGuestValidationResult(legacy, 'legacy-link');
        return;
      }

      ui.applyGuestContext({ valido: false });
      ui.setEnvelopeState(true, false, 'Falta codigo de invitacion en el enlace.');
      showError('No se encontro codigo en la URL. Usa un enlace con ?codigo=ABC123.');
      return;
    }

    if (!isValidCodeFormat(codeFromUrl)) {
      ui.applyGuestContext({ valido: false });
      ui.setEnvelopeState(true, false, 'El formato del codigo no es valido.');
      showError('El formato del codigo no es valido.');
      return;
    }

    try {
      ui.setGuestStatus('Validando invitacion...', 'loading');
      ui.setEnvelopeState(false, false, 'Validando invitacion...');
      const result = await validateGuestByCode(codeFromUrl);
      applyGuestValidationResult(result, codeFromUrl);
    } catch (error) {
      ui.applyGuestContext({ valido: false });
      ui.setEnvelopeState(true, false, 'No fue posible validar el codigo.');
      showError(error.message || 'No se pudo validar el codigo. Revisa tu conexion e intenta de nuevo.');
      ui.setGuestStatus('No fue posible validar el codigo.', 'error');
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!validatedGuest) {
      showError('No puedes enviar RSVP sin un codigo valido.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    hideError();
    isSubmitting = true;
    setSubmitButtonState(true, 'Enviando...');

    try {
      const payload = validateFormData(validatedGuest);
      const serverResult = await sendRsvp(payload);

      if (!serverResult || serverResult.success !== true) {
        throw new Error((serverResult && serverResult.message) ? serverResult.message : 'No se pudo confirmar el registro en servidor.');
      }

      sessionStorage.setItem(getSubmitStorageKey(validatedGuest.codigo), JSON.stringify({
        requestId: payload.requestId,
        timestamp: Date.now()
      }));

      showSuccess(payload, serverResult.message);
    } catch (error) {
      showError(error.message || 'Ocurrio un error al enviar tu confirmacion. Intenta nuevamente.');
    } finally {
      isSubmitting = false;
      setSubmitButtonState(false, 'Enviar Confirmacion');
    }
  });

  const asistenciaRadios = document.querySelectorAll('input[name="asistencia"]');
  asistenciaRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      ui.toggleAttendanceFields(this.value);
    });
  });

  initializeGuestFlow();
});

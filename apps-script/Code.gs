/* ============================================
   GOOGLE APPS SCRIPT - RSVP BODA
   Hojas requeridas:
   1) Invitados
   2) Respuestas
   ============================================ */

const SHEET_ID = 'REEMPLAZA_CON_TU_SHEET_ID';
const SHEET_INVITADOS = 'Invitados';
const SHEET_RESPUESTAS = 'Respuestas';

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : 'ping';

    if (action === 'guest') {
      const codigo = normalizeCode((e.parameter && e.parameter.codigo) || '');
      if (!codigo) {
        return jsonResponse({
          success: false,
          message: 'Debes enviar un codigo de invitacion valido.'
        });
      }

      const guestData = findGuestByCode(codigo);
      if (!guestData) {
        return jsonResponse({
          success: false,
          message: 'Codigo invalido o no encontrado.'
        });
      }

      if (String(guestData.estado || '').toLowerCase() !== 'activo') {
        return jsonResponse({
          success: false,
          message: 'El codigo existe pero no esta activo.'
        });
      }

      const previous = findLatestResponseByCode(codigo);

      return jsonResponse({
        success: true,
        invitado: {
          codigo: guestData.codigo,
          nombre: guestData.nombre,
          pasesAutorizados: guestData.pasesAutorizados,
          estado: guestData.estado,
          observaciones: guestData.observaciones
        },
        ultimaRespuesta: previous
      });
    }

    return jsonResponse({
      success: true,
      message: 'Servicio activo.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: 'Error en doGet: ' + error.message
    });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, message: 'No se recibio payload.' });
    }

    const body = JSON.parse(e.postData.contents);
    const normalizedPayload = normalizePayload(body);

    const validation = validatePayload(normalizedPayload);
    if (!validation.success) {
      return jsonResponse(validation);
    }

    const guestData = findGuestByCode(normalizedPayload.codigo);
    if (!guestData) {
      return jsonResponse({ success: false, message: 'Codigo de invitacion invalido.' });
    }

    if (String(guestData.estado || '').toLowerCase() !== 'activo') {
      return jsonResponse({ success: false, message: 'El invitado no esta activo.' });
    }

    if (normalizedPayload.asistencia === 'si' && normalizedPayload.cantidadConfirmada > guestData.pasesAutorizados) {
      return jsonResponse({
        success: false,
        message: 'La cantidad confirmada supera los pases autorizados.'
      });
    }

    if (normalizedPayload.asistencia === 'no') {
      normalizedPayload.cantidadConfirmada = 0;
      normalizedPayload.acompanantes = '';
    }

    const responseSheet = getSheetByName(SHEET_RESPUESTAS);
    ensureResponsesHeaders(responseSheet);

    const saveResult = upsertResponse(responseSheet, {
      requestId: normalizedPayload.requestId,
      codigo: normalizedPayload.codigo,
      nombreInvitado: guestData.nombre,
      asistencia: normalizedPayload.asistencia,
      cantidadConfirmada: normalizedPayload.cantidadConfirmada,
      acompanantes: normalizedPayload.acompanantes,
      mensaje: normalizedPayload.mensaje
    });

    return jsonResponse({
      success: true,
      updated: saveResult.updated,
      message: saveResult.updated
        ? 'Confirmacion actualizada correctamente.'
        : 'Confirmacion registrada correctamente.'
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: 'Error en doPost: ' + error.message
    });
  }
}

function normalizePayload(body) {
  return {
    requestId: String(body.requestId || '').trim(),
    codigo: normalizeCode(body.codigo || ''),
    asistencia: String(body.asistencia || '').trim().toLowerCase(),
    cantidadConfirmada: Number(body.cantidadConfirmada || 0),
    acompanantes: String(body.acompanantes || '').trim(),
    mensaje: String(body.mensaje || '').trim()
  };
}

function validatePayload(payload) {
  if (!payload.requestId) {
    return { success: false, message: 'Falta requestId.' };
  }

  if (!payload.codigo) {
    return { success: false, message: 'Falta codigo de invitacion.' };
  }

  if (!/^[A-Z0-9_-]{4,30}$/.test(payload.codigo)) {
    return { success: false, message: 'Formato de codigo invalido.' };
  }

  if (payload.asistencia !== 'si' && payload.asistencia !== 'no') {
    return { success: false, message: 'Valor de asistencia invalido.' };
  }

  if (payload.asistencia === 'si') {
    if (!Number.isFinite(payload.cantidadConfirmada) || payload.cantidadConfirmada < 1) {
      return { success: false, message: 'La cantidad confirmada debe ser mayor o igual a 1.' };
    }
  }

  if (payload.asistencia === 'no' && payload.cantidadConfirmada !== 0) {
    return { success: false, message: 'Si no asiste, la cantidad confirmada debe ser 0.' };
  }

  return { success: true };
}

function findGuestByCode(code) {
  const invitedSheet = getSheetByName(SHEET_INVITADOS);
  ensureInvitedHeaders(invitedSheet);

  const data = invitedSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i += 1) {
    const row = data[i];
    const rowCode = normalizeCode(row[0]);
    if (rowCode === code) {
      return {
        codigo: rowCode,
        nombre: String(row[1] || '').trim(),
        pasesAutorizados: Number(row[2] || 0),
        estado: String(row[3] || '').trim(),
        observaciones: String(row[4] || '').trim(),
        rowIndex: i + 1
      };
    }
  }
  return null;
}

function findLatestResponseByCode(code) {
  const responseSheet = getSheetByName(SHEET_RESPUESTAS);
  ensureResponsesHeaders(responseSheet);

  const data = responseSheet.getDataRange().getValues();
  let found = null;

  for (let i = 1; i < data.length; i += 1) {
    const row = data[i];
    const rowCode = normalizeCode(row[2]);
    if (rowCode === code) {
      found = {
        fecha: row[0],
        requestId: String(row[1] || '').trim(),
        codigo: rowCode,
        nombreInvitado: String(row[3] || '').trim(),
        asistencia: String(row[4] || '').trim(),
        cantidadConfirmada: Number(row[5] || 0),
        acompanantes: String(row[6] || '').trim(),
        mensaje: String(row[7] || '').trim()
      };
    }
  }

  return found;
}

function upsertResponse(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i += 1) {
    const row = data[i];
    const rowCode = normalizeCode(row[2]);
    if (rowCode === payload.codigo) {
      const existingRequestId = String(row[1] || '').trim();

      if (existingRequestId === payload.requestId) {
        return { updated: true, skipped: true };
      }

      sheet.getRange(i + 1, 1, 1, 8).setValues([[
        now,
        payload.requestId,
        payload.codigo,
        payload.nombreInvitado,
        payload.asistencia,
        payload.cantidadConfirmada,
        payload.acompanantes,
        payload.mensaje
      ]]);

      return { updated: true, skipped: false };
    }
  }

  sheet.appendRow([
    now,
    payload.requestId,
    payload.codigo,
    payload.nombreInvitado,
    payload.asistencia,
    payload.cantidadConfirmada,
    payload.acompanantes,
    payload.mensaje
  ]);

  return { updated: false, skipped: false };
}

function ensureInvitedHeaders(sheet) {
  const expected = ['Codigo', 'Nombre', 'PasesAutorizados', 'Estado', 'Observaciones'];
  ensureHeaders(sheet, expected);
}

function ensureResponsesHeaders(sheet) {
  const expected = [
    'Fecha',
    'RequestId',
    'Codigo',
    'NombreInvitado',
    'Asistencia',
    'CantidadConfirmada',
    'Acompanantes',
    'Mensaje'
  ];
  ensureHeaders(sheet, expected);
}

function ensureHeaders(sheet, expectedHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), expectedHeaders.length);
  const firstRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const needsHeaders = expectedHeaders.some(function (header, index) {
    return String(firstRow[index] || '').trim() !== header;
  });

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }
}

function getSheetByName(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

# Invitacion de Boda Digital - Guia de Produccion

Proyecto de invitacion web con sobre animado, RSVP y registro en Google Sheets.

La experiencia visual original se mantiene, pero ahora el flujo recomendado es por codigo unico:

?codigo=ABC123

## Estructura del proyecto

- index.html
- css/style.css
- js/config.js
- js/main.js
- js/google-sheets.js
- apps-script/Code.gs

## Arquitectura actual

Flujo:

1. Frontend obtiene codigo desde URL.
2. Frontend valida codigo con Google Apps Script (GET action=guest).
3. Apps Script busca codigo en hoja Invitados.
4. Frontend muestra nombre y pases autorizados.
5. Invitado confirma RSVP.
6. Frontend envia RSVP por POST a Apps Script.
7. Apps Script valida de nuevo codigo/estado/pases.
8. Apps Script guarda o actualiza en hoja Respuestas (upsert por codigo).

## 1) Configurar Google Sheets

Crear una hoja de calculo y dos pestañas exactas:

### Hoja Invitados

Columnas (fila 1):

- Codigo
- Nombre
- PasesAutorizados
- Estado
- Observaciones

Ejemplo:

- ABC123 | Juan Perez | 2 | Activo |
- XYZ456 | Maria Lopez | 4 | Activo |

### Hoja Respuestas

Columnas (fila 1):

- Fecha
- RequestId
- Codigo
- NombreInvitado
- Asistencia
- CantidadConfirmada
- Acompanantes
- RestriccionesAlimentarias
- Mensaje

Notas:

- Si Asistencia = no, CantidadConfirmada debe quedar en 0.
- El script ya controla esto server-side.

## 2) Configurar Google Apps Script

1. Ir a https://script.google.com
2. Crear proyecto nuevo.
3. Copiar contenido de apps-script/Code.gs al archivo Code.gs del proyecto.
4. Reemplazar la constante SHEET_ID con el ID real de tu Google Sheet.
5. Guardar.

## 3) Publicar el Web App

1. Deploy > New deployment.
2. Tipo: Web app.
3. Execute as: Me.
4. Who has access: Anyone.
5. Deploy y copiar URL final (termina en /exec).

## 4) Conectar frontend con Apps Script

Editar js/config.js:

- api.webAppUrl = URL del deployment /exec.

Recomendado:

- allowNoCorsFallback = false

Con esto el frontend solo muestra exito cuando recibe JSON success=true.

## 5) Generar codigos unicos

Recomendaciones:

- Usar codigos alfanumericos de 6 a 10 caracteres.
- No reutilizar codigos.
- Mantener Estado = Activo solo para invitados habilitados.

Ejemplo de formato:

- FAM001
- ABR24X
- NOVIOS10

## 6) Enviar invitaciones

Usar links por invitado/grupo:

- https://tu-dominio.com/?codigo=ABC123
- https://tu-dominio.com/?codigo=XYZ456

No usar en produccion:

- ?nombre=...
- ?pases=...

## 7) Comportamiento RSVP

- Si responde si:
   - Se habilita cantidad (maximo pases autorizados).
   - Se muestran acompanantes y restricciones alimentarias.
- Si responde no:
   - Se ocultan cantidad, acompanantes y restricciones.
   - Se envia cantidadConfirmada = 0.

## 8) Duplicados y actualizaciones

- Se genera requestId unico por envio.
- Apps Script hace upsert por Codigo:
   - Si el codigo ya existe en Respuestas, actualiza esa fila.
   - Si no existe, crea nueva fila.
- Si llega el mismo requestId, evita duplicado exacto.

## 9) Permisos y seguridad

- No poner secretos en frontend.
- La validacion importante esta en servidor:
   - Codigo valido.
   - Invitado activo.
   - CantidadConfirmada <= PasesAutorizados.

## 10) Pruebas recomendadas

Probar como minimo:

1. Codigo valido con 1 pase.
2. Codigo valido con 2 pases.
3. Codigo valido con 4 pases.
4. Codigo invalido.
5. Codigo vacio.
6. Invitado no asiste.
7. Intento de exceder pases.
8. Doble clic en confirmar.
9. Error de Apps Script.
10. Error de red.
11. Recarga despues de confirmar.
12. Movil (320/375/390/414).
13. Desktop.

## 11) Mantenimiento

- Para agregar invitados: insertar filas en hoja Invitados.
- Para desactivar un codigo: Estado distinto de Activo.
- Para revisar confirmaciones: hoja Respuestas.

## 12) Limitacion tecnica importante

Google Apps Script puede presentar restricciones CORS dependiendo del deployment y dominio.

Por eso:

- El modo recomendado es CORS con respuesta JSON verificable.
- Solo activar allowNoCorsFallback en js/config.js si no tienes alternativa.
- En modo no-cors no es posible confirmar de forma 100% confiable desde navegador que Sheets escribio la fila.

## 13) Checklist rapido de salida

1. SHEET_ID correcto en Apps Script.
2. Web App publicado en modo Anyone.
3. URL /exec pegada en js/config.js.
4. Hojas Invitados y Respuestas con encabezados correctos.
5. Al menos 1 codigo Activo cargado.
6. Pruebas de casos 1-13 completadas.
7. Verificacion visual en movil y desktop.

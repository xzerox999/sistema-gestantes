/**
 * BACKEND API - Sistema de Referencias
 * Instrucciones:
 * 1. Crea un Google Sheet y conviértelo a formato nativo si es .xlsx.
 * 2. Ve a Extensiones > Apps Script.
 * 3. Pega este código y guarda.
 * 4. Implementar > Nueva implementación > Tipo: Aplicación web.
 * 5. Ejecutar como: Tú. Quién tiene acceso: Cualquier persona.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheet;

  if (action === 'read') {
    return handleRead(sheetName);
  }
  
  return jsonResponse({ success: false, message: 'Acción no válida' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const sheetName = data.sheet;

  if (action === 'create') {
    return handleCreate(sheetName, data.payload);
  } else if (action === 'update') {
    return handleUpdate(sheetName, data.payload);
  }

  return jsonResponse({ success: false, message: 'Acción no válida' });
}

function handleRead(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ success: false, message: 'Hoja no encontrada' });
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const rows = data.map(row => {
    let obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
  
  return jsonResponse({ success: true, data: rows });
}

function handleCreate(sheetName, payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ success: false, message: 'Hoja no encontrada' });
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => payload[header] || "");
  
  sheet.appendRow(newRow);
  return jsonResponse({ success: true, message: 'Registro creado' });
}

function handleUpdate(sheetName, payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ success: false, message: 'Hoja no encontrada' });
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  if (idIndex === -1) return jsonResponse({ success: false, message: 'No se encontró columna id' });

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == payload.id) {
      const rowNum = i + 1;
      headers.forEach((header, j) => {
        if (payload[header] !== undefined) {
          sheet.getRange(rowNum, j + 1).setValue(payload[header]);
        }
      });
      return jsonResponse({ success: true, message: 'Registro actualizado' });
    }
  }
  
  return jsonResponse({ success: false, message: 'ID no encontrado' });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

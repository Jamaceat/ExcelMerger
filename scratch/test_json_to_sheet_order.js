const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const junioPath = path.join(__dirname, '..', 'exampleExcels', 'JUNIO 2026 EDWIN.xlsx');

const wbMayo = XLSX.readFile(mayoPath);
const wbJunio = XLSX.readFile(junioPath);

const mergeEngineCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'mergeEngine.js'), 'utf8');
eval(mergeEngineCode);

function detectHeader(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    let consecutive = 0;
    let maxConsecutive = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        consecutive++;
        if (consecutive > maxConsecutive) maxConsecutive = consecutive;
      } else {
        consecutive = 0;
      }
    }
    if (maxConsecutive >= 2) {
      const columns = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        let val = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
        columns.push(val || `Columna_${XLSX.utils.encode_col(c)}`);
      }
      return { headerRow: r, columns };
    }
  }
  return { headerRow: 0, columns: [] };
}

function extractData(sheet, headerRow, columns) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const data = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    let isRowEmpty = true;
    const rowObject = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const val = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
      const colName = columns[c - range.s.c];
      rowObject[colName] = val;
      if (val !== '') isRowEmpty = false;
    }
    if (!isRowEmpty) {
      rowObject['__rowNum'] = r + 1;
      data.push(rowObject);
    }
  }
  return data;
}

const wsBase = wbMayo.Sheets['TOLU'];
const headerBase = detectHeader(wsBase);
const baseData = extractData(wsBase, headerBase.headerRow, headerBase.columns);

const wsMerge = wbJunio.Sheets['Hoja1'];
const headerMerge = detectHeader(wsMerge);
const mergeData = extractData(wsMerge, headerMerge.headerRow, headerMerge.columns);

const referenceColumn = 'EXQ';

const result = performMerge(
  baseData,
  mergeData,
  referenceColumn,
  headerBase.columns,
  headerMerge.columns,
  null
);

// Generar una nueva hoja usando XLSX.utils.json_to_sheet
const headerOrder = [...headerBase.columns, ...result.newColumns];
const wsOut = XLSX.utils.json_to_sheet(result.mergedData, { header: headerOrder });

// Leer de nuevo la hoja generada
const outputData = XLSX.utils.sheet_to_json(wsOut);

console.log('--- EN HOJA GENERADA (wsOut) ---');
outputData.forEach((row, i) => {
  if (row['TITULAR'] && (row['TITULAR'].includes('Edalidis') || row['TITULAR'].includes('Maira Alejandra Meza'))) {
    console.log(`Posición en wsOut JSON ${i}:`, row['TITULAR'], 'EXQ:', row['EXQ']);
  }
});

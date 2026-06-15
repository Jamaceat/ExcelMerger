const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const junioPath = path.join(__dirname, '..', 'exampleExcels', 'JUNIO 2026 EDWIN.xlsx');

const wbMayo = XLSX.readFile(mayoPath, { cellStyles: true });
const wbJunio = XLSX.readFile(junioPath, { cellStyles: true });

const mergeEngineCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'mergeEngine.js'), 'utf8');
eval(mergeEngineCode);

const excelParserCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'excelParser.js'), 'utf8');
eval(excelParserCode); // Carga extractData y detectHeader modificado

const wsBase = wbMayo.Sheets['TOLU'];
const headerBase = detectHeader(wsBase);
// Extraemos con ignoreHidden = true
const baseData = extractData(wsBase, headerBase.headerRow, headerBase.columns, true);

const wsMerge = wbJunio.Sheets['Hoja1'];
const headerMerge = detectHeader(wsMerge);
// Extraemos con ignoreHidden = true
const mergeData = extractData(wsMerge, headerMerge.headerRow, headerMerge.columns, true);

console.log('Total filas extraídas de Base (TOLU visible):', baseData.length);
console.log('Total filas extraídas de Merge (Hoja1 visible):', mergeData.length);

const referenceColumn = 'EXQ';

const result = performMerge(
  baseData,
  mergeData,
  referenceColumn,
  headerBase.columns,
  headerMerge.columns,
  null
);

console.log('\n--- PRIMERAS 10 FILAS EN EL RESULTADO ---');
result.mergedData.slice(0, 10).forEach((row, i) => {
  console.log(`Fila ${i}: TITULAR="${row['TITULAR']}", EXQ=${row['EXQ']}, Fila original Base=${row['__rowNum']}`);
});

const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Mock Expo File y Platform
const mockPlatform = { OS: 'web' };

// Cargar y transformar excelParser.js para que corra en Node
let parserCode = fs.readFileSync(path.join(__dirname, '../src/utils/excelParser.js'), 'utf8');
// Quitar imports de ES6
parserCode = parserCode.replace(/import\s+\{\s*Platform\s*\}\s+from\s+'react-native';/g, '');
parserCode = parserCode.replace(/import\s+\{\s*File\s+as\s+ExpoFile\s*\}\s+from\s+'expo-file-system';/g, '');
parserCode = parserCode.replace(/import\s+\*\s+as\s+XLSX\s+from\s+'xlsx';/g, '');
// Quitar exports de ES6
parserCode = parserCode.replace(/export\s+/g, '');
// Evaluar para cargar las funciones en el ámbito global
const Platform = mockPlatform;
eval(parserCode);

// Cargar y transformar mergeEngine.js
let mergeCode = fs.readFileSync(path.join(__dirname, '../src/utils/mergeEngine.js'), 'utf8');
mergeCode = mergeCode.replace(/export\s+/g, '');
eval(mergeCode);

// Cargar y transformar excelWriter.js
let writerCode = fs.readFileSync(path.join(__dirname, '../src/utils/excelWriter.js'), 'utf8');
writerCode = writerCode.replace(/import\s+ExcelJS\s+from\s+'exceljs';/g, '');
writerCode = writerCode.replace(/import\s+\{\s*File\s+as\s+ExpoFile,\s*Paths\s*\}\s+from\s+'expo-file-system';/g, '');
writerCode = writerCode.replace(/import\s+\*\s+as\s+Sharing\s+from\s+'expo-sharing';/g, '');
writerCode = writerCode.replace(/import\s+\{\s*Buffer\s*\}\s+from\s+'buffer';/g, '');
writerCode = writerCode.replace(/import\s+\{\s*Platform\s*\}\s+from\s+'react-native';/g, '');
writerCode = writerCode.replace(/export\s+/g, '');
eval(writerCode);

const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const junioPath = path.join(__dirname, '..', 'exampleExcels', 'JUNIO 2026 EDWIN.xlsx');

global.fetch = async (uri) => {
  return {
    arrayBuffer: async () => {
      const buf = fs.readFileSync(uri);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
  };
};
global.window = {
  URL: {
    createObjectURL: (blob) => {
      global.outputBlob = blob;
      return 'blob:mock';
    },
    revokeObjectURL: () => {}
  }
};
global.document = {
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  createElement: () => {
    return {
      href: '',
      download: '',
      click: () => {}
    };
  }
};

async function testMergeAndWrite() {
  console.log("=== Iniciando Prueba de Integración ===");

  // 1. Cargar base y merge
  const wbBase = await parseExcelFile(mayoPath);
  const wbMerge = await parseExcelFile(junioPath);

  const baseSheet = wbBase.Sheets['TOLU'];
  const mergeSheet = wbMerge.Sheets['Hoja1'];

  const baseInfo = detectHeader(baseSheet);
  const mergeInfo = detectHeader(mergeSheet);

  // 2. Combinar formatos
  const baseFormats = detectColumnFormats(baseSheet, baseInfo);
  const mergeFormats = detectColumnFormats(mergeSheet, mergeInfo);
  const combinedFormats = { ...mergeFormats, ...baseFormats };

  console.log("Formatos base detectados:", Object.keys(baseFormats).filter(k => baseFormats[k]).length);
  console.log("Formatos merge detectados:", Object.keys(mergeFormats).filter(k => mergeFormats[k]).length);
  console.log("Formatos 'FECHAPAGO' y 'P. HASTA':", combinedFormats['FECHAPAGO'], combinedFormats['P. HASTA']);

  // 3. Extraer datos
  const baseData = extractData(baseSheet, baseInfo.headerRow, baseInfo.columns, true);
  const mergeData = extractData(mergeSheet, mergeInfo.headerRow, mergeInfo.columns, true);

  // 4. Perform merge
  const mergeResult = performMerge(
    baseData,
    mergeData,
    'EXQ',
    baseInfo.columns,
    mergeInfo.columns,
    null
  );

  console.log("Total filas combinadas:", mergeResult.mergedData.length);

  // 5. Generate Excel
  const baseFileMock = { uri: mayoPath, name: 'MAYO 2025 EDWIN.xlsx' };
  await generateExcel(
    baseFileMock.uri,
    baseFileMock.name,
    mergeResult.mergedData,
    baseInfo.columns,
    mergeResult.newColumns,
    '#FFA500',
    '#FFC0CB',
    'Resultado_Combinacion',
    combinedFormats
  );

  if (global.outputBlob) {
    const testOutFile = path.join(__dirname, 'test_integration_output.xlsx');
    const buffer = Buffer.from(await global.outputBlob.arrayBuffer());
    fs.writeFileSync(testOutFile, buffer);
    console.log(`\nArchivo Excel generado correctamente en: ${testOutFile}`);

    // Leer el archivo de salida con SheetJS y comprobar el formato de las celdas
    const wbOut = XLSX.readFile(testOutFile, { cellNF: true });
    const wsOut = wbOut.Sheets['Resultado_Combinacion'];

    console.log("\nHojas en el archivo de salida:", wbOut.SheetNames);
    
    // Verificar algunas celdas de fecha y número
    const cellRefPago = 'G2'; // FECHAPAGO
    const cellRefHasta = 'I2'; // P. HASTA
    
    console.log(`Celda FECHAPAGO (${cellRefPago}):`, wsOut[cellRefPago]);
    console.log(`Celda P. HASTA (${cellRefHasta}):`, wsOut[cellRefHasta]);

    if (wsOut[cellRefPago] && wsOut[cellRefPago].z !== 'General' && wsOut[cellRefPago].z !== undefined) {
      console.log(`\n✅ ÉXITO: El formato de fecha se conservó correctamente en la celda ${cellRefPago}: "${wsOut[cellRefPago].z}"`);
    } else {
      console.log(`\n❌ ERROR: El formato de fecha se perdió y se guardó como "${wsOut[cellRefPago] ? wsOut[cellRefPago].z : 'undefined'}".`);
    }

    fs.unlinkSync(testOutFile);
    console.log("Limpieza del archivo de salida de prueba completada.");
  } else {
    console.error("❌ ERROR: No se generó el blob de salida.");
  }
}

testMergeAndWrite().catch(console.error);

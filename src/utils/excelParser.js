/**
 * src/utils/excelParser.js
 * Módulo para lectura de archivos Excel y procesamiento de datos en React Native/Expo.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

/**
 * Lee un archivo Excel local desde su URI de Expo y retorna el workbook de SheetJS.
 * @param {string} fileUri - URI del archivo obtenido por DocumentPicker
 * @returns {Promise<any>} Workbook de SheetJS
 */
export async function parseExcelFile(fileUri) {
  try {
    let workbook;
    
    if (Platform.OS === 'web') {
      // En la web, fetch de la URI (blob: o data:) para obtener el ArrayBuffer
      const response = await fetch(fileUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Parsear el ArrayBuffer con SheetJS
      workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellStyles: true,
        cellFormulas: true,
        cellNF: true,
      });
    } else {
      let readUri = fileUri;
      let isTempFile = false;
      const tempFilePath = FileSystem.cacheDirectory + 'temp_excel_parse_' + Date.now() + '.xlsx';

      // Si es un content:// URI, debemos copiarlo al directorio de caché primero para poder leerlo
      if (fileUri.startsWith('content://')) {
        await FileSystem.copyAsync({
          from: fileUri,
          to: tempFilePath,
        });
        readUri = tempFilePath;
        isTempFile = true;
      }

      // En entorno móvil (Android/iOS), leer usando expo-file-system
      const fileContent = await FileSystem.readAsStringAsync(readUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Parsear el contenido Base64 con SheetJS
      workbook = XLSX.read(fileContent, {
        type: 'base64',
        cellStyles: true,
        cellFormulas: true,
        cellNF: true,
      });

      // Limpiar el archivo temporal
      if (isTempFile) {
        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch (cleanupError) {
          console.warn('Error al limpiar archivo temporal:', cleanupError);
        }
      }
    }
    
    return workbook;
  } catch (error) {
    console.error('Error al leer/parsear Excel:', error);
    throw new Error('No se pudo abrir el archivo Excel. Asegúrate de que sea un archivo de hoja de cálculo válido (.xlsx o .xls).');
  }
}

/**
 * Escanea la hoja para encontrar automáticamente la fila de la cabecera.
 * Heurística: la primera fila con al menos 2 celdas no vacías consecutivas.
 * @param {any} sheet - Hoja de SheetJS
 * @returns {{ headerRow: number, columns: string[] }}
 */
export function detectHeader(sheet) {
  if (!sheet || !sheet['!ref']) {
    return { headerRow: 0, columns: [] };
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // Recorrer filas desde el inicio
  for (let r = range.s.r; r <= range.e.r; r++) {
    let consecutive = 0;
    let maxConsecutive = 0;
    
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      const hasVal = cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '';
      
      if (hasVal) {
        consecutive++;
        if (consecutive > maxConsecutive) {
          maxConsecutive = consecutive;
        }
      } else {
        consecutive = 0;
      }
    }
    
    // Si encontramos una fila con al menos 2 celdas consecutivas con texto
    if (maxConsecutive >= 2) {
      const columns = [];
      const seen = {};
      
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellRef];
        let val = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
        
        if (!val) {
          val = `Columna_${XLSX.utils.encode_col(c)}`;
        }
        
        // Manejar nombres de columna duplicados
        if (seen[val] !== undefined) {
          seen[val]++;
          val = `${val}_${seen[val]}`;
        } else {
          seen[val] = 0;
        }
        
        columns.push(val);
      }
      return { headerRow: r, columns };
    }
  }

  // Fallback: usar la primera fila (row 0)
  const columns = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    columns.push(`Columna_${XLSX.utils.encode_col(c)}`);
  }
  return { headerRow: range.s.r, columns };
}

/**
 * Detecta los formatos de número/fecha para cada columna en la hoja.
 * @param {any} sheet - Hoja de SheetJS
 * @param {{ headerRow: number, columns: string[] }} headerInfo 
 * @returns {Record<string, string>} Mapeo de nombre de columna a formato (.z)
 */
export function detectColumnFormats(sheet, headerInfo) {
  const formats = {};
  if (!sheet || !sheet['!ref'] || !headerInfo || !headerInfo.columns) {
    return formats;
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const columns = headerInfo.columns;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const colName = columns[c - range.s.c];
    if (!colName) continue;

    // Buscar el primer formato no vacío en la columna (debajo de la fila de cabecera)
    for (let r = headerInfo.headerRow + 1; r <= range.e.r; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (cell && cell.z) {
        formats[colName] = cell.z;
        break; // Pasamos a la siguiente columna al encontrar el primer formato
      }
    }
  }

  return formats;
}

/**
 * Extrae los datos de la hoja a partir de la fila de cabecera como un array de objetos.
 * @param {any} sheet 
 * @param {number} headerRow 
 * @param {string[]} columns 
 * @param {boolean} ignoreHidden
 * @returns {any[]} Array de objetos
 */
export function extractData(sheet, headerRow, columns, ignoreHidden = false) {
  if (!sheet || !sheet['!ref']) return [];
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const data = [];
  
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Si ignoreHidden está activo y la fila está oculta por filtros, la saltamos
    if (ignoreHidden && sheet['!rows'] && sheet['!rows'][r] && sheet['!rows'][r].hidden) {
      continue;
    }

    let isRowEmpty = true;
    const rowObject = {};
    
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      const val = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
      
      const colName = columns[c - range.s.c] || `Columna_${XLSX.utils.encode_col(c)}`;
      rowObject[colName] = val;
      
      if (val !== '') {
        isRowEmpty = false;
      }
    }
    
    if (!isRowEmpty) {
      // Guardamos la fila real (1-indexed para el usuario) para estadísticas o referencias
      rowObject['__rowNum'] = r + 1;
      data.push(rowObject);
    }
  }
  
  return data;
}

/**
 * Compara las columnas de ambos archivos para clasificarlas.
 * @param {string[]} baseColumns 
 * @param {string[]} mergeColumns 
 * @returns {{ common: string[], onlyBase: string[], onlyMerge: string[] }}
 */
export function compareColumns(baseColumns, mergeColumns) {
  const common = [];
  const onlyBase = [];
  const onlyMerge = [];
  
  const baseSet = new Set(baseColumns);
  const mergeSet = new Set(mergeColumns);
  
  for (const col of baseColumns) {
    if (mergeSet.has(col)) {
      common.push(col);
    } else {
      onlyBase.push(col);
    }
  }
  
  for (const col of mergeColumns) {
    if (!baseSet.has(col)) {
      onlyMerge.push(col);
    }
  }
  
  return { common, onlyBase, onlyMerge };
}

/**
 * Obtiene los valores únicos y ordenados de una columna de datos.
 * @param {any[]} data 
 * @param {string} columnName 
 * @returns {string[]}
 */
export function getUniqueValues(data, columnName) {
  const vals = new Set();
  for (const row of data) {
    const v = row[columnName];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      vals.add(String(v).trim());
    }
  }
  return Array.from(vals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

/**
 * Filtra los datos según una columna y un conjunto de valores seleccionados (Multiselect).
 * @param {any[]} data 
 * @param {string} columnName 
 * @param {string[]} selectedValues - Array de valores seleccionados
 * @returns {any[]}
 */
export function filterData(data, columnName, selectedValues = []) {
  if (!selectedValues || selectedValues.length === 0) {
    return data;
  }
  
  const selectedSet = new Set(selectedValues.map(v => String(v).trim().toLowerCase()));
  
  return data.filter(row => {
    const v = row[columnName];
    const strVal = v !== undefined && v !== null ? String(v).trim().toLowerCase() : '';
    return selectedSet.has(strVal);
  });
}

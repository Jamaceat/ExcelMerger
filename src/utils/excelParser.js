/**
 * src/utils/excelParser.js
 * Módulo para lectura de archivos Excel y procesamiento de datos en React Native/Expo.
 */

import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
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
      return { workbook, rawBytes: null };
    } else {
      console.log(`[excelParser] Intentando leer archivo en móvil con la API moderna de File. URI: ${fileUri}`);
      
      // Crear instancia de File con la URI (soporta content:// y file:// automáticamente)
      const file = new ExpoFile(fileUri);
      
      // Validar si existe y obtener tamaño
      const size = file.size;
      console.log(`[excelParser] Tamaño del archivo obtenido: ${size} bytes`);
      
      // Leer el archivo como Uint8Array de forma eficiente en memoria
      const uint8Array = await file.bytes();
      console.log(`[excelParser] Archivo leído con éxito (${uint8Array.length} bytes). Parseando con SheetJS...`);

      // Parsear el Uint8Array con SheetJS usando type: 'array'
      workbook = XLSX.read(uint8Array, {
        type: 'array',
        cellStyles: true,
        cellFormulas: true,
        cellNF: true,
      });

      console.log(`[excelParser] Archivo Excel parseado con éxito.`);
      return { workbook, rawBytes: uint8Array };
    }

    return { workbook, rawBytes: null };
  } catch (error) {
    console.error('Error al leer/parsear Excel:', error);
    // Proporcionar detalles adicionales si es posible para depurar
    throw new Error(`No se pudo abrir el archivo Excel. Asegúrate de que sea un archivo de hoja de cálculo válido: ${error.message || error}`);
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
 * Detecta los colores de fondo de fila del archivo base (SheetJS con cellStyles: true).
 * @param {any} sheet - Hoja de SheetJS
 * @param {{ headerRow: number, columns: string[] }} headerInfo
 * @returns {{ colorPalette: {hex: string, count: number}[], rowColorMap: Record<number, string> }}
 */
export function detectRowColors(sheet, headerInfo) {
  if (!sheet || !sheet['!ref'] || !headerInfo) {
    return { colorPalette: [], rowColorMap: {} };
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const colorCounts = {};
  const rowColorMap = {};

  for (let r = headerInfo.headerRow + 1; r <= range.e.r; r++) {
    const rowColorFreq = {};

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (!cell || !cell.s || !cell.s.fgColor) continue;

      const fgColor = cell.s.fgColor;
      if (!fgColor.rgb || fgColor.rgb.length < 6) continue;

      const rgb = fgColor.rgb.toUpperCase();
      // Ignorar blanco, negro y transparente
      if (rgb === 'FFFFFF' || rgb === '000000' || rgb === 'FF000000') continue;

      rowColorFreq[rgb] = (rowColorFreq[rgb] || 0) + 1;
    }

    // Color dominante de la fila
    let dominantColor = null;
    let maxCount = 0;
    for (const [color, count] of Object.entries(rowColorFreq)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }

    if (dominantColor) {
      const rowNum = r + 1; // 1-indexed, igual que __rowNum en extractData
      rowColorMap[rowNum] = '#' + dominantColor;
      colorCounts[dominantColor] = (colorCounts[dominantColor] || 0) + 1;
    }
  }

  const colorPalette = Object.entries(colorCounts)
    .map(([rgb, count]) => ({ hex: '#' + rgb, count }))
    .sort((a, b) => b.count - a.count);

  return { colorPalette, rowColorMap };
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

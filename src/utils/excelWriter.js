/**
 * src/utils/excelWriter.js
 * Módulo para generar y exportar el archivo Excel en React Native usando exceljs, expo-file-system y expo-sharing.
 */

import ExcelJS from 'exceljs';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

// Definir el Buffer global en caso de que exceljs lo requiera
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

/**
 * Limpia y prepara un color hexadecimal para ExcelJS (formato ARGB sin '#', ej. "FFA500" -> "FFFFA500").
 * @param {string} hexColor 
 * @returns {string} Color en formato ARGB
 */
function cleanHexColor(hexColor) {
  if (!hexColor) return 'FFFFFFFF';
  const clean = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  // Si tiene 6 dígitos (RGB), añadimos el canal Alfa al inicio (FF = 100% opaco)
  return clean.length === 6 ? 'FF' + clean.toUpperCase() : clean.toUpperCase();
}

const CHUNK_SIZE = 200;
export const UNMATCHED_BASE_COLOR = '#7A6869';

/**
 * Genera el archivo Excel final aplicando estilos y abriendo el menú de compartir nativo,
 * preservando todas las demás pestañas, gráficos, macros y metadatos del archivo base original.
 *
 * @param {string} baseFileUri - URI de Expo del archivo Excel Base original
 * @param {string} baseFileName - Nombre del archivo Excel Base original
 * @param {any[]} mergedData - Datos combinados
 * @param {string[]} baseColumns - Columnas de la hoja base
 * @param {string[]} newColumns - Columnas nuevas agregadas
 * @param {string} highlightColor - Hexadecimal del color para columnas nuevas (ej. "#FFA500")
 * @param {string} unmatchedColor - Hexadecimal del color para filas sin coincidencia (ej. "#FFCCCC")
 * @param {string} newSheetName - Nombre deseado para la nueva pestaña
 * @param {Record<string, string>} columnFormats - Mapeo de nombre de columna a formato (.z)
 * @param {string[]} preserveColors - Colores de filas a preservar
 * @param {Record<number, string>} rowColorMap - Mapa de fila original a color
 * @param {Uint8Array|null} preloadedBytes - Bytes del archivo base ya leídos (evita releer disco)
 * @param {string} outputFileName - Nombre del archivo resultante (sin extensión)
 * @param {boolean} appendUnmatchedBaseToEnd - Si true, mueve las filas base sin coincidencia al final
 */
export async function generateExcel(
  baseFileUri,
  baseFileName,
  mergedData,
  baseColumns,
  newColumns,
  highlightColor,
  unmatchedColor,
  newSheetName,
  columnFormats,
  preserveColors = [],
  rowColorMap = {},
  preloadedBytes = null,
  outputFileName = null,
  appendUnmatchedBaseToEnd = false,
) {
  try {
    let arrayBuffer;

    // 1. Usar bytes pre-cargados si están disponibles (evita releer del disco)
    if (preloadedBytes) {
      arrayBuffer = Buffer.from(preloadedBytes);
    } else if (Platform.OS === 'web') {
      const response = await fetch(baseFileUri);
      arrayBuffer = await response.arrayBuffer();
    } else {
      const file = new ExpoFile(baseFileUri);
      const uint8Array = await file.bytes();
      arrayBuffer = Buffer.from(uint8Array);
    }

    // 2. Cargar el workbook en ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. Determinar un nombre de hoja único que no exista
    let finalSheetName = (newSheetName || 'Merge_Result').trim();
    if (finalSheetName.length > 31) {
      // Excel limita los nombres de pestañas a 31 caracteres
      finalSheetName = finalSheetName.substring(0, 31);
    }
    
    // Obtener nombres de pestañas existentes
    const existingSheetNames = workbook.worksheets.map(s => s.name.toLowerCase());
    let suffix = 2;
    let uniqueSheetName = finalSheetName;
    while (existingSheetNames.includes(uniqueSheetName.toLowerCase())) {
      const suffixStr = `_${suffix}`;
      const maxLen = 31 - suffixStr.length;
      uniqueSheetName = finalSheetName.substring(0, maxLen) + suffixStr;
      suffix++;
    }

    // 4. Añadir el nuevo sheet al workbook
    const sheet = workbook.addWorksheet(uniqueSheetName);

    // 4b. Reordenar si se pidió mover filas base sin coincidencia al final
    let orderedData = mergedData;
    if (appendUnmatchedBaseToEnd) {
      const matchedBase = mergedData.filter(r => r['__isMatched'] === true);
      const unmatchedBase = mergedData.filter(r => r['__isMatched'] === false && r['__isUnmatched'] !== true);
      const unmatchedMerge = mergedData.filter(r => r['__isUnmatched'] === true);
      orderedData = [...matchedBase, ...unmatchedBase, ...unmatchedMerge];
    }

    // 5. Preparar las cabeceras
    const headerOrder = [...baseColumns, ...newColumns];
    const newColsSet = new Set(newColumns);
    const cleanHighlight = cleanHexColor(highlightColor);
    const cleanUnmatched = cleanHexColor(unmatchedColor);
    const preserveSet = new Set((preserveColors || []).map(c => c.toUpperCase()));
    const cleanUnmatchedBase = cleanHexColor(UNMATCHED_BASE_COLOR);

    // 6. Escribir cabeceras en la Fila 1 y dar formato
    const headerRow = sheet.getRow(1);
    headerRow.height = 25;
    
    headerOrder.forEach((colName, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = colName;
      cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF000000' } };
      
      // Alinear centrado
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Aplicar borde fino inferior a las cabeceras
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF808080' } }
      };

      // Si es una columna nueva, destacar la cabecera
      if (newColsSet.has(colName)) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: cleanHighlight }
        };
      }
    });

    // 7. Escribir los datos en chunks para no bloquear el hilo JS
    for (let chunkStart = 0; chunkStart < orderedData.length; chunkStart += CHUNK_SIZE) {
      const end = Math.min(chunkStart + CHUNK_SIZE, orderedData.length);
      for (let i = chunkStart; i < end; i++) {
        const rowData = orderedData[i];
        const excelRowIndex = i + 2; // Fila 1 es cabecera, datos desde Fila 2
        const row = sheet.getRow(excelRowIndex);
        row.height = 20;

        const originalRowNum = rowData['__rowNum'];
        const originalColor = rowColorMap && originalRowNum ? rowColorMap[originalRowNum] : null;
        const shouldPreserve = originalColor && preserveSet.size > 0 &&
          preserveSet.has(originalColor.toUpperCase());
        const cleanPreserved = shouldPreserve ? cleanHexColor(originalColor) : null;

        headerOrder.forEach((colName, cIndex) => {
          const cell = row.getCell(cIndex + 1);
          const val = rowData[colName];

          cell.value = val !== undefined && val !== null ? val : '';
          cell.alignment = { vertical: 'middle' };

          if (columnFormats && columnFormats[colName]) {
            cell.numFmt = columnFormats[colName];
          }

          if (newColsSet.has(colName)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cleanHighlight } };
          } else if (rowData['__isUnmatched'] === true) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cleanUnmatched } };
          } else if (rowData['__isMatched'] === false) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cleanUnmatchedBase } };
          } else if (cleanPreserved) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cleanPreserved } };
          }
        });
      }
      // Ceder el hilo al event loop para que el spinner anime
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 8. Auto-ajustar el ancho de las columnas (single pass sobre filas)
    const maxLens = headerOrder.map(col => (col ? col.length : 10));
    for (let chunkStart = 0; chunkStart < orderedData.length; chunkStart += CHUNK_SIZE) {
      const end = Math.min(chunkStart + CHUNK_SIZE, orderedData.length);
      for (let i = chunkStart; i < end; i++) {
        const rowData = orderedData[i];
        headerOrder.forEach((colName, colIdx) => {
          const val = rowData[colName];
          if (val !== undefined && val !== null) {
            const len = String(val).length;
            if (len > maxLens[colIdx]) maxLens[colIdx] = len;
          }
        });
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    headerOrder.forEach((colName, colIdx) => {
      sheet.getColumn(colIdx + 1).width = Math.min(50, Math.max(12, maxLens[colIdx] + 4));
    });

    // 9. Escribir el buffer final
    const outputBuffer = await workbook.xlsx.writeBuffer();
    
    // Preparar el nombre del archivo de salida
    const cleanName = outputFileName
      ? outputFileName.replace(/\.[^/.]+$/, '')
      : baseFileName.replace(/\.[^/.]+$/, '') + '_merged';
    const finalOutputFileName = `${cleanName}.xlsx`;

    if (Platform.OS === 'web') {
      // En la web, creamos un blob y disparamos la descarga del navegador
      const blob = new Blob([outputBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalOutputFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      const file = new ExpoFile(Paths.cache, finalOutputFileName);
      file.create({ overwrite: true });
      file.write(new Uint8Array(outputBuffer));
      const outputUri = file.uri;

      // 10. Compartir el archivo nativamente usando Expo Sharing
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outputUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'EdwinCobra - Guardar Excel Combinado',
          UTI: 'org.openxmlformats.spreadsheet-ml.sheet'
        });
      } else {
        throw new Error('La opción de compartir no está disponible en este dispositivo móvil.');
      }
    }
  } catch (error) {
    console.error('Error al generar Excel en EdwinCobra:', error);
    throw new Error('Error al escribir el archivo Excel: ' + error.message);
  }
}

/**
 * src/utils/excelWriter.js
 * Módulo para generar y exportar el archivo Excel en React Native usando exceljs, expo-file-system y expo-sharing.
 */

import ExcelJS from 'exceljs';
import * as FileSystem from 'expo-file-system';
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
  columnFormats
) {
  try {
    let arrayBuffer;
    
    // 1. Leer el archivo base original
    if (Platform.OS === 'web') {
      const response = await fetch(baseFileUri);
      arrayBuffer = await response.arrayBuffer();
    } else {
      const fileContent = await FileSystem.readAsStringAsync(baseFileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      arrayBuffer = Buffer.from(fileContent, 'base64');
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

    // 5. Preparar las cabeceras
    const headerOrder = [...baseColumns, ...newColumns];
    const newColsSet = new Set(newColumns);
    const cleanHighlight = cleanHexColor(highlightColor);
    const cleanUnmatched = cleanHexColor(unmatchedColor);

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

    // 7. Escribir los datos y aplicar formatos/colores por celda/fila
    mergedData.forEach((rowData, rIndex) => {
      const excelRowIndex = rIndex + 2; // Fila 1 es cabecera, datos desde Fila 2
      const row = sheet.getRow(excelRowIndex);
      row.height = 20;

      headerOrder.forEach((colName, cIndex) => {
        const cell = row.getCell(cIndex + 1);
        const val = rowData[colName];
        
        // Asignar el valor
        cell.value = val !== undefined && val !== null ? val : '';
        cell.alignment = { vertical: 'middle' };

        // Aplicar formato de número/fecha si fue detectado
        if (columnFormats && columnFormats[colName]) {
          cell.numFormat = columnFormats[colName];
        }

        // Si es columna nueva en una fila con match, destacar la celda
        if (newColsSet.has(colName)) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cleanHighlight }
          };
        }
      });

      // Si es una fila sin correspondencia (unmatched), colorear toda la fila
      if (rowData['__isUnmatched'] === true) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cleanUnmatched }
          };
        });
      }
    });

    // 8. Auto-ajustar el ancho de las columnas
    headerOrder.forEach((colName, colIdx) => {
      const column = sheet.getColumn(colIdx + 1);
      let maxLen = colName ? colName.length : 10;

      mergedData.forEach(row => {
        const val = row[colName];
        if (val !== undefined && val !== null) {
          const strVal = String(val);
          if (strVal.length > maxLen) {
            maxLen = strVal.length;
          }
        }
      });

      column.width = Math.min(50, Math.max(12, maxLen + 4));
    });

    // 9. Escribir el buffer final
    const outputBuffer = await workbook.xlsx.writeBuffer();
    
    // Preparar el nombre del archivo de salida
    const cleanName = baseFileName.replace(/\.[^/.]+$/, "");
    const outputFileName = `${cleanName}_merged.xlsx`;

    if (Platform.OS === 'web') {
      // En la web, creamos un blob y disparamos la descarga del navegador
      const blob = new Blob([outputBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      const base64 = Buffer.from(outputBuffer).toString('base64');
      const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;

      // Escribir el archivo en el directorio de cache temporal
      await FileSystem.writeAsStringAsync(outputUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

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

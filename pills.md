# Píldoras de Código Reutilizables — EdwinCobra (Móvil)

Este documento recopila fragmentos de código y lógicas de desarrollo muy precisas que han sido implementadas en este proyecto y que pueden ser exportadas directamente a cualquier otra aplicación móvil (React Native / Expo) o web que requiera manipulación de archivos Excel, rendimiento fluido o procesos asíncronos en segundo plano.

---

## 💊 Píldora 1: Lectura y Extracción de Archivos Excel (Expo FileSystem + SheetJS)
* **Objetivo:** Leer archivos Excel de forma eficiente tanto en móviles (Android/iOS) usando la API moderna de archivos de Expo como en la Web sin duplicar lógica.

```javascript
import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import * as XLSX from 'xlsx';

/**
 * Lee un archivo Excel local desde su URI y retorna el workbook de SheetJS y sus bytes crudos.
 * @param {string} fileUri - URI local del archivo (content://, file://, o blob en web)
 * @returns {Promise<{ workbook: XLSX.WorkBook, rawBytes: Uint8Array|null }>}
 */
export async function parseExcelFile(fileUri) {
  try {
    let workbook;
    
    if (Platform.OS === 'web') {
      // En la web, fetch de la URI para obtener el ArrayBuffer
      const response = await fetch(fileUri);
      const arrayBuffer = await response.arrayBuffer();
      
      workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellStyles: true,
        cellFormulas: true,
        cellNF: true, // Habilitar lectura de formatos de celda
      });
      return { workbook, rawBytes: null };
    } else {
      // En móviles, se usa la API nativa de Expo File para leer bytes directamente
      const file = new ExpoFile(fileUri);
      const uint8Array = await file.bytes(); // Retorna un Uint8Array eficiente
      
      workbook = XLSX.read(uint8Array, {
        type: 'array',
        cellStyles: true,
        cellFormulas: true,
        cellNF: true,
      });
      
      // Retornar los bytes leídos evita recargar el disco en pasos posteriores
      return { workbook, rawBytes: uint8Array };
    }
  } catch (error) {
    throw new Error(`Error al abrir el archivo Excel: ${error.message}`);
  }
}
```

---

## 💊 Píldora 2: Detección y Mapeo de Formatos de Columnas
* **Objetivo:** Identificar los formatos originales de cada columna (por ejemplo, si es una celda de fecha con formato `d-mmm-yy` o una moneda con `#,##0`) para mantener el mismo formato visual al escribir el resultado.

```javascript
import * as XLSX from 'xlsx';

/**
 * Escanea la hoja y mapea cada columna a su formato numérico original (.z)
 * @param {XLSX.Worksheet} sheet - Hoja de SheetJS
 * @param {number} headerRow - Indice de la fila de cabeceras (0-indexed)
 * @param {string[]} columns - Nombres ordenados de las columnas
 * @returns {Record<string, string>} Objeto con formato de cada columna (ej: { "FECHA": "dd/mm/yyyy" })
 */
export function detectColumnFormats(sheet, headerInfo) {
  const formats = {};
  if (!sheet || !sheet['!ref'] || !headerInfo) return formats;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const columns = headerInfo.columns;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const colName = columns[c - range.s.c];
    if (!colName) continue;

    // Buscar hacia abajo del header el primer valor que tenga formato (.z)
    for (let r = headerInfo.headerRow + 1; r <= range.e.r; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (cell && cell.z) {
        formats[colName] = cell.z;
        break; // Guardar formato y continuar con la siguiente columna
      }
    }
  }
  return formats;
}
```

---

## 💊 Píldora 3: Extracción de Colores Dominantes de Fila (Paleta de Colores)
* **Objetivo:** Leer estilos de celdas en SheetJS (usando `cellStyles: true`), obtener la codificación RGB/ARGB e identificar la paleta de colores de fondo elegida por el usuario para poder replicarla.

```javascript
import * as XLSX from 'xlsx';

/**
 * Detecta y agrupa los colores de fondo de cada fila en la hoja de Excel.
 * @param {XLSX.Worksheet} sheet 
 * @param {object} headerInfo - Información de cabeceras detectada
 * @returns {{ colorPalette: {hex: string, count: number}[], rowColorMap: Record<number, string> }}
 */
export function detectRowColors(sheet, headerInfo) {
  if (!sheet || !sheet['!ref'] || !headerInfo) return { colorPalette: [], rowColorMap: {} };

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const colorCounts = {};
  const rowColorMap = {};

  for (let r = headerInfo.headerRow + 1; r <= range.e.r; r++) {
    const rowColorFreq = {};

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      // Verificar estilos fgColor
      if (!cell || !cell.s || !cell.s.fgColor || !cell.s.fgColor.rgb) continue;

      const rgb = cell.s.fgColor.rgb.toUpperCase();
      // Ignorar fondos por defecto de color blanco y negro
      if (rgb === 'FFFFFF' || rgb === '000000' || rgb === 'FF000000') continue;

      rowColorFreq[rgb] = (rowColorFreq[rgb] || 0) + 1;
    }

    // Encontrar el color con más frecuencia en la fila (color dominante)
    let dominantColor = null;
    let maxCount = 0;
    for (const [color, count] of Object.entries(rowColorFreq)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }

    if (dominantColor) {
      const rowNum = r + 1; // Fila real en base 1
      rowColorMap[rowNum] = '#' + dominantColor;
      colorCounts[dominantColor] = (colorCounts[dominantColor] || 0) + 1;
    }
  }

  // Generar paleta de colores ordenada de mayor a menor uso
  const colorPalette = Object.entries(colorCounts)
    .map(([rgb, count]) => ({ hex: '#' + rgb, count }))
    .sort((a, b) => b.count - a.count);

  return { colorPalette, rowColorMap };
}
```

---

## 💊 Píldora 4: Escritura en Chunks Asíncronos (Evitar Bloqueos del Event Loop)
* **Objetivo:** Al insertar miles de filas a ExcelJS o realizar autoajuste de columnas, el procesador puede colapsar el hilo de JavaScript y generar errores de congelamiento ("Application Not Responding"). Cedemos control periódicamente al event loop usando `setTimeout`.

```javascript
const CHUNK_SIZE = 200; // Procesar de 200 en 200 filas

// ... Dentro del generador de ExcelJS
for (let chunkStart = 0; chunkStart < dataset.length; chunkStart += CHUNK_SIZE) {
  const end = Math.min(chunkStart + CHUNK_SIZE, dataset.length);
  
  for (let i = chunkStart; i < end; i++) {
    const rowData = dataset[i];
    const row = sheet.getRow(i + 2); // Excel 1-based, fila 1 es header
    
    // Aplicar valores
    headers.forEach((colName, cIndex) => {
      const cell = row.getCell(cIndex + 1);
      cell.value = rowData[colName];
      
      // Aplicar formato de celda dinámico (Fechas/Números) extraído en Píldora 2
      if (columnFormats && columnFormats[colName]) {
        cell.numFmt = columnFormats[colName];
      }
    });
  }
  
  // Ceder control al Event Loop (libera el JS Thread para pintar loaders o interfaces)
  await new Promise(resolve => setTimeout(resolve, 0));
}
```

---

## 💊 Píldora 5: Auto-Ajuste de Columnas (Single Pass Auto-fit)
* **Objetivo:** Modificar el ancho de cada columna en ExcelJS para que se ajuste automáticamente a su celda de mayor longitud de caracteres de manera optimizada.

```javascript
// Calcular anchos máximos basados en los nombres de cabeceras
const maxLens = headers.map(col => (col ? col.length : 10));

// Escanear datos en chunks asíncronos para actualizar las longitudes máximas
for (let chunkStart = 0; chunkStart < dataset.length; chunkStart += CHUNK_SIZE) {
  const end = Math.min(chunkStart + CHUNK_SIZE, dataset.length);
  for (let i = chunkStart; i < end; i++) {
    const rowData = dataset[i];
    headers.forEach((colName, colIdx) => {
      const val = rowData[colName];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLens[colIdx]) maxLens[colIdx] = len;
      }
    });
  }
  await new Promise(resolve => setTimeout(resolve, 0));
}

// Asignar el ancho final a cada columna de ExcelJS aplicando un padding de 4 caracteres
headers.forEach((colName, colIdx) => {
  sheet.getColumn(colIdx + 1).width = Math.min(50, Math.max(12, maxLens[colIdx] + 4));
});
```

---

## 💊 Píldora 6: Exportación y Compartido Nativo (ExcelJS Buffer a Expo Share)
* **Objetivo:** Guardar un búfer binario a disco móvil y disparar el visualizador nativo del sistema operativo (iOS/Android) para guardar en carpetas, enviar por chat o compartir.

```javascript
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Guarda el búfer del workbook y dispara el cuadro de diálogo para guardar/compartir nativo.
 * @param {ExcelJS.Workbook} workbook - Instancia de ExcelJS configurada
 * @param {string} fileName - Nombre del archivo final con extensión (ej. "salida.xlsx")
 */
export async function saveAndShareExcel(workbook, fileName) {
  // 1. Escribir datos a un buffer ArrayBuffer
  const outputBuffer = await workbook.xlsx.writeBuffer();
  
  // 2. Crear archivo temporal en el directorio de caché del dispositivo
  const file = new ExpoFile(Paths.cache, fileName);
  file.create({ overwrite: true });
  
  // 3. Escribir el Uint8Array binario
  file.write(new Uint8Array(outputBuffer));
  const fileUri = file.uri; // URI del archivo generado

  // 4. Compartir nativamente
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Guardar Archivo Combinado',
      UTI: 'org.openxmlformats.spreadsheet-ml.sheet'
    });
  } else {
    throw new Error('La opción de compartir no está disponible en este dispositivo.');
  }
}
```

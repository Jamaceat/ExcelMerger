/**
 * app.js
 * Controlador general de la interfaz de usuario y del flujo del wizard.
 */

// Estado global de la aplicación
const state = {
  currentStep: 1,
  totalSteps: 6,
  files: {
    base: null,
    merge: null
  },
  workbooks: {
    base: null,
    merge: null
  },
  sheets: {
    base: null, // Nombre de la hoja seleccionada
    merge: null
  },
  headers: {
    base: null, // { headerRow: number, columns: string[] }
    merge: null
  },
  data: {
    base: null, // Array de objetos extraídos
    merge: null
  },
  refColumn: '',
  filter: {
    column: '',
    value: ''
  },
  mergeResults: null
};

// Elementos de la interfaz de usuario (DOM)
const dom = {
  // Wizard Steps
  steps: Array.from({ length: 6 }, (_, i) => document.getElementById(`step${i + 1}`)),
  indicators: Array.from({ length: 6 }, (_, i) => document.getElementById(`stepIndicator${i + 1}`)),
  stepperProgress: document.getElementById('stepperProgress'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  
  // Loading & Error overlays
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),

  // Paso 1: Archivos
  dropzoneBase: document.getElementById('dropzoneBase'),
  dropzoneMerge: document.getElementById('dropzoneMerge'),
  inputBase: document.getElementById('inputBase'),
  inputMerge: document.getElementById('inputMerge'),
  infoBase: document.getElementById('infoBase'),
  infoMerge: document.getElementById('infoMerge'),
  nameBase: document.getElementById('nameBase'),
  nameMerge: document.getElementById('nameMerge'),
  removeBase: document.getElementById('removeBase'),
  removeMerge: document.getElementById('removeMerge'),

  // Paso 2: Hojas
  listBaseSheets: document.getElementById('listBaseSheets'),
  listMergeSheets: document.getElementById('listMergeSheets'),

  // Paso 3: Referencia
  selectRefColumn: document.getElementById('selectRefColumn'),
  listBaseColumns: document.getElementById('listBaseColumns'),
  listMergeColumns: document.getElementById('listMergeColumns'),

  // Paso 4: Filtros
  selectFilterColumn: document.getElementById('selectFilterColumn'),
  selectFilterValue: document.getElementById('selectFilterValue'),
  filterPreviewBadge: document.getElementById('filterPreviewBadge'),
  filterPreviewText: document.getElementById('filterPreviewText'),

  // Paso 5: Columnas
  tableColumnComparison: document.getElementById('tableColumnComparison').querySelector('tbody'),

  // Paso 6: Configuración e Inicio de Merge
  inputSheetName: document.getElementById('inputSheetName'),
  pickerHighlight: document.getElementById('pickerHighlight'),
  pickerUnmatched: document.getElementById('pickerUnmatched'),
  btnExecuteMerge: document.getElementById('btnExecuteMerge'),
  resultsContainer: document.getElementById('resultsContainer'),
  btnDownload: document.getElementById('btnDownload'),

  // Stats
  statBaseRows: document.getElementById('statBaseRows'),
  statMatched: document.getElementById('statMatched'),
  statNewCols: document.getElementById('statNewCols'),
  statUnmatched: document.getElementById('statUnmatched'),

  // Preview
  tablePreviewHeaders: document.getElementById('tablePreviewHeaders'),
  tablePreviewBody: document.getElementById('tablePreviewBody'),
  previewRowsCount: document.getElementById('previewRowsCount')
};

// Inicialización de Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  setupWizardNav();
  setupDragAndDrop();
  setupStepEvents();
});

// ==========================================
// 1. CONTROLADORES DEL WIZARD (NAVEGACIÓN)
// ==========================================

function setupWizardNav() {
  dom.btnPrev.addEventListener('click', () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  });

  dom.btnNext.addEventListener('click', () => {
    if (state.currentStep < state.totalSteps && validateStep(state.currentStep)) {
      goToStep(state.currentStep + 1);
    }
  });
}

/**
 * Navega hacia el paso especificado.
 * @param {number} stepIndex - Siguiente paso (1 a 6)
 */
function goToStep(stepIndex) {
  // Limpiar posibles mensajes de error al cambiar de paso
  hideError();

  // Cambiar clases de las tarjetas
  dom.steps.forEach((card, index) => {
    if (index + 1 === stepIndex) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Cambiar clases de los indicadores superiores
  dom.indicators.forEach((indicator, index) => {
    const stepNum = index + 1;
    if (stepNum === stepIndex) {
      indicator.classList.add('active');
      indicator.classList.remove('completed');
    } else if (stepNum < stepIndex) {
      indicator.classList.remove('active');
      indicator.classList.add('completed');
    } else {
      indicator.classList.remove('active');
      indicator.classList.remove('completed');
    }
  });

  // Actualizar barra de progreso
  const progressPercent = ((stepIndex - 1) / (state.totalSteps - 1)) * 100;
  dom.stepperProgress.style.width = `${progressPercent}%`;

  // Actualizar estado de los botones de navegación
  state.currentStep = stepIndex;
  updateNavButtons();

  // Acciones secundarias específicas de entrada a pasos
  onStepEnter(stepIndex);
}

/**
 * Valida y formatea datos específicos al ingresar a un nuevo paso.
 * @param {number} stepIndex 
 */
function onStepEnter(stepIndex) {
  switch (stepIndex) {
    case 3:
      // Paso 3: Inicializar la lista de columnas y selector de referencia
      populateReferenceColumnOptions();
      renderColumnsSideBySide();
      break;
    case 4:
      // Paso 4: Inicializar filtros opcionales
      populateFilterOptions();
      break;
    case 5:
      // Paso 5: Mostrar la comparación de columnas
      renderColumnComparison();
      break;
    case 6:
      // Paso 6: Configuración final
      // Si ya se realizó un merge anterior, resetear vista
      dom.resultsContainer.style.display = 'none';
      break;
  }
}

/**
 * Habilita/Deshabilita botones según el paso actual y las condiciones de validación.
 */
function updateNavButtons() {
  // Botón Anterior
  dom.btnPrev.disabled = (state.currentStep === 1);

  // Botón Siguiente
  if (state.currentStep === state.totalSteps) {
    dom.btnNext.style.display = 'none';
  } else {
    dom.btnNext.style.display = 'inline-flex';
    dom.btnNext.disabled = !validateStep(state.currentStep);
  }
}

/**
 * Valida si el paso actual cumple los requisitos para avanzar.
 * @param {number} step 
 * @returns {boolean}
 */
function validateStep(step) {
  switch (step) {
    case 1:
      // Paso 1: Ambos archivos cargados y parseados
      return !!(state.workbooks.base && state.workbooks.merge);
    case 2:
      // Paso 2: Ambas hojas seleccionadas
      return !!(state.sheets.base && state.sheets.merge);
    case 3:
      // Paso 3: Columna de referencia seleccionada y existente en ambos
      if (!state.refColumn) return false;
      const baseCols = state.headers.base ? state.headers.base.columns : [];
      const mergeCols = state.headers.merge ? state.headers.merge.columns : [];
      return baseCols.includes(state.refColumn) && mergeCols.includes(state.refColumn);
    case 4:
    case 5:
      // Pasos 4 y 5 siempre permiten avanzar (los filtros son opcionales)
      return true;
    default:
      return false;
  }
}

// ==========================================
// 2. DRAG AND DROP & CARGA DE ARCHIVOS (PASO 1)
// ==========================================

function setupDragAndDrop() {
  const configureDropzone = (dropzone, input, type) => {
    // Abrir selector al hacer clic
    dropzone.addEventListener('click', () => input.click());

    // Eventos drag
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    // Procesar archivo al soltarlo
    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length) {
        handleFileSelect(files[0], type);
      }
    });

    // Procesar archivo al seleccionarlo con explorador
    input.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length) {
        handleFileSelect(files[0], type);
      }
    });
  };

  configureDropzone(dom.dropzoneBase, dom.inputBase, 'base');
  configureDropzone(dom.dropzoneMerge, dom.inputMerge, 'merge');

  // Remoción de archivos
  dom.removeBase.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile('base');
  });

  dom.removeMerge.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile('merge');
  });
}

/**
 * Lee y valida el archivo Excel seleccionado.
 * @param {File} file 
 * @param {'base' | 'merge'} type 
 */
async function handleFileSelect(file, type) {
  // Validar extensión
  const name = file.name;
  const extension = name.split('.').pop().toLowerCase();
  if (extension !== 'xlsx' && extension !== 'xls') {
    showError('Solo se permiten archivos de Excel (.xlsx, .xls)');
    return;
  }

  showLoading(`Procesando archivo ${type === 'base' ? 'Base' : 'Merge'}...`);
  hideError();

  try {
    const workbook = await parseExcelFile(file);
    state.files[type] = file;
    state.workbooks[type] = workbook;

    // Actualizar visualizaciones de la UI para Carga Realizada
    const dropzone = type === 'base' ? dom.dropzoneBase : dom.dropzoneMerge;
    const info = type === 'base' ? dom.infoBase : dom.infoMerge;
    const nameLabel = type === 'base' ? dom.nameBase : dom.nameMerge;

    dropzone.style.display = 'none';
    info.style.display = 'flex';
    nameLabel.textContent = file.name;
    dropzone.classList.add('loaded');

    // Inicializar Hojas en Paso 2
    renderSheetLists(type);
    
    // Auto-seleccionar si solo hay 1 hoja
    const sheetsList = workbook.SheetNames;
    if (sheetsList.length === 1) {
      selectSheet(sheetsList[0], type);
    }

    updateNavButtons();
  } catch (err) {
    showError(err.message || 'Error al procesar el archivo Excel.');
    resetFile(type);
  } finally {
    hideLoading();
  }
}

/**
 * Resetea el estado de carga para un archivo.
 * @param {'base' | 'merge'} type 
 */
function resetFile(type) {
  state.files[type] = null;
  state.workbooks[type] = null;
  state.sheets[type] = null;
  state.headers[type] = null;
  state.data[type] = null;

  const dropzone = type === 'base' ? dom.dropzoneBase : dom.dropzoneMerge;
  const info = type === 'base' ? dom.infoBase : dom.infoMerge;
  const input = type === 'base' ? dom.inputBase : dom.inputMerge;
  const sheetList = type === 'base' ? dom.listBaseSheets : dom.listMergeSheets;

  dropzone.style.display = 'flex';
  info.style.display = 'none';
  input.value = '';
  dropzone.classList.remove('loaded');
  sheetList.innerHTML = '';

  // Limpiar estados de pasos subsiguientes
  if (type === 'base') {
    state.refColumn = '';
    dom.selectRefColumn.innerHTML = '<option value="" disabled selected>Selecciona una columna...</option>';
    dom.listBaseColumns.innerHTML = '';
  } else {
    dom.listMergeColumns.innerHTML = '';
    state.filter = { column: '', value: '' };
  }

  updateNavButtons();
}

// ==========================================
// 3. SELECCIÓN DE PESTAÑAS (PASO 2)
// ==========================================

/**
 * Dibuja la lista de hojas en los contenedores del Paso 2.
 * @param {'base' | 'merge'} type 
 */
function renderSheetLists(type) {
  const wb = state.workbooks[type];
  const listContainer = type === 'base' ? dom.listBaseSheets : dom.listMergeSheets;
  listContainer.innerHTML = '';

  if (!wb) return;

  wb.SheetNames.forEach(sheetName => {
    const item = document.createElement('div');
    item.className = 'sheet-item';
    if (state.sheets[type] === sheetName) {
      item.classList.add('selected');
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = sheetName;
    item.appendChild(nameSpan);

    // badge indicador de filas aproximadas
    const badge = document.createElement('span');
    badge.className = 'sheet-badge';
    
    // Obtener un estimado rápido
    const sheet = wb.Sheets[sheetName];
    if (sheet && sheet['!ref']) {
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const rows = range.e.r - range.s.r + 1;
      badge.textContent = `${rows} filas`;
    } else {
      badge.textContent = 'vacía';
    }
    
    item.appendChild(badge);

    item.addEventListener('click', () => {
      selectSheet(sheetName, type);
    });

    listContainer.appendChild(item);
  });
}

/**
 * Asigna la hoja seleccionada y dispara la detección de cabeceras.
 * @param {string} sheetName 
 * @param {'base' | 'merge'} type 
 */
function selectSheet(sheetName, type) {
  state.sheets[type] = sheetName;

  // Actualizar clases CSS de la lista visual
  const listContainer = type === 'base' ? dom.listBaseSheets : dom.listMergeSheets;
  Array.from(listContainer.children).forEach(child => {
    if (child.firstChild.textContent === sheetName) {
      child.classList.add('selected');
    } else {
      child.classList.remove('selected');
    }
  });

  // Procesar hoja y extraer cabeceras y datos
  const sheet = state.workbooks[type].Sheets[sheetName];
  
  // Detección automática de cabeceras
  const headerInfo = detectHeader(sheet);
  state.headers[type] = headerInfo;
  
  // Extraer datos usando la fila de cabecera detectada
  state.data[type] = extractData(sheet, headerInfo.headerRow, headerInfo.columns);

  // Reset de variables que dependan de la hoja cargada
  if (type === 'base') {
    state.refColumn = '';
  } else {
    state.filter = { column: '', value: '' };
  }

  updateNavButtons();
}

// ==========================================
// 4. COLUMNA DE REFERENCIA (PASO 3)
// ==========================================

function populateReferenceColumnOptions() {
  dom.selectRefColumn.innerHTML = '<option value="" disabled selected>Selecciona una columna...</option>';
  
  if (!state.headers.base) return;

  const baseCols = state.headers.base.columns;
  const mergeCols = state.headers.merge ? state.headers.merge.columns : [];

  baseCols.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col;
    
    // Advertir si no existe en el merge
    if (!mergeCols.includes(col)) {
      opt.textContent += ' (No encontrada en Excel Merge)';
      opt.disabled = true;
      opt.style.color = 'var(--text-muted)';
    }

    dom.selectRefColumn.appendChild(opt);
  });

  // Restaurar valor previo si sigue siendo válido
  if (state.refColumn && baseCols.includes(state.refColumn) && mergeCols.includes(state.refColumn)) {
    dom.selectRefColumn.value = state.refColumn;
  } else {
    state.refColumn = '';
  }
}

function renderColumnsSideBySide() {
  const renderList = (columns, refColName, container) => {
    container.innerHTML = '';
    columns.forEach(col => {
      const pill = document.createElement('div');
      pill.className = 'column-pill';
      pill.textContent = col;
      if (col === refColName) {
        pill.classList.add('reference-active');
      }
      container.appendChild(pill);
    });
  };

  const baseCols = state.headers.base ? state.headers.base.columns : [];
  const mergeCols = state.headers.merge ? state.headers.merge.columns : [];

  renderList(baseCols, state.refColumn, dom.listBaseColumns);
  renderList(mergeCols, state.refColumn, dom.listMergeColumns);
}

function setupStepEvents() {
  // Cambio en dropdown de referencia (Paso 3)
  dom.selectRefColumn.addEventListener('change', (e) => {
    state.refColumn = e.target.value;
    renderColumnsSideBySide();
    updateNavButtons();
  });

  // Cambio en columna de filtro (Paso 4)
  dom.selectFilterColumn.addEventListener('change', (e) => {
    const colSelected = e.target.value;
    state.filter.column = colSelected;
    state.filter.value = '';
    
    if (colSelected) {
      populateFilterValueOptions(colSelected);
      dom.selectFilterValue.disabled = false;
      updateFilterPreview();
    } else {
      dom.selectFilterValue.innerHTML = '<option value="">-- Selecciona un valor --</option>';
      dom.selectFilterValue.disabled = true;
      dom.filterPreviewBadge.style.display = 'none';
    }
  });

  // Cambio en valor de filtro (Paso 4)
  dom.selectFilterValue.addEventListener('change', (e) => {
    state.filter.value = e.target.value;
    updateFilterPreview();
  });

  // Ejecutar Merge (Paso 6)
  dom.btnExecuteMerge.addEventListener('click', () => {
    runMergeProcess();
  });

  // Descargar Archivo (Paso 6)
  dom.btnDownload.addEventListener('click', () => {
    if (state.mergeResults) {
      showLoading('Generando y estilizando archivo Excel...');
      try {
        const highlightColor = dom.pickerHighlight.value;
        const unmatchedColor = dom.pickerUnmatched.value;
        const sheetName = dom.inputSheetName.value || 'Merge_Result';

        generateExcel(
          state.workbooks.base,
          state.files.base.name,
          state.mergeResults.mergedData,
          state.headers.base.columns,
          state.mergeResults.newColumns,
          highlightColor,
          unmatchedColor,
          sheetName
        );
      } catch (err) {
        showError('Error al exportar Excel: ' + err.message);
      } finally {
        hideLoading();
      }
    }
  });
}

// ==========================================
// 5. FILTROS DEL MERGE (PASO 4)
// ==========================================

function populateFilterOptions() {
  dom.selectFilterColumn.innerHTML = '<option value="">-- Sin filtro / Omitir --</option>';
  dom.selectFilterValue.innerHTML = '<option value="">-- Selecciona un valor --</option>';
  dom.selectFilterValue.disabled = true;
  dom.filterPreviewBadge.style.display = 'none';

  if (!state.headers.merge) return;

  const mergeCols = state.headers.merge.columns;
  mergeCols.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col;
    dom.selectFilterColumn.appendChild(opt);
  });

  // Restaurar estado si ya existía
  if (state.filter.column && mergeCols.includes(state.filter.column)) {
    dom.selectFilterColumn.value = state.filter.column;
    populateFilterValueOptions(state.filter.column);
    dom.selectFilterValue.disabled = false;
    
    if (state.filter.value) {
      dom.selectFilterValue.value = state.filter.value;
      updateFilterPreview();
    }
  }
}

function populateFilterValueOptions(columnName) {
  dom.selectFilterValue.innerHTML = '<option value="">-- Selecciona un valor --</option>';
  
  if (!state.data.merge) return;

  const uniqueVals = getUniqueValues(state.data.merge, columnName);
  uniqueVals.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    dom.selectFilterValue.appendChild(opt);
  });
}

function updateFilterPreview() {
  if (!state.filter.column || !state.filter.value) {
    dom.filterPreviewBadge.style.display = 'none';
    return;
  }

  const filtered = filterData(state.data.merge, state.filter.column, state.filter.value);
  const total = state.data.merge.length;
  
  dom.filterPreviewText.textContent = `${filtered.length} de ${total} filas del Excel Merge pasarán al merge final.`;
  dom.filterPreviewBadge.style.display = 'flex';
}

// ==========================================
// 6. VALIDACIÓN DE COLUMNAS (PASO 5)
// ==========================================

function renderColumnComparison() {
  dom.tableColumnComparison.innerHTML = '';
  
  if (!state.headers.base || !state.headers.merge) return;

  const baseCols = state.headers.base.columns;
  const mergeCols = state.headers.merge.columns;

  const comp = compareColumns(baseCols, mergeCols);

  // 1. Columnas en Común
  comp.common.forEach(col => {
    createComparisonRow(col, 'Ambos (Base y Merge)', 'common', '✅ Coincide (se actualizarán datos)');
  });

  // 2. Solo en Base
  comp.onlyBase.forEach(col => {
    createComparisonRow(col, 'Excel Base', 'only-base', '🟡 Solo en Base (se mantendrá intacta)');
  });

  // 3. Solo en Merge
  comp.onlyMerge.forEach(col => {
    createComparisonRow(col, 'Excel Merge', 'only-merge', '🟠 Columna nueva (se agregará a la derecha)');
  });
}

function createComparisonRow(colName, origin, badgeClass, statusText) {
  const tr = document.createElement('tr');

  const tdCol = document.createElement('td');
  tdCol.style.fontWeight = '600';
  tdCol.style.fontFamily = 'var(--font-mono)';
  tdCol.textContent = colName;
  tr.appendChild(tdCol);

  const tdOrigin = document.createElement('td');
  tdOrigin.textContent = origin;
  tr.appendChild(tdOrigin);

  const tdStatus = document.createElement('td');
  const span = document.createElement('span');
  span.className = `status-badge ${badgeClass}`;
  span.textContent = statusText;
  tdStatus.appendChild(span);
  tr.appendChild(tdStatus);

  dom.tableColumnComparison.appendChild(tr);
}

// ==========================================
// 7. MOTOR DE MERGE & DESCARGA (PASO 6)
// ==========================================

function runMergeProcess() {
  showLoading('Procesando unión de bases de datos...');
  
  // Pequeño delay para dejar renderizar el spinner
  setTimeout(() => {
    try {
      const baseData = state.data.base;
      const mergeData = state.data.merge;
      const refCol = state.refColumn;
      const baseCols = state.headers.base.columns;
      const mergeCols = state.headers.merge.columns;
      
      const activeFilter = (state.filter.column && state.filter.value) ? state.filter : null;

      const result = performMerge(
        baseData,
        mergeData,
        refCol,
        baseCols,
        mergeCols,
        activeFilter
      );

      state.mergeResults = result;

      // Renderizar estadísticas
      dom.statBaseRows.textContent = result.stats.totalBaseRows;
      dom.statMatched.textContent = result.stats.matchedRows;
      dom.statNewCols.textContent = result.stats.newColumnsCount;
      dom.statUnmatched.textContent = result.stats.unmatchedMergeRowsAdded;

      // Renderizar Previsualización
      renderPreviewTable(result.mergedData, baseCols, result.newColumns);

      // Mostrar contenedor de resultados
      dom.resultsContainer.style.display = 'block';
      hideError();
    } catch (err) {
      showError('Fallo en la ejecución del merge: ' + err.message);
      dom.resultsContainer.style.display = 'none';
    } finally {
      hideLoading();
    }
  }, 100);
}

/**
 * Renderiza la previsualización de la tabla combinada.
 * @param {any[]} mergedData 
 * @param {string[]} baseCols 
 * @param {string[]} newCols 
 */
function renderPreviewTable(mergedData, baseCols, newCols) {
  dom.tablePreviewHeaders.innerHTML = '';
  dom.tablePreviewBody.innerHTML = '';

  const headers = [...baseCols, ...newCols];

  // 1. Cabeceras
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    
    // Pintar cabecera de columnas nuevas
    if (newCols.includes(h)) {
      th.style.color = dom.pickerHighlight.value;
      th.style.borderBottom = `2px solid ${dom.pickerHighlight.value}`;
    }
    
    dom.tablePreviewHeaders.appendChild(th);
  });

  // 2. Filas (primeras 50)
  const previewData = mergedData.slice(0, 50);
  dom.previewRowsCount.textContent = `Mostrando ${previewData.length} de ${mergedData.length} filas`;

  previewData.forEach(row => {
    const tr = document.createElement('tr');
    
    // Aplicar estilos estéticos de previsualización según estado de la fila
    if (row['__isUnmatched'] === true) {
      // Fila añadida (sin coincidencia)
      tr.style.background = 'rgba(239, 68, 68, 0.1)';
      tr.style.borderLeft = `3px solid ${dom.pickerUnmatched.value}`;
    } else if (row['__isMatched'] === true) {
      // Coincidencia
      tr.style.background = 'rgba(16, 185, 129, 0.02)';
    }

    headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = row[h] !== undefined ? row[h] : '';
      
      // Resaltar celdas de columnas nuevas en filas coincidentes
      if (newCols.includes(h) && row['__isUnmatched'] !== true) {
        td.style.color = dom.pickerHighlight.value;
        td.style.fontWeight = '500';
      }

      tr.appendChild(td);
    });

    dom.tablePreviewBody.appendChild(tr);
  });
}

// ==========================================
// 8. FUNCIONES DE AYUDA Y VISUALES
// ==========================================

function showLoading(msg = 'Procesando...') {
  dom.loadingText.textContent = msg;
  dom.loadingOverlay.classList.add('show');
}

function hideLoading() {
  dom.loadingOverlay.classList.remove('show');
}

function showError(msg) {
  dom.errorText.textContent = msg;
  dom.errorMessage.classList.add('show');
  dom.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  dom.errorMessage.classList.remove('show');
}

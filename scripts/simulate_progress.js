/**
 * Simula el comportamiento de la progress bar con los archivos reales.
 * Muestra dónde se congela y cómo se verá la nueva animación time-based.
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILES = {
  mayo: path.join(__dirname, '../exampleExcels/MAYO 2025 EDWIN.xlsx'),
  junio: path.join(__dirname, '../exampleExcels/JUNIO 2026 EDWIN.xlsx'),
};

// ─── Medir tiempos reales ─────────────────────────────────────────────────────
function measureLoad(filePath) {
  const bytes = fs.readFileSync(filePath);
  const t0 = performance.now();
  const wb = XLSX.read(bytes, { type: 'buffer', cellStyles: true, cellNF: true });
  const loadMs = performance.now() - t0;
  return { loadMs, sizeKb: Math.round(bytes.length / 1024), sheetNames: wb.SheetNames };
}

function measureExtract(filePath) {
  const bytes = fs.readFileSync(filePath);
  const wb = XLSX.read(bytes, { type: 'buffer', cellStyles: true, cellNF: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  const t0 = performance.now();
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const extractMs = performance.now() - t0;

  return { extractMs, rows: data.length, cols: range.e.c - range.s.c + 1 };
}

console.log('══════════════════════════════════════════════════');
console.log(' SIMULACIÓN PROGRESS BAR — EdwinCobra');
console.log('══════════════════════════════════════════════════\n');

// 1) Medir tiempos reales
console.log('📁 [FASE 1] Cargando archivos...');
const mayo = measureLoad(FILES.mayo);
const junio = measureLoad(FILES.junio);
console.log(`  Base  (MAYO  ${mayo.sizeKb}KB): XLSX.read = ${mayo.loadMs.toFixed(0)}ms | hojas: ${mayo.sheetNames.join(', ')}`);
console.log(`  Merge (JUNIO ${junio.sizeKb}KB): XLSX.read = ${junio.loadMs.toFixed(0)}ms | hojas: ${junio.sheetNames.join(', ')}`);

console.log('\n📄 [FASE 2] Extracción de datos...');
const mayoExt = measureExtract(FILES.mayo);
const junioExt = measureExtract(FILES.junio);
console.log(`  MAYO:  ${mayoExt.rows} filas × ${mayoExt.cols} cols — ${mayoExt.extractMs.toFixed(0)}ms`);
console.log(`  JUNIO: ${junioExt.rows} filas × ${junioExt.cols} cols — ${junioExt.extractMs.toFixed(0)}ms`);

// 2) Simular checkpoints del excelWriter (situación actual)
// En el código actual, los report() se llaman en estos momentos:
const totalRows = mayoExt.rows; // filas que se escribirán
const CHUNK_SIZE = 200;
const chunks = Math.ceil(totalRows / CHUNK_SIZE);

// Estimación de tiempos por fase (ms)
const phases = {
  load_workbook: mayo.loadMs,       // xlsx.load del workbook base
  write_header: 5,                  // casi instantáneo
  write_data_chunks: chunks * 4,    // ~4ms por chunk (await setTimeout 0)
  autofit_chunks: chunks * 3,       // ~3ms por chunk
  write_buffer: 800,                // xlsx.writeBuffer, suele ser ~0.5-1.5s
  share: 200,                       // expo-sharing
};

console.log('\n⚡ [Estimación tiempos - Generación Excel]');
let cumulative = 0;
for (const [phase, ms] of Object.entries(phases)) {
  cumulative += ms;
  console.log(`  ${phase.padEnd(20)} ${ms.toFixed(0)}ms cumul: ${cumulative.toFixed(0)}ms`);
}
console.log(`  TOTAL ESTIMADO: ${cumulative.toFixed(0)}ms`);

// 3) Checkpoints actuales en excelWriter.js
const totalMs = cumulative;
const checkpoints = [
  { ms: 0, value: 0 },
  { ms: phases.load_workbook, value: 0.15 },                             // después de xlsx.load
  { ms: phases.load_workbook + phases.write_header, value: 0.20 },      // después de header
  { ms: phases.load_workbook + phases.write_header + phases.write_data_chunks, value: 0.65 }, // después de chunks
  { ms: phases.load_workbook + phases.write_header + phases.write_data_chunks + phases.autofit_chunks, value: 0.80 },
  { ms: totalMs - phases.share, value: 0.90 },                           // después de writeBuffer
  { ms: totalMs, value: 1.0 },
];

// 4) Simular animación ACTUAL (checkpoint-chase con ceiling = real * 0.95)
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('❌ ANIMACIÓN ACTUAL (congela en real*0.95)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Tiempo(ms) | Real% | Display% | Estado');
console.log('──────────────────────────────────────────────────');

{
  let display = 0;
  let lastReal = 0;
  let frozenCount = 0;

  for (let t = 0; t <= totalMs + 1000; t += 80) {
    // Valor real en este momento
    let real = 0;
    for (const cp of checkpoints) {
      if (cp.ms <= t) real = cp.value;
    }

    if (real !== lastReal) {
      console.log(`\n  *** CHECKPOINT: real pasa a ${Math.round(real * 100)}% en t=${t}ms ***`);
      lastReal = real;
    }

    let frozen = false;
    if (real >= 1.0) {
      const gap = 1.0 - display;
      if (gap >= 0.001) display += gap * 0.3;
      else display = 1.0;
    } else {
      const ceiling = real * 0.95;
      const gap = ceiling - display;
      if (gap > 0) {
        const factor = 0.10 + 0.05; // avg
        const speed = Math.max(0.0008, Math.min(0.014, gap * factor));
        display = Math.min(display + speed, ceiling);
      } else {
        frozen = true;
        frozenCount++;
      }
    }

    // Solo imprimir cada 200ms o en momentos clave
    if (t % 200 === 0 || frozen && frozenCount <= 3) {
      const pct = Math.round(display * 100);
      const realPct = Math.round(real * 100);
      const status = frozen ? '🧊 CONGELADO' : display >= real * 0.93 ? '⏸ cerca techo' : '▶ avanzando';
      console.log(`t=${String(t).padStart(5)}ms | ${String(realPct).padStart(3)}% | ${String(pct).padStart(7)}% | ${status}`);
    }
  }
}

// 5) Simular animación NUEVA (time-based)
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ ANIMACIÓN NUEVA (time-based, nunca congela)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Suponer que baseFileLoadTimeMs = mayo.loadMs
const baseLoadMs = mayo.loadMs;
const estimatedGenerationMs = Math.max(2000, baseLoadMs * 1.5);
console.log(`  baseFileLoadTimeMs = ${baseLoadMs.toFixed(0)}ms`);
console.log(`  estimatedGenerationMs = max(2000, ${baseLoadMs.toFixed(0)}*1.5) = ${estimatedGenerationMs.toFixed(0)}ms`);
console.log(`  operationActualMs = ${totalMs.toFixed(0)}ms\n`);
console.log('Tiempo(ms) | Display% | Estado');
console.log('────────────────────────────────────');

{
  let display = 0;
  let realDone = false;
  const startTime = 0;

  for (let t = 0; t <= totalMs + 1000; t += 80) {
    // Real done?
    if (t >= totalMs && !realDone) {
      realDone = true;
      console.log(`\n  *** OPERACIÓN COMPLETADA en t=${t}ms — fill hacia 100% ***\n`);
    }

    if (realDone) {
      const gap = 1.0 - display;
      if (gap >= 0.001) display += gap * 0.3;
      else display = 1.0;
    } else {
      const elapsed = t - startTime;
      const timeProgress = Math.min(elapsed / estimatedGenerationMs, 0.90);
      // Pequeño jitter aleatorio (usamos avg 0.003 para simular)
      const jitter = 0.003;
      const target = Math.max(display, timeProgress);
      display = Math.min(0.90, target + jitter);
    }

    if (t % 200 === 0 || t >= totalMs) {
      const pct = Math.round(display * 100);
      const status = realDone ? '⚡ fill rápido' : '▶ avanzando';
      console.log(`t=${String(t).padStart(5)}ms | ${String(pct).padStart(7)}% | ${status}`);
    }
  }
}

console.log('\n✅ Simulación completada.\n');

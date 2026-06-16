/**
 * src/app/index.tsx
 * Pantalla principal y orquestador del Wizard de EdwinCobra.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import WizardProgress from '../components/WizardProgress';
import ProgressModal from '../components/ProgressModal';
import Step1Upload from '../components/Step1Upload';
import Step2Sheets from '../components/Step2Sheets';
import Step3Reference from '../components/Step3Reference';
import Step4Filter from '../components/Step4Filter';
import Step5Mapping from '../components/Step5Mapping';
import Step6Colors from '../components/Step6Colors';
import Step6Download from '../components/Step6Download';

import { parseExcelFile, detectHeader, detectColumnFormats, extractData, detectRowColors } from '../utils/excelParser';
import { performMerge } from '../utils/mergeEngine';

export default function HomeScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  // Estados para ProgressModal de carga de archivos (Modo 1 — time-based)
  const [loadingEstimatedMs, setLoadingEstimatedMs] = useState(3000);
  const [loadingDone, setLoadingDone] = useState(false);

  // Estados de archivos y workbooks
  const [baseFile, setBaseFile] = useState<any>(null);
  const [mergeFile, setMergeFile] = useState<any>(null);
  const [baseWorkbook, setBaseWorkbook] = useState<any>(null);
  const [mergeWorkbook, setMergeWorkbook] = useState<any>(null);

  // Estados de hojas y selección
  const [baseSheets, setBaseSheets] = useState<string[]>([]);
  const [mergeSheets, setMergeSheets] = useState<string[]>([]);
  const [selectedBaseSheet, setSelectedBaseSheet] = useState('');
  const [selectedMergeSheet, setSelectedMergeSheet] = useState('');

  // Estados de columnas y datos extraídos
  const [baseColumns, setBaseColumns] = useState<string[]>([]);
  const [mergeColumns, setMergeColumns] = useState<string[]>([]);
  const [columnFormats, setColumnFormats] = useState<Record<string, string>>({});
  const [baseData, setBaseData] = useState<any[]>([]);
  const [mergeData, setMergeData] = useState<any[]>([]);

  // Configuración de cruce
  const [selectedColumn, setSelectedColumn] = useState('');
  const [filterConfig, setFilterConfig] = useState<{ column: string; values: string[] } | null>(null);

  // Resultados finales
  const [mergedData, setMergedData] = useState<any[]>([]);
  const [newColumns, setNewColumns] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Colores del archivo base
  const [colorPalette, setColorPalette] = useState<any[]>([]);
  const [rowColorMap, setRowColorMap] = useState<Record<number, string>>({});
  const [preserveColors, setPreserveColors] = useState<string[]>([]);

  // Bytes cacheados del archivo base (evita releer del disco al exportar)
  const [baseFileRawBytes, setBaseFileRawBytes] = useState<Uint8Array | null>(null);

  // Tiempo que tomó cargar el archivo base (usado para estimar duración de la generación)
  const [baseFileLoadTimeMs, setBaseFileLoadTimeMs] = useState<number | null>(null);

  // Paso 1: Archivo seleccionado
  const handleFileSelected = async (isBase: boolean, file: any) => {
    // Estimar duración según tamaño (~1 byte/ms ≈ 1MB/s para XLSX.read)
    const fileSizeBytes: number = (file as any).size || 0;
    const estimatedMs = isBase
      ? Math.max(1500, fileSizeBytes / 1000)
      : Math.max(1200, baseFileLoadTimeMs
          ? baseFileLoadTimeMs * (fileSizeBytes / Math.max(1, (baseFile as any)?.size || fileSizeBytes))
          : fileSizeBytes / 1000);

    setLoadingDone(false);
    setLoadingEstimatedMs(estimatedMs);
    setLoading(true);
    setLoadingMessage(isBase ? 'Analizando archivo Principal...' : 'Analizando archivo de Datos Nuevos...');

    // Tick para que React renderice el modal ANTES de que XLSX.read bloquee el JS thread
    await new Promise(resolve => setTimeout(resolve, 80));
    const opStart = Date.now();
    try {
      const { workbook: wb, rawBytes } = await parseExcelFile(file.uri);
      if (isBase) {
        setBaseFile(file);
        setBaseWorkbook(wb);
        setBaseSheets(wb.SheetNames);
        setSelectedBaseSheet(wb.SheetNames[0] || '');
        setBaseFileRawBytes(rawBytes);
        setBaseFileLoadTimeMs(Date.now() - opStart);
      } else {
        setMergeFile(file);
        setMergeWorkbook(wb);
        setMergeSheets(wb.SheetNames);
        setSelectedMergeSheet(wb.SheetNames[0] || '');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      // Señalar done → ProgressModal fillea a 100% con withTiming (UI thread)
      setLoadingDone(true);
      await new Promise(resolve => setTimeout(resolve, 900));
      setLoading(false);
    }
  };

  // Paso 2: Avanzar y extraer cabeceras/datos
  const handleStep2Next = () => {
    setLoading(true);
    setLoadingMessage('Analizando estructura de hojas...');
    setLoadingDone(false);
    setLoadingEstimatedMs(400);
    try {
      const baseSheet = baseWorkbook.Sheets[selectedBaseSheet];
      const mergeSheet = mergeWorkbook.Sheets[selectedMergeSheet];
      
      const baseInfo = detectHeader(baseSheet);
      const mergeInfo = detectHeader(mergeSheet);
      
      const baseFormats = detectColumnFormats(baseSheet, baseInfo);
      const mergeFormats = detectColumnFormats(mergeSheet, mergeInfo);
      const combinedFormats = { ...mergeFormats, ...baseFormats };
      const bData = extractData(baseSheet, baseInfo.headerRow, baseInfo.columns, true);
      const mData = extractData(mergeSheet, mergeInfo.headerRow, mergeInfo.columns, true);

      const { colorPalette: palette, rowColorMap: colorMap } = detectRowColors(baseSheet, baseInfo);
      setColorPalette(palette);
      setRowColorMap(colorMap);

      setBaseColumns(baseInfo.columns);
      setMergeColumns(mergeInfo.columns);
      setColumnFormats(combinedFormats);
      setBaseData(bData);
      setMergeData(mData);
      
      // Auto-seleccionar primera coincidencia si aplica
      const firstCommon = baseInfo.columns.find(col => mergeInfo.columns.includes(col));
      if (firstCommon && !selectedColumn) {
        setSelectedColumn(firstCommon);
      }

      setLoadingDone(true);
      setStep(3);
    } catch (e: any) {
      alert('Error al extraer datos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Paso 6: Toggle de colores a preservar
  const handleTogglePreserveColor = (hex: string) => {
    const upper = hex.toUpperCase();
    setPreserveColors(prev =>
      prev.includes(upper) ? prev.filter(c => c !== upper) : [...prev, upper]
    );
  };

  // Paso 5: Ejecutar merge y pasar a Paso 6
  const handleStep5Next = () => {
    setLoading(true);
    setLoadingMessage('Cruzando y estructurando registros...');
    setLoadingDone(false);
    setLoadingEstimatedMs(600);
    try {
      const result = performMerge(
        baseData,
        mergeData,
        selectedColumn,
        baseColumns,
        mergeColumns,
        filterConfig
      );
      
      setMergedData(result.mergedData);
      setNewColumns(result.newColumns);
      setStats(result.stats);
      setLoadingDone(true);
      setStep(6);
    } catch (e: any) {
      alert('Error al combinar los datos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar todo el proceso
  const handleRestart = () => {
    setStep(1);
    setBaseFile(null);
    setMergeFile(null);
    setBaseWorkbook(null);
    setMergeWorkbook(null);
    setBaseSheets([]);
    setMergeSheets([]);
    setSelectedBaseSheet('');
    setSelectedMergeSheet('');
    setBaseColumns([]);
    setMergeColumns([]);
    setColumnFormats({});
    setBaseData([]);
    setMergeData([]);
    setSelectedColumn('');
    setFilterConfig(null);
    setMergedData([]);
    setNewColumns([]);
    setStats(null);
    setColorPalette([]);
    setRowColorMap({});
    setPreserveColors([]);
    setBaseFileRawBytes(null);
    setBaseFileLoadTimeMs(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Cabecera Premium */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EdwinCobra</Text>
        <Text style={styles.headerSubtitle}>Combinador Inteligente</Text>
      </View>

      {/* Progress Wizard */}
      <WizardProgress currentStep={step} />

      {/* Pantalla del Paso Activo */}
      <View style={styles.content}>
        {step === 1 && (
          <Step1Upload
            baseFile={baseFile}
            mergeFile={mergeFile}
            onFileSelected={handleFileSelected}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Sheets
            baseFileName={baseFile?.name}
            mergeFileName={mergeFile?.name}
            baseSheets={baseSheets}
            mergeSheets={mergeSheets}
            selectedBaseSheet={selectedBaseSheet}
            selectedMergeSheet={selectedMergeSheet}
            onSelectBaseSheet={setSelectedBaseSheet}
            onSelectMergeSheet={setSelectedMergeSheet}
            onNext={handleStep2Next}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3Reference
            baseColumns={baseColumns}
            mergeColumns={mergeColumns}
            selectedColumn={selectedColumn}
            onSelectColumn={setSelectedColumn}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Filter
            mergeColumns={mergeColumns}
            mergeData={mergeData}
            filterColumn={filterConfig?.column || ''}
            filterValues={filterConfig?.values || []}
            onUpdateFilter={setFilterConfig}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <Step5Mapping
            baseColumns={baseColumns}
            mergeColumns={mergeColumns}
            onNext={handleStep5Next}
            onBack={() => setStep(4)}
          />
        )}
        {step === 6 && (
          <Step6Colors
            colorPalette={colorPalette}
            preserveColors={preserveColors}
            onToggleColor={handleTogglePreserveColor}
            onClearColors={() => setPreserveColors([])}
            onNext={() => setStep(7)}
            onBack={() => setStep(5)}
          />
        )}
        {step === 7 && (
          <Step6Download
            baseFile={baseFile}
            baseSheetName={selectedBaseSheet}
            mergedData={mergedData}
            baseColumns={baseColumns}
            newColumns={newColumns}
            stats={stats}
            columnFormats={columnFormats}
            preserveColors={preserveColors}
            rowColorMap={rowColorMap}
            baseFileRawBytes={baseFileRawBytes}
            baseFileLoadTimeMs={baseFileLoadTimeMs}
            onRestart={handleRestart}
            onBack={() => setStep(6)}
          />
        )}
      </View>

      {/* Modal de Carga — Reanimated (UI thread, sobrevive bloqueo de XLSX.read) */}
      <ProgressModal
        visible={loading}
        message={loadingMessage}
        estimatedMs={loadingEstimatedMs}
        done={loadingDone}
        color={Colors.secondary}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    ...Platform.select({
      web: {
        height: '100vh' as any,
        overflow: 'hidden' as any,
      },
      default: {},
    }),
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
});

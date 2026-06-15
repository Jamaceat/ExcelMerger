/**
 * src/app/index.tsx
 * Pantalla principal y orquestador del Wizard de EdwinCobra.
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import WizardProgress from '../components/WizardProgress';
import Step1Upload from '../components/Step1Upload';
import Step2Sheets from '../components/Step2Sheets';
import Step3Reference from '../components/Step3Reference';
import Step4Filter from '../components/Step4Filter';
import Step5Mapping from '../components/Step5Mapping';
import Step6Download from '../components/Step6Download';

import { parseExcelFile, detectHeader, detectColumnFormats, extractData } from '../utils/excelParser';
import { performMerge } from '../utils/mergeEngine';

export default function HomeScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

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

  // Paso 1: Archivo seleccionado
  const handleFileSelected = async (isBase: boolean, file: any) => {
    setLoading(true);
    setLoadingMessage(isBase ? 'Analizando archivo Base...' : 'Analizando archivo Merge...');
    try {
      const wb = await parseExcelFile(file.uri);
      if (isBase) {
        setBaseFile(file);
        setBaseWorkbook(wb);
        setBaseSheets(wb.SheetNames);
        setSelectedBaseSheet(wb.SheetNames[0] || '');
      } else {
        setMergeFile(file);
        setMergeWorkbook(wb);
        setMergeSheets(wb.SheetNames);
        setSelectedMergeSheet(wb.SheetNames[0] || '');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Avanzar y extraer cabeceras/datos
  const handleStep2Next = () => {
    setLoading(true);
    setLoadingMessage('Analizando estructura de hojas...');
    try {
      const baseSheet = baseWorkbook.Sheets[selectedBaseSheet];
      const mergeSheet = mergeWorkbook.Sheets[selectedMergeSheet];
      
      const baseInfo = detectHeader(baseSheet);
      const mergeInfo = detectHeader(mergeSheet);
      
      const baseFormats = detectColumnFormats(baseSheet, baseInfo);
      const bData = extractData(baseSheet, baseInfo.headerRow, baseInfo.columns, true);
      const mData = extractData(mergeSheet, mergeInfo.headerRow, mergeInfo.columns, true);

      setBaseColumns(baseInfo.columns);
      setMergeColumns(mergeInfo.columns);
      setColumnFormats(baseFormats);
      setBaseData(bData);
      setMergeData(mData);
      
      // Auto-seleccionar primera coincidencia si aplica
      const firstCommon = baseInfo.columns.find(col => mergeInfo.columns.includes(col));
      if (firstCommon && !selectedColumn) {
        setSelectedColumn(firstCommon);
      }

      setStep(3);
    } catch (e: any) {
      alert('Error al extraer datos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Paso 5: Ejecutar merge y pasar a Paso 6
  const handleStep5Next = () => {
    setLoading(true);
    setLoadingMessage('Cruzando y estructurando registros...');
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
      setStep(6);
    } catch (e: any) {
      alert('Error al realizar el merge: ' + e.message);
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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Cabecera Premium */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EdwinCobra</Text>
        <Text style={styles.headerSubtitle}>Excel Merger Tool</Text>
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
          <Step6Download
            baseFile={baseFile}
            mergedData={mergedData}
            baseColumns={baseColumns}
            newColumns={newColumns}
            stats={stats}
            columnFormats={columnFormats}
            onRestart={handleRestart}
            onBack={() => setStep(5)}
          />
        )}
      </View>

      {/* Modal de Carga */}
      <Modal transparent={true} visible={loading} animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: Colors.backgroundLight,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    width: 240,
    gap: 16,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

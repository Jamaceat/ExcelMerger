/**
 * src/components/Step6Download.js
 * Componente final del wizard. Permite configurar nombre de hoja, colores,
 * ver estadísticas, previsualizar la tabla y descargar/compartir el archivo.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform as RNPlatform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import PreviewTable from './PreviewTable';
import { generateExcel, UNMATCHED_BASE_COLOR } from '../utils/excelWriter';

// Opciones de paletas premium para columnas nuevas
const HIGHLIGHT_PALETTE = [
  { hex: '#FFA500', name: 'Naranja' },
  { hex: '#8B5CF6', name: 'Violeta' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#F59E0B', name: 'Ambar' },
  { hex: '#EC4899', name: 'Rosa' },
];

// Opciones de paletas premium suaves para filas sin match
const UNMATCHED_PALETTE = [
  { hex: '#991F72', name: 'Magenta' },
  { hex: '#FF9999', name: 'Rojo Suave' },
  { hex: '#FEF08A', name: 'Amarillo Suave' },
  { hex: '#BFDBFE', name: 'Azul Suave' },
  { hex: '#E9D5FF', name: 'Púrpura Suave' },
];

export default function Step6Download({
  baseFile,
  baseSheetName,
  mergedData,
  baseColumns,
  newColumns,
  stats,
  columnFormats,
  preserveColors,
  rowColorMap,
  baseFileRawBytes,
  onRestart,
  onBack,
}) {
  const defaultBaseName = () => baseFile?.name?.replace(/\.[^/.]+$/, '') || 'Resultado';

  const [sheetName, setSheetName] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const baseName = baseSheetName || 'Resultado';
    const suffix = `_${month}_${year}`;
    const maxBase = 31 - suffix.length;
    return (baseName.length > maxBase ? baseName.substring(0, maxBase) : baseName) + suffix;
  });
  const [highlightColor, setHighlightColor] = useState('#FFA500');
  const [unmatchedColor, setUnmatchedColor] = useState('#991F72');
  const [generating, setGenerating] = useState(false);
  const [appendUnmatchedBaseToEnd, setAppendUnmatchedBaseToEnd] = useState(false);

  // Modal para nombre del archivo resultante
  const [fileNameModalVisible, setFileNameModalVisible] = useState(false);
  const [outputFileName, setOutputFileName] = useState(defaultBaseName);

  const handleGenerateAndShare = async () => {
    setGenerating(true);
    // Dejar que el spinner se renderice antes de iniciar trabajo pesado
    await new Promise(resolve => setTimeout(resolve, 80));
    try {
      await generateExcel(
        baseFile.uri,
        baseFile.name,
        mergedData,
        baseColumns,
        newColumns,
        highlightColor,
        unmatchedColor,
        sheetName,
        columnFormats,
        preserveColors || [],
        rowColorMap || {},
        baseFileRawBytes || null,
        outputFileName || null,
        appendUnmatchedBaseToEnd,
      );
    } catch (error) {
      console.error('Error al generar Excel:', error);
      Alert.alert(
        'Error',
        'No se pudo generar o compartir el archivo Excel. Detalles: ' + error.message
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurar y Descargar</Text>
      <Text style={styles.subtitle}>
        Personaliza los estilos del archivo final antes de exportarlo.
      </Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Nombre del archivo resultante */}
        <Text style={styles.label}>Nombre del Archivo Resultante</Text>
        <TouchableOpacity style={styles.inputContainer} onPress={() => setFileNameModalVisible(true)}>
          <Ionicons name="save-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <Text style={styles.inputDisplayText} numberOfLines={1}>{outputFileName || defaultBaseName()}.xlsx</Text>
          <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Nombre del nuevo sheet */}
        <Text style={styles.label}>Nombre de la Nueva Pestaña</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="document-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={sheetName}
            onChangeText={setSheetName}
            placeholder="Resultado_Combinacion"
            placeholderTextColor={Colors.textMuted}
            maxLength={31}
          />
        </View>

        {/* Selector de color: Columnas Nuevas */}
        <Text style={styles.label}>Color de Columnas Nuevas</Text>
        <View style={styles.paletteRow}>
          {HIGHLIGHT_PALETTE.map((colorObj) => {
            const isSelected = highlightColor.toLowerCase() === colorObj.hex.toLowerCase();
            return (
              <TouchableOpacity
                key={colorObj.hex}
                style={[
                  styles.colorBadge,
                  { backgroundColor: colorObj.hex },
                  isSelected ? styles.colorBadgeActive : null
                ]}
                onPress={() => setHighlightColor(colorObj.hex)}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#000" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selector de color: Filas Sin Match */}
        <Text style={styles.label}>Color de Filas Sin Match (Agregadas al Final)</Text>
        <View style={styles.paletteRow}>
          {UNMATCHED_PALETTE.map((colorObj) => {
            const isSelected = unmatchedColor.toLowerCase() === colorObj.hex.toLowerCase();
            return (
              <TouchableOpacity
                key={colorObj.hex}
                style={[
                  styles.colorBadge,
                  { backgroundColor: colorObj.hex },
                  isSelected ? styles.colorBadgeActive : null
                ]}
                onPress={() => setUnmatchedColor(colorObj.hex)}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#000" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Estadísticas del merge */}
        <Text style={styles.sectionTitle}>Resumen de Operación</Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Filas en Excel Base:</Text>
            <Text style={styles.statValue}>{stats.totalBaseRows}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Filas en Excel de Datos Nuevos:</Text>
            <Text style={styles.statValue}>
              {stats.totalMergeRows} {stats.filteredOutRows > 0 ? `(${stats.filteredMergeRows} filtradas)` : ''}
            </Text>
          </View>
          <View style={[styles.statRow, styles.divider]}>
            <Text style={[styles.statLabel, { color: Colors.success }]}>Coincidencias (Matches):</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{stats.matchedRows}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Filas base sin coincidencia:</Text>
            <View style={styles.statRowRight}>
              <Text style={styles.statValue}>{stats.unmatchedBaseRows}</Text>
              {stats.unmatchedBaseRows > 0 && (
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAppendUnmatchedBaseToEnd(v => !v)}
                >
                  <View style={[styles.checkbox, appendUnmatchedBaseToEnd && styles.checkboxChecked]}>
                    {appendUnmatchedBaseToEnd && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Agregar al final</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {stats.unmatchedBaseRows > 0 && (
            <View style={styles.unmatchedBaseHint}>
              <View style={[styles.colorDot, { backgroundColor: UNMATCHED_BASE_COLOR }]} />
              <Text style={styles.unmatchedBaseHintText}>
                Las filas sin coincidencia con datos nuevos tendrán este color
              </Text>
            </View>
          )}
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: Colors.warning }]}>Filas nuevas agregadas al final:</Text>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{stats.unmatchedMergeRowsAdded}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Columnas nuevas añadidas:</Text>
            <Text style={styles.statValue}>{stats.newColumnsCount}</Text>
          </View>
        </View>

        {/* Previsualización */}
        <Text style={styles.sectionTitle}>Previsualización (Primeras 50 Filas)</Text>
        <PreviewTable 
          data={mergedData}
          baseColumns={baseColumns}
          newColumns={newColumns}
          highlightColor={highlightColor}
          unmatchedColor={unmatchedColor}
        />

        {/* Botón de reinicio */}
        <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
          <Ionicons name="refresh" size={18} color={Colors.textMuted} />
          <Text style={styles.restartBtnText}>Reiniciar y Combinar Otros Archivos</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal: carga full-screen bloqueante */}
      <Modal visible={generating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Generando archivo...</Text>
          </View>
        </View>
      </Modal>

      {/* Modal: nombre del archivo resultante */}
      <Modal
        visible={fileNameModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setFileNameModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nombre del Archivo</Text>
            <TouchableOpacity onPress={() => setFileNameModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Escribe el nombre que tendrá el archivo Excel resultante (sin extensión).
          </Text>

          <View style={styles.modalInputContainer}>
            <TextInput
              style={styles.modalInput}
              value={outputFileName}
              onChangeText={setOutputFileName}
              placeholder={defaultBaseName()}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => setFileNameModalVisible(false)}
            />
            <Text style={styles.modalExtension}>.xlsx</Text>
          </View>

          <TouchableOpacity
            style={styles.modalConfirmBtn}
            onPress={() => setFileNameModalVisible(false)}
          >
            <Text style={styles.modalConfirmText}>Confirmar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalResetBtn}
            onPress={() => { setOutputFileName(defaultBaseName()); }}
          >
            <Text style={styles.modalResetText}>Restablecer nombre original</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Botones de navegación inferior */}
      <View style={styles.navigationRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={generating}>
          <Ionicons name="arrow-back" size={18} color={Colors.text} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.downloadButton,
            generating ? styles.downloadButtonDisabled : null
          ]}
          onPress={handleGenerateAndShare}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.downloadButtonText}>Exportar y Guardar</Text>
              <Ionicons name="share-social" size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  paletteRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  colorBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBadgeActive: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statsCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: 'bold',
  },
  divider: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  statRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  unmatchedBaseHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(122, 104, 105, 0.12)',
    borderRadius: 8,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  },
  unmatchedBaseHintText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: Colors.backgroundLight,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    gap: 16,
    width: 240,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    backgroundColor: Colors.backgroundLight,
    gap: 8,
    marginTop: 8,
  },
  restartBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  downloadButton: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadButtonDisabled: {
    backgroundColor: Colors.backgroundLight,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  downloadButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputDisplayText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  // Modal de nombre de archivo
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 32,
    lineHeight: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  modalInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  modalExtension: {
    color: Colors.textMuted,
    fontSize: 16,
    marginLeft: 4,
  },
  modalConfirmBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalResetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  modalResetText: {
    color: Colors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});

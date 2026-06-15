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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import PreviewTable from './PreviewTable';
import { generateExcel } from '../utils/excelWriter';

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
  { hex: '#FF9999', name: 'Rojo Suave' },
  { hex: '#FEF08A', name: 'Amarillo Suave' },
  { hex: '#BFDBFE', name: 'Azul Suave' },
  { hex: '#E9D5FF', name: 'Púrpura Suave' },
  { hex: '#A7F3D0', name: 'Verde Suave' },
];

export default function Step6Download({
  baseFile,
  mergedData,
  baseColumns,
  newColumns,
  stats,
  columnFormats,
  onRestart,
  onBack,
}) {
  const [sheetName, setSheetName] = useState('Merge_Result');
  const [highlightColor, setHighlightColor] = useState('#FFA500');
  const [unmatchedColor, setUnmatchedColor] = useState('#FF9999');
  const [generating, setGenerating] = useState(false);

  const handleGenerateAndShare = async () => {
    setGenerating(true);
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
        columnFormats
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
        {/* Nombre del nuevo sheet */}
        <Text style={styles.label}>Nombre de la Nueva Pestaña</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="document-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={sheetName}
            onChangeText={setSheetName}
            placeholder="Merge_Result"
            placeholderTextColor={Colors.textMuted}
            maxLength={31} // Limite de Excel para pestañas
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
            <Text style={styles.statLabel}>Filas en Excel Merge:</Text>
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
            <Text style={styles.statValue}>{stats.unmatchedBaseRows}</Text>
          </View>
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
});

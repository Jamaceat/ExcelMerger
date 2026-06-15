/**
 * src/components/Step1Upload.js
 * Componente para subir archivos Excel Base y Merge usando expo-document-picker.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../theme/colors';

export default function Step1Upload({ baseFile, mergeFile, onFileSelected, onNext }) {
  const [loadingBase, setLoadingBase] = useState(false);
  const [loadingMerge, setLoadingMerge] = useState(false);

  const handlePickFile = async (isBase) => {
    const setLoading = isBase ? setLoadingBase : setLoadingMerge;
    setLoading(true);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream' // Para compatibilidad amplia
        ],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0];
        // Enviar el archivo seleccionado al componente principal
        await onFileSelected(isBase, fileAsset);
      }
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      alert('Ocurrió un error al seleccionar el archivo Excel.');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb > 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${kb.toFixed(0)} KB`;
  };

  const canContinue = baseFile && mergeFile;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subir Archivos de Datos</Text>
      <Text style={styles.subtitle}>
        Carga tus hojas de cálculo locales para iniciar la combinación.
      </Text>

      {/* Tarjeta Archivo Base */}
      <TouchableOpacity 
        style={[
          styles.card, 
          baseFile ? styles.cardActive : null
        ]}
        onPress={() => handlePickFile(true)}
        disabled={loadingBase}
      >
        {loadingBase ? (
          <ActivityIndicator size="large" color={Colors.secondary} />
        ) : (
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={baseFile ? "document-text" : "arrow-up-circle"} 
                size={32} 
                color={baseFile ? Colors.success : Colors.textMuted} 
              />
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.cardTitle}>Excel Base (Destino)</Text>
              <Text style={styles.cardDesc}>
                {baseFile 
                  ? `${baseFile.name} (${formatSize(baseFile.size)})` 
                  : "Presiona para elegir el archivo original donde se insertarán los datos."
                }
              </Text>
            </View>
            {baseFile && (
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} style={styles.badge} />
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Tarjeta Archivo Merge */}
      <TouchableOpacity 
        style={[
          styles.card, 
          mergeFile ? styles.cardActive : null
        ]}
        onPress={() => handlePickFile(false)}
        disabled={loadingMerge}
      >
        {loadingMerge ? (
          <ActivityIndicator size="large" color={Colors.secondary} />
        ) : (
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={mergeFile ? "copy" : "arrow-up-circle"} 
                size={32} 
                color={mergeFile ? Colors.primaryLight : Colors.textMuted} 
              />
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.cardTitle}>Excel de Datos Nuevos (Origen)</Text>
              <Text style={styles.cardDesc}>
                {mergeFile 
                  ? `${mergeFile.name} (${formatSize(mergeFile.size)})` 
                  : "Presiona para elegir el archivo con la información adicional a cruzar."
                }
              </Text>
            </View>
            {mergeFile && (
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} style={styles.badge} />
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Botón Siguiente */}
      <TouchableOpacity 
        style={[
          styles.button, 
          !canContinue ? styles.buttonDisabled : null
        ]}
        onPress={onNext}
        disabled={!canContinue}
      >
        <Text style={styles.buttonText}>Continuar al Paso 2</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" style={styles.buttonIcon} />
      </TouchableOpacity>
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
    marginBottom: 24,
    lineHeight: 18,
  },
  card: {
    ...CommonStyles.glassCard,
    marginBottom: 16,
    minHeight: 100,
    justifyContent: 'center',
  },
  cardActive: {
    borderColor: Colors.cardBorderActive,
    backgroundColor: 'rgba(27, 30, 46, 0.95)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  badge: {
    alignSelf: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.backgroundLight,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

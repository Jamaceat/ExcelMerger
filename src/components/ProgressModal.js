/**
 * src/components/ProgressModal.js
 * Modal de progreso — barra Y texto 100% en UI thread (Reanimated worklets).
 * Sobrevive el bloqueo del JS thread causado por XLSX.read().
 *
 * Modo 1 — time-based (loading):
 *   Pasa estimatedMs + done. La barra avanza sola hasta 88% y fillea al recibir done=true.
 *
 * Modo 2 — progress-based (generación async):
 *   Pasa progress (0-1). Cada cambio hace withTiming — suaviza saltos.
 */

import React, { useEffect } from 'react';
import { Modal, View, StyleSheet, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useAnimatedReaction,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';

// TextInput animado: usa la propiedad nativa `text` desde el UI thread
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function ProgressModal({
  visible,
  message,
  estimatedMs,   // Modo 1
  done,          // Modo 1
  progress,      // Modo 2 (0-1)
  color,
}) {
  const isMode2 = progress !== undefined;
  const fillColor = color || Colors.secondary;

  const barValue = useSharedValue(0);
  const trackWidthSV = useSharedValue(220);

  // Animación del texto (UI thread)
  const slideOffset = useSharedValue(0);
  const slideOpacity = useSharedValue(1);

  // ── Reset al cerrar ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      cancelAnimation(barValue);
      barValue.value = 0;
      slideOffset.value = 0;
      slideOpacity.value = 1;
    }
  }, [visible]);

  // ── Modo 1: iniciar time-based al abrir ──────────────────────────────────
  useEffect(() => {
    if (!visible || isMode2 || !estimatedMs) return;
    barValue.value = 0;
    barValue.value = withTiming(0.88, {
      duration: estimatedMs,
      easing: Easing.bezier(0.25, 0.0, 0.4, 1.0),
    });
  }, [visible, estimatedMs, isMode2]);

  // ── Modo 1: completar al done ────────────────────────────────────────────
  useEffect(() => {
    if (!visible || isMode2 || !done) return;
    barValue.value = withTiming(1.0, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
  }, [done, visible, isMode2]);

  // ── Modo 2: animar a cada nuevo progress ─────────────────────────────────
  useEffect(() => {
    if (!visible || !isMode2) return;
    barValue.value = withTiming(progress, {
      duration: progress >= 1.0 ? 400 : 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, visible, isMode2]);

  // ── Animación del texto en el UI thread ──────────────────────────────────
  // useAnimatedReaction corre como worklet: sin runOnJS, sin JS thread.
  useAnimatedReaction(
    () => Math.round(barValue.value * 100),
    (current, previous) => {
      if (current === previous || previous === null) return;
      const diff = current - previous;

      if (Math.abs(diff) > 5) {
        // Salto grande: slide-in desde abajo con overshoot "genial"
        slideOffset.value = 14;
        slideOpacity.value = 0;
        slideOffset.value = withTiming(0, {
          duration: 280,
          easing: Easing.out(Easing.back(1.5)),
        });
        slideOpacity.value = withTiming(1, { duration: 220 });
      } else {
        // Cambio pequeño: micro-rebote hacia arriba
        slideOffset.value = withSequence(
          withTiming(-4, { duration: 55, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 75, easing: Easing.in(Easing.quad) }),
        );
      }
    },
  );

  // ── Texto animado: UI thread via useAnimatedProps (TextInput nativo) ─────
  const pctAnimProps = useAnimatedProps(() => ({
    text: `${Math.round(barValue.value * 100)}%`,
  }));

  // ── Estilos animados ──────────────────────────────────────────────────────
  const barStyle = useAnimatedStyle(() => ({
    width: barValue.value * trackWidthSV.value,
  }));

  const textContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideOffset.value }],
    opacity: slideOpacity.value,
  }));

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Animated.Text style={styles.message}>{message}</Animated.Text>

          <View
            style={styles.track}
            onLayout={e => {
              trackWidthSV.value = e.nativeEvent.layout.width;
            }}
          >
            <Animated.View
              style={[styles.fill, { backgroundColor: fillColor }, barStyle]}
            />
          </View>

          <Animated.View style={textContainerStyle}>
            <AnimatedTextInput
              animatedProps={pctAnimProps}
              defaultValue="0%"
              editable={false}
              caretHidden
              style={[styles.pct, { color: Colors.textMuted }]}
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: Colors.backgroundLight,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    width: 260,
    gap: 12,
  },
  message: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  pct: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    minWidth: 44,
    textAlign: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
  },
});

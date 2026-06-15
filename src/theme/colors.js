/**
 * src/theme/colors.js
 * Sistema de diseño de EdwinCobra. Contiene la paleta de colores HSL armonizada,
 * gradientes y estilos comunes para el diseño oscuro premium y Glassmorphism.
 */

export const Colors = {
  // Fondos principales
  background: '#0B0D16', // Azul muy oscuro espacial
  backgroundLight: '#121526', // Fondo de tarjetas con más contraste
  cardBg: 'rgba(23, 27, 48, 0.7)', // Glassmorphism base
  cardBorder: 'rgba(255, 255, 255, 0.08)', // Borde sutil blanco de glassmorphism
  cardBorderActive: 'rgba(109, 40, 217, 0.4)', // Borde violeta activo

  // Colores de acento
  primary: '#6D28D9', // Violeta intenso
  primaryLight: '#8B5CF6', // Violeta más claro para acentos
  secondary: '#06B6D4', // Cyan vibrante
  
  // Colores de estado
  success: '#10B981', // Verde esmeralda (Común)
  warning: '#F59E0B', // Naranja/Ambar (Solo en Base)
  danger: '#EF4444', // Rojo coral (Solo en Merge)
  info: '#3B82F6', // Azul informativo
  
  // Colores de texto
  text: '#FFFFFF', // Blanco principal
  textMuted: '#94A3B8', // Gris slate para subtítulos
  textDark: '#475569', // Gris oscuro
  
  // Highlight predeterminados de Excel
  excelHighlight: '#FFA500', // Naranja de columnas nuevas
  excelUnmatched: '#FF9999', // Rojo suave de filas sin correspondencia
};

export const CommonStyles = {
  glassCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  gradientText: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  }
};

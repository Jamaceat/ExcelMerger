# Excel Merge Web Tool

Una herramienta web estática diseñada para combinar y unificar el contenido de dos archivos Excel de forma visual y controlada. Todo el procesamiento se realiza en el navegador del cliente utilizando HTML, CSS y JavaScript vanilla con la biblioteca `xlsx-js-style`, garantizando que tus datos permanezcan privados y no se envíen a ningún servidor.

## 🚀 Características Principales

1. **Diseño Wizard de 6 Pasos:** Interfaz interactiva y guiada por etapas con un diseño oscuro premium, animaciones micro-interactivas y estética Glassmorphism.
2. **Carga Drag & Drop:** Arrastra y suelta tus archivos Excel directamente en la interfaz.
3. **Selección Visual de Pestañas:** Listado automático de hojas detectadas por cada libro de cálculo con conteo aproximado de registros.
4. **Detección Automática de Cabeceras:** Algoritmo inteligente que escanea las hojas celda por celda para encontrar la cabecera en cualquier fila (no asume fila 1).
5. **Columna de Referencia Inteligente:** Validación cruzada en tiempo real de la existencia de la columna de match seleccionada en ambos archivos.
6. **Filtro del Merge Opcional:** Filtra las filas que participarán en el merge extrayendo los valores únicos de la columna que elijas del archivo Merge.
7. **Mapa Comparativo de Columnas:** Tabla comparativa categorizada por colores (Común, Solo en Base, Solo en Merge).
8. **Configuración Estética del Output:**
   - Permite elegir el nombre del sheet de resultado (por defecto `Merge_Result`).
   - Selección dinámica del color para marcar nuevas columnas (naranja por defecto).
   - Selección dinámica del color para marcar las filas sin correspondencia añadidas al final (rojo suave por defecto).
9. **Operación No Destructiva:** El archivo resultante contiene todas las hojas originales de tu Excel Base intactas, añadiendo el resultado del merge en una pestaña nueva.
10. **Previsualización en Tiempo Real:** Tabla de previsualización con las primeras 50 filas del resultado antes de descargar.

---

## 🛠️ Estructura del Proyecto

```
excelProyect/
├── index.html          ← Estructura del Wizard y elementos UI
├── css/
│   └── styles.css      ← Estilos visuales del Tema Oscuro y Glassmorphism
├── js/
│   ├── app.js          ← Controlador principal de estados y eventos
│   ├── excelParser.js  ← Lectura de archivos y extracción de datos/cabeceras
│   ├── mergeEngine.js  ← Lógica del motor de merge de datos
│   └── excelWriter.js  ← Escritura y coloreado de celdas con xlsx-js-style
├── PLAN.md             ← Plan de implementación inicial
├── PROGRESS.md         ← Control de tareas de desarrollo
└── README.md           ← Este documento
```

---

## 💻 Configuración Local

Dado que la aplicación es totalmente estática y carga la librería Excel mediante CDN, puedes ejecutarla localmente de manera muy sencilla.

### Opción 1: Abrir directamente el archivo
Simplemente haz doble clic en `index.html` para abrirlo en cualquier navegador web moderno.

### Opción 2: Usar un Servidor HTTP Local (Recomendado)
Para evitar problemas con políticas de CORS locales de algunos navegadores al cargar recursos, se recomienda levantar un servidor rápido.

**Con Python:**
Ejecuta la siguiente línea en tu terminal en la raíz del proyecto:
```bash
python3 -m http.server 8000
```
Luego abre `http://localhost:8000` en tu navegador.

**Con Node.js (npm):**
Puedes instalar y ejecutar un servidor local:
```bash
npx serve .
```
Luego abre `http://localhost:3000` en tu navegador.

---

## 🌐 Despliegue en GitHub Pages

Para publicar esta herramienta de forma gratuita usando GitHub Pages:
1. Crea un repositorio en GitHub y sube los archivos de este proyecto (`git push`).
2. Ve a los **Settings** (Ajustes) de tu repositorio.
3. En el menú de la izquierda, selecciona **Pages**.
4. En **Build and deployment**, selecciona la rama `main` y la carpeta `/ (root)`.
5. Haz clic en **Save** (Guardar).
6. Tu aplicación estará disponible en pocos minutos en `https://<tu-usuario>.github.io/<nombre-repositorio>/`.

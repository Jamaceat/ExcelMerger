const XLSX = require('xlsx');
const path = require('path');

// 1. Crear Excel Base
const wbBase = XLSX.utils.book_new();

// Datos para la Hoja 1 de Base
// Dejamos intencionalmente filas vacías arriba para verificar la detección de cabeceras en fila 3 (index 2)
const wsBaseData = [
  [], // Fila 0 vacía
  [], // Fila 1 vacía
  ["ID", "Nombre", "Departamento", "Salario"], // Fila 2 (Cabecera)
  [101, "Ana Gomez", "IT", 50000],
  [102, "Carlos Perez", "Ventas", 45000],
  [103, "Maria Lopez", "Marketing", 48000],
  [104, "Juan Rodriguez", "IT", 52000]
];
const wsBase = XLSX.utils.aoa_to_sheet(wsBaseData);
XLSX.utils.book_append_sheet(wbBase, wsBase, "Empleados");

// Agregar otra hoja vacía o simple para probar
const wsBase2 = XLSX.utils.aoa_to_sheet([["Info"], ["Reporte de Junio 2026"]]);
XLSX.utils.book_append_sheet(wbBase, wsBase2, "Metadatos");

const baseFilePath = path.join(__dirname, 'test_base.xlsx');
XLSX.writeFile(wbBase, baseFilePath);
console.log('Creado:', baseFilePath);

// 2. Crear Excel Merge
const wbMerge = XLSX.utils.book_new();

// Datos para la Hoja 1 de Merge
// Cabecera en fila 1 (index 0)
// Columnas en común: ID, Departamento
// Columnas nuevas: Evaluacion, Email
// Registros con match: 101, 103, 104
// Registros sin match: 105 (nuevo empleado), 106 (nuevo empleado)
const wsMergeData = [
  ["ID", "Evaluacion", "Email", "Departamento"], // Fila 0 (Cabecera)
  [101, "Excelente", "ana.gomez@empresa.com", "IT"],
  [103, "Bueno", "maria.lopez@empresa.com", "Marketing"],
  [104, "Sobresaliente", "juan.rodriguez@empresa.com", "IT"],
  [105, "Bueno", "pedro.sanchez@empresa.com", "Soporte"],
  [106, "Regular", "lucia.diaz@empresa.com", "Ventas"]
];
const wsMerge = XLSX.utils.aoa_to_sheet(wsMergeData);
XLSX.utils.book_append_sheet(wbMerge, wsMerge, "Info_Adicional");

const mergeFilePath = path.join(__dirname, 'test_merge.xlsx');
XLSX.writeFile(wbMerge, mergeFilePath);
console.log('Creado:', mergeFilePath);

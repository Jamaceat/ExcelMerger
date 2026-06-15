const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function test() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Test');

  const row1 = sheet.getRow(1);
  row1.getCell(1).value = 'FECHAPAGO';
  row1.getCell(2).value = 'CUOTA';

  const row2 = sheet.getRow(2);
  row2.getCell(1).value = 45755; // Date
  row2.getCell(1).numFormat = 'd-mmm-yy';

  row2.getCell(2).value = 21000; // Currency/Number
  row2.getCell(2).numFormat = '#,##0';

  const row3 = sheet.getRow(3);
  row3.getCell(1).value = '45755'; // Date as string
  row3.getCell(1).numFormat = 'd-mmm-yy';

  row3.getCell(2).value = '21000'; // Currency as string
  row3.getCell(2).numFormat = '#,##0';

  const outPath = path.join(__dirname, 'test_exceljs_out.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log("Written ExcelJS test to", outPath);
}

test().catch(console.error);

// src/utils/excelExport.js
// Drop-in replacement for xlsx using exceljs (no known vulnerabilities).
import ExcelJS from "exceljs";

/**
 * Export an array of flat objects to an .xlsx file and trigger a browser download.
 *
 * @param {string} filename - e.g. "report.xlsx"
 * @param {Object[]} rows - Array of plain JS objects (one per row). Keys become column headers.
 * @param {string} [sheetName="Sheet1"] - Name of the worksheet tab.
 */
export async function exportToExcelFile(filename, rows, sheetName = "Sheet1") {
  if (!rows || rows.length === 0) {
    console.warn("exportToExcelFile: no rows to export");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Derive columns from the union of all row keys (preserving first-seen order).
  // Using only the first row can drop columns when some rows omit a key
  // (e.g. "Service Availed" missing on records without that field).
  const keys = [];
  const seen = new Set();
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    });
  });
  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(key.length + 4, 14),
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center" };

  // Add data rows
  rows.forEach((row) => worksheet.addRow(row));

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// src/utils/excelExport.js
// Drop-in replacement for xlsx using exceljs (no known vulnerabilities).
import ExcelJS from "exceljs";

// Excel cells can only hold scalars. Multi-select answers (e.g. "Service
// Availed") are stored as arrays and used to come out as "[object Object]" or
// an empty cell, so every value is flattened to a string here.
function toCellValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(toCellValue).filter(Boolean).join("; ");
  if (value instanceof Date) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function addSheet(workbook, sheetName, rows) {
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
    width: Math.min(Math.max(key.length + 4, 14), 60),
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6F4FF" },
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Add data rows
  rows.forEach((row) => {
    const flat = {};
    keys.forEach((k) => {
      flat[k] = toCellValue(row?.[k]);
    });
    worksheet.addRow(flat);
  });

  // Auto-size columns against the longest value (capped so long remarks wrap).
  keys.forEach((key, idx) => {
    const col = worksheet.getColumn(idx + 1);
    let max = key.length;
    rows.forEach((row) => {
      const len = String(toCellValue(row?.[key]) ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 2, 12), 60);
    col.alignment = { vertical: "top", wrapText: true };
  });

  return worksheet;
}

async function download(workbook, filename) {
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
  addSheet(workbook, sheetName, rows);
  await download(workbook, filename);
}

/**
 * Export several sheets into one workbook.
 *
 * @param {string} filename
 * @param {{ name: string, rows: Object[] }[]} sheets - empty sheets are skipped.
 */
export async function exportWorkbook(filename, sheets) {
  const usable = (sheets || []).filter((s) => Array.isArray(s?.rows) && s.rows.length > 0);
  if (usable.length === 0) {
    console.warn("exportWorkbook: no rows to export");
    return;
  }
  const workbook = new ExcelJS.Workbook();
  usable.forEach((s) => addSheet(workbook, s.name || "Sheet", s.rows));
  await download(workbook, filename);
}

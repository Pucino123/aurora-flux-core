/**
 * Basic formula evaluation engine for the Sheet editor.
 * Supports: =SUM, =AVG, =COUNT, =MIN, =MAX, and basic arithmetic (+, -, *, /).
 * Cell references: A1, B2, etc. Ranges: A1:A5.
 */

type CellResolver = (col: number, row: number) => number;

function colLetterToIndex(letter: string): number {
  let idx = 0;
  for (let i = 0; i < letter.length; i++) {
    idx = idx * 26 + (letter.charCodeAt(i) - 64);
  }
  return idx - 1; // 0-indexed
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  return { col: colLetterToIndex(match[1].toUpperCase()), row: parseInt(match[2], 10) - 1 };
}

function expandRange(rangeStr: string): Array<{ col: number; row: number }> {
  const [startStr, endStr] = rangeStr.split(":");
  const start = parseCellRef(startStr.trim());
  const end = parseCellRef(endStr.trim());
  if (!start || !end) return [];

  const cells: Array<{ col: number; row: number }> = [];
  for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
    for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
      cells.push({ col: c, row: r });
    }
  }
  return cells;
}

function resolveValues(argsStr: string, resolve: CellResolver): number[] {
  const parts = argsStr.split(",").map(s => s.trim());
  const values: number[] = [];
  for (const part of parts) {
    if (part.includes(":")) {
      const cells = expandRange(part);
      for (const cell of cells) {
        values.push(resolve(cell.col, cell.row));
      }
    } else {
      const ref = parseCellRef(part);
      if (ref) {
        values.push(resolve(ref.col, ref.row));
      } else {
        const n = parseFloat(part);
        if (!isNaN(n)) values.push(n);
      }
    }
  }
  return values;
}

function evaluateFunction(fn: string, argsStr: string, resolve: CellResolver): number {
  const values = resolveValues(argsStr, resolve);
  switch (fn) {
    case "SUM": return values.reduce((a, b) => a + b, 0);
    case "AVG":
    case "AVERAGE": return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case "COUNT": return values.filter(v => !isNaN(v)).length;
    case "MIN": return values.length ? Math.min(...values) : 0;
    case "MAX": return values.length ? Math.max(...values) : 0;
    default: return NaN;
  }
}

/** Replace cell references (e.g., A1) with their numeric values in an expression */
function substituteCellRefs(expr: string, resolve: CellResolver): string {
  return expr.replace(/([A-Z]+\d+)/gi, (match) => {
    const ref = parseCellRef(match);
    if (ref) return String(resolve(ref.col, ref.row));
    return match;
  });
}

/**
 * Evaluate a formula string. Returns the computed number or NaN on error.
 * @param formula The raw cell value (e.g., "=SUM(A1:A3)" or "=A1+B1*2")
 * @param resolve Function to get the numeric value of a cell by (col, row)
 */
export function evaluateFormula(formula: string, resolve: CellResolver): number | string {
  if (!formula.startsWith("=")) return formula;

  const expr = formula.slice(1).trim();

  // Check for function calls like SUM(...)
  const fnMatch = expr.match(/^([A-Z]+)\((.+)\)$/i);
  if (fnMatch) {
    const result = evaluateFunction(fnMatch[1].toUpperCase(), fnMatch[2], resolve);
    return isNaN(result) ? "#ERROR" : result;
  }

  // Basic arithmetic with cell references
  try {
    const substituted = substituteCellRefs(expr, resolve);
    // Only allow safe arithmetic characters
    if (/^[\d\s+\-*/().]+$/.test(substituted)) {
      const result = new Function(`return (${substituted})`)();
      return typeof result === "number" && !isNaN(result) ? result : "#ERROR";
    }
    return "#ERROR";
  } catch {
    return "#ERROR";
  }
}

/** Get the display value for a cell (computed if formula, raw otherwise) */
export function getCellDisplayValue(rawValue: string, resolve: CellResolver): string {
  if (!rawValue.startsWith("=")) return rawValue;
  const result = evaluateFormula(rawValue, resolve);
  return String(result);
}

/** Convert column index (0-based) to letter (A, B, ..., Z, AA, ...) */
export function colIndexToLetter(idx: number): string {
  let result = "";
  let n = idx;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

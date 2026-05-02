import * as XLSX from "xlsx";
import { measureTextWidth } from "./measureText";

export interface ExcelFormatOptions {
  isCompact: boolean;
  excelShowKey: boolean;
  excelAutoWrap: boolean;
  font: string;
  fontSize: number;
}

export function formatExcelRow(row: any, options: ExcelFormatOptions): string {
  const { isCompact, excelShowKey, excelAutoWrap, font, fontSize } = options;
  const entries = Object.entries(row).filter(([k]) => k !== "Loop");
  
  if (!isCompact) {
    return entries.map(([k, v]) => excelShowKey ? `${k}: ${v}` : `${v}`).join("\n");
  }

  const maxW = 384; // Fixed printer width
  let lines: string[] = [];
  let currentLine = "";

  entries.forEach(([k, v]) => {
    const cleanV = String(v).replace(/\r?\n/g, " ");
    const segment = excelShowKey ? `${k}: ${cleanV}` : cleanV;

    if (!excelAutoWrap) {
      currentLine = currentLine ? `${currentLine}  ${segment}` : segment;
      return;
    }

    // If excelShowKey is ON and the combined 'Key: Value' is too long on its own, try to split them
    let partsToProcess = [segment];
    if (excelShowKey && !currentLine) {
       const singleWidth = measureTextWidth(segment, font, fontSize) * 1.05;
       if (singleWidth > maxW - 15) {
          partsToProcess = [`${k}:`, cleanV];
       }
    }

    partsToProcess.forEach(part => {
      const potentialLine = currentLine ? `${currentLine}  ${part}` : part;
      // Multiply width by a small factor to be conservative
      const width = measureTextWidth(potentialLine, font, fontSize) * 1.05;

      // Wrap if it exceeds the printable area (with a 15px safety margin)
      if (width <= maxW - 15) {
        currentLine = potentialLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = part;
      }
    });
  });
  
  if (currentLine) lines.push(currentLine);
  return excelAutoWrap ? lines.join("\n") : currentLine;
}

export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const expandedData: any[] = [];
        json.forEach(row => {
          const loopCount = parseInt(row["Loop"]) || 1;
          
          // Split columns by semicolon
          const columnSegments: Record<string, string[]> = {};
          let maxSegments = 1;
          
          Object.entries(row).forEach(([k, v]) => {
            if (k === "Loop") return;
            const rawSegments = String(v).split(";");
            const expandedSegments: string[] = [];
            rawSegments.forEach(seg => {
              const match = seg.match(/^(.*?)\s*\*\s*(\d+)\s*$/);
              if (match) {
                const text = match[1];
                const count = parseInt(match[2], 10);
                for (let i = 0; i < count; i++) {
                  expandedSegments.push(text);
                }
              } else {
                expandedSegments.push(seg);
              }
            });
            columnSegments[k] = expandedSegments;
            if (expandedSegments.length > maxSegments) maxSegments = expandedSegments.length;
          });

          // Loop through the repetitions
          for (let i = 0; i < loopCount; i++) {
            // Then loop through the semicolon segments
            for (let s = 0; s < maxSegments; s++) {
              const newRow: any = { ...row };
              Object.keys(columnSegments).forEach(k => {
                const segs = columnSegments[k];
                // If there are multiple segments, use the current one. 
                // If not, keep the original value (segs[0]).
                newRow[k] = segs[s] !== undefined ? segs[s] : segs[0];
              });
              expandedData.push(newRow);
            }
          }
        });
        resolve(expandedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

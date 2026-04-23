import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useContext,
  type ChangeEventHandler,
} from "react";
import * as XLSX from "xlsx";

import { PrinterContext } from "./context.tsx";

type AlignmentType = "left" | "center" | "right";

function LabelSvg({
  text,
  onChange,
  onOverflow,
  onScaleChange,
  align,
  font,
  fontSize,
  direction,
  autoShrink,
  autoExpand,
}: {
  text: string;
  onChange: (svg: string, width: number, height: number) => void;
  onOverflow: (overflowing: boolean) => void;
  onScaleChange?: (scale: number) => void;
  align: AlignmentType;
  font: string;
  fontSize: number;
  direction: "horizontal" | "vertical";
  autoShrink: boolean;
  autoExpand: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const lines = text.split("\n");
  const isVertical = direction === "vertical";
  const lineSpacing = 1.2;
  const step = fontSize * lineSpacing;

  useLayoutEffect(() => {
    if (!ref.current || !gRef.current) return;
    
    const bbox = gRef.current.getBBox();
    const padding = 2;
    const realW = bbox.width + padding * 2;
    const realH = bbox.height + padding * 2;

    const maxW = 384;
    let scale = 1;
    let finalW = Math.max(1, Math.ceil(realW));
    let finalH = Math.max(1, Math.ceil(realH));

    const isOverflowing = realW > maxW;
    onOverflow(isOverflowing);

    if (autoShrink && isOverflowing) {
      scale = maxW / realW;
      finalW = maxW;
      finalH = Math.ceil(realH * scale);
      
      if (onScaleChange && scale < 0.99) {
        setTimeout(() => onScaleChange(scale), 0);
      }
    } else if (autoExpand && !isOverflowing && realW > 0) {
      scale = maxW / realW;
      if (onScaleChange && scale > 1.01) {
        setTimeout(() => onScaleChange(scale), 0);
      }
    }

    ref.current.setAttribute("width", finalW.toString());
    ref.current.setAttribute("height", finalH.toString());
    
    if (autoShrink && isOverflowing) {
      ref.current.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${realW} ${realH}`);
    } else {
      ref.current.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${finalW} ${finalH}`);
    }

    if (size.w !== finalW || size.h !== finalH) {
      setSize({ w: finalW, h: finalH });
    }

    onChange(ref.current.outerHTML, finalW, finalH);
  }, [text, align, font, fontSize, direction, autoShrink, autoExpand]);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, opacity: 0, pointerEvents: "none" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        ref={ref}
      >
        <g ref={gRef}>
          {lines.map((line, i) => {

            // Text Positioning
            let x = 0;
            let y = 0;
            let anchor = "start";

            if (isVertical) {
              x = -i * step;
              anchor = "middle";
              if (align === "left") y = 0;
              else if (align === "center") y = 500; // Large arbitrary middle
              else y = 1000;
            } else {
              y = (i + 1) * step - (step - fontSize) / 2;
              if (align === "left") { x = 0; anchor = "start"; }
              else if (align === "center") { x = 500; anchor = "middle"; }
              else { x = 1000; anchor = "end"; }
            }

            return (
              <text
                key={i}
                x={x}
                y={y}
                style={{
                  textAnchor: anchor as any,
                  fontFamily: font,
                  fontSize: `${fontSize}px`,
                  writingMode: isVertical ? "vertical-rl" : "horizontal-tb",
                }}
              >
                {line}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function LabelCanvas({
  text,
  align,
  font,
  fontSize,
  length,
  direction,
  autoShrink,
  autoExpand,
  onOverflow,
  onScaleChange,
  onChangeBitmap,
}: {
  text: string;
  align: AlignmentType;
  font: string;
  fontSize: number;
  length: number | null;
  direction: "horizontal" | "vertical";
  autoShrink: boolean;
  autoExpand: boolean;
  onOverflow: (overflowing: boolean) => void;
  onScaleChange?: (scale: number) => void;
  onChangeBitmap: (x: ImageData) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  const [svgData, setSvgData] = useState<string>("");
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  const onSvgChange = (s: string, w: number, h: number) => {
    setSvgData(s);
    setWidth(w);
    setHeight(h);
  };

  useEffect(() => {
    if (!svgData || !width || !height || !ref.current) return;

    let isCurrent = true;
    const image = new Image();
    const context = ref.current.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No context from canvas");

    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    image.onload = () => {
      if (!isCurrent || !ref.current) {
        URL.revokeObjectURL(url);
        return;
      }

      context.clearRect(0, 0, ref.current.width, ref.current.height);
      const canvasWidth = ref.current.width;
      const canvasHeight = ref.current.height;

      let xOffset = 0;
      if (align === "center") {
        xOffset = (canvasWidth - width) / 2;
      } else if (align === "right") {
        xOffset = canvasWidth - width;
      }

      let yOffset = 0;
      if (length && height < canvasHeight) {
        yOffset = (canvasHeight - height) / 2;
      }

      context.drawImage(image, xOffset, yOffset, width, height);
      onChangeBitmap(context.getImageData(0, 0, canvasWidth, canvasHeight));
      URL.revokeObjectURL(url);
    };

    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;

    return () => {
      isCurrent = false;
      URL.revokeObjectURL(url);
    };
  }, [svgData, length, align, width, height]);

  return (
    <>
      <LabelSvg
        text={text}
        onChange={onSvgChange}
        onOverflow={onOverflow}
        onScaleChange={onScaleChange}
        align={align}
        font={font}
        fontSize={fontSize}
        direction={direction}
        autoShrink={autoShrink}
        autoExpand={autoExpand}
      />
      <div className="canvas-wrapper">
        <div className="canvas-container">
          <canvas
            ref={ref}
            width={384}
            height={length || (height > 0 ? height : 1)}
            style={{ margin: 0, backgroundColor: "white", display: "block" }}
          />
        </div>
      </div>
    </>
  );
}

function PreviewLabel({
  text,
  align,
  font,
  fontSize,
  length,
  direction,
  autoShrink,
  autoExpand,
}: {
  text: string;
  align: AlignmentType;
  font: string;
  fontSize: number;
  length: number | null;
  direction: "horizontal" | "vertical";
  autoShrink: boolean;
  autoExpand: boolean;
}) {
  const [svgData, setSvgData] = useState<string>("");
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  const onSvgChange = (s: string, w: number, h: number) => {
    setSvgData(s);
    setWidth(w);
    setHeight(h);
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '384px', 
      minHeight: length || (height > 0 ? height : 30),
      background: 'white', 
      overflow: 'hidden',
      display: 'flex',
      alignItems: length ? 'center' : 'flex-start',
      justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
    }}>
      <LabelSvg
        text={text}
        onChange={onSvgChange}
        onOverflow={() => {}}
        align={align}
        font={font}
        fontSize={fontSize}
        direction={direction}
        autoShrink={autoShrink}
        autoExpand={autoExpand}
      />
      {svgData && (
        <div 
          dangerouslySetInnerHTML={{ __html: svgData }} 
          style={{ width: width, height: height, display: 'block' }}
        />
      )}
    </div>
  );
}


function TextAlignButton({
  val,
  text,
  align,
  onChangeHandler,
}: {
  val: AlignmentType;
  text: string;
  align: AlignmentType;
  onChangeHandler: ChangeEventHandler<HTMLInputElement>;
}) {
  const active = align === val;
  return (
    <label 
      htmlFor={val}
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '6px 0',
        cursor: 'pointer',
        fontSize: '0.85em',
        fontWeight: active ? 600 : 400,
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        background: active ? '#646cff' : 'transparent',
        borderRadius: '6px',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <input
        type="radio"
        name="align"
        value={val}
        id={val}
        checked={active}
        onChange={onChangeHandler}
        style={{ display: 'none' }}
      />
      {text}
    </label>
  );
}

function TextAlign({
  align,
  setAlign,
}: {
  align: AlignmentType;
  setAlign: (x: AlignmentType) => void;
}) {
  const { t } = useContext(PrinterContext);
  const onChangeHandler: ChangeEventHandler<HTMLInputElement> = (e) => {
    setAlign(e.target.value as AlignmentType);
  };

  return (
    <div style={{
      display: 'flex',
      background: 'rgba(0,0,0,0.3)',
      padding: '4px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.1)',
      flex: 1,
      maxWidth: '220px'
    }}>
      <TextAlignButton val="left" text={t('alignLeft')} align={align} onChangeHandler={onChangeHandler} />
      <TextAlignButton val="center" text={t('alignCenter')} align={align} onChangeHandler={onChangeHandler} />
      <TextAlignButton val="right" text={t('alignRight')} align={align} onChangeHandler={onChangeHandler} />
    </div>
  );
}

function LengthSelect({
  length,
  setLength,
}: {
  length: number | null;
  setLength: (x: number | null) => void;
}) {
  const { t } = useContext(PrinterContext);
  return (
    <select
      value={length || "auto"}
      onChange={(e) => setLength(parseInt(e.target.value) || null)}
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        fontSize: '0.9em',
        cursor: 'pointer',
        outline: 'none',
        flex: 1,
        maxWidth: '220px'
      }}
    >
      <option value="auto">{t('auto')}</option>
      <option value="230">28mm</option>
    </select>
  );
}

function FontSelect({
  font,
  setFont,
  advanced,
}: {
  font: string;
  setFont: (x: string) => void;
  advanced: boolean;
}) {
  const fonts = advanced
    ? [
        "Yu Mincho", "Yu Gothic", "Meiryo", "MS Mincho", "MS Gothic",
        "Arial", "Times New Roman", "Courier New", "Georgia",
        "Verdana", "Trebuchet MS", "Impact",
      ]
    : ["Yu Mincho", "Yu Gothic", "Meiryo", "Arial", "Times New Roman"];

  return (
    <select 
      value={font} 
      onChange={(e) => setFont(e.target.value)}
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        fontSize: '0.9em',
        cursor: 'pointer',
        outline: 'none',
        flex: 1,
        maxWidth: '220px'
      }}
    >
      {fonts.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
}

function FontSizeInput({
  fontSize,
  setFontSize,
  advanced,
}: {
  fontSize: number;
  setFontSize: (x: number) => void;
  advanced: boolean;
}) {
  const baseSizes = advanced
    ? [12, 16, 20, 24, 32, 48, 64, 80, 96, 128, 160, 200]
    : [24, 32, 48, 64, 80, 128];

  const sizes = baseSizes.includes(fontSize) 
    ? baseSizes 
    : [...baseSizes, fontSize].sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '220px', justifyContent: 'flex-end' }}>
      <select 
        value={fontSize} 
        onChange={(e) => setFontSize(parseInt(e.target.value))}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: '0.9em',
          cursor: 'pointer',
          outline: 'none',
          flex: 1
        }}
      >
        {sizes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.5)', width: '20px', textAlign: 'right' }}>px</span>
    </div>
  );
}

export function LabelMaker() {
  const [text, setText] = useState(() => localStorage.getItem("label_text") || "Hello");
  const [align, setAlign] = useState<"left" | "center" | "right">(() => (localStorage.getItem("label_align") as any) || "left");
  const [bitmap, setBitmap] = useState<ImageData>();
  const [font, setFont] = useState<string>(() => localStorage.getItem("label_font") || "sans-serif");
  const [fontSize, setFontSize] = useState<number>(() => parseInt(localStorage.getItem("label_fontSize") || "24", 10));
  const [length, setLength] = useState<number | null>(() => {
    const val = localStorage.getItem("label_length");
    return val ? parseInt(val, 10) : null;
  });
  const [direction, setDirection] = useState<"horizontal" | "vertical">(() => (localStorage.getItem("label_direction") as any) || "horizontal");
  const [showDetailed, setShowDetailed] = useState(false);
  const [advancedFontSize, setAdvancedFontSize] = useState(() => localStorage.getItem("label_advancedFontSize") === "true");
  const [advancedFonts, setAdvancedFonts] = useState(() => localStorage.getItem("label_advancedFonts") === "true");
  
  const [autoShrink, setAutoShrink] = useState(() => localStorage.getItem("label_autoShrink") === "true");
  const [autoExpand, setAutoExpand] = useState(() => localStorage.getItem("label_autoExpand") === "true");
  const [isOverflowing, setIsOverflowing] = useState(false);

  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  if (!measureCtxRef.current) {
    const canvas = document.createElement("canvas");
    measureCtxRef.current = canvas.getContext("2d", { willReadFrequently: true });
  }

  const measureTextWidth = (text: string, fontName: string, size: number) => {
    let est = 0;
    for (let i = 0; i < text.length; i++) {
      // Full-width (CJK) roughly 1em, ASCII roughly 0.6em
      est += text.charCodeAt(i) > 255 ? size : size * 0.6;
    }

    let width = 0;
    const ctx = measureCtxRef.current;
    if (ctx) {
      const cleanFont = fontName.replace(/["']/g, "");
      const isGeneric = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(cleanFont.toLowerCase());
      const safeFont = isGeneric ? cleanFont : `"${cleanFont}"`;
      ctx.font = `${size}px ${safeFont}, "Yu Gothic", "Meiryo", sans-serif`;
      width = ctx.measureText(text).width;
    }
    
    // If canvas returned 0 or severely underestimated (e.g. invalid font string caused fallback to 10px),
    // enforce the estimate as a lower bound.
    if (!width || width < est * 0.5) {
      width = est;
    }

    return width;
  };

  const formatExcelRow = (row: any, isCompact: boolean) => {
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
  };

  const [excelMode, setExcelMode] = useState(() => localStorage.getItem("label_excelMode") === "true");
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelDelay, setExcelDelay] = useState(() => parseFloat(localStorage.getItem("label_excelDelay") || "0"));
  const [excelSpacing, setExcelSpacing] = useState(() => parseInt(localStorage.getItem("label_excelSpacing") || "0", 10));
  const [excelCompact, setExcelCompact] = useState(() => localStorage.getItem("label_excelCompact") === "true");
  const [excelShowKey, setExcelShowKey] = useState(() => localStorage.getItem("label_excelShowKey") !== "false");
  const [excelAutoWrap, setExcelAutoWrap] = useState(() => localStorage.getItem("label_excelAutoWrap") !== "false");
  const [itemOverflowWarning, setItemOverflowWarning] = useState(false);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [batchIndex, setBatchIndex] = useState(-1);
  const [waitingForRender, setWaitingForRender] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("label_text", text);
    localStorage.setItem("label_align", align);
    localStorage.setItem("label_font", font);
    localStorage.setItem("label_fontSize", fontSize.toString());
    localStorage.setItem("label_length", length?.toString() || "");
    localStorage.setItem("label_direction", direction);
    localStorage.setItem("label_autoShrink", autoShrink.toString());
    localStorage.setItem("label_autoExpand", autoExpand.toString());
    localStorage.setItem("label_advancedFontSize", advancedFontSize.toString());
    localStorage.setItem("label_advancedFonts", advancedFonts.toString());
    localStorage.setItem("label_excelMode", excelMode.toString());
    localStorage.setItem("label_excelDelay", excelDelay.toString());
    localStorage.setItem("label_excelSpacing", excelSpacing.toString());
    localStorage.setItem("label_excelCompact", excelCompact.toString());
    localStorage.setItem("label_excelShowKey", excelShowKey.toString());
    localStorage.setItem("label_excelAutoWrap", excelAutoWrap.toString());
  }, [text, align, font, fontSize, length, direction, autoShrink, autoExpand, advancedFontSize, advancedFonts, excelMode, excelDelay, excelSpacing, excelCompact, excelShowKey, excelAutoWrap]);

  useEffect(() => {
    if (!excelMode || !excelData.length) {
      setItemOverflowWarning(false);
      return;
    }
    let overflow = false;
    for (const row of excelData.slice(0, 50)) {
      const entries = Object.entries(row).filter(([k]) => k !== "Loop");
      for (const [k, v] of entries) {
        const cleanV = String(v).replace(/\r?\n/g, " ");
        const segment = excelShowKey ? `${k}: ${cleanV}` : cleanV;
        const width = measureTextWidth(segment, font, fontSize) * 1.05;
        if (width > 384 - 10) {
          overflow = true;
          break;
        }
      }
      if (overflow) break;
    }
    setItemOverflowWarning(overflow);
  }, [excelData, excelMode, excelShowKey, font, fontSize]);

  const { 
    printer, 
    printerStatus, 
    browserKeepAlive, 
    setBrowserKeepAlive, 
    printerKeepAlive, 
    setPrinterKeepAlive,
    t
  } = useContext(PrinterContext);

  const canPrint = !!bitmap && printerStatus.state === "connected";

  const print = () => {
    if (canPrint && printer) printer.print(bitmap);
  };

  const startBatchPrint = () => {
    if (!excelData.length || !printer) return;
    setIsBatchPrinting(true);
    setBatchIndex(0);
    setWaitingForRender(true);
    
    // Set text for the first row
    const firstRow = excelData[0];
    setText(formatExcelRow(firstRow, excelCompact));
  };

  useEffect(() => {
    if (!isBatchPrinting || !waitingForRender || !bitmap || !printer) return;
    
    const doPrint = async () => {
      // Print the current label (which is now guaranteed to be rendered)
      await printer.print(bitmap);
      setWaitingForRender(false);
      
      // Physical spacing (feed)
      if (excelSpacing > 0) {
        await printer.feed(excelSpacing);
      }

      // Delay in seconds
      if (excelDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, excelDelay * 1000));
      }

      const nextIndex = batchIndex + 1;
      if (nextIndex < excelData.length) {
        setBatchIndex(nextIndex);
        setWaitingForRender(true);
        const nextRow = excelData[nextIndex];
        setText(formatExcelRow(nextRow, excelCompact));
      } else {
        setIsBatchPrinting(false);
        setBatchIndex(-1);
      }
    };

    doPrint();
  }, [bitmap, isBatchPrinting, waitingForRender, batchIndex, excelData, printer, excelDelay, excelSpacing, excelCompact, font, fontSize, excelShowKey, excelAutoWrap]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
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
          const segments = String(v).split(";");
          columnSegments[k] = segments;
          if (segments.length > maxSegments) maxSegments = segments.length;
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
      setExcelData(expandedData);
    };
    reader.readAsArrayBuffer(file);
    // Reset input value to allow re-selecting the same file
    e.target.value = "";
  };

  const handleScaleChange = (scale: number) => {
    if (autoShrink && scale < 0.99) {
      const newSize = Math.max(12, Math.floor(fontSize * scale));
      if (newSize !== fontSize) {
        setFontSize(newSize);
      }
    } else if (autoExpand && scale > 1.01) {
      const newSize = Math.min(200, Math.ceil(fontSize * scale));
      if (newSize !== fontSize) {
        setFontSize(newSize);
      }
    }
  };

  const wakeLockSupported = 'wakeLock' in navigator;

  return (
    <div className="label-maker">
      <div style={{ position: 'relative' }}>
        <LabelCanvas
          text={text}
          align={align}
          font={font}
          fontSize={fontSize}
          length={length}
          direction={direction}
          autoShrink={autoShrink}
          autoExpand={autoExpand}
          onOverflow={setIsOverflowing}
          onScaleChange={handleScaleChange}
          onChangeBitmap={(x: ImageData) => setBitmap(x)}
        />
        {isOverflowing && !autoShrink && (
          <div style={{
            position: 'absolute',
            top: -25,
            left: 0,
            width: '100%',
            textAlign: 'center',
            color: '#ff4d4d',
            fontSize: '0.8em',
            fontWeight: 'bold',
            animation: 'pulse 1.5s infinite'
          }}>
            ⚠️ {t('overflowWarning')}
          </div>
        )}
      </div>

      <div className="label-maker-controls" style={{ 
        border: isOverflowing && !autoShrink ? '2px solid #ff4d4d' : '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.03)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02), 0 4px 12px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        margin: '15px 0'
      }}>
        
        {/* Layout Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('direction')}
            </span>
            <TextAlign align={align} setAlign={setAlign} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('length')}
            </span>
            <LengthSelect length={length} setLength={setLength} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {/* Font Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('fontFamily')}
            </span>
            <FontSelect font={font} setFont={setFont} advanced={advancedFonts} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('fontSize')}
            </span>
            <FontSizeInput fontSize={fontSize} setFontSize={setFontSize} advanced={advancedFontSize} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {/* Toggles Section */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ 
            flex: 1,
            cursor: "pointer", 
            display: "flex", 
            justifyContent: "center",
            alignItems: "center", 
            gap: "8px", 
            fontSize: '0.8em',
            background: autoShrink ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            padding: '8px',
            borderRadius: '10px',
            border: autoShrink ? '1px solid #646cff' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s ease',
            color: autoShrink ? '#fff' : 'rgba(255,255,255,0.6)'
          }}>
            <input 
              type="checkbox" 
              checked={autoShrink} 
              onChange={(e) => setAutoShrink(e.target.checked)} 
              style={{ cursor: 'pointer', margin: 0 }}
            />
            {t('autoShrink')}
          </label>

          <label style={{ 
            flex: 1,
            cursor: "pointer", 
            display: "flex", 
            justifyContent: "center",
            alignItems: "center", 
            gap: "8px", 
            fontSize: '0.8em',
            background: autoExpand ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            padding: '8px',
            borderRadius: '10px',
            border: autoExpand ? '1px solid #646cff' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s ease',
            color: autoExpand ? '#fff' : 'rgba(255,255,255,0.6)'
          }}>
            <input 
              type="checkbox" 
              checked={autoExpand} 
              onChange={(e) => setAutoExpand(e.target.checked)} 
              style={{ cursor: 'pointer', margin: 0 }}
            />
            {t('autoExpand')}
          </label>
        </div>
      </div>
      <div className="text-input-group">
          <textarea
            value={text}
            onChange={(x) => setText(x.target.value)}
            rows={4}
            placeholder={t('typeTextHere')}
          />
        </div>
        <div className="actions" style={{ textAlign: 'center', marginTop: '10px' }}>
          <button 
            className="print-button" 
            onClick={excelMode ? startBatchPrint : print} 
            disabled={!canPrint || (excelMode && !excelData.length)}
          >
            {printerStatus.state === "printing" || isBatchPrinting 
              ? (isBatchPrinting ? `${t('printingStatus')} (${batchIndex + 1}/${excelData.length})` : t('printingStatus')) 
              : (excelMode ? t('excelPrint') : t('printLabel'))}
          </button>
          
          <div style={{ marginTop: '15px' }}>
            <button 
              className="detailed-options-button" 
              onClick={() => setShowDetailed(!showDetailed)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.85em',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {showDetailed ? t('hideDetailedOptions') : t('detailedOptions')}
            </button>
            
            {showDetailed && (
              <div style={{ 
                marginTop: '10px', 
                padding: '15px', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '12px',
                textAlign: 'left',
                fontSize: '0.9em'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ 
                    cursor: wakeLockSupported ? "pointer" : "default", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    opacity: wakeLockSupported ? 1 : 0.5
                  }}>
                    <input 
                      type="checkbox" 
                      checked={browserKeepAlive} 
                      onChange={(e) => setBrowserKeepAlive(e.target.checked)} 
                      disabled={!wakeLockSupported}
                    />
                    {t('browserKeepAlive')}
                  </label>
                  {!wakeLockSupported && (
                    <div style={{ fontSize: '0.75em', color: '#ffa500', marginLeft: '24px', marginTop: '4px' }}>
                      ℹ️ {t('wakeLockNotSupported')}
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={printerKeepAlive} 
                      onChange={(e) => setPrinterKeepAlive(e.target.checked)} 
                    />
                    {t('printerKeepAlive')}
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={advancedFontSize} 
                      onChange={(e) => setAdvancedFontSize(e.target.checked)} 
                    />
                    {t('advancedFontSize')}
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={advancedFonts} 
                      onChange={(e) => setAdvancedFonts(e.target.checked)} 
                    />
                    {t('advancedFonts')}
                  </label>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{t('direction')}:</span>
                  <div className="orientation-toggle" style={{ padding: '3px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', gap: '4px' }}>
                    <label style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', background: direction === 'horizontal' ? '#646cff' : 'transparent', fontSize: '0.85em' }}>
                      <input type="radio" name="direction" value="horizontal" checked={direction === 'horizontal'} onChange={() => setDirection('horizontal')} style={{ display: 'none' }} />
                      {t('horizontal')}
                    </label>
                    <label style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', background: direction === 'vertical' ? '#646cff' : 'transparent', fontSize: '0.85em' }}>
                      <input type="radio" name="direction" value="vertical" checked={direction === 'vertical'} onChange={() => setDirection('vertical')} style={{ display: 'none' }} />
                      {t('vertical')}
                    </label>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={excelMode} 
                      onChange={(e) => setExcelMode(e.target.checked)} 
                    />
                    {t('excelMode')}
                  </label>
                  {excelMode && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('fontFamily')}:</span>
                        <FontSelect font={font} setFont={setFont} advanced={advancedFonts} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('fontSize')}:</span>
                        <FontSizeInput fontSize={fontSize} setFontSize={setFontSize} advanced={advancedFontSize} />
                      </div>
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('excelFile')}:</span>
                        <input 
                          type="file" 
                          accept=".xlsx, .xls" 
                          onChange={handleExcelUpload} 
                          style={{ fontSize: '0.8em', width: '150px' }}
                        />
                      </div>
                      {excelData.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.8em', color: '#4caf50' }}>
                            ✅ {t('excelTotal')}{excelData.length}
                          </div>
                          
                          {itemOverflowWarning && (
                            <div style={{ 
                              fontSize: '0.8em', 
                              color: '#ff4d4d', 
                              padding: '8px', 
                              background: 'rgba(255, 77, 77, 0.1)', 
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 77, 77, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              ⚠️ {t('itemOverflowWarning')}
                            </div>
                          )}

                          <div style={{ 
                            marginTop: '10px', 
                            maxHeight: '150px', 
                            overflowY: 'auto', 
                            background: 'rgba(0,0,0,0.3)', 
                            borderRadius: '6px', 
                            padding: '8px',
                            fontSize: '0.75em',
                            lineHeight: '1.4',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {t('preview')}
                            </div>
                            {excelData.slice(0, 20).map((row, i) => (
                              <div key={i} style={{ 
                                marginBottom: '15px', 
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                width: '384px', 
                                boxSizing: 'content-box', 
                                overflow: 'hidden',
                              }}>
                                <div style={{ 
                                  color: '#646cff', 
                                  fontWeight: 'bold', 
                                  fontSize: '10px', 
                                  fontFamily: 'sans-serif', 
                                  padding: '4px 8px',
                                  background: 'rgba(0,0,0,0.2)',
                                  marginBottom: '0',
                                  opacity: 0.7
                                }}>
                                  #{i+1}
                                </div>
                                <PreviewLabel 
                                  text={formatExcelRow(row, excelCompact)}
                                  align={align}
                                  font={font}
                                  fontSize={fontSize}
                                  length={length}
                                  direction={direction}
                                  autoShrink={autoShrink}
                                  autoExpand={autoExpand}
                                />
                              </div>
                            ))}
                            {excelData.length > 20 && (
                              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '5px' }}>
                                + {excelData.length - 20} more rows...
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('excelDelay')}:</span>
                        <input 
                          type="number" 
                          step="0.1"
                          value={excelDelay} 
                          onChange={(e) => setExcelDelay(parseFloat(e.target.value) || 0)} 
                          style={{ width: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '2px 5px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('excelSpacing')}:</span>
                        <input 
                          type="number" 
                          value={excelSpacing} 
                          onChange={(e) => setExcelSpacing(parseInt(e.target.value) || 0)} 
                          style={{ width: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '2px 5px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
                          <input 
                            type="checkbox" 
                            checked={excelShowKey} 
                            onChange={(e) => setExcelShowKey(e.target.checked)} 
                          />
                          {t('excelShowKey')}
                        </label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
                          <input 
                            type="checkbox" 
                            checked={excelCompact} 
                            onChange={(e) => setExcelCompact(e.target.checked)} 
                          />
                          {t('excelCompact')}
                        </label>
                      </div>
                      {excelCompact && (
                        <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
                            <input 
                              type="checkbox" 
                              checked={excelAutoWrap} 
                              onChange={(e) => setExcelAutoWrap(e.target.checked)} 
                            />
                            {t('excelAutoWrap')}
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

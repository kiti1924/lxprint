import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useContext,
  type ChangeEventHandler,
} from "react";

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
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '0.85em',
        fontWeight: active ? 600 : 400,
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        background: active ? '#646cff' : 'transparent',
        borderRadius: '8px',
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
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.1)',
      width: '240px'
    }}>
      <TextAlignButton
        val="left"
        text={t('alignLeft')}
        align={align}
        onChangeHandler={onChangeHandler}
      />
      <TextAlignButton
        val="center"
        text={t('alignCenter')}
        align={align}
        onChangeHandler={onChangeHandler}
      />
      <TextAlignButton
        val="right"
        text={t('alignRight')}
        align={align}
        onChangeHandler={onChangeHandler}
      />
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
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        fontSize: '0.9em',
        cursor: 'pointer',
        outline: 'none',
        width: '120px'
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
        "Yu Mincho",
        "Yu Gothic",
        "Meiryo",
        "MS Mincho",
        "MS Gothic",
        "Arial",
        "Times New Roman",
        "Courier New",
        "Georgia",
        "Verdana",
        "Trebuchet MS",
        "Impact",
      ]
    : ["Yu Mincho", "Yu Gothic", "Meiryo", "Arial", "Times New Roman"];

  return (
    <select 
      value={font} 
      onChange={(e) => setFont(e.target.value)}
      style={{
        padding: '8px 12px',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        fontSize: '0.9em',
        cursor: 'pointer',
        outline: 'none',
        minWidth: '160px'
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

  // Always include the current fontSize if it's not in the list
  const sizes = baseSizes.includes(fontSize) 
    ? baseSizes 
    : [...baseSizes, fontSize].sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <select 
        value={fontSize} 
        onChange={(e) => setFontSize(parseInt(e.target.value))}
        style={{
          padding: '8px 12px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: '0.9em',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {sizes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.5)' }}>px</span>
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
  }, [text, align, font, fontSize, length, direction, autoShrink, autoExpand, advancedFontSize, advancedFonts]);

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
        border: isOverflowing && !autoShrink ? '2px solid #ff4d4d' : 'none',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '20px 32px',
        padding: '12px 20px',
        background: 'rgba(255, 255, 255, 0.03)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        margin: '10px 0'
      }}>
        {/* Layout Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('direction')}
          </span>
          <TextAlign align={align} setAlign={setAlign} />
        </div>

        {/* Length Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('length')}
          </span>
          <LengthSelect length={length} setLength={setLength} />
        </div>

        {/* Font Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 auto' }}>
          <span style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('fontFamily')} / {t('fontSize')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <FontSelect font={font} setFont={setFont} advanced={advancedFonts} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <FontSizeInput fontSize={fontSize} setFontSize={setFontSize} advanced={advancedFontSize} />
              
              {/* Auto Shrink Toggle */}
              <label style={{ 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                gap: "6px", 
                fontSize: '0.8em',
                background: autoShrink ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: autoShrink ? '1px solid #646cff' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
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

              {/* Auto Expand Toggle */}
              <label style={{ 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                gap: "6px", 
                fontSize: '0.8em',
                background: autoExpand ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: autoExpand ? '1px solid #646cff' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
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
          <button className="print-button" onClick={print} disabled={!canPrint}>
            {printerStatus.state === "printing" ? t('printingStatus') : t('printLabel')}
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
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

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
  align,
  font,
  fontSize,
  direction,
}: {
  text: string;
  onChange: (svg: string, width: number, height: number) => void;
  align: AlignmentType;
  font: string;
  fontSize: number;
  direction: "horizontal" | "vertical";
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
    
    // Initial measurement
    const bbox = gRef.current.getBBox();
    const padding = 2;
    const newW = Math.max(1, Math.ceil(bbox.width + padding * 2));
    const newH = Math.max(1, Math.ceil(bbox.height + padding * 2));

    // Update the SVG attributes directly to avoid re-render loop
    ref.current.setAttribute("width", newW.toString());
    ref.current.setAttribute("height", newH.toString());
    ref.current.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${newW} ${newH}`);

    if (size.w !== newW || size.h !== newH) {
      setSize({ w: newW, h: newH });
    }

    onChange(ref.current.outerHTML, newW, newH);
  }, [text, align, font, fontSize, direction]);

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
  onChangeBitmap,
}: {
  text: string;
  align: AlignmentType;
  font: string;
  fontSize: number;
  length: number | null;
  direction: "horizontal" | "vertical";
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
        align={align}
        font={font}
        fontSize={fontSize}
        direction={direction}
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
  return (
    <label htmlFor={val}>
      <input
        type="radio"
        name="align"
        value={val}
        id={val}
        checked={align === val}
        onChange={onChangeHandler}
      />
      {text}
    </label>
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
  return (
    <select value={font} onChange={(e) => setFont(e.target.value)}>
      {/* Standard 5 Fonts */}
      <option value='Arial, Helvetica, sans-serif'>Arial</option>
      <option value='"Times New Roman", Times, serif'>Times New Roman</option>
      <option value='"Courier New", Courier, monospace'>Courier New</option>
      <option value='"Yu Gothic", "YuGothic", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'>Yu Gothic</option>
      <option value='"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS PMincho", serif'>Yu Mincho</option>

      {/* Advanced Fonts */}
      {advanced && (
        <>
          <option value='Verdana, Geneva, sans-serif'>Verdana</option>
          <option value='Tahoma, Geneva, sans-serif'>Tahoma</option>
          <option value='Impact, Charcoal, sans-serif'>Impact</option>
          <option value='Georgia, serif'>Georgia</option>
          <option value='"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'>Gothic</option>
          <option value='"Hiragino Mincho ProN", "MS PMincho", serif'>Mincho</option>
          <option value='"Meiryo", sans-serif'>Meiryo</option>
          <option value='cursive'>Cursive</option>
          <option value='fantasy'>Fantasy</option>
        </>
      )}
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
  const { t } = useContext(PrinterContext);
  const standardSizes = [12, 16, 20, 24, 32, 48, 64, 80, 96, 128];

  if (!advanced) {
    return (
      <label>
        {t('fontSize')}:
        <select 
          value={fontSize} 
          onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
          style={{ width: 'auto' }}
        >
          {!standardSizes.includes(fontSize) && <option value={fontSize}>{fontSize}</option>}
          {standardSizes.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        px
      </label>
    );
  }

  return (
    <label>
      {t('fontSize')}:
      <input
        type="number"
        value={fontSize}
        onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 0)}
        min="1"
        max="200"
      />
      px
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
  const onOptionChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (align === "left" || align === "center" || align === "right")
      setAlign(e.target.value as AlignmentType);
  };

  return (
    <div>
      <TextAlignButton
        val="left"
        text={t('alignLeft')}
        align={align}
        onChangeHandler={onOptionChange}
      />
      <TextAlignButton
        val="center"
        text={t('alignCenter')}
        align={align}
        onChangeHandler={onOptionChange}
      />
      <TextAlignButton
        val="right"
        text={t('alignRight')}
        align={align}
        onChangeHandler={onOptionChange}
      />
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

  useEffect(() => {
    localStorage.setItem("label_text", text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem("label_align", align);
  }, [align]);

  useEffect(() => {
    localStorage.setItem("label_font", font);
  }, [font]);

  useEffect(() => {
    localStorage.setItem("label_fontSize", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (length !== null) {
      localStorage.setItem("label_length", length.toString());
    } else {
      localStorage.removeItem("label_length");
    }
  }, [length]);

  useEffect(() => {
    localStorage.setItem("label_direction", direction);
  }, [direction]);

  useEffect(() => {
    localStorage.setItem("label_advancedFontSize", advancedFontSize.toString());
  }, [advancedFontSize]);

  useEffect(() => {
    localStorage.setItem("label_advancedFonts", advancedFonts.toString());
  }, [advancedFonts]);

  const { 
    printer, 
    printerStatus, 
    browserKeepAlive, 
    setBrowserKeepAlive, 
    printerKeepAlive, 
    setPrinterKeepAlive,
    t
  } = useContext(PrinterContext);

  const canPrint = !!printer && printerStatus.state == "connected" && !!bitmap;

  const print = () => {
    if (canPrint) printer.print(bitmap);
  };

  return (
    <div className="label-maker">
      <LabelCanvas
        text={text}
        align={align}
        font={font}
        fontSize={fontSize}
        length={length}
        direction={direction}
        onChangeBitmap={(x: ImageData) => setBitmap(x)}
      />
      <div className="label-maker-controls">
        <div className="control-group">
          <TextAlign align={align} setAlign={setAlign} />
        </div>
        <div className="control-group">
          <FontSelect font={font} setFont={setFont} advanced={advancedFonts} />
          <FontSizeInput fontSize={fontSize} setFontSize={setFontSize} advanced={advancedFontSize} />
          <LengthSelect length={length} setLength={setLength} />
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
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={browserKeepAlive} 
                      onChange={(e) => setBrowserKeepAlive(e.target.checked)} 
                    />
                    {t('browserKeepAlive')}
                  </label>
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
    </div>
  );
}

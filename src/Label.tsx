import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  use,
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
}: {
  text: string;
  onChange: (svg: string, width: number, height: number) => void;
  align: AlignmentType;
  font: string;
  fontSize: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  useLayoutEffect(() => {
    if (!ref.current || !textRef.current) return;
    const bbox = textRef.current.getBBox();
    const newWidth = Math.ceil(bbox.width);
    const newHeight = Math.ceil(bbox.height);

    const safeWidth = Math.max(1, newWidth);
    const safeHeight = Math.max(1, newHeight);

    if (width !== safeWidth || height !== safeHeight) {
      setWidth(safeWidth);
      setHeight(safeHeight);
    }

    // Update attributes to match the measured box
    ref.current.setAttribute("width", safeWidth.toString());
    ref.current.setAttribute("height", safeHeight.toString());
    ref.current.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

    onChange(ref.current.outerHTML, safeWidth, safeHeight);
  }, [text, align, font, fontSize, width, height]);

  const [xPos, textAnchor] = ((): [number, "start" | "middle" | "end"] => {
    switch (align) {
      case "left":
        return [0, "start"];
      case "center":
        return [width / 2, "middle"];
      case "right":
        return [width, "end"];
      default:
        return [0, "start"];
    }
  })();

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width || 1}
        height={height || 1}
        viewBox={`${0} 0 ${width || 1} ${height || 1}`}
        ref={ref}
        style={{ width: width || 1, height: height || 1 }}
      >
        <text
          x={xPos}
          y="0"
          id="labelText"
          ref={textRef}
          style={{
            textAnchor: textAnchor,
            fontFamily: font,
            fontSize: `${fontSize}px`,
          }}
        >
          {text.split("\n").map((x, i) => (
            <tspan key={i} x={xPos} dy="1em">
              {x}
            </tspan>
          ))}
        </text>
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
  onChangeBitmap,
}: {
  text: string;
  align: AlignmentType;
  font: string;
  fontSize: number;
  length: number | null;
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
    if (!svgData || !width || !height || !ref.current) {
      return;
    }

    let isCurrent = true;
    const image = new Image();
    const context = ref.current.getContext("2d");
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

      context.drawImage(
        image,
        xOffset,
        yOffset,
        width,
        height,
      );

      onChangeBitmap(
        context.getImageData(0, 0, canvasWidth, canvasHeight),
      );
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
    };

    image.src = url;

    return () => {
      isCurrent = false;
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [svgData, length, align, width, height]);

  return (
    <>
      <LabelSvg
        text={text}
        onChange={(s, w, h) => onSvgChange(s, w, h)}
        align={align}
        font={font}
        fontSize={fontSize}
      />
      <div
        className="canvas-wrapper"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          padding: "30px",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px"
        }}
      >
        <div className="canvas-container">
          <canvas
            ref={ref}
            width={384}
            height={length || (height > 0 ? height : 1)}
            style={{
              margin: 0,
              backgroundColor: "white",
              display: "block"
            }}
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
  return (
    <select
      value={length || "auto"}
      onChange={(e) => setLength(parseInt(e.target.value) || null)}
    >
      <option value="auto">Auto</option>
      <option value="230">28mm</option>
    </select>
  );
}

function FontSelect({
  font,
  setFont,
}: {
  font: string;
  setFont: (x: string) => void;
}) {
  return (
    <select value={font} onChange={(e) => setFont(e.target.value)}>
      <option value="serif">serif</option>
      <option value="sans-serif">sans-serif</option>
      <option value="cursive">cursive</option>
      <option value="monospace">monospace</option>
      <option value="fantasy">fantasy</option>
    </select>
  );
}

function FontSizeInput({
  fontSize,
  setFontSize,
}: {
  fontSize: number;
  setFontSize: (x: number) => void;
}) {
  return (
    <label>
      Font size:
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
  const onOptionChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (align === "left" || align === "center" || align === "right")
      setAlign(e.target.value as AlignmentType);
  };

  return (
    <div>
      <TextAlignButton
        val="left"
        text="Left"
        align={align}
        onChangeHandler={onOptionChange}
      />
      <TextAlignButton
        val="center"
        text="Center"
        align={align}
        onChangeHandler={onOptionChange}
      />
      <TextAlignButton
        val="right"
        text="Right"
        align={align}
        onChangeHandler={onOptionChange}
      />
    </div>
  );
}

export function LabelMaker() {
  const [text, setText] = useState("Hello");
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [bitmap, setBitmap] = useState<ImageData>();
  const [font, setFont] = useState<string>("sans-serif");
  const [fontSize, setFontSize] = useState<number>(24);
  const [length, setLength] = useState<number | null>(null);

  const { printer, printerStatus } = use(PrinterContext);

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
        onChangeBitmap={(x: ImageData) => setBitmap(x)}
      />
      <div className="label-maker-controls">
        <div className="control-group">
          <TextAlign align={align} setAlign={setAlign} />
        </div>
        <div className="control-group">
          <FontSelect font={font} setFont={setFont} />
          <FontSizeInput fontSize={fontSize} setFontSize={setFontSize} />
          <LengthSelect length={length} setLength={setLength} />
        </div>
        <div className="text-input-group">
          <textarea
            value={text}
            onChange={(x) => setText(x.target.value)}
            rows={4}
            placeholder="Type your label text here..."
          />
        </div>
        <div className="actions" style={{ textAlign: 'center', marginTop: '10px' }}>
          <button className="print-button" onClick={print} disabled={!canPrint}>
            {printerStatus.state === "printing" ? "Printing..." : "Print Label"}
          </button>
        </div>
      </div>
    </div>
  );
}

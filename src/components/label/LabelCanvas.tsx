import { useState, useEffect, useRef } from "react";
import type { AlignmentType } from "./useLabelState";
import { LabelSvg } from "./LabelSvg";

export function LabelCanvas({
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
  }, [svgData, length, align, width, height, onChangeBitmap]);

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

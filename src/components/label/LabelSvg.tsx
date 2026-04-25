import { useState, useLayoutEffect, useRef } from "react";
import type { AlignmentType } from "./useLabelState";

export function LabelSvg({
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
  padding,
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
  padding: number;
  autoTrim: boolean;
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
  }, [text, align, font, fontSize, direction, autoShrink, autoExpand, padding]);

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

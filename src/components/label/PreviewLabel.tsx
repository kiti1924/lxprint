import { useState } from "react";
import type { AlignmentType } from "./useLabelState";
import { LabelSvg } from "./LabelSvg";
import { trimImageData } from "../../lib/imageUtils";

export function PreviewLabel({
  text,
  align,
  font,
  fontSize,
  length,
  direction,
  autoShrink,
  autoExpand,
  padding,
  autoTrim,
}: {
  text: string;
  align: AlignmentType;
  font: string;
  fontSize: number;
  length: number | null;
  direction: "horizontal" | "vertical";
  autoShrink: boolean;
  autoExpand: boolean;
  padding: number;
  autoTrim: boolean;
}) {
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [trimmedImg, setTrimmedImg] = useState<string>("");

  const onSvgChange = (svgData: string, w: number, h: number) => {
    if (!autoTrim) {
      setWidth(w);
      setHeight(h);
      setTrimmedImg(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`);
      return;
    }

    // Perform pixel-perfect trim for preview
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      
      const trimmed = trimImageData(ctx.getImageData(0, 0, w, h));
      
      const outCanvas = document.createElement("canvas");
      outCanvas.width = trimmed.width;
      outCanvas.height = trimmed.height;
      outCanvas.getContext("2d")?.putImageData(trimmed, 0, 0);
      
      setTrimmedImg(outCanvas.toDataURL());
      setWidth(trimmed.width);
      setHeight(trimmed.height);
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
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
      <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
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
          padding={padding}
          autoTrim={autoTrim}
        />
      </div>
      {trimmedImg && (
        <img 
          src={trimmedImg} 
          style={{ width: width, height: height, display: 'block' }} 
          alt="preview"
        />
      )}
    </div>
  );
}

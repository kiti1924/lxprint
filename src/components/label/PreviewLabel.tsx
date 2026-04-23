import { useState } from "react";
import type { AlignmentType } from "./useLabelState";
import { LabelSvg } from "./LabelSvg";

export function PreviewLabel({
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

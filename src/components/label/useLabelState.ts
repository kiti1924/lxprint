import { useLocalStorage } from "../../hooks/useLocalStorage";

export type AlignmentType = "left" | "center" | "right";

export function useLabelState() {
  const [text, setText] = useLocalStorage("label_text", "Hello");
  const [align, setAlign] = useLocalStorage<AlignmentType>("label_align", "left");
  const [font, setFont] = useLocalStorage("label_font", "sans-serif");
  const [fontSize, setFontSize] = useLocalStorage("label_fontSize", 24);
  const [length, setLength] = useLocalStorage<number | null>("label_length", null);
  const [direction, setDirection] = useLocalStorage<"horizontal" | "vertical">("label_direction", "horizontal");
  const [advancedFontSize, setAdvancedFontSize] = useLocalStorage("label_advancedFontSize", false);
  const [advancedFonts, setAdvancedFonts] = useLocalStorage("label_advancedFonts", false);
  
  const [autoShrink, setAutoShrink] = useLocalStorage("label_autoShrink", false);
  const [autoExpand, setAutoExpand] = useLocalStorage("label_autoExpand", false);
  
  const [advancedLength, setAdvancedLength] = useLocalStorage("label_advancedLength", false);
  const [padding, setPadding] = useLocalStorage("label_padding", 2);
  
  const [excelMode, setExcelMode] = useLocalStorage("label_excelMode", false);
  const [excelDelay, setExcelDelay] = useLocalStorage("label_excelDelay", 0);
  const [excelSpacing, setExcelSpacing] = useLocalStorage("label_excelSpacing", 0);
  const [excelCompact, setExcelCompact] = useLocalStorage("label_excelCompact", false);
  const [excelShowKey, setExcelShowKey] = useLocalStorage("label_excelShowKey", true);
  const [excelAutoWrap, setExcelAutoWrap] = useLocalStorage("label_excelAutoWrap", true);

  return {
    text, setText,
    align, setAlign,
    font, setFont,
    fontSize, setFontSize,
    length, setLength,
    direction, setDirection,
    advancedFontSize, setAdvancedFontSize,
    advancedFonts, setAdvancedFonts,
    autoShrink, setAutoShrink,
    autoExpand, setAutoExpand,
    advancedLength, setAdvancedLength,
    padding, setPadding,
    excelMode, setExcelMode,
    excelDelay, setExcelDelay,
    excelSpacing, setExcelSpacing,
    excelCompact, setExcelCompact,
    excelShowKey, setExcelShowKey,
    excelAutoWrap, setExcelAutoWrap
  };
}

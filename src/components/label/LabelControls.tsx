import { useContext, type ChangeEventHandler } from "react";
import { PrinterContext } from "../../context";
import type { AlignmentType } from "./useLabelState";

export function TextAlignButton({
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

export function TextAlign({
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

export function LengthSelect({
  length,
  setLength,
  advanced,
}: {
  length: number | null;
  setLength: (x: number | null) => void;
  advanced: boolean;
}) {
  const { t } = useContext(PrinterContext);
  const presets = [
    { label: "15mm", val: 120 },
    { label: "20mm", val: 160 },
    { label: "28mm", val: 230 },
    { label: "30mm", val: 240 },
    { label: "40mm", val: 320 },
    { label: "50mm", val: 400 },
    { label: "100mm", val: 800 },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '220px', justifyContent: 'flex-end' }}>
      <select
        value={length === null ? "auto" : presets.some(p => p.val === length) ? length : "manual"}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "auto") setLength(null);
          else if (v === "manual") { /* Keep current or set default */ }
          else setLength(parseInt(v));
        }}
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
        }}
      >
        <option value="auto">{t('auto')}</option>
        {presets.map(p => (
          <option key={p.val} value={p.val}>{p.label}</option>
        ))}
        {advanced && !presets.some(p => p.val === length) && length !== null && (
          <option value="manual">{Math.round(length / 8)}mm</option>
        )}
      </select>
      {advanced && (
        <input 
          type="number"
          value={length === null ? "" : Math.round(length / 8)}
          placeholder="mm"
          onChange={(e) => {
            const mm = parseInt(e.target.value);
            setLength(isNaN(mm) ? null : mm * 8);
          }}
          style={{
            width: '60px',
            padding: '8px 6px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            fontSize: '0.9em',
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}

export function PaddingInput({
  padding,
  setPadding,
}: {
  padding: number;
  setPadding: (x: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '220px', justifyContent: 'flex-end' }}>
      <input 
        type="range"
        min="0"
        max="20"
        value={padding}
        onChange={(e) => setPadding(parseInt(e.target.value))}
        style={{ flex: 1, cursor: 'pointer' }}
      />
      <input 
        type="number"
        value={padding}
        onChange={(e) => setPadding(Math.max(0, parseInt(e.target.value) || 0))}
        style={{
          width: '50px',
          padding: '8px 6px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: '0.9em',
          textAlign: 'center',
          outline: 'none',
        }}
      />
      <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.5)', width: '20px' }}>px</span>
    </div>
  );
}

export function FontSelect({
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

export function FontSizeInput({
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

import { useState, useEffect, useContext } from "react";
import { PrinterContext } from "./context";
import { useLabelState } from "./components/label/useLabelState";
import { LabelCanvas } from "./components/label/LabelCanvas";
import { PreviewLabel } from "./components/label/PreviewLabel";
import { TextAlign, LengthSelect, FontSelect, FontSizeInput, PaddingInput } from "./components/label/LabelControls";
import { parseExcelFile, formatExcelRow } from "./lib/excelUtils";
import { measureTextWidth } from "./lib/measureText";
import { combineImages } from "./lib/imageUtils";

export function LabelMaker() {
  const state = useLabelState();
  const [bitmap, setBitmap] = useState<ImageData>();
  const [showDetailed, setShowDetailed] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [itemOverflowWarning, setItemOverflowWarning] = useState(false);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [batchIndex, setBatchIndex] = useState(-1);
  const [waitingForRender, setWaitingForRender] = useState(false);
  const [batchBuffer, setBatchBuffer] = useState<ImageData[]>([]);

  const { 
    printer, 
    printerStatus, 
    browserKeepAlive, 
    setBrowserKeepAlive, 
    printerKeepAlive, 
    setPrinterKeepAlive,
    t
  } = useContext(PrinterContext);

  useEffect(() => {
    if (!state.excelMode || !excelData.length) {
      setItemOverflowWarning(false);
      return;
    }
    let overflow = false;
    for (const row of excelData.slice(0, 50)) {
      const entries = Object.entries(row).filter(([k]) => k !== "Loop");
      for (const [k, v] of entries) {
        const cleanV = String(v).replace(/\r?\n/g, " ");
        const segment = state.excelShowKey ? `${k}: ${cleanV}` : cleanV;
        const width = measureTextWidth(segment, state.font, state.fontSize) * 1.05;
        if (width > 384 - 10) {
          overflow = true;
          break;
        }
      }
      if (overflow) break;
    }
    setItemOverflowWarning(overflow);
  }, [excelData, state.excelMode, state.excelShowKey, state.font, state.fontSize]);

  const canPrint = !!bitmap && printerStatus.state === "connected";

  const print = () => {
    if (canPrint && printer) printer.print(bitmap);
  };

  const startBatchPrint = () => {
    if (!excelData.length || !printer) return;
    setIsBatchPrinting(true);
    setBatchIndex(0);
    setBatchBuffer([]);
    
    const firstRow = excelData[0];
    const formattedText = formatExcelRow(firstRow, {
      isCompact: state.excelCompact,
      excelShowKey: state.excelShowKey,
      excelAutoWrap: state.excelAutoWrap,
      font: state.font,
      fontSize: state.fontSize
    });

    if (formattedText !== state.text) {
      setBitmap(undefined);
    }
    
    setWaitingForRender(true);
    state.setText(formattedText);
  };

  useEffect(() => {
    if (!isBatchPrinting || !waitingForRender || !bitmap || !printer || printerStatus.state !== "connected") return;
    
    const doPrint = async () => {
      if (state.excelUseBatch) {
        const newBuffer = [...batchBuffer, bitmap];
        const isLastRow = batchIndex === excelData.length - 1;
        
        if (newBuffer.length >= state.excelBatchSize || isLastRow) {
          const combined = combineImages(newBuffer, Math.round(state.excelSpacing * 8));
          if (combined) {
            await printer.print(combined);
          }
          setBatchBuffer([]);
        } else {
          setBatchBuffer(newBuffer);
        }
      } else {
        // Single-row logic
        if (state.text.trim()) {
          await printer.print(bitmap);
        }
        
        if (state.text.trim() && state.excelSpacing > 0) {
          await printer.feed(state.excelSpacing);
        }

        if (state.excelDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, state.excelDelay * 1000));
        }
      }
      
      setWaitingForRender(false);

      const nextIndex = batchIndex + 1;
      if (nextIndex < excelData.length) {
        const nextRow = excelData[nextIndex];
        const nextText = formatExcelRow(nextRow, {
          isCompact: state.excelCompact,
          excelShowKey: state.excelShowKey,
          excelAutoWrap: state.excelAutoWrap,
          font: state.font,
          fontSize: state.fontSize
        });

        if (nextText !== state.text) {
          setBitmap(undefined);
        }
        
        setBatchIndex(nextIndex);
        setWaitingForRender(true);
        state.setText(nextText);
      } else {
        setIsBatchPrinting(false);
        setBatchIndex(-1);
        setBatchBuffer([]);
      }
    };

    doPrint();
  }, [bitmap, isBatchPrinting, waitingForRender, batchIndex, excelData, printer, printerStatus, state, batchBuffer]);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcelFile(file);
      setExcelData(data);
    } catch (err) {
      console.error("Failed to parse excel file", err);
    }
    e.target.value = "";
  };

  const handleScaleChange = (scale: number) => {
    if (state.autoShrink && scale < 0.99) {
      const newSize = Math.max(12, Math.floor(state.fontSize * scale));
      if (newSize !== state.fontSize) {
        state.setFontSize(newSize);
      }
    } else if (state.autoExpand && scale > 1.01) {
      const newSize = Math.min(200, Math.ceil(state.fontSize * scale));
      if (newSize !== state.fontSize) {
        state.setFontSize(newSize);
      }
    }
  };

  const wakeLockSupported = 'wakeLock' in navigator;

  return (
    <div className="label-maker">
      <div style={{ position: 'relative' }}>
        <LabelCanvas
          text={state.text}
          align={state.align}
          font={state.font}
          fontSize={state.fontSize}
          length={state.length}
          direction={state.direction}
          autoShrink={state.autoShrink}
          autoExpand={state.autoExpand}
          padding={state.padding}
          onOverflow={setIsOverflowing}
          onScaleChange={handleScaleChange}
          onChangeBitmap={setBitmap}
        />
        {isOverflowing && !state.autoShrink && (
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
        border: isOverflowing && !state.autoShrink ? '2px solid #ff4d4d' : '1px solid rgba(255,255,255,0.05)',
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
            <TextAlign align={state.align} setAlign={state.setAlign} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('length')}
            </span>
            <LengthSelect 
              length={state.length} 
              setLength={state.setLength} 
              advanced={state.advancedLength} 
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('padding')}
            </span>
            <PaddingInput padding={state.padding} setPadding={state.setPadding} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {/* Font Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('fontFamily')}
            </span>
            <FontSelect font={state.font} setFont={state.setFont} advanced={state.advancedFonts} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {t('fontSize')}
            </span>
            <FontSizeInput fontSize={state.fontSize} setFontSize={state.setFontSize} advanced={state.advancedFontSize} />
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
            background: state.autoShrink ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            padding: '8px',
            borderRadius: '10px',
            border: state.autoShrink ? '1px solid #646cff' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s ease',
            color: state.autoShrink ? '#fff' : 'rgba(255,255,255,0.6)'
          }}>
            <input 
              type="checkbox" 
              checked={state.autoShrink} 
              onChange={(e) => state.setAutoShrink(e.target.checked)} 
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
            background: state.autoExpand ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            padding: '8px',
            borderRadius: '10px',
            border: state.autoExpand ? '1px solid #646cff' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s ease',
            color: state.autoExpand ? '#fff' : 'rgba(255,255,255,0.6)'
          }}>
            <input 
              type="checkbox" 
              checked={state.autoExpand} 
              onChange={(e) => state.setAutoExpand(e.target.checked)} 
              style={{ cursor: 'pointer', margin: 0 }}
            />
            {t('autoExpand')}
          </label>
        </div>
      </div>
      <div className="text-input-group">
          <textarea
            value={state.text}
            onChange={(x) => state.setText(x.target.value)}
            rows={4}
            placeholder={t('typeTextHere')}
          />
        </div>
        <div className="actions" style={{ textAlign: 'center', marginTop: '10px' }}>
          <button 
            className="print-button" 
            onClick={state.excelMode ? startBatchPrint : print} 
            disabled={!canPrint || (state.excelMode && !excelData.length)}
          >
            {printerStatus.state === "printing" || isBatchPrinting 
              ? (isBatchPrinting ? `${t('printingStatus')} (${batchIndex + 1}/${excelData.length})` : t('printingStatus')) 
              : (state.excelMode ? t('excelPrint') : t('printLabel'))}
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
                      checked={state.advancedFontSize} 
                      onChange={(e) => state.setAdvancedFontSize(e.target.checked)} 
                    />
                    {t('advancedFontSize')}
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={state.advancedLength} 
                      onChange={(e) => state.setAdvancedLength(e.target.checked)} 
                    />
                    {t('advancedLength')}
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={state.advancedFonts} 
                      onChange={(e) => state.setAdvancedFonts(e.target.checked)} 
                    />
                    {t('advancedFonts')}
                  </label>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{t('direction')}:</span>
                  <div className="orientation-toggle" style={{ padding: '3px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', gap: '4px' }}>
                    <label style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', background: state.direction === 'horizontal' ? '#646cff' : 'transparent', fontSize: '0.85em' }}>
                      <input type="radio" name="direction" value="horizontal" checked={state.direction === 'horizontal'} onChange={() => state.setDirection('horizontal')} style={{ display: 'none' }} />
                      {t('horizontal')}
                    </label>
                    <label style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', background: state.direction === 'vertical' ? '#646cff' : 'transparent', fontSize: '0.85em' }}>
                      <input type="radio" name="direction" value="vertical" checked={state.direction === 'vertical'} onChange={() => state.setDirection('vertical')} style={{ display: 'none' }} />
                      {t('vertical')}
                    </label>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="checkbox" 
                      checked={state.excelMode} 
                      onChange={(e) => state.setExcelMode(e.target.checked)} 
                    />
                    {t('excelMode')}
                  </label>
                  {state.excelMode && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('fontFamily')}:</span>
                        <FontSelect font={state.font} setFont={state.setFont} advanced={state.advancedFonts} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('fontSize')}:</span>
                        <FontSizeInput fontSize={state.fontSize} setFontSize={state.setFontSize} advanced={state.advancedFontSize} />
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
                                 marginBottom: state.excelUseBatch ? '0' : `${Math.max(2, state.excelSpacing * 8)}px`, 
                                 background: 'rgba(255,255,255,0.02)',
                                 borderLeft: '1px solid rgba(255,255,255,0.1)',
                                 borderRight: '1px solid rgba(255,255,255,0.1)',
                                 borderTop: i === 0 || !state.excelUseBatch ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                 borderBottom: !state.excelUseBatch || i === Math.min(excelData.length, 20) - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                 width: '384px', 
                                 boxSizing: 'content-box', 
                                 overflow: 'hidden',
                                 position: 'relative'
                               }}>
                                 {state.excelSpacing > 0 && state.excelUseBatch && i > 0 && (
                                   <div style={{ 
                                     height: `${state.excelSpacing * 8}px`, 
                                     background: 'rgba(255,255,255,0.05)',
                                     borderTop: '1px dashed rgba(255,255,255,0.2)',
                                     borderBottom: '1px dashed rgba(255,255,255,0.2)',
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     color: 'rgba(255,255,255,0.2)',
                                     fontSize: '8px'
                                   }}>
                                     {state.excelSpacing}mm
                                   </div>
                                 )}
                                 <div style={{ 
                                   color: '#646cff', 
                                   fontWeight: 'bold', 
                                   fontSize: '10px', 
                                   fontFamily: 'sans-serif', 
                                   padding: '2px 8px',
                                   background: 'rgba(0,0,0,0.2)',
                                   marginBottom: '0',
                                   opacity: 0.5,
                                   position: 'absolute',
                                   top: 0,
                                   right: 0,
                                   zIndex: 1,
                                   borderRadius: '0 0 0 4px'
                                 }}>
                                   #{i+1}
                                 </div>
                                 <PreviewLabel 
                                   text={formatExcelRow(row, {
                                     isCompact: state.excelCompact,
                                     excelShowKey: state.excelShowKey,
                                     excelAutoWrap: state.excelAutoWrap,
                                     font: state.font,
                                     fontSize: state.fontSize
                                   })}
                                   align={state.align}
                                   font={state.font}
                                   fontSize={state.fontSize}
                                   length={state.length}
                                   direction={state.direction}
                                   autoShrink={state.autoShrink}
                                   autoExpand={state.autoExpand}
                                   padding={state.padding}
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
                          value={state.excelDelay} 
                          onChange={(e) => state.setExcelDelay(parseFloat(e.target.value) || 0)} 
                          style={{ width: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '2px 5px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('excelSpacing')}:</span>
                        <input 
                          type="number" 
                          step="0.1"
                          min="0"
                          value={state.excelSpacing} 
                          onChange={(e) => state.setExcelSpacing(parseFloat(e.target.value) || 0)} 
                          style={{ width: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '2px 5px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
                          <input 
                            type="checkbox" 
                            checked={state.excelShowKey} 
                            onChange={(e) => state.setExcelShowKey(e.target.checked)} 
                          />
                          {t('excelShowKey')}
                        </label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
                          <input 
                            type="checkbox" 
                            checked={state.excelCompact} 
                            onChange={(e) => state.setExcelCompact(e.target.checked)} 
                          />
                          {t('excelCompact')}
                        </label>
                      </div>
                      {state.excelCompact && (
                        <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
                            <input 
                              type="checkbox" 
                              checked={state.excelAutoWrap} 
                              onChange={(e) => state.setExcelAutoWrap(e.target.checked)} 
                            />
                            {t('excelAutoWrap')}
                          </label>
                        </div>
                      )}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
                          <input 
                            type="checkbox" 
                            checked={state.excelUseBatch} 
                            onChange={(e) => state.setExcelUseBatch(e.target.checked)} 
                          />
                          {t('excelUseBatch')}
                        </label>
                        {state.excelUseBatch && (
                          <div style={{ paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>{t('excelBatchSize')}:</span>
                            <input 
                              type="number" 
                              min="1"
                              max="100"
                              value={state.excelBatchSize} 
                              onChange={(e) => state.setExcelBatchSize(Math.max(1, parseInt(e.target.value) || 1))} 
                              style={{ width: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '2px 5px' }}
                            />
                          </div>
                        )}
                      </div>
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

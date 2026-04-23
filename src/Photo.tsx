import { useState, useRef, useContext, useEffect } from "react";
import { PrinterContext } from "./context.tsx";
import { processImage, getImageContentBounds } from "./lib/imageUtils";

export function PhotoMaker() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [bitmap, setBitmap] = useState<ImageData | null>(null);
  const [autoTrim, setAutoTrim] = useState(() => localStorage.getItem("photo_autoTrim") === "true");
  const [processingMethod, setProcessingMethod] = useState<"dithering" | "threshold">(() => (localStorage.getItem("photo_processingMethod") as any) || "dithering");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDetailed, setShowDetailed] = useState(false);

  useEffect(() => {
    localStorage.setItem("photo_autoTrim", autoTrim.toString());
  }, [autoTrim]);

  useEffect(() => {
    localStorage.setItem("photo_processingMethod", processingMethod);
  }, [processingMethod]);

  const { 
    printer, 
    printerStatus,
    browserKeepAlive,
    setBrowserKeepAlive,
    printerKeepAlive,
    setPrinterKeepAlive,
    t
  } = useContext(PrinterContext);

  const canPrint = !!printer && printerStatus.state === "connected" && !!bitmap;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Use an offscreen canvas to analyze original image
    const offscreen = document.createElement("canvas");
    offscreen.width = image.width;
    offscreen.height = image.height;
    const octx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!octx) return;
    octx.drawImage(image, 0, 0);

    let srcX = 0, srcY = 0, srcW = image.width, srcH = image.height;

    if (autoTrim) {
      const bounds = getImageContentBounds(octx, image.width, image.height);
      srcX = bounds.x;
      srcY = bounds.y;
      srcW = bounds.width;
      srcH = bounds.height;
    }

    const targetWidth = 384;
    let targetHeight = Math.round((srcH / srcW) * targetWidth);

    // Safeguard to prevent astronomical heights that crash the browser or printer
    const MAX_HEIGHT = 8000;
    let drawW = targetWidth;
    let drawH = targetHeight;
    let offsetX = 0;

    if (targetHeight > MAX_HEIGHT) {
      drawH = MAX_HEIGHT;
      drawW = Math.round((srcW / srcH) * drawH);
      targetHeight = MAX_HEIGHT;
      offsetX = Math.floor((targetWidth - drawW) / 2);
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Fill with white (transparent will be treated as white by processImage)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      image,
      srcX, srcY, srcW, srcH,
      offsetX, 0, drawW, drawH
    );
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    
    // Apply selected image processing
    const processedData = processImage(imageData, processingMethod);
    ctx.putImageData(processedData, 0, 0);
    setBitmap(processedData);
  }, [image, autoTrim, processingMethod]);

  const print = () => {
    if (canPrint && bitmap) printer.print(bitmap);
  };

  return (
    <div className="photo-maker">
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button 
          className="select-button" 
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="icon">📷</span> {t('selectPhoto')}
        </button>
        {image && (
          <div className="options-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={autoTrim} 
                onChange={(e) => setAutoTrim(e.target.checked)} 
              />
              {t('autoTrim')}
            </label>
            <div className="process-select-group">
              <label>{t('processingMethod')}:</label>
              <select 
                value={processingMethod} 
                onChange={(e) => setProcessingMethod(e.target.value as "dithering" | "threshold")}
              >
                <option value="dithering">{t('dithering')}</option>
                <option value="threshold">{t('threshold')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {image && (
        <div className="preview-section">
          <h3>{processingMethod === "dithering" ? t('ditheredPreview') : t('thresholdPreview')}</h3>
          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
          <div className="actions" style={{ textAlign: 'center' }}>
            <button 
              className="print-button" 
              onClick={print} 
              disabled={!canPrint}
            >
              {printerStatus.state === "printing" ? t('printingStatus') : t('printPhoto')}
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
                  <div>
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                      <input 
                        type="checkbox" 
                        checked={printerKeepAlive} 
                        onChange={(e) => setPrinterKeepAlive(e.target.checked)} 
                      />
                      {t('printerKeepAlive')}
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



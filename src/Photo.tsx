import { useState, useRef, use, useEffect } from "react";
import { PrinterContext } from "./context.tsx";

export function PhotoMaker() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [bitmap, setBitmap] = useState<ImageData | null>(null);
  const [autoTrim, setAutoTrim] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<"dithering" | "threshold">("dithering");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { printer, printerStatus } = use(PrinterContext);

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
    const targetHeight = Math.round((srcH / srcW) * targetWidth);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      image,
      srcX, srcY, srcW, srcH,
      0, 0, targetWidth, targetHeight
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
          <span className="icon">📷</span> Select Photo
        </button>
        {image && (
          <div className="options-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={autoTrim} 
                onChange={(e) => setAutoTrim(e.target.checked)} 
              />
              Auto Trim (Margins)
            </label>
            <div className="process-select-group">
              <label>Method:</label>
              <select 
                value={processingMethod} 
                onChange={(e) => setProcessingMethod(e.target.value as "dithering" | "threshold")}
              >
                <option value="dithering">Dithering (Floyd-Steinberg)</option>
                <option value="threshold">Threshold (Black & White)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {image && (
        <div className="preview-section">
          <h3>{processingMethod === "dithering" ? "Dithered Preview" : "Threshold Preview"}</h3>
          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
          <div className="actions">
            <button 
              className="print-button" 
              onClick={print} 
              disabled={!canPrint}
            >
              {printerStatus.state === "printing" ? "Printing..." : "Print Photo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function processImage(imageData: ImageData, method: "dithering" | "threshold") {
  const width = imageData.width;
  const height = imageData.height;
  const data = new Float32Array(width * height);

  // Convert to grayscale first
  for (let i = 0; i < width * height; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    const a = imageData.data[i * 4 + 3];
    // Luminance formula
    // If transparent, treat as white
    if (a < 10) {
      data[i] = 255;
    } else {
      data[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  if (method === "dithering") {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const oldPixel = data[i];
        const newPixel = oldPixel < 128 ? 0 : 255;
        const error = oldPixel - newPixel;
        data[i] = newPixel;

        // Distribute error to neighbors (Floyd-Steinberg)
        if (x + 1 < width) data[i + 1] += error * 7 / 16;
        if (y + 1 < height) {
          if (x > 0) data[i + width - 1] += error * 3 / 16;
          data[i + width] += error * 5 / 16;
          if (x + 1 < width) data[i + width + 1] += error * 1 / 16;
        }
      }
    }
  } else {
    // Simple Threshold
    for (let i = 0; i < width * height; i++) {
      data[i] = data[i] < 128 ? 0 : 255;
    }
  }

  // Convert back to ImageData (Black pixels for 0, Transparent for 255)
  const result = new Uint8ClampedArray(imageData.data.length);
  for (let i = 0; i < width * height; i++) {
    const val = data[i] < 128 ? 0 : 255;
    result[i * 4] = 0;
    result[i * 4 + 1] = 0;
    result[i * 4 + 2] = 0;
    result[i * 4 + 3] = val === 0 ? 255 : 0; // Black if 0, Transparent if 255
  }

  return new ImageData(result, width, height);
}

function getImageContentBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Check if not white (threshold 250) and not transparent
      const isWhite = r > 250 && g > 250 && b > 250;
      const isTransparent = a < 10;

      if (!isWhite && !isTransparent) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return { x: 0, y: 0, width, height };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

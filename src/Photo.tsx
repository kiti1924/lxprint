import { useState, useRef, use, useEffect } from "react";
import { PrinterContext } from "./context.tsx";

export function PhotoMaker() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [bitmap, setBitmap] = useState<ImageData | null>(null);
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

    const width = 384;
    const height = Math.round((image.height / image.width) * width);
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    
    // Apply Floyd-Steinberg Dithering
    const ditheredData = applyDithering(imageData);
    ctx.putImageData(ditheredData, 0, 0);
    setBitmap(ditheredData);
  }, [image]);

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
      </div>

      {image && (
        <div className="preview-section">
          <h3>Dithered Preview</h3>
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

function applyDithering(imageData: ImageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = new Float32Array(width * height);

  // Convert to grayscale first
  for (let i = 0; i < width * height; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    // Luminance formula
    data[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

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

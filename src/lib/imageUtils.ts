export function processImage(imageData: ImageData, method: "dithering" | "threshold") {
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

export function getImageContentBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
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

export function trimImageData(imageData: ImageData) {
  const width = imageData.width;
  const height = imageData.height;
  
  // Create a temporary canvas to use getImageContentBounds
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageData;
  
  ctx.putImageData(imageData, 0, 0);
  const bounds = getImageContentBounds(ctx, width, height);
  
  if (bounds.width === width && bounds.height === height && bounds.x === 0 && bounds.y === 0) {
    return imageData;
  }
  
  return ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
}

export function combineImages(images: ImageData[], spacing: number = 0) {
  if (images.length === 0) return null;
  if (images.length === 1 && spacing === 0) return images[0];

  const width = images[0].width;
  let totalHeight = 0;
  for (let i = 0; i < images.length; i++) {
    totalHeight += images[i].height;
    if (i < images.length - 1) totalHeight += spacing;
  }

  const result = new Uint8ClampedArray(width * totalHeight * 4);
  // Fill with transparent/white (depending on printer interpretation, but 0 opacity is usually white)
  result.fill(0); 

  let currentY = 0;
  for (const img of images) {
    if (img.width !== width) {
      console.warn("combineImages: Image width mismatch. Skipping or stretching is not implemented.");
    }
    
    // Copy image data to the result array
    for (let y = 0; y < img.height; y++) {
      const srcStart = y * img.width * 4;
      const srcEnd = srcStart + img.width * 4;
      const destStart = (currentY + y) * width * 4;
      result.set(img.data.subarray(srcStart, srcEnd), destStart);
    }
    
    currentY += img.height + spacing;
  }

  return new ImageData(result, width, totalHeight);
}

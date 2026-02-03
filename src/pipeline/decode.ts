import heic2any from 'heic2any';
import libheif from 'libheif-js/wasm-bundle';

type DecodeOptions = {
  maxDim?: number;
};

async function decodeHeicWithLibheif(file: File, options?: DecodeOptions): Promise<DecodedImage> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(buffer);
  if (!images || images.length === 0) {
    throw new Error('libheif-js returned no images');
  }

  const image = images[0];
  const originalWidth = image.get_width();
  const originalHeight = image.get_height();
  const maxDim = options?.maxDim ?? Math.max(originalWidth, originalHeight);
  const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));

  // libheif-js display expects the full image dimensions; scaling is done after.
  const rgba = new Uint8ClampedArray(originalWidth * originalHeight * 4);
  const imageData = await new Promise<ImageData>((resolve, reject) => {
    image.display({ data: rgba, width: originalWidth, height: originalHeight }, (displayData: any) => {
      if (!displayData) {
        reject(new Error('libheif-js display failed'));
        return;
      }
      resolve(new ImageData(displayData.data, displayData.width, displayData.height));
    });
  });

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = originalWidth;
  sourceCanvas.height = originalHeight;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Canvas context not available');
  sourceCtx.putImageData(imageData, 0, 0);

  let outputCanvas = sourceCanvas;
  if (width !== originalWidth || height !== originalHeight) {
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = width;
    targetCanvas.height = height;
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) throw new Error('Canvas context not available');
    targetCtx.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight, 0, 0, width, height);
    outputCanvas = targetCanvas;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((b) => {
      if (!b) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }
      resolve(b);
    }, 'image/jpeg', 0.92);
  });

  const bitmap = await createImageBitmap(blob);
  const previewUrl = URL.createObjectURL(blob);
  return {
    bitmap,
    width,
    height,
    previewUrl,
    mime: 'image/jpeg',
    originalWidth,
    originalHeight
  };
}

export type DecodedImage = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  previewUrl: string;
  mime: string;
  originalWidth?: number;
  originalHeight?: number;
};

export async function decodeFileToBitmap(file: File, options?: DecodeOptions): Promise<DecodedImage> {
  const isHeic = /\.heic$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';

  // First try native decode (Safari can decode HEIC directly).
  try {
    const nativeBitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const previewUrl = URL.createObjectURL(file);
    return {
      bitmap: nativeBitmap,
      width: nativeBitmap.width,
      height: nativeBitmap.height,
      previewUrl,
      mime: file.type || 'image/jpeg',
      originalWidth: nativeBitmap.width,
      originalHeight: nativeBitmap.height
    };
  } catch {
    // Fall through to HEIC conversion if needed.
  }

  if (isHeic) {
    try {
      const decoded = await decodeHeicWithLibheif(file, options);
      return decoded;
    } catch (err) {
      // Fall through to legacy decoder below.
    }
    try {
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92
      });

      const blob = Array.isArray(converted) ? converted[0] : converted;
      const bitmap = await createImageBitmap(blob);
      const previewUrl = URL.createObjectURL(blob);
      const originalWidth = bitmap.width;
      const originalHeight = bitmap.height;
      return {
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        previewUrl,
        mime: 'image/jpeg',
        originalWidth,
        originalHeight
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      throw new Error(`HEIC decode failed: ${message}`);
    }
  }

  const fallbackBitmap = await createImageBitmap(file);
  const fallbackUrl = URL.createObjectURL(file);
  return {
    bitmap: fallbackBitmap,
    width: fallbackBitmap.width,
    height: fallbackBitmap.height,
    previewUrl: fallbackUrl,
    mime: file.type || 'image/jpeg',
    originalWidth: fallbackBitmap.width,
    originalHeight: fallbackBitmap.height
  };
}

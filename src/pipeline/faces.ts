import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceDetection from '@tensorflow-models/face-detection';
import type { Face } from '../core/types/album/Face';

type DetectorMode = 'fast' | 'accurate' | 'ultra';

const detectors = new Map<DetectorMode, faceDetection.FaceDetector>();

async function getDetector(mode: DetectorMode) {
  const existing = detectors.get(mode);
  if (existing) return existing;
  await tf.setBackend('webgl');
  await tf.ready();
  const detector = await faceDetection.createDetector(
    faceDetection.SupportedModels.MediaPipeFaceDetector,
    {
      runtime: 'tfjs',
      modelType: mode === 'fast' ? 'short' : 'full',
      maxFaces: mode === 'ultra' ? 30 : mode === 'accurate' ? 18 : 6,
      minDetectionConfidence: mode === 'ultra' ? 0.1 : mode === 'accurate' ? 0.18 : 0.5,
      minSuppressionThreshold: mode === 'ultra' ? 0.05 : mode === 'accurate' ? 0.1 : 0.3
    }
  );
  detectors.set(mode, detector);
  return detector;
}

function drawToCanvas(bitmap: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

export async function detectFaces(
  bitmap: ImageBitmap,
  sourceWidth: number,
  sourceHeight: number,
  mode: DetectorMode = 'accurate',
  targetWidth: number = sourceWidth,
  targetHeight: number = sourceHeight,
  debug: boolean = false
): Promise<Face[]> {
  const targetMaxDim = mode === 'ultra' ? 2800 : mode === 'accurate' ? 1800 : 640;
  const secondPassMaxDim = mode === 'ultra' ? 3600 : 2600;
  const tileMaxDim = mode === 'ultra' ? 2400 : 1400;
  const maxDim = Math.max(sourceWidth, sourceHeight);

  const detector = await getDetector(mode);

  const toFaces = (
    detections: faceDetection.Face[],
    scale: number,
    offsetSourceX = 0,
    offsetSourceY = 0
  ): Face[] => {
    const scaleX = (targetWidth / sourceWidth) * scale;
    const scaleY = (targetHeight / sourceHeight) * scale;
    const offsetX = (targetWidth / sourceWidth) * offsetSourceX;
    const offsetY = (targetHeight / sourceHeight) * offsetSourceY;

    return detections.map((det) => {
      const box = det.box;
      const d_width = box.width;
      const d_height = box.height;
      const d_left = box.xMin;
      const d_top = box.yMin;

      const width = (d_width + d_width * 0.2 * 2) * scaleX;
      const height = (d_height + d_height * 0.4 + d_height * 0.2) * scaleY;
      const left = offsetX + (d_left - d_width * 0.2) * scaleX;
      const top = offsetY + (d_top - d_height * 0.4) * scaleY;

      return {
        d_width,
        d_height,
        d_left,
        d_top,
        width,
        height,
        left,
        top,
        scaledWidth: 0,
        scaledHeight: 0,
        offsetX: 0,
        offsetY: 0,
        resizedPhotoWidth: 0,
        resizedPhotoHeight: 0
      };
    });
  };

  const runDetection = async (maxDimTarget: number) => {
    const scale = maxDim > maxDimTarget ? maxDim / maxDimTarget : 1;
    const resizedWidth = Math.max(1, Math.round(sourceWidth / scale));
    const resizedHeight = Math.max(1, Math.round(sourceHeight / scale));
    const canvas = drawToCanvas(bitmap, resizedWidth, resizedHeight);
    const detections = await detector.estimateFaces(canvas);
    return { detections, scale };
  };

  const iou = (a: Face, b: Face) => {
    const ax2 = a.left + a.width;
    const ay2 = a.top + a.height;
    const bx2 = b.left + b.width;
    const by2 = b.top + b.height;
    const ix1 = Math.max(a.left, b.left);
    const iy1 = Math.max(a.top, b.top);
    const ix2 = Math.min(ax2, bx2);
    const iy2 = Math.min(ay2, by2);
    const iw = Math.max(0, ix2 - ix1);
    const ih = Math.max(0, iy2 - iy1);
    const inter = iw * ih;
    const union = a.width * a.height + b.width * b.height - inter;
    return union > 0 ? inter / union : 0;
  };

  const mergeFaces = (faces: Face[]) => {
    const deduped: Face[] = [];
    const sorted = faces.sort((a, b) => b.width * b.height - a.width * a.height);
    const threshold = mode === 'ultra' ? 0.5 : 0.6;
    for (const face of sorted) {
      if (!deduped.some((existing) => iou(existing, face) > threshold)) {
        deduped.push(face);
      }
    }
    return deduped;
  };

  const t0 = performance.now();
  const base = await runDetection(targetMaxDim);
  const t1 = performance.now();
  let baseFaces = toFaces(base.detections, base.scale);

  const minFacesForSecondPass = mode === 'ultra' ? 6 : 1;
  let secondFaces: Face[] = [];
  if ((mode === 'accurate' || mode === 'ultra') && base.detections.length <= minFacesForSecondPass && maxDim > targetMaxDim) {
    const second = await runDetection(Math.min(secondPassMaxDim, maxDim));
    if (second.detections.length > 0) {
      secondFaces = toFaces(second.detections, second.scale);
    }
  }

  let merged = mergeFaces([...baseFaces, ...secondFaces]);

  const t2 = performance.now();

  if (mode === 'ultra') {
    const overlap = 0.3;
    const grid = 3;
      const tileW = sourceWidth / grid;
      const tileH = sourceHeight / grid;
      const stepX = tileW * (1 - overlap);
      const stepY = tileH * (1 - overlap);

      const xs: number[] = [];
      for (let x = 0; x + tileW < sourceWidth; x += stepX) {
        xs.push(Math.min(x, sourceWidth - tileW));
      }
      xs.push(sourceWidth - tileW);
      const ys: number[] = [];
      for (let y = 0; y + tileH < sourceHeight; y += stepY) {
        ys.push(Math.min(y, sourceHeight - tileH));
      }
      ys.push(sourceHeight - tileH);

    const tileFaces: Face[] = [];
    for (const x of xs) {
      for (const y of ys) {
        const maxDimTile = Math.max(tileW, tileH);
        const scaleTile = maxDimTile > tileMaxDim ? maxDimTile / tileMaxDim : 1;
        const resizedWidth = Math.max(1, Math.round(tileW / scaleTile));
        const resizedHeight = Math.max(1, Math.round(tileH / scaleTile));
        const canvas = document.createElement('canvas');
        canvas.width = resizedWidth;
        canvas.height = resizedHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(bitmap, x, y, tileW, tileH, 0, 0, resizedWidth, resizedHeight);
        const detectionsTile = await detector.estimateFaces(canvas);
        if (detectionsTile.length > 0) {
          tileFaces.push(...toFaces(detectionsTile, scaleTile, x, y));
        }
      }
    }
    merged = mergeFaces([...merged, ...tileFaces]);
    if (debug) {
      console.log(`[faces] tiles=${tileFaces.length} total=${merged.length}`);
    }
  }
  const t3 = performance.now();

  if (debug) {
    console.log(
      `[faces] mode=${mode} base=${baseFaces.length} second=${secondFaces.length} total=${merged.length} baseMs=${(t1 - t0).toFixed(0)} secondMs=${(t2 - t1).toFixed(0)} tilesMs=${(t3 - t2).toFixed(0)}`
    );
  }

  return merged;
}

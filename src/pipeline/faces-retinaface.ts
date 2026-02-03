import * as ort from 'onnxruntime-web/wasm';
import type { Face } from '../core/types/album/Face';

type DetectOptions = {
  modelUrl?: string;
  inputHeight?: number;
  inputWidth?: number;
  scoreThreshold?: number;
  nmsThreshold?: number;
  preprocess?: 'stretch' | 'letterbox';
  onDebug?: (info: DebugInfo) => void;
  debug?: boolean;
};

export type DebugBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
};

export type DebugInfo = {
  inputWidth: number;
  inputHeight: number;
  resizeX: number;
  resizeY: number;
  padX: number;
  padY: number;
  scaledWidth: number;
  scaledHeight: number;
  boxesInput: DebugBox[];
  boxesSource: DebugBox[];
  inputCanvas?: HTMLCanvasElement;
  mode: 'stretch' | 'letterbox';
};

const DEFAULTS = {
  modelUrl: (import.meta as any).env?.VITE_RETINAFACE_MODEL_URL ?? '/models/retinaface_mv2.onnx',
  inputHeight: Number((import.meta as any).env?.VITE_RETINAFACE_INPUT_H ?? 640),
  inputWidth: Number((import.meta as any).env?.VITE_RETINAFACE_INPUT_W ?? 640),
  scoreThreshold: Number((import.meta as any).env?.VITE_RETINAFACE_SCORE_THRESHOLD ?? 0.6),
  nmsThreshold: Number((import.meta as any).env?.VITE_RETINAFACE_NMS_THRESHOLD ?? 0.4),
  preprocess: ((import.meta as any).env?.VITE_RETINAFACE_PREPROCESS ?? 'stretch') as
    | 'stretch'
    | 'letterbox'
};

const CFG = {
  minSizes: [
    [16, 32],
    [64, 128],
    [256, 512]
  ],
  steps: [8, 16, 32],
  variance: [0.1, 0.2],
  clip: false
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let assetsChecked = false;
const priorCache = new Map<string, Float32Array>();

async function ensureOrtAssets(basePath: string) {
  if (assetsChecked) return;
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const mustHave = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  for (const name of mustHave) {
    const url = `${prefix}${name}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(
        `ONNX Runtime asset missing: ${url}. Copy all 'ort-wasm-*.mjs' and 'ort-wasm-*.wasm' files to ${prefix}`
      );
    }
  }
  assetsChecked = true;
}

async function getSession(modelUrl: string) {
  if (!sessionPromise) {
    const wasmPath = (import.meta as any).env?.VITE_ORT_WASM_PATH ?? '/onnx/';
    const baseUrl =
      typeof window !== 'undefined' ? new URL(wasmPath, window.location.href).href : wasmPath;
    const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    ort.env.wasm.wasmPaths = {
      mjs: `${prefix}ort-wasm-simd-threaded.mjs`,
      wasm: `${prefix}ort-wasm-simd-threaded.wasm`
    };
    await ensureOrtAssets(baseUrl);
    const crossOriginIsolated = typeof self !== 'undefined' && (self as any).crossOriginIsolated;
    const desiredThreads = Math.min(4, navigator.hardwareConcurrency || 4);
    ort.env.wasm.numThreads = crossOriginIsolated ? Math.max(1, desiredThreads) : 1;
    ort.env.wasm.simd = true;
    console.info(
      `[retinaface] backend=wasm threads=${ort.env.wasm.numThreads} simd=${ort.env.wasm.simd} crossOriginIsolated=${crossOriginIsolated}`
    );
    sessionPromise = ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
  }
  return sessionPromise;
}

function getPriors(inputHeight: number, inputWidth: number) {
  const key = `${inputHeight}x${inputWidth}`;
  const cached = priorCache.get(key);
  if (cached) return cached;

  const featureMaps = CFG.steps.map((step) => [
    Math.ceil(inputHeight / step),
    Math.ceil(inputWidth / step)
  ]);

  const anchors: number[] = [];
  for (let k = 0; k < featureMaps.length; k += 1) {
    const [fH, fW] = featureMaps[k];
    const minSizes = CFG.minSizes[k];
    const step = CFG.steps[k];
    for (let i = 0; i < fH; i += 1) {
      for (let j = 0; j < fW; j += 1) {
        for (const minSize of minSizes) {
          const s_kx = minSize / inputWidth;
          const s_ky = minSize / inputHeight;
          const cx = (j + 0.5) * step / inputWidth;
          const cy = (i + 0.5) * step / inputHeight;
          anchors.push(cx, cy, s_kx, s_ky);
        }
      }
    }
  }

  const priors = new Float32Array(anchors);
  priorCache.set(key, priors);
  return priors;
}

type Mat = {
  data: Float32Array;
  n: number;
  c: number;
  layout: 'NC' | 'CN';
};

function toMat(tensor: ort.Tensor): Mat | null {
  const data = tensor.data as Float32Array;
  const dims = tensor.dims;
  if (dims.length === 3) {
    const [a, b, c] = dims;
    if (c === 2 || c === 4 || c === 10) {
      return { data, n: b, c, layout: 'NC' };
    }
    if (b === 2 || b === 4 || b === 10) {
      return { data, n: c, c: b, layout: 'CN' };
    }
  }
  if (dims.length === 2) {
    const [n, c] = dims;
    if (c === 2 || c === 4 || c === 10) {
      return { data, n, c, layout: 'NC' };
    }
  }
  return null;
}

function matVal(mat: Mat, idx: number, c: number) {
  if (mat.layout === 'NC') return mat.data[idx * mat.c + c];
  return mat.data[c * mat.n + idx];
}

function softmax2(a: number, b: number) {
  const max = Math.max(a, b);
  const ea = Math.exp(a - max);
  const eb = Math.exp(b - max);
  return eb / (ea + eb);
}

function preprocess(
  bitmap: ImageBitmap,
  inputHeight: number,
  inputWidth: number,
  mode: 'stretch' | 'letterbox'
) {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = bitmap.width;
  srcCanvas.height = bitmap.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Canvas context not available');
  srcCtx.drawImage(bitmap, 0, 0);

  let newW = inputWidth;
  let newH = inputHeight;
  let padX = 0;
  let padY = 0;
  let resize = 1;
  let resizeY = 1;

  if (mode === 'letterbox') {
    const ratio = Math.min(inputWidth / bitmap.width, inputHeight / bitmap.height);
    newW = Math.max(1, Math.floor(bitmap.width * ratio));
    newH = Math.max(1, Math.floor(bitmap.height * ratio));
    padX = Math.floor((inputWidth - newW) / 2);
    padY = Math.floor((inputHeight - newH) / 2);
    resize = newW / bitmap.width;
    resizeY = newH / bitmap.height;
  } else {
    newW = inputWidth;
    newH = inputHeight;
    resize = newW / bitmap.width;
    resizeY = newH / bitmap.height;
  }

  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newW;
  resizedCanvas.height = newH;
  const resizedCtx = resizedCanvas.getContext('2d');
  if (!resizedCtx) throw new Error('Canvas context not available');
  resizedCtx.drawImage(srcCanvas, 0, 0, bitmap.width, bitmap.height, 0, 0, newW, newH);

  const paddedCanvas = document.createElement('canvas');
  paddedCanvas.width = inputWidth;
  paddedCanvas.height = inputHeight;
  const paddedCtx = paddedCanvas.getContext('2d');
  if (!paddedCtx) throw new Error('Canvas context not available');
  paddedCtx.fillStyle = 'black';
  paddedCtx.fillRect(0, 0, inputWidth, inputHeight);
  paddedCtx.drawImage(resizedCanvas, padX, padY);

  const imageData = paddedCtx.getImageData(0, 0, inputWidth, inputHeight);
  const size = inputWidth * inputHeight;
  const data = new Float32Array(1 * 3 * size);

  for (let i = 0; i < size; i += 1) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    data[i] = b - 104;
    data[i + size] = g - 117;
    data[i + size * 2] = r - 123;
  }

  return {
    tensor: new ort.Tensor('float32', data, [1, 3, inputHeight, inputWidth]),
    resizeX: resize,
    resizeY,
    padX,
    padY,
    scaledWidth: newW,
    scaledHeight: newH,
    inputCanvas: paddedCanvas
  };
}

function iou(a: [number, number, number, number], b: [number, number, number, number]) {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}

function nms(boxes: Array<[number, number, number, number]>, scores: number[], threshold: number) {
  const order = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).map((p) => p[1]);
  const keep: number[] = [];
  while (order.length > 0) {
    const current = order.shift()!;
    keep.push(current);
    const rest: number[] = [];
    for (const idx of order) {
      if (iou(boxes[current], boxes[idx]) <= threshold) rest.push(idx);
    }
    order.splice(0, order.length, ...rest);
  }
  return keep;
}

export async function detectFacesRetinafaceOnnx(
  bitmap: ImageBitmap,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  options: DetectOptions = {}
): Promise<Face[]> {
  const config = { ...DEFAULTS, ...options };
  const debug = Boolean(config.debug);

  const t0 = performance.now();
  const session = await getSession(config.modelUrl!);
  const inputName = session.inputNames[0];
  let inputHeight = config.inputHeight!;
  let inputWidth = config.inputWidth!;
  const meta = (session as any).inputMetadata?.[inputName];
  const dims: number[] | undefined = meta?.dimensions;
  if (dims && dims.length >= 4) {
    const h = dims[dims.length - 2];
    const w = dims[dims.length - 1];
    if (Number.isFinite(h) && Number.isFinite(w) && h > 0 && w > 0) {
      inputHeight = h;
      inputWidth = w;
    }
  }
  if (debug) {
    console.log('[retinaface] inputs=', session.inputNames, 'outputs=', session.outputNames);
    if (dims) {
      console.log('[retinaface] input dims=', dims, `using=${inputHeight}x${inputWidth}`);
    }
  }
  const t1 = performance.now();

  const { tensor, resizeX, resizeY, padX, padY, scaledWidth, scaledHeight, inputCanvas } = preprocess(
    bitmap,
    inputHeight,
    inputWidth,
    config.preprocess!
  );
  const t2 = performance.now();

  const output = await session.run({ [inputName]: tensor });
  const t3 = performance.now();

  const mats: Mat[] = [];
  for (const name of session.outputNames) {
    const mat = toMat(output[name]);
    if (mat) mats.push(mat);
  }

  const loc = mats.find((m) => m.c === 4);
  const conf = mats.find((m) => m.c === 2);
  if (!loc || !conf) {
    throw new Error('RetinaFace outputs not recognized. Expected loc/conf tensors.');
  }

  const priors = getPriors(inputHeight, inputWidth);
  const numPriors = Math.min(loc.n, Math.floor(priors.length / 4));
  const boxes: Array<[number, number, number, number]> = [];
  const boxesInput: Array<[number, number, number, number]> = [];
  const boxesSource: Array<[number, number, number, number]> = [];
  const scores: number[] = [];
  const scaleX = inputWidth;
  const scaleY = inputHeight;

  for (let i = 0; i < numPriors; i += 1) {
    const score = softmax2(matVal(conf, i, 0), matVal(conf, i, 1));
    if (score < config.scoreThreshold!) continue;

    const priorCx = priors[i * 4];
    const priorCy = priors[i * 4 + 1];
    const priorW = priors[i * 4 + 2];
    const priorH = priors[i * 4 + 3];

    const dx = matVal(loc, i, 0);
    const dy = matVal(loc, i, 1);
    const dw = matVal(loc, i, 2);
    const dh = matVal(loc, i, 3);

    const cx = priorCx + dx * CFG.variance[0] * priorW;
    const cy = priorCy + dy * CFG.variance[0] * priorH;
    const w = priorW * Math.exp(dw * CFG.variance[1]);
    const h = priorH * Math.exp(dh * CFG.variance[1]);

    const x1Input = (cx - w / 2) * scaleX;
    const y1Input = (cy - h / 2) * scaleY;
    const x2Input = (cx + w / 2) * scaleX;
    const y2Input = (cy + h / 2) * scaleY;

    let x1 = (x1Input - padX) / resizeX;
    let y1 = (y1Input - padY) / resizeY;
    let x2 = (x2Input - padX) / resizeX;
    let y2 = (y2Input - padY) / resizeY;

    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    if (centerX < 0 || centerY < 0 || centerX > sourceWidth || centerY > sourceHeight) continue;

    boxesInput.push([x1Input, y1Input, x2Input, y2Input]);
    boxesSource.push([x1, y1, x2, y2]);

    x1 = (x1 / sourceWidth) * targetWidth;
    y1 = (y1 / sourceHeight) * targetHeight;
    x2 = (x2 / sourceWidth) * targetWidth;
    y2 = (y2 / sourceHeight) * targetHeight;

    const clampedX1 = Math.max(0, Math.min(targetWidth, x1));
    const clampedY1 = Math.max(0, Math.min(targetHeight, y1));
    const clampedX2 = Math.max(0, Math.min(targetWidth, x2));
    const clampedY2 = Math.max(0, Math.min(targetHeight, y2));
    if (clampedX2 <= clampedX1 || clampedY2 <= clampedY1) continue;

    boxes.push([clampedX1, clampedY1, clampedX2, clampedY2]);
    scores.push(score);
  }

  if (boxes.length === 0) {
    if (config.onDebug) {
      config.onDebug({
        inputWidth,
        inputHeight,
        resizeX,
        resizeY,
        padX,
        padY,
        scaledWidth,
        scaledHeight,
        boxesInput: [],
        boxesSource: [],
        inputCanvas,
        mode: config.preprocess!
      });
    }
    return [];
  }
  const keep = nms(boxes, scores, config.nmsThreshold!);
  const faces: Face[] = [];

  if (config.onDebug) {
    const boxesInputKeep: DebugBox[] = keep.map((idx) => ({
      x1: boxesInput[idx][0],
      y1: boxesInput[idx][1],
      x2: boxesInput[idx][2],
      y2: boxesInput[idx][3],
      score: scores[idx]
    }));
    const boxesSourceKeep: DebugBox[] = keep.map((idx) => ({
      x1: boxesSource[idx][0],
      y1: boxesSource[idx][1],
      x2: boxesSource[idx][2],
      y2: boxesSource[idx][3],
      score: scores[idx]
    }));
    config.onDebug({
      inputWidth,
      inputHeight,
      resizeX,
      resizeY,
      padX,
      padY,
      scaledWidth,
      scaledHeight,
      boxesInput: boxesInputKeep,
      boxesSource: boxesSourceKeep,
      inputCanvas,
      mode: config.preprocess!
    });
  }
  for (const idx of keep) {
    const [x1, y1, x2, y2] = boxes[idx];
    const w = x2 - x1;
    const h = y2 - y1;
    const left = Math.max(0, x1 - w * 0.2);
    const top = Math.max(0, y1 - h * 0.4);
    const right = Math.min(targetWidth, x2 + w * 0.2);
    const bottom = Math.min(targetHeight, y2 + h * 0.2);

    faces.push({
      d_width: w,
      d_height: h,
      d_left: x1,
      d_top: y1,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      left,
      top,
      scaledWidth: 0,
      scaledHeight: 0,
      offsetX: 0,
      offsetY: 0,
      resizedPhotoWidth: 0,
      resizedPhotoHeight: 0
    });
  }

  if (debug) {
    console.log(
      `[retinaface] mode=${config.preprocess} resize=(${resizeX.toFixed(6)},${resizeY.toFixed(6)}) pad=(${padX},${padY}) scaled=${scaledWidth}x${scaledHeight}`
    );
  }
  if (debug) {
    const t4 = performance.now();
    console.log(
      `[retinaface] prep=${(t2 - t1).toFixed(0)}ms infer=${(t3 - t2).toFixed(0)}ms post=${(t4 - t3).toFixed(0)}ms faces=${faces.length}`
    );
  }

  return faces;
}

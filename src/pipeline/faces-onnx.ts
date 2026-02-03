import * as ort from 'onnxruntime-web/wasm';
import type { Face } from '../core/types/album/Face';

type DetectOptions = {
  modelUrl?: string;
  inputSize?: number;
  scoreThreshold?: number;
  nmsThreshold?: number;
  mean?: number;
  std?: number;
  swapRB?: boolean;
  debug?: boolean;
};

const DEFAULTS = {
  modelUrl: (import.meta as any).env?.VITE_SCRFD_MODEL_URL ?? '/models/scrfd_10g_bnkps.onnx',
  inputSize: Number((import.meta as any).env?.VITE_SCRFD_INPUT_SIZE ?? 640),
  scoreThreshold: Number((import.meta as any).env?.VITE_SCRFD_SCORE_THRESHOLD ?? 0.7),
  nmsThreshold: Number((import.meta as any).env?.VITE_SCRFD_NMS_THRESHOLD ?? 0.45),
  mean: Number((import.meta as any).env?.VITE_SCRFD_MEAN ?? 127.5),
  std: Number((import.meta as any).env?.VITE_SCRFD_STD ?? 128.0),
  swapRB: String((import.meta as any).env?.VITE_SCRFD_SWAP_RB ?? 'true') !== 'false'
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let assetsChecked = false;
const anchorCenterCache = new Map<string, Float32Array>();

async function ensureOrtAssets(basePath: string) {
  if (assetsChecked) return;
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const mustHave = [
    'ort-wasm-simd-threaded.mjs',
    'ort-wasm-simd-threaded.wasm'
  ];

  for (const name of mustHave) {
    const url = `${prefix}${name}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(
        `ONNX Runtime asset missing: ${url}. Copy all 'ort-wasm-*.mjs' and 'ort-wasm-*.wasm' files to ${prefix}`
      );
    }
    if (name.endsWith('.mjs')) {
      const text = await res.text();
      if (text.trim().startsWith('<')) {
        throw new Error(`ONNX Runtime asset is not JS: ${url}`);
      }
    } else if (name.endsWith('.wasm')) {
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length < 4 || buf[0] !== 0x00 || buf[1] !== 0x61 || buf[2] !== 0x73 || buf[3] !== 0x6d) {
        throw new Error(`ONNX Runtime asset is not WASM: ${url}`);
      }
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
    const wasmMjs = `${prefix}ort-wasm-simd-threaded.mjs`;
    const wasmBin = `${prefix}ort-wasm-simd-threaded.wasm`;
    ort.env.wasm.wasmPaths = { mjs: wasmMjs, wasm: wasmBin };
    await ensureOrtAssets(baseUrl);
    const crossOriginIsolated = typeof self !== 'undefined' && (self as any).crossOriginIsolated;
    const desiredThreads = Math.min(4, navigator.hardwareConcurrency || 4);
    ort.env.wasm.numThreads = crossOriginIsolated ? Math.max(1, desiredThreads) : 1;
    ort.env.wasm.simd = true;
    console.info(
      `[onnx] backend=wasm threads=${ort.env.wasm.numThreads} simd=${ort.env.wasm.simd} crossOriginIsolated=${crossOriginIsolated}`
    );
    sessionPromise = ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm']
    });
  }
  return sessionPromise;
}

function preprocess(
  bitmap: ImageBitmap,
  inputSize: number,
  mean: number,
  std: number,
  swapRB: boolean
) {
  const canvas = document.createElement('canvas');
  canvas.width = inputSize;
  canvas.height = inputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, inputSize, inputSize);

  const imRatio = bitmap.height / bitmap.width;
  const modelRatio = 1;
  let newW: number;
  let newH: number;
  if (imRatio > modelRatio) {
    newH = inputSize;
    newW = Math.max(1, Math.floor(newH / imRatio));
  } else {
    newW = inputSize;
    newH = Math.max(1, Math.floor(newW * imRatio));
  }
  const detScale = newH / bitmap.height;
  const dx = 0;
  const dy = 0;

  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, dx, dy, newW, newH);
  const imageData = ctx.getImageData(0, 0, inputSize, inputSize);

  const size = inputSize * inputSize;
  const data = new Float32Array(1 * 3 * size);

  for (let i = 0; i < size; i += 1) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    const c0 = swapRB ? b : r;
    const c1 = g;
    const c2 = swapRB ? r : b;
    data[i] = (c0 - mean) / std;
    data[i + size] = (c1 - mean) / std;
    data[i + size * 2] = (c2 - mean) / std;
  }

  return {
    tensor: new ort.Tensor('float32', data, [1, 3, inputSize, inputSize]),
    detScale,
    dx,
    dy,
    scaledWidth: newW,
    scaledHeight: newH
  };
}

function iou(a: [number, number, number, number], b: [number, number, number, number]) {
  const ax2 = a[2];
  const ay2 = a[3];
  const bx2 = b[2];
  const by2 = b[3];
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = (ax2 - a[0]) * (ay2 - a[1]);
  const areaB = (bx2 - b[0]) * (by2 - b[1]);
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
      if (iou(boxes[current], boxes[idx]) <= threshold) {
        rest.push(idx);
      }
    }
    order.splice(0, order.length, ...rest);
  }
  return keep;
}

function extractStride(name: string): number | null {
  const match = name.match(/(\d+)/g);
  if (!match || match.length === 0) return null;
  const value = Number(match[match.length - 1]);
  return Number.isFinite(value) ? value : null;
}

function getAnchorCenters(feat: number, anchors: number, stride: number) {
  const key = `${feat}-${anchors}-${stride}`;
  const cached = anchorCenterCache.get(key);
  if (cached) return cached;
  const total = feat * feat * anchors;
  const centers = new Float32Array(total * 2);
  let idx = 0;
  for (let y = 0; y < feat; y += 1) {
    for (let x = 0; x < feat; x += 1) {
      const cx = x * stride;
      const cy = y * stride;
      for (let a = 0; a < anchors; a += 1) {
        centers[idx * 2] = cx;
        centers[idx * 2 + 1] = cy;
        idx += 1;
      }
    }
  }
  anchorCenterCache.set(key, centers);
  return centers;
}

export async function detectFacesOnnx(
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
  if (debug) {
    console.log('[onnx] inputs=', session.inputNames, 'outputs=', session.outputNames);
  }
  const t1 = performance.now();

  const { tensor, detScale, scaledWidth, scaledHeight } = preprocess(
    bitmap,
    config.inputSize!,
    config.mean!,
    config.std!,
    config.swapRB!
  );
  const t2 = performance.now();
  if (debug) {
    console.log(
      `[onnx] detScale=${detScale.toFixed(6)} scaled=${scaledWidth}x${scaledHeight} source=${sourceWidth}x${sourceHeight}`
    );
  }

  const output = await session.run({ [inputName]: tensor });
  const t3 = performance.now();

  if (debug) {
    for (const name of session.outputNames) {
      const tensorOut = output[name];
      const len = (tensorOut.data as Float32Array)?.length ?? 0;
      console.log('[onnx] raw output', name, 'dims=', tensorOut.dims, 'type=', tensorOut.type, 'len=', len);
    }
  }

  type OutputInfo = {
    name: string;
    data: Float32Array;
    dims: readonly number[];
    c: number;
    h: number;
    w: number;
    layout: 'NCHW' | 'NHWC';
  };

  type FlatOutput = {
    name: string;
    data: Float32Array;
    dims: readonly number[];
    n: number;
    c: number;
  };

  const outputs: OutputInfo[] = [];
  const flatOutputs: FlatOutput[] = [];
  for (const name of session.outputNames) {
    const tensorOut = output[name];
    const data = tensorOut.data as Float32Array;
    const dims = tensorOut.dims;
    if (dims.length === 4) {
      const [n, a, b, c] = dims;
      if (!n || !a || !b || !c) continue;
      // Heuristic: channel dimension is small (<=32) compared to spatial.
      if (a <= 32 && b >= 8 && c >= 8) {
        outputs.push({ name, data, dims, c: a, h: b, w: c, layout: 'NCHW' });
      } else if (c <= 32 && a >= 8 && b >= 8) {
        outputs.push({ name, data, dims, c: c, h: a, w: b, layout: 'NHWC' });
      } else {
        // default to NCHW
        outputs.push({ name, data, dims, c: a, h: b, w: c, layout: 'NCHW' });
      }
    } else if (dims.length === 3) {
      const [a, b, c] = dims;
      if (!a || !b || !c) continue;
      // Flattened: [1, N, C] or [N, C, 1]
      if (a === 1 && b >= 32 && c <= 32) {
        flatOutputs.push({ name, data, dims, n: b, c });
        continue;
      }
      if (c === 1 && a >= 32 && b <= 32) {
        flatOutputs.push({ name, data, dims, n: a, c: b });
        continue;
      }
      if (a <= 32 && b >= 8 && c >= 8) {
        outputs.push({ name, data, dims, c: a, h: b, w: c, layout: 'NCHW' });
      } else if (c <= 32 && a >= 8 && b >= 8) {
        outputs.push({ name, data, dims, c: c, h: a, w: b, layout: 'NHWC' });
      } else {
        outputs.push({ name, data, dims, c: a, h: b, w: c, layout: 'NCHW' });
      }
    } else if (dims.length === 2) {
      const [a, b] = dims;
      if (a && b) {
        flatOutputs.push({ name, data, dims, n: a, c: b });
      }
    } else if (dims.length === 1) {
      const [a] = dims;
      if (a) {
        flatOutputs.push({ name, data, dims, n: a, c: 1 });
      }
    }
  }

  if (debug) {
    const summary = outputs
      .map((o) => `${o.name}: [${o.dims.join(',')}] ${o.layout}`)
      .join(' | ');
    const flatSummary = flatOutputs
      .map((o) => `${o.name}: [${o.dims.join(',')}] flat n=${o.n} c=${o.c}`)
      .join(' | ');
    console.log('[onnx] output shapes', summary);
    if (flatOutputs.length > 0) {
      console.log('[onnx] flat outputs', flatSummary);
    }
  }

  const bySpatial = new Map<string, OutputInfo[]>();
  for (const out of outputs) {
    const key = `${out.h}x${out.w}`;
    const list = bySpatial.get(key) ?? [];
    list.push(out);
    bySpatial.set(key, list);
  }

  const boxes: Array<[number, number, number, number]> = [];
  const scores: number[] = [];
  let parsedAny = false;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));
  const isInValidRegion = (x1: number, y1: number, x2: number, y2: number) => {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    return cx >= 0 && cy >= 0 && cx <= scaledWidth && cy <= scaledHeight;
  };

  const getAt = (
    out: OutputInfo,
    c: number,
    y: number,
    x: number
  ) => {
    if (out.layout === 'NHWC') {
      return out.data[(y * out.w + x) * out.c + c];
    }
    return out.data[(c * out.h + y) * out.w + x];
  };

  for (const [, group] of bySpatial.entries()) {
    // Prefer name-based if available.
    let scoreOut = group.find((o) => o.name.toLowerCase().includes('score') || o.name.toLowerCase().includes('cls'));
    let bboxOut = group.find((o) => o.name.toLowerCase().includes('bbox') || o.name.toLowerCase().includes('reg'));

    if (!scoreOut || !bboxOut) {
      // Fallback: infer by channel count.
      bboxOut = group.find((o) => o.c % 4 === 0 && o.c >= 4);
      if (!bboxOut) continue;
      const anchors = Math.max(1, Math.round(bboxOut.c / 4));
      scoreOut =
        group.find((o) => o.c === anchors * 2) ||
        group.find((o) => o.c === anchors) ||
        group.find((o) => o.c % 2 === 0);
    }

    if (!scoreOut || !bboxOut) {
      continue;
    }
    parsedAny = true;

    const featH = scoreOut.h;
    const featW = scoreOut.w;
    const stride = Math.round(config.inputSize! / featH);
    const anchors = Math.max(1, Math.round(bboxOut.c / 4));

    for (let y = 0; y < featH; y += 1) {
      for (let x = 0; x < featW; x += 1) {
        for (let a = 0; a < anchors; a += 1) {
          const scoreChannel = a * 2 + 1;
          if (scoreChannel >= scoreOut.c) continue;
          const score = getAt(scoreOut, scoreChannel, y, x);
          if (score < config.scoreThreshold!) continue;

          const l = getAt(bboxOut, a * 4 + 0, y, x) * stride;
          const t = getAt(bboxOut, a * 4 + 1, y, x) * stride;
          const r = getAt(bboxOut, a * 4 + 2, y, x) * stride;
          const b = getAt(bboxOut, a * 4 + 3, y, x) * stride;

          const cx = x * stride;
          const cy = y * stride;

          let x1 = cx - l;
          let y1 = cy - t;
          let x2 = cx + r;
          let y2 = cy + b;

          if (!isInValidRegion(x1, y1, x2, y2)) continue;

          // Undo resize scale back to source image space.
          x1 = x1 / detScale;
          y1 = y1 / detScale;
          x2 = x2 / detScale;
          y2 = y2 / detScale;

          // Map to target (original) size if needed.
          x1 = (x1 / sourceWidth) * targetWidth;
          y1 = (y1 / sourceHeight) * targetHeight;
          x2 = (x2 / sourceWidth) * targetWidth;
          y2 = (y2 / sourceHeight) * targetHeight;

          const clampedX1 = clamp(x1, 0, targetWidth);
          const clampedY1 = clamp(y1, 0, targetHeight);
          const clampedX2 = clamp(x2, 0, targetWidth);
          const clampedY2 = clamp(y2, 0, targetHeight);
          if (clampedX2 <= clampedX1 || clampedY2 <= clampedY1) continue;
          boxes.push([clampedX1, clampedY1, clampedX2, clampedY2]);
          scores.push(score);
        }
      }
    }
  }

  if (!parsedAny) {
    // Fallback to flat outputs if present.
    if (flatOutputs.length > 0) {
      const byN = new Map<number, FlatOutput[]>();
      for (const out of flatOutputs) {
        const list = byN.get(out.n) ?? [];
        list.push(out);
        byN.set(out.n, list);
      }

      const possibleStrides = [8, 16, 32, 64];

      const inferStrideAndAnchors = (n: number, inputSize: number) => {
        for (const stride of possibleStrides) {
          const feat = inputSize / stride;
          if (!Number.isInteger(feat)) continue;
          const anchors = n / (feat * feat);
          if (Number.isInteger(anchors) && anchors > 0 && anchors <= 4) {
            return { stride, feat: feat as number, anchors: anchors as number };
          }
        }
        return null;
      };

      const maybeSigmoid = (val: number, useSigmoid: boolean) =>
        useSigmoid ? 1 / (1 + Math.exp(-val)) : val;

      for (const [n, group] of byN.entries()) {
        const bboxOut =
          group.find((o) => o.name.toLowerCase().includes('bbox') || o.name.toLowerCase().includes('reg')) ||
          group.find((o) => o.c === 4);
        const scoreOut =
          group.find((o) => o.name.toLowerCase().includes('score') || o.name.toLowerCase().includes('cls')) ||
          group.find((o) => o.c === 1);

        if (!bboxOut || !scoreOut) continue;

        const inferred = inferStrideAndAnchors(n, config.inputSize!);
        if (!inferred) continue;

        const { stride, feat, anchors } = inferred;
        const centers = getAnchorCenters(feat, anchors, stride);

        let scoreNeedsSigmoid = false;
        for (let i = 0; i < Math.min(100, scoreOut.data.length); i += 1) {
          const v = scoreOut.data[i];
          if (v < 0 || v > 1) {
            scoreNeedsSigmoid = true;
            break;
          }
        }

        for (let idx = 0; idx < n; idx += 1) {
          const score = maybeSigmoid(scoreOut.data[idx], scoreNeedsSigmoid);
          if (score < config.scoreThreshold!) continue;

          const base = idx * 4;
          const l = bboxOut.data[base + 0] * stride;
          const t = bboxOut.data[base + 1] * stride;
          const r = bboxOut.data[base + 2] * stride;
          const b = bboxOut.data[base + 3] * stride;

          const cx = centers[idx * 2];
          const cy = centers[idx * 2 + 1];

          let x1 = cx - l;
          let y1 = cy - t;
          let x2 = cx + r;
          let y2 = cy + b;

          if (!isInValidRegion(x1, y1, x2, y2)) continue;

          x1 = x1 / detScale;
          y1 = y1 / detScale;
          x2 = x2 / detScale;
          y2 = y2 / detScale;
          x1 = (x1 / sourceWidth) * targetWidth;
          y1 = (y1 / sourceHeight) * targetHeight;
          x2 = (x2 / sourceWidth) * targetWidth;
          y2 = (y2 / sourceHeight) * targetHeight;

          const clampedX1 = clamp(x1, 0, targetWidth);
          const clampedY1 = clamp(y1, 0, targetHeight);
          const clampedX2 = clamp(x2, 0, targetWidth);
          const clampedY2 = clamp(y2, 0, targetHeight);
          if (clampedX2 <= clampedX1 || clampedY2 <= clampedY1) continue;
          boxes.push([clampedX1, clampedY1, clampedX2, clampedY2]);
          scores.push(score);
        }
      }

      parsedAny = boxes.length > 0;
    }

    if (!parsedAny) {
      throw new Error('SCRFD model outputs not recognized. Expected score/bbox tensors.');
    }
  }

  if (boxes.length === 0) {
    if (debug) {
      console.log('[onnx] no faces detected');
    }
    return [];
  }

  const keep = nms(boxes, scores, config.nmsThreshold!);
  const faces: Face[] = [];

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
    const t4 = performance.now();
    console.log(
      `[onnx] prep=${(t2 - t1).toFixed(0)}ms infer=${(t3 - t2).toFixed(0)}ms post=${(t4 - t3).toFixed(0)}ms faces=${faces.length}`
    );
  }

  return faces;
}

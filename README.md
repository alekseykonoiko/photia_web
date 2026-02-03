# Photia Web Prototype (Phase 1)

Local-only prototype to validate:
- HEIC decoding in the browser
- Face detection on the client
- Album compilation using the **same algorithm** as the mobile app

No backend calls, no uploads.

## Prerequisites
- Node.js 18+ (you have 23.9.0)
- npm

## Setup
```bash
cd /Users/akonoiko/Downloads/Photia-App-main/web-prototype
npm install
```

## Run
```bash
npm run dev
```
Open the URL shown in the terminal (default is `http://localhost:5173`).

## Load Templates
Templates auto-load from the API for region `BY` via the Vite proxy.

Pick a template from the dropdown once the list loads.

## Notes
- Face detection supports TFJS (fast/accurate/ultra) and ONNX (SCRFD + RetinaFace).
- HEIC decoding in Chrome/Firefox uses the local `libheif-js/wasm-bundle` package.
- Safari can decode HEIC natively.
- The compiled album JSON can be downloaded from the UI.

## ONNX Face Detection (SCRFD + RetinaFace)
The ONNX detectors expect model files in the web app `public` folder.

1. Download SCRFD and/or RetinaFace ONNX models.
2. Place them here:
   - `web-prototype/public/models/scrfd_10g_bnkps.onnx`
   - `web-prototype/public/models/retinaface_mv1_0.25.onnx`
   - `web-prototype/public/models/retinaface_mv2.onnx`
3. Restart the dev server and select the desired ONNX mode in the UI.

Optional environment variables:
- `VITE_SCRFD_MODEL_URL` (default `/models/scrfd_10g_bnkps.onnx`)
- `VITE_SCRFD_INPUT_SIZE` (default `640`)
- `VITE_SCRFD_SCORE_THRESHOLD` (default `0.3`)
- `VITE_SCRFD_NMS_THRESHOLD` (default `0.45`)
- `VITE_SCRFD_MEAN` (default `127.5`)
- `VITE_SCRFD_STD` (default `128`)
- `VITE_SCRFD_SWAP_RB` (default `true`)
- `VITE_RETINAFACE_MODEL_URL` (default `/models/retinaface_mv2.onnx`)
- `VITE_RETINAFACE_INPUT_H` (default `640`)
- `VITE_RETINAFACE_INPUT_W` (default `640`)
- `VITE_RETINAFACE_SCORE_THRESHOLD` (default `0.6`)
- `VITE_RETINAFACE_NMS_THRESHOLD` (default `0.4`)
- `VITE_RETINAFACE_PREPROCESS` (default `stretch`; set to `letterbox` if needed)
- `VITE_ORT_WASM_PATH` (optional; set to `/onnx/` if you copy wasm files locally)

To enable ONNX Runtime in the browser you **must** provide the wasm files.

Recommended (local, no CDN):
1. Copy files from `node_modules/onnxruntime-web/dist/` to `web-prototype/public/onnx/`
2. The app will load wasm from `/onnx/` by default. You can override with `VITE_ORT_WASM_PATH`.

Example:
```bash
mkdir -p /Users/akonoiko/Downloads/Photia-App-main/web-prototype/public/onnx
cp /Users/akonoiko/Downloads/Photia-App-main/web-prototype/node_modules/onnxruntime-web/dist/ort-wasm-*.mjs \
  /Users/akonoiko/Downloads/Photia-App-main/web-prototype/public/onnx/
cp /Users/akonoiko/Downloads/Photia-App-main/web-prototype/node_modules/onnxruntime-web/dist/ort-wasm-*.wasm \
  /Users/akonoiko/Downloads/Photia-App-main/web-prototype/public/onnx/
```

Vite note:
- The app uses the wasm-only build of ONNX Runtime and expects
  `ort-wasm-simd-threaded.mjs` + `ort-wasm-simd-threaded.wasm` in `/public/onnx`.
- A small patch adds `@vite-ignore` to the ONNX dynamic import so loading from `/public/onnx` works.
- This runs automatically on `npm install` via `postinstall`.
- If you still see `Failed to load url /onnx/...mjs`, clear `node_modules/.vite` and restart `npm run dev`.

## Next Step
Once this prototype matches mobile output for the same photo set:
- connect to a staging API
- upload originals via presigned S3 URLs

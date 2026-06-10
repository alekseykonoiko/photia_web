import { useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import productFixture from './fixtures/product.json';
import type { Product } from './core/types/Product';
import type { Photo } from './core/types/album/Photo';
import type { Frame } from './core/types/album/Frame';
import { Orientation } from './core/Constants';
import { decodeFileToBitmap } from './pipeline/decode';
import { detectFacesRetinafaceOnnx, preloadFaceDetection } from './pipeline/faces-retinaface';
import { buildAlbum } from './pipeline/buildAlbum';
import LoginPage from './components/LoginPage';

const emptyFrame = (): Frame => ({
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  angle: 0,
  type: 0,
  scaledWidth: 0,
  scaledHeight: 0,
  scaledTop: 0,
  scaledLeft: 0,
  index: 0,
  universal: false,
  cutWidth: 0,
  cutHeight: 0,
  cutTop: 0,
  cutLeft: 0,
  cutScaledWidth: 0,
  cutScaledHeight: 0,
  cutScaledTop: 0,
  cutScaledLeft: 0,
  secWidth: 0,
  secHeight: 0,
  secTop: 0,
  secLeft: 0,
  secScaledWidth: 0,
  secScaledHeight: 0,
  secScaledTop: 0,
  secScaledLeft: 0,
  version: 0
});

type PhotoItem = {
  file: File;
  photo: Photo;
  previewUrl: string;
};

function isValidProduct(input: unknown): input is Product {
  if (!input || typeof input !== 'object') return false;
  const product = input as Product;
  return Boolean(product.id && product.name && product.template && product.template.pageTemplates);
}

function FacePreview({ item, showFaces }: { item: PhotoItem; showFaces: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [imageReady, setImageReady] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageReady((prev) => prev + 1);
    };
    img.src = item.previewUrl;
    return () => {
      img.onload = null;
    };
  }, [item.previewUrl]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    if (size.width === 0 || size.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.max(1, Math.round(size.width));
    canvas.height = Math.max(1, Math.round(size.height));
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const srcW = item.photo.width || img.naturalWidth || canvas.width;
    const srcH = item.photo.height || img.naturalHeight || canvas.height;
    const scale = Math.max(canvas.width / srcW, canvas.height / srcH);
    const displayW = srcW * scale;
    const displayH = srcH * scale;
    const offsetX = (canvas.width - displayW) / 2;
    const offsetY = (canvas.height - displayH) / 2;

    ctx.drawImage(img, offsetX, offsetY, displayW, displayH);

    if (showFaces && item.photo.faces && item.photo.faces.length > 0) {
      ctx.strokeStyle = '#ff4d4f';
      ctx.lineWidth = 2;
      for (const face of item.photo.faces) {
        const rawLeft = face.d_left ?? face.left;
        const rawTop = face.d_top ?? face.top;
        const rawWidth = face.d_width ?? face.width;
        const rawHeight = face.d_height ?? face.height;
        const left = offsetX + rawLeft * scale;
        const top = offsetY + rawTop * scale;
        const width = rawWidth * scale;
        const height = rawHeight * scale;
        if (width <= 0 || height <= 0) continue;
        ctx.strokeRect(left, top, width, height);
      }
    }
  }, [imageReady, item.photo.faces, item.photo.height, item.photo.width, showFaces, size.height, size.width]);

  return (
    <div ref={containerRef} className="preview-wrap">
      <canvas ref={canvasRef} className="preview-canvas" />
    </div>
  );
}

function MainApp() {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [albumJson, setAlbumJson] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<number, Product>>({});
  const region = 'BY';
  const [showFaces, setShowFaces] = useState(false);
  const [logTiming, setLogTiming] = useState(true);
  const [pageLimit, setPageLimit] = useState(0);
  const [preview, setPreview] = useState<{ pages: any[]; width: number; height: number } | null>(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const product = useMemo(() => {
    if (selectedProduct) return selectedProduct;
    return isValidProduct(productFixture) ? productFixture : null;
  }, [selectedProduct]);

  // Preload face detection engine in background after login
  useEffect(() => {
    preloadFaceDetection();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsProcessing(true);
    try {
      for (const file of acceptedFiles) {
        try {
          const decodeStart = performance.now();
          const decodeMaxDim = 3600;
          const decoded = await decodeFileToBitmap(file, { maxDim: decodeMaxDim });
          const decodeMs = performance.now() - decodeStart;

          const photoWidth = decoded.originalWidth ?? decoded.width;
          const photoHeight = decoded.originalHeight ?? decoded.height;

          const faceStart = performance.now();
          let faces: Photo['faces'] = [];
          try {
            faces = await detectFacesRetinafaceOnnx(
              decoded.bitmap,
              decoded.width,
              decoded.height,
              photoWidth,
              photoHeight,
              {
                modelUrl: '/models/retinaface_mv2.onnx',
                preprocess: 'letterbox',
                scoreThreshold: 0.6,
                nmsThreshold: 0.4,
                debug: logTiming
              }
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : JSON.stringify(err);
            console.error('RetinaFace ONNX failed', err);
            setErrors((prev) => [...prev, `RetinaFace ONNX failed: ${message}`]);
          }
          const faceMs = performance.now() - faceStart;
          if (logTiming) {
            console.log(
              `[timing] ${file.name} decode=${decodeMs.toFixed(0)}ms faces=${faceMs.toFixed(0)}ms count=${faces.length} size=${decoded.width}x${decoded.height} orig=${photoWidth}x${photoHeight}`
            );
          }
          const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

          const photo: Photo = {
            id: uuidv4(),
            width: photoWidth,
            height: photoHeight,
            top: 0,
            left: 0,
            imageUrl: decoded.previewUrl,
            localUrl: decoded.previewUrl,
            frame: emptyFrame(),
            lowQuality: false,
            faces,
            fileName: file.name,
            fileSize: file.size,
            type: 'image/jpg',
            isFavorite: false,
            isBig: false,
            isSelected: false,
            blockedQuality: false,
            timestamp: file.lastModified,
            orientation: decoded.width >= decoded.height ? Orientation.LANDSCAPE : Orientation.PORTRAIT,
            fileExtension: extension,
            index: 0,
            scaledWidth: 0,
            scaledHeight: 0,
            offsetX: 0,
            offsetY: 0,
            scaledFrameWidth: 0,
            scaledFrameHeight: 0,
            resizedPhotoWidth: 0,
            resizedPhotoHeight: 0,
            locked: false,
            assetId: '',
            maxFaceLeft: 0,
            maxFaceRight: 0,
            maxFaceTop: 0,
            maxFaceBottom: 0
          };

          setItems((prev) => [...prev, { file, photo, previewUrl: decoded.previewUrl }]);
        } catch (err) {
          const message = err instanceof Error ? err.message : JSON.stringify(err);
          setErrors((prev) => [...prev, `${file.name}: ${message}`]);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.heif']
    }
  });

  const handleCompile = useCallback(async () => {
    if (!product) {
      alert('No valid product template loaded.');
      return;
    }
    if (!product.template?.pageTemplates || product.template.pageTemplates.length === 0) {
      alert('Selected product does not include pageTemplates. Fetch product details first.');
      return;
    }
    if (items.length === 0) return;
    setIsProcessing(true);
    try {
      const result = await buildAlbum(product, items.map((item) => item.photo), 320);
      setAlbumJson(JSON.stringify(result.album, null, 2));
      setPreview({ pages: result.album.pages ?? [], width: result.previewWidth, height: result.previewHeight });
      setCurrentSpread(0); // Reset to first spread when regenerating
    } finally {
      setIsProcessing(false);
    }
  }, [items, product]);

  const loadProducts = useCallback(async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/product/catalogtest?region=${encodeURIComponent(region)}`);
      if (!response.ok) {
        throw new Error(`Failed to load products: ${response.status}`);
      }
      const data = (await response.json()) as Product[];
      const filtered = data.filter((p) => p.template && Number(p.template.width) > 0 && Number(p.template.height) > 0);
      setProducts(filtered);
      if (filtered.length > 0) {
        setSelectedProductId(filtered[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      setErrors((prev) => [...prev, `Load templates failed: ${message}`]);
    } finally {
      setIsProcessing(false);
    }
  }, [region]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadProductDetails = useCallback(
    async (id: number) => {
      if (detailsCache[id]) {
        setSelectedProduct(detailsCache[id]);
        return;
      }
      setIsProcessing(true);
      try {
        const response = await fetch(`/api/product/detailstest/${id}?region=${encodeURIComponent(region)}`);
        if (!response.ok) {
          throw new Error(`Failed to load product details: ${response.status}`);
        }
        const payload = await response.json();
        const productData = payload.product ?? payload;
        if (!productData?.template?.pageTemplates) {
          throw new Error('Product details missing pageTemplates.');
        }
        setDetailsCache((prev) => ({ ...prev, [id]: productData }));
        setSelectedProduct(productData);
      } catch (err) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        setErrors((prev) => [...prev, `Load product details failed: ${message}`]);
      } finally {
        setIsProcessing(false);
      }
    },
    [detailsCache, region]
  );

  useEffect(() => {
    if (selectedProductId) {
      loadProductDetails(selectedProductId);
    } else {
      setSelectedProduct(null);
    }
  }, [selectedProductId, loadProductDetails]);

  // Templates are loaded automatically for BY.

  const downloadJson = () => {
    if (!albumJson) return;
    const blob = new Blob([albumJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'album.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pagesToRender = useMemo(() => {
    if (!preview?.pages) return [];
    const pages = preview.pages.filter((p) => p && p.Photos && p.Photos.length > 0);
    if (pageLimit && pageLimit > 0) {
      return pages.slice(0, pageLimit);
    }
    return pages;
  }, [preview, pageLimit]);

  // Group pages into spreads (2 pages per spread)
  const spreads = useMemo(() => {
    const result: Array<{ left: any | null; right: any | null }> = [];
    for (let i = 0; i < pagesToRender.length; i += 2) {
      result.push({
        left: pagesToRender[i] || null,
        right: pagesToRender[i + 1] || null
      });
    }
    return result;
  }, [pagesToRender]);

  const totalSpreads = spreads.length;
  const currentSpreadData = spreads[currentSpread] || null;

  const goToPrevSpread = () => {
    setCurrentSpread((prev) => Math.max(0, prev - 1));
  };

  const goToNextSpread = () => {
    setCurrentSpread((prev) => Math.min(totalSpreads - 1, prev + 1));
  };


  const renderPage = useCallback(
    (page: any, key: string) => {
      if (!preview) return null;
      return (
        <div className="album-page" key={key} style={{ width: preview.width, height: preview.height }}>
          {(page.Photos ?? []).map((photo: Photo, pIdx: number) => {
            const frame = photo.frame;
            if (!frame) return null;
            const hasBorders = Boolean(page.HasBorders || page.PageTemplate?.hasBorders);
            const innerLeft =
              hasBorders && frame.cutScaledWidth ? frame.cutScaledLeft - frame.scaledLeft : 0;
            const innerTop =
              hasBorders && frame.cutScaledHeight ? frame.cutScaledTop - frame.scaledTop : 0;
            const innerWidth = hasBorders && frame.cutScaledWidth ? frame.cutScaledWidth : frame.scaledWidth;
            const innerHeight =
              hasBorders && frame.cutScaledHeight ? frame.cutScaledHeight : frame.scaledHeight;
            const imgLeft = -photo.offsetX - innerLeft;
            const imgTop = -photo.offsetY - innerTop;
            const rotation = frame.angle ? `rotate(${frame.angle}deg)` : undefined;

            return (
              <div
                key={`frame-${key}-${pIdx}`}
                className="frame-outer"
                style={{
                  left: frame.scaledLeft,
                  top: frame.scaledTop,
                  width: frame.scaledWidth,
                  height: frame.scaledHeight,
                  background: hasBorders ? '#ffffff' : 'transparent',
                  transform: rotation,
                  zIndex: frame.index ?? pIdx
                }}
              >
                <div
                  className="frame-inner"
                  style={{
                    left: innerLeft,
                    top: innerTop,
                    width: innerWidth,
                    height: innerHeight
                  }}
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.fileName}
                    style={{
                      position: 'absolute',
                      width: photo.scaledWidth,
                      height: photo.scaledHeight,
                      left: imgLeft,
                      top: imgTop
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    },
    [preview]
  );

  return (
    <div className="container">
      <h1>Photia Web Prototype</h1>
      <p className="muted">
        Phase 1: local photo processing with HEIC + face detection. Templates auto-load for BY.
      </p>

      <div className="card" {...getRootProps()}>
        <input {...getInputProps()} />
        <div className="dropzone">
          {isDragActive ? (
            <p>Drop files here…</p>
          ) : (
            <p>Drag & drop photos here, or click to select files (HEIC supported).</p>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12 }} className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="muted">Face detection</label>
          <span className="muted">RetinaFace MobileNet V2 (letterbox, score 0.6, NMS 0.4)</span>
          <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={logTiming}
              onChange={(e) => setLogTiming(e.target.checked)}
            />
            Log timing
          </label>
          <span className="muted">Affects newly added photos.</span>
        </div>
      </div>

      <div style={{ marginTop: 16 }} className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">Region: {region}</span>
          <span className="muted">Templates loaded: {products.length}</span>
        </div>
        {products.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <label className="muted">Template</label>
            <select
              style={{ marginLeft: 8, padding: '6px 8px' }}
              value={selectedProductId ?? products[0].id}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (id: {p.id})
                </option>
              ))}
            </select>
            <span className="muted" style={{ marginLeft: 12 }}>
              {selectedProduct ? 'details loaded' : 'loading details...'}
            </span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }} className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleCompile} disabled={isProcessing || items.length === 0}>
            {isProcessing ? 'Processing…' : 'Compile Album JSON'}
          </button>
          <button className="button" onClick={downloadJson} disabled={!albumJson}>
            Download JSON
          </button>
          <span className="muted">Photos loaded: {items.length}</span>
        </div>
      </div>

      <div style={{ marginTop: 16 }} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Preview</h3>
          <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={showFaces}
              onChange={(e) => setShowFaces(e.target.checked)}
            />
            Show face boxes
          </label>
        </div>
        <div className="grid">
          {items.map((item) => (
            <FacePreview key={item.photo.id} item={item} showFaces={showFaces} />
          ))}
        </div>
      </div>

      {preview && (
        <div style={{ marginTop: 16 }} className="card">
          <h3>Album Preview</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Max pages
              <input
                type="number"
                min={0}
                value={pageLimit}
                onChange={(e) => {
                  setPageLimit(Number(e.target.value || 0));
                  setCurrentSpread(0);
                }}
                style={{ width: 80, padding: '4px 6px' }}
              />
            </label>
            <span className="muted">0 = all pages</span>
            <span className="muted">| Total pages: {pagesToRender.length}</span>
          </div>

          {totalSpreads > 0 && currentSpreadData && (
            <div className="spread-view">
              <div className="pagination-bar">
                <button
                  className="button"
                  onClick={goToPrevSpread}
                  disabled={currentSpread === 0}
                  style={{ padding: '8px 16px' }}
                >
                  ← Prev
                </button>
                <span className="muted">
                  Spread {currentSpread + 1} of {totalSpreads} (Pages {currentSpread * 2 + 1}–{Math.min(currentSpread * 2 + 2, pagesToRender.length)})
                </span>
                <button
                  className="button"
                  onClick={goToNextSpread}
                  disabled={currentSpread >= totalSpreads - 1}
                  style={{ padding: '8px 16px' }}
                >
                  Next →
                </button>
              </div>

              <div className="spread">
                {currentSpreadData.left && renderPage(currentSpreadData.left, `spread-${currentSpread}-left`)}
                {currentSpreadData.right && renderPage(currentSpreadData.right, `spread-${currentSpread}-right`)}
              </div>
            </div>
          )}

          {totalSpreads === 0 && (
            <p className="muted">No pages to display.</p>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ marginTop: 16 }} className="card">
          <h3>Decode Errors</h3>
          <ul className="muted">
            {errors.map((err, idx) => (
              <li key={`${err}-${idx}`}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 16 }} className="card">
        <h3>Album JSON</h3>
        {albumJson ? <pre>{albumJson}</pre> : <p className="muted">No album compiled yet.</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('photia_auth') === 'true';
  });

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <MainApp />;
}

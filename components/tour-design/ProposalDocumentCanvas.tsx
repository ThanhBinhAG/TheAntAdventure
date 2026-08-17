'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

const PAGE_WIDTH = 820;
const FALLBACK_HEIGHT = 1000;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

export interface ProposalDocumentCanvasProps {
  html: string;
  title: string;
  status?: ReactNode;
  leading?: ReactNode;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  onIframeLoad?: () => void;
  emptyHint?: string;
}

/**
 * Shared document canvas: gray stage, white A4 page with shadow, zoom/Fit.
 * Used by Step 5 Export preview and Edit Template modal.
 */
export default function ProposalDocumentCanvas({
  html,
  title,
  status,
  leading,
  iframeRef: externalIframeRef,
  onIframeLoad,
  emptyHint,
}: ProposalDocumentCanvasProps) {
  const [pageHeight, setPageHeight] = useState(FALLBACK_HEIGHT);
  const [zoom, setZoom] = useState(1);
  const [fitReady, setFitReady] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const activeIframeRef = externalIframeRef ?? internalIframeRef;
  const canvasRef = useRef<HTMLDivElement>(null);
  const measureTimerRef = useRef(0);
  const hasHtml = Boolean(html);

  if (!hasHtml && hasLoadedOnce) {
    setHasLoadedOnce(false);
    setPageHeight(FALLBACK_HEIGHT);
  }

  function measurePage() {
    const doc = activeIframeRef.current?.contentDocument;
    const height = doc?.body?.scrollHeight || doc?.documentElement?.scrollHeight;
    if (height && height > 40) {
      setPageHeight(height);
      setHasLoadedOnce(true);
    } else {
      setPageHeight(FALLBACK_HEIGHT);
    }
  }

  function handleIframeLoad() {
    measurePage();
    window.clearTimeout(measureTimerRef.current);
    measureTimerRef.current = window.setTimeout(() => measurePage(), 400);
    onIframeLoad?.();
  }

  useEffect(() => {
    return () => window.clearTimeout(measureTimerRef.current);
  }, []);

  function applyFitZoom() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = 48;
    const available = Math.max(canvas.clientWidth - pad, 200);
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, available / PAGE_WIDTH));
    setZoom(Math.round(next * 100) / 100);
    setFitReady(true);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (!fitReady) applyFitZoom();
    });
    ro.observe(canvas);
    applyFitZoom();
    return () => ro.disconnect();
  }, [fitReady]);

  useEffect(() => {
    if (!hasHtml || !hasLoadedOnce) return;
    const timer = window.setTimeout(() => {
      const doc = activeIframeRef.current?.contentDocument;
      const height = doc?.body?.scrollHeight || doc?.documentElement?.scrollHeight;
      if (height && height > 40) setPageHeight(height);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [html, hasHtml, hasLoadedOnce, activeIframeRef]);

  const bumpZoom = (delta: number) => {
    setZoom((z) => {
      const next = Math.round((z + delta) * 10) / 10;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    });
    setFitReady(true);
  };

  const scaledW = Math.round(PAGE_WIDTH * zoom);
  const scaledH = Math.round(pageHeight * zoom);

  return (
    <div className="td-export-preview proposal-doc-canvas-root">
      <div className="td-export-preview-hd">
        <div className="td-export-preview-title">
          {leading ?? <strong>{title}</strong>}
        </div>
        <div className="td-export-zoom" role="group" aria-label="Preview zoom">
          <button
            type="button"
            className="td-export-zoom-btn"
            disabled={!hasHtml || zoom <= ZOOM_MIN}
            onClick={() => bumpZoom(-ZOOM_STEP)}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="td-export-zoom-label">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="td-export-zoom-btn"
            disabled={!hasHtml || zoom >= ZOOM_MAX}
            onClick={() => bumpZoom(ZOOM_STEP)}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="td-export-zoom-fit"
            disabled={!hasHtml}
            onClick={() => {
              setFitReady(false);
              applyFitZoom();
            }}
          >
            Fit
          </button>
        </div>
        {status}
      </div>

      <div className="td-export-canvas" ref={canvasRef}>
        {!hasHtml ? (
          <div className="td-export-canvas-empty">
            {emptyHint ?? 'Nothing to preview yet.'}
          </div>
        ) : (
          <>
            {!hasLoadedOnce ? (
              <div className="td-export-page td-export-page--skel" style={{ width: Math.min(scaledW, PAGE_WIDTH) }}>
                <div className="page-route-skel" style={{ height: 28, width: '42%', marginBottom: 16 }} />
                <div className="page-route-skel" style={{ height: 14, width: '100%', marginBottom: 10 }} />
                <div className="page-route-skel" style={{ height: 14, width: '88%', marginBottom: 10 }} />
                <div className="page-route-skel" style={{ height: 14, width: '72%', marginBottom: 22 }} />
                <div className="page-route-skel" style={{ height: 160, width: '100%', marginBottom: 16 }} />
                <div className="page-route-skel" style={{ height: 14, width: '94%', marginBottom: 10 }} />
                <div className="page-route-skel" style={{ height: 14, width: '80%' }} />
              </div>
            ) : null}
            <div
              className="td-export-page-scaler"
              style={{
                width: scaledW,
                height: scaledH,
                visibility: hasLoadedOnce ? 'visible' : 'hidden',
                position: hasLoadedOnce ? 'relative' : 'absolute',
                pointerEvents: hasLoadedOnce ? 'auto' : 'none',
              }}
              aria-hidden={!hasLoadedOnce}
            >
              <div
                className="td-export-page"
                style={{
                  width: PAGE_WIDTH,
                  height: pageHeight,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <iframe
                  ref={activeIframeRef as RefObject<HTMLIFrameElement>}
                  title={title}
                  srcDoc={html}
                  className="td-export-preview-frame"
                  style={{ width: PAGE_WIDTH, height: pageHeight }}
                  onLoad={handleIframeLoad}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

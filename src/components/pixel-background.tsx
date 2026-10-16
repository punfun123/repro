'use client';

import { useEffect, useRef, useState } from 'react';

const preferenceKey = 'repro.background-motion';

export function useBackgroundMotion() {
  const [enabled, setEnabled] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    try { setEnabled(localStorage.getItem(preferenceKey) !== 'off'); } catch { /* Storage is optional. */ }
    setReady(true);
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  function toggle() {
    if (reduced) return;
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(preferenceKey, next ? 'on' : 'off'); } catch { /* Retain this session's choice. */ }
  }

  return { animated: ready && enabled && !reduced, enabled, reduced, ready, toggle };
}

// A decorative layer only. These paths have no relationship to experiment activity.
export function PixelBackground({ animated }: { animated: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    const textMask = document.createElement('canvas');
    const maskContext = textMask.getContext('2d');
    if (!maskContext) return;

    let width = 0;
    let height = 0;
    let mobile = false;
    let frame = 0;
    let previous = 0;
    let lastPaint = 0;
    let frameCount = 0;
    let resizeFrame = 0;
    let maskFrame = 0;
    let maskDirty = true;
    let disposed = false;
    let routes: { path: Path2D; x: number; y: number }[] = [];
    const fraction = (value: number) => value - Math.floor(value);
    const seed = (index: number) => fraction(Math.sin(index * 127.1 + 31.7) * 43758.5453);

    function buildRoutes() {
      const unit = mobile ? 28 : 48;
      const columns = Math.ceil(width / (mobile ? 145 : 280));
      const rows = Math.min(8, Math.ceil(height / (mobile ? 160 : 190)));
      const snap = (value: number) => Math.round(value / unit) * unit;
      const clamp = (value: number, limit: number) => Math.max(-unit, Math.min(limit + unit, value));
      routes = Array.from({ length: columns * rows }, (_, i) => {
        let x = snap((i % columns + seed(i + 9) * 0.65) * width / columns);
        let y = snap((Math.floor(i / columns) + seed(i + 31) * 0.7) * height / rows);
        const path = new Path2D();
        path.moveTo(x, y);
        const horizontal = seed(i + 57) > 0.5 ? 1 : -1;
        const vertical = seed(i + 72) > 0.5 ? 1 : -1;
        for (let step = 0; step < 6; step++) {
          const length = unit * (1 + Math.floor(seed(i * 7 + step + 110) * 3));
          if (step % 2 === 0) x = clamp(x + horizontal * length, width);
          else y = clamp(y + vertical * length, height);
          path.lineTo(x, y);
        }
        return { path, x, y };
      });
    }

    // Clear only the actual text lines, retaining the background in the surrounding space.
    // Cache geometry until scrolling, resizing, font loading or content changes.
    function refreshTextMask() {
      maskContext!.clearRect(0, 0, width, height);
      maskContext!.fillStyle = '#000';
      maskContext!.shadowColor = '#000';
      maskContext!.shadowBlur = mobile ? 12 : 18;
      const seen = new Set<Node>();
      const range = document.createRange();
      const selectors = 'h1,h2,h3,p,a,button,label,summary,.chapter-number,.path-label,.source-file-path,.source-line-count,.lab-flow,.editor-top,.editor-bottom,.service-list,.log-intro,.log-date,.evidence-meta,.code-caption,figcaption,.launch-state,.site-footer';
      for (const element of document.querySelectorAll(selectors)) {
        if (element.closest('pre,.code-editor,input,textarea')) continue;
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height || bounds.bottom < -24 || bounds.top > height + 24) continue;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (seen.has(node) || !node.textContent?.trim()) continue;
          seen.add(node);
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.bottom < -24 || rect.top > height + 24) continue;
            maskContext!.fillRect(rect.left - 7, rect.top - 4, rect.width + 14, rect.height + 8);
          }
        }
      }
      for (const image of document.querySelectorAll('.story-end>img,.log-footer>img')) {
        const rect = image.getBoundingClientRect();
        if (rect.bottom >= 0 && rect.top <= height) maskContext!.fillRect(rect.left - 4, rect.top - 4, rect.width + 8, rect.height + 8);
      }
      maskDirty = false;
    }

    function paint() {
      const time = elapsedRef.current;
      context!.clearRect(0, 0, width, height);
      if (maskDirty) refreshTextMask();

      for (const [i, route] of routes.entries()) {
        context!.lineWidth = 1;
        context!.strokeStyle = mobile ? 'rgba(167,40,31,0.23)' : 'rgba(167,40,31,0.3)';
        context!.setLineDash([]);
        context!.stroke(route.path);
        context!.setLineDash([16, 240]);
        context!.lineDashOffset = -(time * 7 + i * 43);
        context!.strokeStyle = 'rgba(219,54,38,0.48)';
        context!.stroke(route.path);
        if (i % 3 === 0) {
          context!.fillStyle = 'rgba(205,45,33,0.37)';
          context!.fillRect(route.x - 2, route.y - 2, 4, 4);
        }
      }
      context!.setLineDash([]);

      const pixels = mobile ? 38 : Math.min(120, Math.ceil(width * height / 15000));
      for (let i = 0; i < pixels; i++) {
        const x = seed(i + 40) * width;
        const y = (seed(i + 100) * (height + 40) + time * (1.1 + seed(i + 15) * 2)) % (height + 40) - 20;
        const size = mobile ? 2 + seed(i + 55) * 2 : 2 + Math.floor(seed(i + 55) * 5);
        context!.fillStyle = `rgba(218,48,34,${0.2 + seed(i + 60) * (mobile ? 0.23 : 0.32)})`;
        context!.fillRect(Math.round(x), Math.round(y), size, size);
      }

      context!.globalCompositeOperation = 'destination-out';
      context!.drawImage(textMask, 0, 0, width, height);
      context!.globalCompositeOperation = 'source-over';
      canvas!.dataset.frame = String(++frameCount);
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      mobile = width < 760;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      textMask.width = canvas!.width;
      textMask.height = canvas!.height;
      maskContext!.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildRoutes();
      maskDirty = true;
      paint();
    }

    function tick(now: number) {
      frame = 0;
      if (!animated || document.hidden) return;
      if (previous) elapsedRef.current += Math.min(now - previous, 100) / 1000;
      previous = now;
      const interval = 1000 / (mobile ? 12 : 20);
      if (now - lastPaint >= interval) { paint(); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    }

    function updatePlayback() {
      cancelAnimationFrame(frame);
      previous = 0;
      canvas!.dataset.motionState = document.hidden ? 'paused' : animated ? 'animated' : 'static';
      if (animated && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function scheduleResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    }

    function invalidateTextMask() {
      maskDirty = true;
      if (!animated && !document.hidden) {
        cancelAnimationFrame(maskFrame);
        maskFrame = requestAnimationFrame(paint);
      }
    }

    resize();
    updatePlayback();
    const contentObserver = new MutationObserver(invalidateTextMask);
    const layoutObserver = new ResizeObserver(invalidateTextMask);
    for (const element of document.querySelectorAll('main,.site-header,.site-footer')) {
      contentObserver.observe(element, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
      layoutObserver.observe(element);
    }
    document.fonts.ready.then(() => { if (!disposed) invalidateTextMask(); });
    document.fonts.addEventListener('loadingdone', invalidateTextMask);
    window.addEventListener('scroll', invalidateTextMask, { passive: true });
    window.addEventListener('resize', scheduleResize, { passive: true });
    document.addEventListener('visibilitychange', updatePlayback);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      cancelAnimationFrame(maskFrame);
      contentObserver.disconnect();
      layoutObserver.disconnect();
      document.fonts.removeEventListener('loadingdone', invalidateTextMask);
      window.removeEventListener('scroll', invalidateTextMask);
      window.removeEventListener('resize', scheduleResize);
      document.removeEventListener('visibilitychange', updatePlayback);
    };
  }, [animated]);

  return <canvas ref={canvasRef} className="pixel-background" aria-hidden="true" data-motion-state="static" />;
}

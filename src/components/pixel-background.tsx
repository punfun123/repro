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

    let width = 0;
    let height = 0;
    let mobile = false;
    let frame = 0;
    let previous = 0;
    let lastPaint = 0;
    let frameCount = 0;
    let resizeFrame = 0;
    const fraction = (value: number) => value - Math.floor(value);
    const seed = (index: number) => fraction(Math.sin(index * 127.1 + 31.7) * 43758.5453);

    function paint() {
      const time = elapsedRef.current;
      context!.clearRect(0, 0, width, height);
      const edge = Math.min(width * (mobile ? 0.055 : 0.12), 160);
      const tracks = mobile ? 4 : 8;

      for (let i = 0; i < tracks; i++) {
        const right = i % 2 === 1;
        const startY = seed(i + 4) * height;
        const direction = right ? -1 : 1;
        const origin = right ? width + 5 : -5;
        const points = [
          [origin, startY],
          [origin + direction * edge * 0.28, startY],
          [origin + direction * edge * 0.28, startY + 46],
          [origin + direction * edge * 0.62, startY + 46],
          [origin + direction * edge * 0.62, startY + 110],
          [origin + direction * edge * 0.92, startY + 110],
        ];
        context!.beginPath();
        points.forEach(([x, y], index) => index ? context!.lineTo(x, y) : context!.moveTo(x, y));
        context!.lineWidth = 1;
        context!.strokeStyle = mobile ? 'rgba(185,46,34,0.16)' : 'rgba(185,46,34,0.28)';
        context!.setLineDash([]);
        context!.stroke();
        // A slow red segment travels along the same rectilinear path.
        context!.setLineDash([18, 250]);
        context!.lineDashOffset = -(time * 5 + i * 43);
        context!.strokeStyle = 'rgba(219,54,38,0.44)';
        context!.stroke();
      }
      context!.setLineDash([]);

      const pixels = mobile ? 14 : 36;
      for (let i = 0; i < pixels; i++) {
        const right = i % 2 === 1;
        const distance = 5 + seed(i + 40) * Math.max(edge - 12, 1);
        const x = right ? width - distance : distance;
        const y = (seed(i + 100) * (height + 40) + time * (1.1 + seed(i + 15) * 2)) % (height + 40) - 20;
        const size = mobile ? 2 + seed(i + 55) * 2 : 3 + Math.floor(seed(i + 55) * 7);
        context!.fillStyle = `rgba(218,48,34,${0.13 + seed(i + 60) * (mobile ? 0.2 : 0.39)})`;
        context!.fillRect(Math.round(x), Math.round(y), size, size);
      }

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

    resize();
    updatePlayback();
    window.addEventListener('resize', scheduleResize, { passive: true });
    document.addEventListener('visibilitychange', updatePlayback);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', scheduleResize);
      document.removeEventListener('visibilitychange', updatePlayback);
    };
  }, [animated]);

  return <canvas ref={canvasRef} className="pixel-background" aria-hidden="true" data-motion-state="static" />;
}

'use client';

import React, { useRef, useEffect } from 'react';

export interface SquaresBackgroundProps {
  direction?: 'diagonal' | 'up' | 'right' | 'down' | 'left';
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  className?: string;
}

/**
 * SquaresBackground - Inspired by reactbits.dev Squares component.
 * Renders a high-performance, subtle interactive geometric grid on an HTML5 canvas.
 * Styled with Apple HIG dark obsidian materials: restrained, subtle 1px specular lines,
 * and soft ambient cursor reactivity. Zero external library dependencies.
 */
export const SquaresBackground: React.FC<SquaresBackgroundProps> = ({
  direction = 'diagonal',
  speed = 0.5,
  borderColor = 'rgba(255, 255, 255, 0.04)',
  squareSize = 48,
  hoverFillColor = 'rgba(10, 132, 255, 0.07)',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const mousePos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.parentElement ? canvas.parentElement.offsetWidth * dpr : window.innerWidth * dpr;
      canvas.height = canvas.parentElement ? canvas.parentElement.offsetHeight * dpr : window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mousePos.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      const width = canvas.parentElement ? canvas.parentElement.offsetWidth : window.innerWidth;
      const height = canvas.parentElement ? canvas.parentElement.offsetHeight : window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      // Subtle directional drifting
      const effectiveSpeed = Math.max(speed, 0.1);
      switch (direction) {
        case 'diagonal':
          gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + squareSize) % squareSize;
          gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + squareSize) % squareSize;
          break;
        case 'right':
          gridOffset.current.x = (gridOffset.current.x + effectiveSpeed) % squareSize;
          break;
        case 'left':
          gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + squareSize) % squareSize;
          break;
        case 'up':
          gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + squareSize) % squareSize;
          break;
        case 'down':
          gridOffset.current.y = (gridOffset.current.y + effectiveSpeed) % squareSize;
          break;
      }

      const startX = Math.floor(gridOffset.current.x - squareSize);
      const startY = Math.floor(gridOffset.current.y - squareSize);

      ctx.lineWidth = 1;
      ctx.strokeStyle = borderColor;

      for (let x = startX; x < width + squareSize; x += squareSize) {
        for (let y = startY; y < height + squareSize; y += squareSize) {
          // Check proximity to cursor for gentle ambient glow
          if (mousePos.current) {
            const dx = mousePos.current.x - (x + squareSize / 2);
            const dy = mousePos.current.y - (y + squareSize / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = squareSize * 2.5;

            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.12;
              ctx.fillStyle = `rgba(10, 132, 255, ${alpha.toFixed(3)})`;
              ctx.fillRect(x, y, squareSize, squareSize);
            }
          }

          ctx.strokeRect(x, y, squareSize, squareSize);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [direction, speed, borderColor, squareSize, hoverFillColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none w-full h-full block ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
};

export default SquaresBackground;

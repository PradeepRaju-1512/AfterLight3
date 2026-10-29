import React, { useRef, useEffect, useState } from 'react';
import { LandscapeConfig, LANDSCAPE_CONFIGS, LandscapeKey } from './landscapeConfig';

interface MoonlitAtmosphereProps {
  children?: React.ReactNode;
  landscapeKey?: LandscapeKey;
  customConfig?: LandscapeConfig;
  className?: string;
  isLoginMode?: boolean;
}

export const MoonlitAtmosphere: React.FC<MoonlitAtmosphereProps> = ({
  children,
  landscapeKey,
  customConfig,
  className = '',
  isLoginMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const [, setIsPointerInside] = useState(false);

  // Determine active landscape configuration
  const config: LandscapeConfig =
    customConfig ||
    (landscapeKey ? LANDSCAPE_CONFIGS[landscapeKey] : isLoginMode ? LANDSCAPE_CONFIGS.login : LANDSCAPE_CONFIGS['bot-game']);

  const isLogin = isLoginMode || config.key === 'login';
  const enableReveal = isLogin || (config.enablePointerReveal ?? false);
  const maxIntensity = config.revealIntensity ?? 0.65;

  useEffect(() => {
    if (!enableReveal) return;
    const container = containerRef.current;
    if (!container) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      container.style.setProperty('--pointer-x', '50%');
      container.style.setProperty('--pointer-y', '42%');
      container.style.setProperty('--reveal-intensity', '0.25');
      return;
    }

    let targetX = 50;
    let targetY = 42;
    let currentX = 50;
    let currentY = 42;
    let targetIntensity = 0.35; // Ambient resting illumination
    let currentIntensity = 0.35;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      targetX = Math.max(0, Math.min(100, x));
      targetY = Math.max(0, Math.min(100, y));
      targetIntensity = maxIntensity;
      setIsPointerInside(true);
    };

    const handlePointerLeave = () => {
      targetIntensity = 0.30; // Soft resting level
      setIsPointerInside(false);
    };

    const updatePosition = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      currentIntensity += (targetIntensity - currentIntensity) * 0.06;

      container.style.setProperty('--pointer-x', `${currentX.toFixed(2)}%`);
      container.style.setProperty('--pointer-y', `${currentY.toFixed(2)}%`);
      container.style.setProperty('--reveal-intensity', currentIntensity.toFixed(3));

      rafId.current = requestAnimationFrame(updatePosition);
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    rafId.current = requestAnimationFrame(updatePosition);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enableReveal, maxIntensity]);

  // Primary image source (WebP with JPEG fallback)
  const mainImageCss = `url('${config.imageWebp}'), url('${config.imageFallback}')`;
  const darkImageCss = config.nearblackWebp
    ? `url('${config.nearblackWebp}'), ${mainImageCss}`
    : mainImageCss;

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-screen overflow-hidden bg-[#070B14] select-none ${className}`}
      style={
        {
          '--pointer-x': '50%',
          '--pointer-y': '42%',
          '--reveal-intensity': '0.35',
        } as React.CSSProperties
      }
    >
      {/* 1. Base Landscape Photograph Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
        style={{
          backgroundImage: isLogin ? darkImageCss : mainImageCss,
          backgroundPosition: `center ${config.mobileFocusY || 'center'}`,
        }}
      />

      {/* 2. Pointer Illumination: Crisp, luminous radial light revealing the real photographic landscape */}
      {enableReveal && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-200"
          style={{
            backgroundImage: mainImageCss,
            backgroundPosition: `center ${config.mobileFocusY || 'center'}`,
            opacity: 'var(--reveal-intensity, 0.35)',
            maskImage: `
              radial-gradient(circle 580px at var(--pointer-x, 50%) var(--pointer-y, 42%),
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 0.95) 25%,
                rgba(0, 0, 0, 0.75) 50%,
                rgba(0, 0, 0, 0.35) 75%,
                rgba(0, 0, 0, 0.08) 90%,
                transparent 100%
              )
            `,
            WebkitMaskImage: `
              radial-gradient(circle 580px at var(--pointer-x, 50%) var(--pointer-y, 42%),
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 0.95) 25%,
                rgba(0, 0, 0, 0.75) 50%,
                rgba(0, 0, 0, 0.35) 75%,
                rgba(0, 0, 0, 0.08) 90%,
                transparent 100%
              )
            `,
          }}
        />
      )}

      {/* 3. Ambient Moonlight Glow around Pointer: Noticeable, ethereal lunar light beam */}
      {enableReveal && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            background: `
              radial-gradient(circle 520px at var(--pointer-x, 50%) var(--pointer-y, 42%),
                rgba(220, 238, 255, calc(var(--reveal-intensity, 0.35) * 0.45)) 0%,
                rgba(165, 210, 255, calc(var(--reveal-intensity, 0.35) * 0.25)) 30%,
                rgba(120, 175, 240, calc(var(--reveal-intensity, 0.35) * 0.09)) 60%,
                transparent 85%
              )
            `,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* 4. Natural Atmospheric Mist/Fog Layer (Subtle, organic depth) */}
      <div
        className="absolute w-full h-80 pointer-events-none blur-3xl opacity-20"
        style={{
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse 65% 45% at 50% 50%, ${config.ambientMistColor || '#91B7CE'} 0%, transparent 80%)`,
        }}
      />

      {/* 5. Route-Specific Contrast & Scrim Overlay (Ensures text/cards readability while preserving photographic clarity) */}
      <div className={`absolute inset-0 pointer-events-none ${config.darknessOverlay}`} />

      {/* 6. Deep Nocturnal Vignette (Subtle edge lighting) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(7,11,20,0.60)_75%,rgba(7,11,20,0.92)_100%)] pointer-events-none" />

      {/* 7. Fine Film Grain Texture for Cinematic Texture */}
      <div className="absolute inset-0 film-grain pointer-events-none opacity-25" />

      {/* 8. Foreground Interactive Content Layer (Fully interactive, non-blocking) */}
      <div className="relative z-10 w-full min-h-screen flex flex-col pointer-events-auto">
        {children}
      </div>
    </div>
  );
};

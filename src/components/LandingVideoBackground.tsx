import React, { useState, useEffect, useRef } from 'react';

interface LandingVideoBackgroundProps {
  children?: React.ReactNode;
  videoSrc?: string;
  posterSrc?: string;
  fallbackColor?: string;
}

export const LandingVideoBackground: React.FC<LandingVideoBackgroundProps> = ({
  children,
  videoSrc = '/video/autumn_forest.mp4',
  posterSrc = '/images/autumn_forest_poster.jpg',
  fallbackColor = '#FAF3E1',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check user accessibility preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Ensure video plays reliably when loaded and motion is allowed
  useEffect(() => {
    if (!prefersReducedMotion && !videoError && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be deferred; graceful fallback to poster image
        setVideoLoaded(false);
      });
    }
  }, [prefersReducedMotion, videoError]);

  return (
    <div 
      className="relative w-full min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: fallbackColor }}
    >
      {/* FIXED FULL-VIEWPORT VIDEO BACKGROUND CANVAS */}
      <div 
        id="landing-video-canvas"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
        aria-hidden="true"
      >
        {/* 1. Static Fallback Poster Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out"
          style={{
            backgroundImage: `url(${posterSrc})`,
            opacity: prefersReducedMotion || videoError || !videoLoaded ? 1 : 0.4,
          }}
        />

        {/* 2. Video Element (Autoplay, Muted, Looped, Full Viewport Cover) */}
        {!prefersReducedMotion && !videoError && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoLoaded(true)}
            onPlaying={() => setVideoLoaded(true)}
            onError={() => {
              console.warn('Video failed to load; using static autumn poster fallback.');
              setVideoError(true);
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out ${
              videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* 3. Warm Atmospheric Tint & Frosted Ambient Overlay */}
        {/* Layer 1: Warm Sand/Cream overlay to unify palette with #FAF3E1 and #F5E7C6 */}
        <div className="absolute inset-0 bg-[#FAF3E1]/35 backdrop-blur-[2px] transition-colors duration-500" />
        
        {/* Layer 2: Subtle warm vignette gradient for reading contrast and visual depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#222222]/[0.12] via-transparent to-[#222222]/[0.22] mix-blend-multiply pointer-events-none" />
      </div>

      {/* FOREGROUND APPLICATION LAYER */}
      <div className="relative z-10 flex-1 flex flex-col w-full h-full min-h-0">
        {children}
      </div>
    </div>
  );
};

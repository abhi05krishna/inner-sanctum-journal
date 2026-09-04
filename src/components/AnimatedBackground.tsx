import React, { useMemo } from 'react';
import type { MoodType, WeatherData, VisualDriverType } from '../types';

interface AnimatedBackgroundProps {
  driver?: VisualDriverType; // 'mood' or 'weather'
  mood?: MoodType | null;
  weather?: WeatherData | null;
  intensity?: 'subtle' | 'vibrant';
  children?: React.ReactNode;
  showIndicatorBadge?: boolean;
  onToggleDriver?: () => void;
  dayNumber?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  driver = 'mood',
  mood = 'neutral',
  weather,
  children,
  showIndicatorBadge = false,
  onToggleDriver,
  dayNumber,
}) => {
  // Determine effective theme configuration
  const themeConfig = useMemo(() => {
    const isWeather = driver === 'weather' && weather;

    if (isWeather && weather) {
      const cond = weather.condition;
      switch (cond) {
        case 'rain':
        case 'drizzle':
          return {
            id: 'weather-rain',
            name: `Rainy Ambiance (${weather.temperatureC}°C)`,
            icon: '🌧️',
            bgGradient: 'from-[#0F2027] via-[#203A43] to-[#2C5364]',
            orb1: 'bg-[#38BDF8]/90',
            orb2: 'bg-[#0284C7]/85',
            orb3: 'bg-[#06B6D4]/80',
            orb4: 'bg-[#60A5FA]/85',
            effect: 'rain',
            accent: '#0284C7',
          };
        case 'clouds':
        case 'fog':
          return {
            id: 'weather-clouds',
            name: `Atmospheric Overcast (${weather.temperatureC}°C)`,
            icon: '⛅',
            bgGradient: 'from-[#475569] via-[#334155] to-[#1E293B]',
            orb1: 'bg-[#94A3B8]/85',
            orb2: 'bg-[#64748B]/90',
            orb3: 'bg-[#38BDF8]/70',
            orb4: 'bg-[#CBD5E1]/80',
            effect: 'clouds',
            accent: '#64748B',
          };
        case 'snow':
          return {
            id: 'weather-snow',
            name: `Crisp Winter Snow (${weather.temperatureC}°C)`,
            icon: '❄️',
            bgGradient: 'from-[#0284C7] via-[#0369A1] to-[#0C4A6E]',
            orb1: 'bg-[#7DD3FC]/90',
            orb2: 'bg-[#E0F2FE]/95',
            orb3: 'bg-[#38BDF8]/85',
            orb4: 'bg-[#BAE6FD]/90',
            effect: 'snow',
            accent: '#38BDF8',
          };
        case 'thunderstorm':
          return {
            id: 'weather-thunder',
            name: `Atmospheric Storm (${weather.temperatureC}°C)`,
            icon: '⛈️',
            bgGradient: 'from-[#090A0F] via-[#1E1B4B] to-[#312E81]',
            orb1: 'bg-[#6366F1]/90',
            orb2: 'bg-[#F59E0B]/85',
            orb3: 'bg-[#3B82F6]/90',
            orb4: 'bg-[#818CF8]/85',
            effect: 'storm',
            accent: '#EAB308',
          };
        case 'clear':
        default:
          return {
            id: 'weather-clear',
            name: `Sunlit Horizon (${weather.temperatureC}°C)`,
            icon: '☀️',
            bgGradient: 'from-[#F59E0B] via-[#EA580C] to-[#C2410C]',
            orb1: 'bg-[#FBBF24]/95',
            orb2: 'bg-[#F97316]/90',
            orb3: 'bg-[#EF4444]/80',
            orb4: 'bg-[#FDE047]/90',
            effect: 'sunlight',
            accent: '#D97706',
          };
      }
    }

    // Mood-driven theme
    const activeMood = mood || 'neutral';
    switch (activeMood) {
      case 'happy':
        return {
          id: 'mood-happy',
          name: 'Joyful Baby Pink & White Blossom',
          icon: '🌸',
          bgGradient: 'from-[#FFF0F0] via-[#FFE4E4] to-[#FFD5D5]',
          orb1: 'bg-[#FF7E7E]/85',
          orb2: 'bg-[#FF9E9E]/85',
          orb3: 'bg-[#FFB5B5]/90',
          orb4: 'bg-[#FF6B6B]/80',
          effect: 'happy',
          accent: '#FF7E7E',
        };
      case 'peaceful':
        return {
          id: 'mood-peaceful',
          name: 'Peaceful Sage & Forest',
          icon: '🌿',
          bgGradient: 'from-[#14532D] via-[#166534] to-[#052E16]',
          orb1: 'bg-[#22C55E]/85',
          orb2: 'bg-[#15803D]/90',
          orb3: 'bg-[#4ADE80]/80',
          orb4: 'bg-[#86EFAC]/85',
          effect: 'peaceful',
          accent: '#15803D',
        };
      case 'energized':
        return {
          id: 'mood-energized',
          name: 'Energized Golden Dawn',
          icon: '⚡',
          bgGradient: 'from-[#EA580C] via-[#C2410C] to-[#9A3412]',
          orb1: 'bg-[#F97316]/95',
          orb2: 'bg-[#EF4444]/90',
          orb3: 'bg-[#FDE047]/90',
          orb4: 'bg-[#FB923C]/95',
          effect: 'energized',
          accent: '#EA580C',
        };
      case 'thoughtful':
        return {
          id: 'mood-thoughtful',
          name: 'Thoughtful Twilight & Cosmos',
          icon: '💡',
          bgGradient: 'from-[#312E81] via-[#1E1B4B] to-[#0F172A]',
          orb1: 'bg-[#6366F1]/90',
          orb2: 'bg-[#818CF8]/85',
          orb3: 'bg-[#A855F7]/80',
          orb4: 'bg-[#4F46E5]/90',
          effect: 'thoughtful',
          accent: '#818CF8',
        };
      case 'motivated':
        return {
          id: 'mood-motivated',
          name: 'Motivated Emerald Surge',
          icon: '🎯',
          bgGradient: 'from-[#065F46] via-[#047857] to-[#064E3B]',
          orb1: 'bg-[#10B981]/90',
          orb2: 'bg-[#059669]/90',
          orb3: 'bg-[#34D399]/85',
          orb4: 'bg-[#6EE7B7]/90',
          effect: 'motivated',
          accent: '#10B981',
        };
      case 'anxious':
        return {
          id: 'mood-anxious',
          name: 'Grounded Ocean Calmer',
          icon: '🌊',
          bgGradient: 'from-[#0369A1] via-[#0284C7] to-[#0C4A6E]',
          orb1: 'bg-[#0EA5E9]/90',
          orb2: 'bg-[#38BDF8]/90',
          orb3: 'bg-[#2563EB]/85',
          orb4: 'bg-[#7DD3FC]/90',
          effect: 'anxious',
          accent: '#0EA5E9',
        };
      case 'overwhelmed':
        return {
          id: 'mood-overwhelmed',
          name: 'Restorative Lavender Sanctuary',
          icon: '🪻',
          bgGradient: 'from-[#6B21A8] via-[#581C87] to-[#3B0764]',
          orb1: 'bg-[#9333EA]/90',
          orb2: 'bg-[#A855F7]/90',
          orb3: 'bg-[#C084FC]/85',
          orb4: 'bg-[#E879F9]/85',
          effect: 'overwhelmed',
          accent: '#A855F7',
        };
      case 'neutral':
      default:
        return {
          id: 'mood-neutral',
          name: 'Warm Amber & Golden Ochre',
          icon: '📜',
          bgGradient: 'from-[#D97706] via-[#B45309] to-[#78350F]',
          orb1: 'bg-[#F59E0B]/85',
          orb2: 'bg-[#D97706]/90',
          orb3: 'bg-[#FCD34D]/80',
          orb4: 'bg-[#FDE68A]/85',
          effect: 'neutral',
          accent: '#D97706',
        };
    }
  }, [driver, mood, weather]);

  return (
    <div className="relative w-full min-h-screen flex flex-col">
      {/* 1. FIXED FULL-VIEWPORT AMBIENT ANIMATED BACKGROUND */}
      <div 
        id="ambient-animated-canvas" 
        className={`fixed inset-0 z-0 bg-gradient-to-br ${themeConfig.bgGradient} animate-gradient-flow transition-all duration-1000 ease-in-out pointer-events-none overflow-hidden`}
      >
        {/* Floating Organic Volumetric Mesh Orbs */}
        <div 
          className={`absolute -top-24 -left-24 w-[48rem] h-[48rem] rounded-full ${themeConfig.orb1} blur-2xl animate-float-orb-1 opacity-95 mix-blend-screen`}
        />
        <div 
          className={`absolute top-1/5 -right-24 w-[54rem] h-[54rem] rounded-full ${themeConfig.orb2} blur-3xl animate-float-orb-2 opacity-90 mix-blend-screen`}
        />
        <div 
          className={`absolute -bottom-24 left-1/5 w-[50rem] h-[50rem] rounded-full ${themeConfig.orb3} blur-2xl animate-float-orb-3 opacity-95 mix-blend-screen`}
        />
        <div 
          className={`absolute top-2/3 -left-24 w-[44rem] h-[44rem] rounded-full ${themeConfig.orb4} blur-3xl animate-float-orb-4 opacity-90 mix-blend-screen`}
        />

        {/* Dynamic Atmospheric Visual Layers */}

        {/* 1. RAIN / STORM PRECIPITATION & RIPPLES */}
        {(themeConfig.effect === 'rain' || themeConfig.effect === 'storm') && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Storm lightning flash */}
            {themeConfig.effect === 'storm' && (
              <div className="absolute inset-0 bg-indigo-200/50 animate-lightning mix-blend-screen" />
            )}

            {/* Falling Rain Streaks */}
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={`rain-${i}`}
                className="absolute w-[2px] sm:w-[3px] h-24 bg-gradient-to-b from-transparent via-cyan-200 to-white rounded-full shadow-[0_0_6px_#38BDF8]"
                style={{
                  left: `${(i * 2.1) % 100}%`,
                  top: `-${(i * 22) % 100}px`,
                  animation: `rainFall ${0.45 + (i % 6) * 0.08}s linear infinite`,
                  animationDelay: `${(i * 0.05) % 1.2}s`,
                  opacity: 0.75 + (i % 4) * 0.08,
                }}
              />
            ))}

            {/* Base Puddle Ripples */}
            <div className="absolute bottom-4 inset-x-0 flex justify-around opacity-60">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`ripple-${i}`}
                  className="w-16 h-8 border-2 border-cyan-200/80 rounded-full"
                  style={{
                    animation: `rainRipple 1.6s ease-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 2. CLOUDS / OVERCAST FLOATING LAYERS */}
        {themeConfig.effect === 'clouds' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
            <svg className="absolute -top-10 -left-16 w-[75rem] h-80 text-white/70 animate-cloud-drift-1" viewBox="0 0 600 200" fill="currentColor">
              <path d="M50 150 C80 100 160 100 190 140 C220 90 320 80 370 130 C410 90 500 100 540 150 Z" />
            </svg>
            <svg className="absolute top-1/3 -right-20 w-[65rem] h-80 text-slate-100/60 animate-cloud-drift-2" viewBox="0 0 600 200" fill="currentColor">
              <path d="M60 140 C100 80 200 80 250 130 C300 70 420 80 470 140 Z" />
            </svg>
            <svg className="absolute bottom-8 left-8 w-[60rem] h-72 text-slate-200/50 animate-cloud-drift-1" viewBox="0 0 600 200" fill="currentColor">
              <path d="M40 130 C70 90 150 90 180 130 C210 80 310 70 360 120 C400 80 490 90 530 140 Z" />
            </svg>
          </div>
        )}

        {/* 3. SNOWFLAKES FALLING WITH WIND SWAY */}
        {themeConfig.effect === 'snow' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 45 }).map((_, i) => (
              <div
                key={`snow-${i}`}
                className="absolute text-white select-none drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
                style={{
                  left: `${(i * 2.2) % 98}%`,
                  top: '-30px',
                  fontSize: `${13 + (i % 5) * 5}px`,
                  animation: `snowDrift ${3.2 + (i % 6) * 0.8}s linear infinite`,
                  animationDelay: `${(i * 0.22) % 3.5}s`,
                  ['--drift-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (60 + (i % 5) * 20)}px`,
                }}
              >
                ❄
              </div>
            ))}
          </div>
        )}

        {/* 4. SUNLIGHT / CLEAR: SOLAR CORONA & GLOWING MOTES */}
        {themeConfig.effect === 'sunlight' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Radiant Rotating Sun Corona Flare */}
            <div className="absolute -top-32 -right-32 w-[65rem] h-[65rem] rounded-full bg-radial from-amber-300/85 via-amber-400/40 to-transparent animate-sun-rotate mix-blend-screen" />
            
            {/* Rising Golden Light Motes */}
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={`sun-mote-${i}`}
                className="absolute rounded-full bg-amber-100 shadow-[0_0_14px_#F59E0B]"
                style={{
                  width: `${5 + (i % 4) * 3}px`,
                  height: `${5 + (i % 4) * 3}px`,
                  left: `${(i * 2.8 + 4) % 95}%`,
                  top: '100vh',
                  animation: `particleRise ${4 + (i % 5) * 0.9}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.28) % 4}s`,
                  ['--drift-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (40 + (i % 4) * 15)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* 4.5. HAPPY: BABY PINK (#FF7E7E) WITH WHITE FLOWERS FALLING LIKE A GENTLE SNOWFALL */}
        {themeConfig.effect === 'happy' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Soft pink light pulse layer */}
            <div className="absolute inset-0 bg-[#FF7E7E]/10 animate-breathe-loop pointer-events-none" />

            {/* Falling 5-Petal White Blossom Flowers & Petals like Snowfall */}
            {Array.from({ length: 46 }).map((_, i) => {
              const isFullFlower = i % 3 !== 0; // mix of full 5-petal white flowers and single white petals
              const size = isFullFlower ? 18 + (i % 5) * 5 : 11 + (i % 4) * 4;
              const duration = 3.6 + (i % 6) * 0.85;
              const delay = (i * 0.19) % 4.0;
              const driftX = (i % 2 === 0 ? 1 : -1) * (55 + (i % 5) * 22);

              return (
                <div
                  key={`flower-${i}`}
                  className="absolute select-none pointer-events-none drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)]"
                  style={{
                    left: `${(i * 2.2 + 1) % 98}%`,
                    top: '-45px',
                    width: `${size}px`,
                    height: `${size}px`,
                    animation: `flowerSnowFall ${duration}s linear infinite`,
                    animationDelay: `${delay}s`,
                    ['--drift-x' as string]: `${driftX}px`,
                  }}
                >
                  {isFullFlower ? (
                    // Crisp 5-Petal White Blossom Flower with subtle golden-pink center
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full filter drop-shadow-[0_1px_4px_rgba(255,126,126,0.35)]"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g fill="#FFFFFF" stroke="#FFE4E4" strokeWidth="1.2">
                        <circle cx="50" cy="30" r="17" fill="#FFFFFF" />
                        <circle cx="69" cy="44" r="17" fill="#FFFFFF" />
                        <circle cx="62" cy="69" r="17" fill="#FFFFFF" />
                        <circle cx="38" cy="69" r="17" fill="#FFFFFF" />
                        <circle cx="31" cy="44" r="17" fill="#FFFFFF" />
                      </g>
                      {/* Delicate Blossom Pistil Center */}
                      <circle cx="50" cy="50" r="7" fill="#FEF08A" stroke="#F59E0B" strokeWidth="0.8" />
                      <circle cx="50" cy="50" r="3.5" fill="#FF7E7E" />
                    </svg>
                  ) : (
                    // Single Falling White Petal
                    <svg
                      viewBox="0 0 40 40"
                      className="w-full h-full"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 4 C32 14 36 28 20 36 C4 28 8 14 20 4 Z"
                        fill="#FFFFFF"
                        stroke="#FFD5D5"
                        strokeWidth="0.9"
                      />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 5. PEACEFUL: HARMONIC ZEN RESONANCE RINGS & SAGE MOTES */}
        {themeConfig.effect === 'peaceful' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[56rem] h-[56rem] rounded-full border-2 border-[#86EFAC]/50 animate-breathe-loop" />
            <div className="absolute w-[42rem] h-[42rem] rounded-full border-2 border-[#22C55E]/45 animate-breathe-loop" style={{ animationDelay: '1.2s' }} />
            <div className="absolute w-[28rem] h-[28rem] rounded-full bg-[#4ADE80]/50 blur-2xl animate-breathe-loop" style={{ animationDelay: '2.4s' }} />
            
            {/* Floating Sage Botanics */}
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={`peace-${i}`}
                className="absolute rounded-full bg-[#86EFAC] shadow-[0_0_12px_#22C55E]"
                style={{
                  width: `${6 + (i % 3) * 3}px`,
                  height: `${6 + (i % 3) * 3}px`,
                  left: `${(i * 3.3 + 3) % 96}%`,
                  top: '100vh',
                  animation: `particleRise ${5 + (i % 4) * 1.1}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.35) % 4.5}s`,
                  ['--drift-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (45 + (i % 4) * 12)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* 6. ENERGIZED: GOLDEN RISING EMBER MOTES */}
        {themeConfig.effect === 'energized' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 38 }).map((_, i) => (
              <div
                key={`ember-${i}`}
                className="absolute rounded-full bg-gradient-to-tr from-yellow-300 via-amber-400 to-orange-500 shadow-[0_0_14px_#EA580C]"
                style={{
                  width: `${6 + (i % 4) * 3}px`,
                  height: `${6 + (i % 4) * 3}px`,
                  left: `${(i * 2.6 + 3) % 96}%`,
                  top: '100vh',
                  animation: `particleRise ${3.5 + (i % 4) * 0.8}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.22) % 3.5}s`,
                  ['--drift-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (50 + (i % 5) * 18)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* 7. THOUGHTFUL: TWINKLING CONSTELLATIONS & COSMIC NEBULA */}
        {themeConfig.effect === 'thoughtful' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={`star-${i}`}
                className="absolute rounded-full bg-white shadow-[0_0_14px_#818CF8]"
                style={{
                  width: `${3 + (i % 4) * 3}px`,
                  height: `${3 + (i % 4) * 3}px`,
                  left: `${(i * 2.0 + 3) % 96}%`,
                  top: `${(i * 5.2 + 5) % 94}%`,
                  animation: `starTwinkle ${1.8 + (i % 5) * 0.6}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.2) % 2.5}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 8. MOTIVATED: EMERALD FOCUS CRYSTAL MOTES */}
        {themeConfig.effect === 'motivated' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={`focus-${i}`}
                className="absolute rotate-45 bg-emerald-200 shadow-[0_0_14px_#10B981]"
                style={{
                  width: `${7 + (i % 3) * 4}px`,
                  height: `${7 + (i % 3) * 4}px`,
                  left: `${(i * 3.1 + 4) % 95}%`,
                  top: '100vh',
                  animation: `particleRise ${3.8 + (i % 4) * 0.9}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.28) % 3.8}s`,
                  ['--drift-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (40 + (i % 3) * 18)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* 9. ANXIOUS: ROLLING OCEAN SINE WAVES */}
        {themeConfig.effect === 'anxious' && (
          <div className="absolute inset-x-0 bottom-0 h-[32rem] overflow-hidden pointer-events-none opacity-65">
            <svg className="absolute bottom-0 w-[200%] h-80 text-sky-400/60 animate-wave-roll" viewBox="0 0 1200 200" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 100 C150 50 350 150 500 100 C650 50 850 150 1000 100 C1150 50 1350 150 1500 100 L1500 200 L0 200 Z" />
            </svg>
            <svg className="absolute -bottom-6 w-[200%] h-80 text-blue-500/50 animate-wave-roll" style={{ animationDuration: '12s', animationDirection: 'reverse' }} viewBox="0 0 1200 200" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 120 C200 70 400 170 600 120 C800 70 1000 170 1200 120 L1200 200 L0 200 Z" />
            </svg>
          </div>
        )}

        {/* 10. OVERWHELMED: RESTORATIVE LAVENDER PETALS */}
        {themeConfig.effect === 'overwhelmed' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={`petal-${i}`}
                className="absolute rounded-tl-full rounded-br-full bg-purple-200 shadow-[0_0_12px_#C084FC]"
                style={{
                  width: `${10 + (i % 3) * 4}px`,
                  height: `${14 + (i % 3) * 5}px`,
                  left: `${(i * 3.2 + 3) % 95}%`,
                  top: '-30px',
                  animation: `petalDrift ${4.8 + (i % 4) * 1.1}s linear infinite`,
                  animationDelay: `${(i * 0.32) % 4.5}s`,
                  ['--drift-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (60 + (i % 4) * 20)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* 11. NEUTRAL: WARM GOLDEN SUNBEAM MOTES */}
        {themeConfig.effect === 'neutral' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={`neutral-mote-${i}`}
                className="absolute rounded-full bg-amber-100 shadow-[0_0_12px_#F59E0B]"
                style={{
                  width: `${5 + (i % 3) * 3}px`,
                  height: `${5 + (i % 3) * 3}px`,
                  left: `${(i * 3.1 + 5) % 94}%`,
                  top: '100vh',
                  animation: `particleRise ${5 + (i % 4) * 1.1}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.35) % 4.5}s`,
                  ['--drift-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (40 + (i % 3) * 15)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Ambient Subtle Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/[0.01] to-black/[0.08] mix-blend-multiply" />
      </div>

      {/* 2. AMBIENT STATUS & ALTERNATING MODE HEADER BADGE */}
      {showIndicatorBadge && (
        <div className="sticky top-0 z-20 mx-auto max-w-4xl w-full px-4 pt-3 pb-1 flex items-center justify-between pointer-events-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E6E2D3]/90 bg-[#FDFCF9]/90 backdrop-blur-md px-3.5 py-1.5 shadow-sm text-xs font-serif">
            <span className="text-base">{themeConfig.icon}</span>
            <span className="text-[#1A1A1A] font-semibold">{themeConfig.name}</span>
            <span className="text-[#9C988B]">•</span>
            <span className="text-[#4A5D4E] font-medium text-[11px]">
              {driver === 'weather'
                ? `Weather-Driven Ambiance (Even Day ${dayNumber ? `#${dayNumber}` : ''})`
                : `Sentiment-Driven Ambiance (Odd Day ${dayNumber ? `#${dayNumber}` : ''})`}
            </span>
          </div>

          {onToggleDriver && (
            <button
              id="btn-toggle-visual-driver"
              onClick={onToggleDriver}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E2D3] bg-[#FDFCF9]/90 hover:bg-[#F5F2E8] backdrop-blur-md px-3.5 py-1.5 text-xs font-serif font-medium text-[#4A5D4E] transition-all shadow-xs hover:shadow-sm cursor-pointer"
              title="Click to switch between Mood-Driven and Weather-Driven ambient backgrounds"
            >
              <span>Switch to {driver === 'weather' ? 'Mood' : 'Weather'} Visuals</span>
            </button>
          )}
        </div>
      )}

      {/* 3. MAIN FOREGROUND CONTENT CONTAINER */}
      <div className="relative z-10 flex-1 flex flex-col w-full h-full min-h-0">
        {children}
      </div>
    </div>
  );
};

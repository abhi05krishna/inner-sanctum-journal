import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Compass, 
  Layers, 
  Info, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Maximize2,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import type { JournalEntry, MoodType } from '../types';
import { projectEmbeddingsPCA, UniverseNode, ConstellationLink, computeCosineSimilarity } from '../utils/pca';

interface ReflectionUniverseProps {
  entries: JournalEntry[];
  onSelectDate: (dateStr: string) => void;
  onBackToCalendar: () => void;
  userId?: string;
  onRefreshEmbeddings?: () => Promise<void>;
  isRefreshingEmbeddings?: boolean;
}

// Celestial High-Contrast Mood Color Palette for deep cosmic dark space
const MOOD_PALETTE: Record<
  MoodType,
  { name: string; hex: string; lightHex: string; glowHex: string; emoji: string }
> = {
  happy: {
    name: 'Happy',
    hex: '#FF6B6B',
    lightHex: '#FFA8A8',
    glowHex: 'rgba(255, 107, 107, 0.35)',
    emoji: '🌸',
  },
  peaceful: {
    name: 'Peaceful',
    hex: '#48BB78',
    lightHex: '#9AE6B4',
    glowHex: 'rgba(72, 187, 120, 0.35)',
    emoji: '🌿',
  },
  energized: {
    name: 'Energized',
    hex: '#F6AD55',
    lightHex: '#FBD38D',
    glowHex: 'rgba(246, 173, 85, 0.35)',
    emoji: '⚡',
  },
  thoughtful: {
    name: 'Thoughtful',
    hex: '#63B3ED',
    lightHex: '#BEE3F8',
    glowHex: 'rgba(99, 179, 237, 0.35)',
    emoji: '💡',
  },
  anxious: {
    name: 'Anxious',
    hex: '#FC8181',
    lightHex: '#FEB2B2',
    glowHex: 'rgba(252, 129, 129, 0.35)',
    emoji: '🌪️',
  },
  motivated: {
    name: 'Motivated',
    hex: '#ED8936',
    lightHex: '#FEEBC8',
    glowHex: 'rgba(237, 137, 54, 0.35)',
    emoji: '🎯',
  },
  overwhelmed: {
    name: 'Overwhelmed',
    hex: '#B794F4',
    lightHex: '#E9D8FD',
    glowHex: 'rgba(183, 148, 244, 0.35)',
    emoji: '🌊',
  },
  neutral: {
    name: 'Neutral',
    hex: '#CBD5E0',
    lightHex: '#EDF2F7',
    glowHex: 'rgba(203, 213, 224, 0.35)',
    emoji: '🌱',
  },
};

// Deterministic background stars for the deep night-sky constellation canvas
interface BackgroundStar {
  x: number;
  y: number;
  r: number;
  opacity: number;
  twinkleDuration: number;
  twinkleDelay: number;
  color: string;
}

function generateDeterministicStars(count = 110): BackgroundStar[] {
  const stars: BackgroundStar[] = [];
  const starColors = ['#FFFFFF', '#E2E8F0', '#FDE68A', '#93C5FD', '#DDD6FE'];

  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random values
    const seedX = Math.sin(i * 997.3 + 12.5);
    const seedY = Math.cos(i * 733.7 + 45.1);
    const seedR = Math.sin(i * 421.1 + 8.2);
    const seedTwinkle = Math.cos(i * 311.9 + 19.3);

    const x = Math.round(((seedX + 1) / 2) * 1000) / 10; // 0 to 100%
    const y = Math.round(((seedY + 1) / 2) * 1000) / 10; // 0 to 100%
    const r = 0.6 + Math.abs(seedR) * 1.5; // 0.6px to 2.1px
    const opacity = 0.18 + Math.abs(seedTwinkle) * 0.55;
    const twinkleDuration = 2.5 + Math.abs(seedX) * 3.5;
    const twinkleDelay = Math.abs(seedY) * 3;
    const color = starColors[i % starColors.length];

    stars.push({ x, y, r, opacity, twinkleDuration, twinkleDelay, color });
  }

  return stars;
}

const BACKGROUND_STARS = generateDeterministicStars(110);

export const ReflectionUniverse: React.FC<ReflectionUniverseProps> = ({
  entries,
  onSelectDate,
  onBackToCalendar,
  userId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 960, height: 620 });
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<MoodType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showClusterShading, setShowClusterShading] = useState(true);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  
  // Pan and Zoom states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  // ResizeObserver for responsive SVG dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((chartEntries) => {
      for (const entry of chartEntries) {
        const { width, height } = entry.contentRect;
        if (width > 200 && height > 200) {
          setContainerDimensions({
            width: Math.round(width),
            height: Math.round(Math.max(height, 540)),
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter active, non-deleted entries
  const activeEntries = useMemo(() => {
    return entries.filter((e) => !e.isDeleted);
  }, [entries]);

  // Entries with valid embeddings
  const embeddedEntries = useMemo(() => {
    return activeEntries.filter(
      (e) => Array.isArray(e.embedding) && e.embedding.length > 0 && e.embedding.some((val) => val !== 0)
    );
  }, [activeEntries]);

  // Perform 2D PCA projection
  const projection = useMemo(() => {
    return projectEmbeddingsPCA(embeddedEntries, {
      width: containerDimensions.width,
      height: containerDimensions.height,
      padding: Math.min(110, Math.round(containerDimensions.width * 0.14)),
    });
  }, [embeddedEntries, containerDimensions]);

  // Node Map for fast lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, UniverseNode>();
    for (const node of projection.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [projection.nodes]);

  // Group nodes by mood to generate soft cluster shading & centroids
  const moodClusters = useMemo(() => {
    const groups: Record<string, UniverseNode[]> = {};
    for (const node of projection.nodes) {
      const mood = node.mood || 'neutral';
      if (!groups[mood]) groups[mood] = [];
      groups[mood].push(node);
    }

    const clusters: Array<{
      mood: MoodType;
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      nodesCount: number;
      palette: typeof MOOD_PALETTE[MoodType];
    }> = [];

    for (const [moodKey, groupNodes] of Object.entries(groups)) {
      const mood = moodKey as MoodType;
      const palette = MOOD_PALETTE[mood] || MOOD_PALETTE.neutral;

      if (groupNodes.length === 1) {
        // Single point cluster aura
        clusters.push({
          mood,
          cx: groupNodes[0].x,
          cy: groupNodes[0].y,
          rx: 75,
          ry: 75,
          nodesCount: 1,
          palette,
        });
      } else {
        // Multi-point cluster: calculate centroid and spatial radius
        let sumX = 0;
        let sumY = 0;
        for (const n of groupNodes) {
          sumX += n.x;
          sumY += n.y;
        }
        const cx = sumX / groupNodes.length;
        const cy = sumY / groupNodes.length;

        let maxDistX = 50;
        let maxDistY = 50;
        for (const n of groupNodes) {
          maxDistX = Math.max(maxDistX, Math.abs(n.x - cx));
          maxDistY = Math.max(maxDistY, Math.abs(n.y - cy));
        }

        clusters.push({
          mood,
          cx,
          cy,
          rx: Math.min(220, maxDistX + 60),
          ry: Math.min(200, maxDistY + 60),
          nodesCount: groupNodes.length,
          palette,
        });
      }
    }

    return clusters;
  }, [projection.nodes]);

  // Selected Node Object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeMap.get(selectedNodeId) || null;
  }, [selectedNodeId, nodeMap]);

  // Closest semantic neighbors to the selected node
  const selectedNeighbors = useMemo(() => {
    if (!selectedNode) return [];
    const list: Array<{ node: UniverseNode; similarity: number }> = [];
    for (const node of projection.nodes) {
      if (node.id === selectedNode.id) continue;
      const sim = computeCosineSimilarity(selectedNode.embedding, node.embedding);
      list.push({ node, similarity: sim });
    }
    list.sort((a, b) => b.similarity - a.similarity);
    return list.slice(0, 3);
  }, [selectedNode, projection.nodes]);

  // Mood counts for the legend
  const moodCounts = useMemo(() => {
    const counts: Record<MoodType, number> = {
      happy: 0,
      peaceful: 0,
      energized: 0,
      thoughtful: 0,
      anxious: 0,
      motivated: 0,
      overwhelmed: 0,
      neutral: 0,
    };
    for (const node of projection.nodes) {
      const mood = node.mood || 'neutral';
      counts[mood] = (counts[mood] || 0) + 1;
    }
    return counts;
  }, [projection.nodes]);

  // Pan / Drag handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow dragging when clicking on SVG background or background groups
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel Zoom support
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoomLevel((prev) => Math.min(3.2, Math.max(0.5, prev * zoomFactor)));
  }, []);

  // Touch handlers for mobile pan & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPanOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchDistance !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistance;
      setZoomLevel((prev) => Math.min(3.2, Math.max(0.5, prev * factor)));
      setTouchDistance(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchDistance(null);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#070B14] text-[#E2E8F0] flex flex-col relative overflow-hidden select-none">
      {/* Top Observatory Control Bar */}
      <div className="border-b border-white/10 bg-[#0B1222]/85 px-4 sm:px-6 py-3 backdrop-blur-md z-10 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back Button & Title */}
          <div className="flex items-center gap-3">
            <button
              id="btn-universe-back"
              onClick={onBackToCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 text-xs font-serif font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors shadow-2xs cursor-pointer"
              title="Return to Calendar View"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#FA8112]" />
              <span>Calendar</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-serif font-bold text-white flex items-center gap-2">
                  <Compass className="h-5 w-5 text-[#63B3ED]" />
                  <span>Reflection Universe</span>
                </h1>
                <span className="text-[10px] font-mono uppercase bg-[#63B3ED]/20 text-[#90CDF4] font-bold px-2 py-0.5 rounded-full border border-[#63B3ED]/30">
                  2D Semantic Space
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block mt-0.5">
                Observatory map of your thoughts. Distance indicates semantic relatedness.
              </p>
            </div>
          </div>

          {/* Quick Actions & Canvas Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Entry Count Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-xl border border-white/10 text-xs text-slate-300">
              <span className="font-semibold text-white">{projection.nodes.length}</span> stars mapped
            </div>

            {/* Constellations Line Toggle (with semantic similarity clarification) */}
            <button
              id="btn-toggle-constellations"
              onClick={() => setShowConstellations((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-serif transition-all cursor-pointer ${
                showConstellations
                  ? 'bg-[#63B3ED]/20 text-[#90CDF4] border-[#63B3ED]/50 shadow-sm'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200'
              }`}
              title="Toggle semantic similarity links between reflections (≥55% similarity)"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Constellations</span>
              <span className="text-[10px] opacity-70">
                {showConstellations ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Soft Cluster Shading Toggle */}
            <button
              id="btn-toggle-clusters"
              onClick={() => setShowClusterShading((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-serif transition-all cursor-pointer ${
                showClusterShading
                  ? 'bg-[#B794F4]/20 text-[#D6BCFA] border-[#B794F4]/50 shadow-sm'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200'
              }`}
              title="Toggle soft colored nebula glow behind thematic clusters"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cluster Shading</span>
              <span className="text-[10px] opacity-70">
                {showClusterShading ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Zoom / Reset Controls */}
            <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5 shadow-2xs">
              <button
                onClick={() => setZoomLevel((z) => Math.min(3.2, z + 0.25))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={resetView}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Reset View & Pan (100%)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-2 select-none">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="border-b border-white/10 bg-[#0B1222]/50 px-4 sm:px-6 py-2.5 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Mood Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => setSelectedMoodFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all cursor-pointer ${
                selectedMoodFilter === 'all'
                  ? 'bg-white text-[#0A0F1D] font-bold shadow-sm'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              All Reflections ({projection.nodes.length})
            </button>

            {(Object.keys(MOOD_PALETTE) as MoodType[]).map((moodKey) => {
              const info = MOOD_PALETTE[moodKey];
              const count = moodCounts[moodKey] || 0;
              if (count === 0 && selectedMoodFilter !== moodKey) return null;
              const isActive = selectedMoodFilter === moodKey;

              return (
                <button
                  key={moodKey}
                  onClick={() => setSelectedMoodFilter(isActive ? 'all' : moodKey)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-serif transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/20 text-white font-bold border border-white/40 shadow-sm'
                      : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                  }`}
                  style={{
                    borderColor: isActive ? info.hex : undefined,
                    backgroundColor: isActive ? `${info.hex}25` : undefined,
                    color: isActive ? info.lightHex : undefined,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full inline-block"
                    style={{ backgroundColor: info.hex }}
                  />
                  <span>{info.emoji}</span>
                  <span className="capitalize">{info.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              maxLength={300}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search constellations..."
              className="w-full rounded-xl border border-white/15 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-[#63B3ED] focus:outline-none focus:bg-white/10 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden" ref={containerRef}>
        {/* Edge Case: Insufficient Data (< 2 entries with embeddings) */}
        {projection.status === 'insufficient_data' ? (
          <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
            <div className="max-w-md w-full text-center bg-[#0B1222]/80 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-[#63B3ED] mb-4 border border-white/10 shadow-inner">
                <Compass className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-serif font-bold text-white">
                Your Reflection Universe is Forming
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                The Reflection Universe maps your thoughts across a 2D emotional landscape using vector embeddings. To plot constellations, we need at least <strong>2 completed reflections</strong>.
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-black/30 border border-white/10 text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Active Journal Entries:</span>
                  <span className="font-semibold text-white">{activeEntries.length}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Embedded Reflections:</span>
                  <span className="font-semibold text-[#63B3ED]">{embeddedEntries.length} / 2 required</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onBackToCalendar}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-[#0A0F1D] text-xs font-serif font-bold hover:bg-slate-200 transition-all shadow-md cursor-pointer"
                >
                  Return to Journal
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* SVG Interactive Visualization Canvas */
          <div
            className={`flex-1 relative overflow-hidden min-h-[480px] bg-[#070B14] ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* SVG Interactive Canvas */}
            <svg
              className="w-full h-full select-none block"
              style={{ minHeight: '520px' }}
            >
              <defs>
                {/* Subtle Radial Sky Background Gradient */}
                <radialGradient id="sky-nebula-core" cx="50%" cy="45%" r="70%">
                  <stop offset="0%" stopColor="#14213d" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#0b1329" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#050811" stopOpacity="1" />
                </radialGradient>

                {/* Soft Cluster Gaussian Blur Filter */}
                <filter id="cluster-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="42" result="blur" />
                </filter>

                {/* Subtle Star Glow Filter */}
                <filter id="star-diffuse-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Celestial Grid Pattern */}
                <pattern id="celestial-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="1" fill="rgba(255, 255, 255, 0.12)" />
                </pattern>
              </defs>

              {/* Sky Backdrop */}
              <rect width="100%" height="100%" fill="url(#sky-nebula-core)" />
              <rect width="100%" height="100%" fill="url(#celestial-grid)" />

              {/* Faint Distant Twinkling Background Starfield */}
              <g className="pointer-events-none">
                {BACKGROUND_STARS.map((star, idx) => (
                  <circle
                    key={`bg-star-${idx}`}
                    cx={`${star.x}%`}
                    cy={`${star.y}%`}
                    r={star.r}
                    fill={star.color}
                    opacity={star.opacity}
                    style={{
                      animation: `starTwinkle ${star.twinkleDuration}s ease-in-out infinite`,
                      animationDelay: `${star.twinkleDelay}s`,
                    }}
                  />
                ))}
              </g>

              {/* Transform Group for Pan and Zoom */}
              <g
                transform={`translate(${panOffset.x + (containerDimensions.width / 2) * (1 - zoomLevel)}, ${
                  panOffset.y + (containerDimensions.height / 2) * (1 - zoomLevel)
                }) scale(${zoomLevel})`}
              >
                {/* 1. Soft Cluster Shading (Translucent glowing nebula clouds behind groups) */}
                {showClusterShading && (
                  <g className="pointer-events-none">
                    {/* Individual point soft colored auras */}
                    {projection.nodes.map((node) => {
                      const mood = node.mood || 'neutral';
                      const palette = MOOD_PALETTE[mood] || MOOD_PALETTE.neutral;
                      return (
                        <circle
                          key={`node-cloud-${node.id}`}
                          cx={node.x}
                          cy={node.y}
                          r={60}
                          fill={palette.hex}
                          opacity={0.09}
                          filter="url(#cluster-glow)"
                        />
                      );
                    })}

                    {/* Group clusters: Centroid ambient ellipses */}
                    {moodClusters.map((cluster, idx) => (
                      <ellipse
                        key={`cluster-blob-${idx}`}
                        cx={cluster.cx}
                        cy={cluster.cy}
                        rx={cluster.rx}
                        ry={cluster.ry}
                        fill={cluster.palette.hex}
                        opacity={cluster.nodesCount > 1 ? 0.14 : 0.08}
                        filter="url(#cluster-glow)"
                      />
                    ))}
                  </g>
                )}

                {/* 2. Constellation Links between semantic neighbors */}
                {showConstellations &&
                  projection.links.map((link) => {
                    const source = nodeMap.get(link.sourceId);
                    const target = nodeMap.get(link.targetId);
                    if (!source || !target) return null;

                    const isHighlighted =
                      selectedNodeId === link.sourceId ||
                      selectedNodeId === link.targetId ||
                      hoveredNodeId === link.sourceId ||
                      hoveredNodeId === link.targetId ||
                      hoveredLinkId === `${link.sourceId}-${link.targetId}`;

                    const sourcePalette = MOOD_PALETTE[source.mood || 'neutral'] || MOOD_PALETTE.neutral;
                    const strokeColor = isHighlighted ? sourcePalette.hex : '#64748B';

                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;

                    return (
                      <g
                        key={`${link.sourceId}-${link.targetId}`}
                        onMouseEnter={() => setHoveredLinkId(`${link.sourceId}-${link.targetId}`)}
                        onMouseLeave={() => setHoveredLinkId(null)}
                      >
                        {/* Faint Celestial Constellation Line */}
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={strokeColor}
                          strokeWidth={isHighlighted ? 2.5 : 1.2}
                          strokeDasharray={isHighlighted ? 'none' : '4 5'}
                          opacity={isHighlighted ? 0.95 : 0.35}
                          className="transition-all duration-300"
                        />

                        {/* Semantic Match Percentage Badge on Highlight */}
                        {isHighlighted && (
                          <g transform={`translate(${midX}, ${midY})`}>
                            <rect
                              x="-24"
                              y="-11"
                              width="48"
                              height="20"
                              rx="10"
                              fill="#0B1222"
                              stroke={strokeColor}
                              strokeWidth="1.2"
                              opacity="0.95"
                            />
                            <text
                              x="0"
                              y="3"
                              textAnchor="middle"
                              className="text-[9px] font-mono font-bold fill-white pointer-events-none select-none"
                            >
                              {Math.round(link.similarity * 100)}%
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                {/* 3. Interactive Star Nodes */}
                {projection.nodes.map((node) => {
                  const mood = node.mood || 'neutral';
                  const palette = MOOD_PALETTE[mood] || MOOD_PALETTE.neutral;
                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;

                  // Filter check
                  const matchesMood = selectedMoodFilter === 'all' || node.mood === selectedMoodFilter;
                  const matchesSearch =
                    !searchQuery ||
                    node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.date.includes(searchQuery) ||
                    (node.summary && node.summary.toLowerCase().includes(searchQuery.toLowerCase()));

                  const isDimmed = !matchesMood || !matchesSearch;

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer transition-all duration-200"
                      opacity={isDimmed ? 0.18 : 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* Outer Cosmic Pulse Aura */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected ? 30 : isHovered ? 24 : 16}
                        fill={palette.hex}
                        opacity={isSelected ? 0.35 : isHovered ? 0.28 : 0.15}
                        className={isSelected || isHovered ? 'animate-celestial-pulse' : ''}
                      />

                      {/* Selected Orbital Beacon Ring */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={22}
                          fill="none"
                          stroke={palette.hex}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity={0.8}
                        />
                      )}

                      {/* 4-Point Starlight Diffraction Spikes for Selected or Hovered Star */}
                      {(isSelected || isHovered) && (
                        <g opacity={0.75} stroke={palette.lightHex} strokeWidth="1.2">
                          <line x1={node.x - 18} y1={node.y} x2={node.x + 18} y2={node.y} />
                          <line x1={node.x} y1={node.y - 18} x2={node.x} y2={node.y + 18} />
                        </g>
                      )}

                      {/* Outer Stellar Rim */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected ? 12 : isHovered ? 10.5 : 8}
                        fill="#0B1222"
                        stroke={palette.hex}
                        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                        className="transition-all duration-200"
                        filter="url(#star-diffuse-glow)"
                      />

                      {/* Brilliant White Core */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected ? 5.5 : isHovered ? 4.5 : 3.5}
                        fill="#FFFFFF"
                      />

                      {/* Date Label under star */}
                      <text
                        x={node.x}
                        y={node.y + (isSelected ? 26 : 20)}
                        textAnchor="middle"
                        className="text-[10px] font-sans font-medium select-none pointer-events-none fill-slate-200"
                        style={{
                          textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0,0,0,0.8)',
                          fontWeight: isSelected ? '700' : '500',
                          fill: isSelected ? '#FFFFFF' : '#CBD5E1',
                        }}
                      >
                        {node.date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Quick Floating Tooltip for Hovered Node */}
            {hoveredNodeId && !selectedNodeId && (
              (() => {
                const node = nodeMap.get(hoveredNodeId);
                if (!node) return null;
                const palette = MOOD_PALETTE[node.mood || 'neutral'] || MOOD_PALETTE.neutral;

                return (
                  <div
                    className="absolute z-20 pointer-events-none rounded-2xl border border-white/20 bg-[#0B1222]/95 backdrop-blur-xl p-3.5 shadow-2xl max-w-xs text-xs text-white animate-in fade-in duration-150"
                    style={{
                      left: Math.min(
                        node.x * zoomLevel + panOffset.x + (containerDimensions.width / 2) * (1 - zoomLevel) + 20,
                        containerDimensions.width - 260
                      ),
                      top: Math.max(
                        node.y * zoomLevel + panOffset.y + (containerDimensions.height / 2) * (1 - zoomLevel) - 50,
                        20
                      ),
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1 font-serif">
                      <span>{palette.emoji}</span>
                      <span className="font-bold text-white">{node.date}</span>
                      <span
                        className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ml-auto"
                        style={{
                          backgroundColor: `${palette.hex}25`,
                          color: palette.lightHex,
                          border: `1px solid ${palette.hex}40`,
                        }}
                      >
                        {node.mood || 'peaceful'}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-100 line-clamp-1">
                      {node.title}
                    </div>
                    {node.summary && (
                      <div className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-tight">
                        {node.summary}
                      </div>
                    )}
                    <div className="mt-2 text-[10px] text-[#63B3ED] font-medium flex items-center gap-1">
                      <span>Click star to inspect & open reflection</span>
                      <span>→</span>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Comprehensive Mood Color & Constellations Legend (Bottom-Left Corner) */}
            <div className="absolute bottom-4 left-4 z-20 max-w-[290px] w-full">
              <div className="rounded-2xl border border-white/15 bg-[#0B1222]/90 backdrop-blur-xl p-3 shadow-2xl text-xs text-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#63B3ED]" />
                    <span className="font-serif font-bold text-white text-[11px] tracking-wide">
                      Universe Map Legend
                    </span>
                  </div>
                  <button
                    onClick={() => setIsLegendExpanded((prev) => !prev)}
                    className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title={isLegendExpanded ? 'Collapse Legend' : 'Expand Legend'}
                  >
                    {isLegendExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {isLegendExpanded && (
                  <div className="pt-2.5 space-y-3">
                    {/* 1. Mood Colors Grid */}
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                        Mood Color Frequencies
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(MOOD_PALETTE) as MoodType[]).map((mKey) => {
                          const info = MOOD_PALETTE[mKey];
                          const count = moodCounts[mKey] || 0;
                          const isFiltered = selectedMoodFilter === mKey;

                          return (
                            <button
                              key={`legend-mood-${mKey}`}
                              onClick={() => setSelectedMoodFilter(isFiltered ? 'all' : mKey)}
                              className={`flex items-center justify-between px-2 py-1 rounded-lg border transition-all text-left cursor-pointer ${
                                isFiltered
                                  ? 'bg-white/20 border-white/40 text-white'
                                  : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0 shadow-xs"
                                  style={{ backgroundColor: info.hex }}
                                />
                                <span className="text-[11px] truncate capitalize">{info.name}</span>
                              </div>
                              <span className="text-[10px] font-mono opacity-70 ml-1">
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Map Symbols & Semantic Closeness Guide */}
                    <div className="pt-2 border-t border-white/10 space-y-1.5 text-[10px] text-slate-300 leading-snug">
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-white shrink-0">• Closeness:</span>
                        <span>Points closer together share similar themes & emotions.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-mono text-[#90CDF4] shrink-0 font-bold">- - -</span>
                        <span>
                          <strong className="text-white">Constellation Lines:</strong> Semantic match ≥55% (not a timeline).
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#B794F4] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-white">Soft Nebula Aura:</strong> Visual clustering of related reflections.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* On-Canvas Pan & Navigation Helper (Bottom-Right Corner) */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-[#0B1222]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-400">
              <Compass className="h-3.5 w-3.5 text-[#63B3ED]" />
              <span>Drag canvas to pan • Scroll to zoom</span>
            </div>
          </div>
        )}

        {/* Selected Entry Detail Drawer / Sidebar */}
        {selectedNode && (
          <div className="w-full lg:w-92 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0B1222]/95 p-5 backdrop-blur-2xl flex flex-col justify-between shadow-2xl z-20 animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl shadow-inner border border-white/10"
                    style={{
                      backgroundColor: `${MOOD_PALETTE[selectedNode.mood || 'neutral'].hex}20`,
                    }}
                  >
                    <span>{MOOD_PALETTE[selectedNode.mood || 'neutral'].emoji}</span>
                  </div>
                  <div>
                    <div className="text-xs font-serif font-bold text-white flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-[#FA8112]" />
                      <span>{selectedNode.date}</span>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5"
                      style={{
                        backgroundColor: `${MOOD_PALETTE[selectedNode.mood || 'neutral'].hex}25`,
                        color: MOOD_PALETTE[selectedNode.mood || 'neutral'].lightHex,
                        border: `1px solid ${MOOD_PALETTE[selectedNode.mood || 'neutral'].hex}50`,
                      }}
                    >
                      {selectedNode.mood || 'peaceful'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg text-xs hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  ✕
                </button>
              </div>

              {/* Title & Excerpt */}
              <div className="py-4 space-y-3">
                <h3 className="text-base font-serif font-bold text-white leading-snug">
                  {selectedNode.title}
                </h3>

                {selectedNode.summary ? (
                  <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    {selectedNode.summary}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    Reflection recorded with {selectedNode.turnsCount || 1} conversation turns.
                  </p>
                )}

                {/* Tags if any */}
                {selectedNode.tags && selectedNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedNode.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white/5 text-slate-300 px-2.5 py-0.5 rounded-lg border border-white/10"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Connected Constellation Neighbors */}
              {selectedNeighbors.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[11px] font-serif font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[#63B3ED]" />
                    <span>Closest Semantic Connections:</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedNeighbors.map(({ node: neighbor, similarity }) => (
                      <button
                        key={neighbor.id}
                        onClick={() => setSelectedNodeId(neighbor.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs transition-colors cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1 font-serif text-[11px] font-bold text-white">
                            <span>{MOOD_PALETTE[neighbor.mood || 'neutral'].emoji}</span>
                            <span>{neighbor.date}</span>
                          </div>
                          <div className="truncate text-[11px] text-slate-300 font-sans mt-0.5">
                            {neighbor.title}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-[#90CDF4] bg-[#63B3ED]/20 border border-[#63B3ED]/30 px-2 py-0.5 rounded-md shrink-0">
                          {Math.round(similarity * 100)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 mt-4 flex items-center gap-2">
              <button
                id="btn-universe-open-reflection"
                onClick={() => onSelectDate(selectedNode.date)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FA8112] text-white text-xs font-serif font-bold hover:bg-[#E5730D] transition-all shadow-lg cursor-pointer"
              >
                <span>Open Reflection</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

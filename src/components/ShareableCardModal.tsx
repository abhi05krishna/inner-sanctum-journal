import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  Quote, 
  Calendar as CalendarIcon,
  Smile,
  RefreshCw
} from 'lucide-react';
import type { JournalEntry, MoodType } from '../types';

interface ShareableCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: JournalEntry;
  initialExcerpt?: string;
}

const MOOD_META: Record<MoodType, { emoji: string; label: string }> = {
  happy: { emoji: '🌸', label: 'Happy' },
  peaceful: { emoji: '🌿', label: 'Peaceful' },
  thoughtful: { emoji: '💡', label: 'Thoughtful' },
  energized: { emoji: '⚡', label: 'Energized' },
  motivated: { emoji: '🎯', label: 'Motivated' },
  neutral: { emoji: '⚖️', label: 'Neutral' },
  anxious: { emoji: '🌪️', label: 'Anxious' },
  overwhelmed: { emoji: '🌊', label: 'Overwhelmed' },
};

export const ShareableCardModal: React.FC<ShareableCardModalProps> = ({
  isOpen,
  onClose,
  entry,
  initialExcerpt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'portrait'>('square');
  const [includeDate, setIncludeDate] = useState<boolean>(true);
  const [includeMood, setIncludeMood] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Available quote excerpts extracted from the entry
  const availableExcerpts = useMemo(() => {
    const list: { id: string; label: string; text: string; source: 'takeaway' | 'user' | 'gemini' }[] = [];

    // Takeaways / Summary
    if (entry.takeaways && entry.takeaways.length > 0) {
      entry.takeaways.forEach((t, i) => {
        list.push({
          id: `takeaway-${i}`,
          label: `Key Insight #${i + 1}`,
          text: t,
          source: 'takeaway',
        });
      });
    } else if (entry.summary) {
      list.push({
        id: 'summary',
        label: 'Synthesized Summary',
        text: entry.summary.slice(0, 240) + (entry.summary.length > 240 ? '...' : ''),
        source: 'takeaway',
      });
    }

    // User reflections
    entry.turns
      .filter((t) => t.role === 'user' && t.content.trim().length > 0)
      .forEach((t, i) => {
        const text = t.content.trim();
        list.push({
          id: `user-${t.id || i}`,
          label: `My Reflection #${i + 1}`,
          text: text.length > 280 ? text.slice(0, 277) + '...' : text,
          source: 'user',
        });
      });

    // Gemini responses
    entry.turns
      .filter((t) => t.role === 'gemini' && t.content.trim().length > 0)
      .forEach((t, i) => {
        // Strip markdown headings or quotes for clean excerpt
        const clean = t.content.replace(/[#*`_]/g, '').trim();
        const firstSentence = clean.split('\n')[0] || clean;
        list.push({
          id: `gemini-${t.id || i}`,
          label: `Gemini Inquiry #${i + 1}`,
          text: firstSentence.length > 280 ? firstSentence.slice(0, 277) + '...' : firstSentence,
          source: 'gemini',
        });
      });

    return list;
  }, [entry]);

  // Initial text population
  useEffect(() => {
    if (!isOpen) return;

    if (initialExcerpt && initialExcerpt.trim()) {
      setSelectedText(initialExcerpt.trim());
    } else if (availableExcerpts.length > 0) {
      setSelectedText(availableExcerpts[0].text);
    } else if (entry.title && entry.title !== 'Untitled Reflection') {
      setSelectedText(entry.title);
    } else {
      setSelectedText('A quiet moment of reflection, discovering clarity within.');
    }
  }, [isOpen, initialExcerpt, availableExcerpts, entry.title]);

  // Render card on canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    // Dimensions: High-DPI
    const width = 1200;
    const height = aspectRatio === 'square' ? 1200 : 1500;
    canvas.width = width;
    canvas.height = height;

    // Background: #FAF3E1
    ctx.fillStyle = '#FAF3E1';
    ctx.fillRect(0, 0, width, height);

    // Subtle inner double border: #DFCBA0
    const margin = 50;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#DFCBA0';
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    const innerMargin = 64;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E6D7B8';
    ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

    // Subtle decorative corner flourishes
    const cornerSize = 24;
    ctx.fillStyle = '#FA8112';
    const drawDiamond = (cx: number, cy: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(innerMargin, innerMargin, 5);
    drawDiamond(width - innerMargin, innerMargin, 5);
    drawDiamond(innerMargin, height - innerMargin, 5);
    drawDiamond(width - innerMargin, height - innerMargin, 5);

    // Header: "INNER SANCTUM"
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Top Sparkle Emblem
    const emblemY = 110;
    drawDiamond(width / 2, emblemY, 8);

    // Brand Name
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 38px "Playfair Display", Georgia, serif';
    ctx.fillText('INNER SANCTUM', width / 2, emblemY + 28);

    // Subtitle
    ctx.fillStyle = '#7C725F';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('A REFLECTION RECORD', width / 2, emblemY + 76);

    // Subtle Divider
    ctx.strokeStyle = '#DFCBA0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, emblemY + 112);
    ctx.lineTo(width / 2 + 80, emblemY + 112);
    ctx.stroke();

    // Mood Badge (if enabled)
    let currentY = emblemY + 140;
    if (includeMood && entry.mood) {
      const moodInfo = MOOD_META[entry.mood] || { emoji: '🌿', label: 'Reflective' };
      const moodText = `${moodInfo.emoji}  ${moodInfo.label.toUpperCase()}`;

      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = ctx.measureText(moodText).width;
      const pillW = textWidth + 48;
      const pillH = 38;
      const pillX = (width - pillW) / 2;
      const pillY = currentY;

      // Pill background: #F5E7C6
      ctx.fillStyle = '#F5E7C6';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 19);
      ctx.fill();

      // Pill border: #DFCBA0
      ctx.strokeStyle = '#DFCBA0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pill text: #994500
      ctx.fillStyle = '#994500';
      ctx.textBaseline = 'middle';
      ctx.fillText(moodText, width / 2, pillY + pillH / 2);

      currentY += 60;
    } else {
      currentY += 20;
    }

    // Large Decorative Opening Quotation Mark
    ctx.fillStyle = '#E5D3AE';
    ctx.font = 'italic 160px "Playfair Display", Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('“', width / 2, currentY + 30);

    // Quote Body Text Box
    const textToRender = selectedText.trim() || 'A quiet moment of reflection.';
    const maxTextWidth = width - 260;

    // Calculate font size dynamically based on length
    let fontSize = 42;
    if (textToRender.length > 250) {
      fontSize = 30;
    } else if (textToRender.length > 150) {
      fontSize = 34;
    } else if (textToRender.length > 80) {
      fontSize = 38;
    }

    ctx.fillStyle = '#222222';
    ctx.font = `italic ${fontSize}px "Playfair Display", Georgia, serif`;
    ctx.textBaseline = 'top';

    // Word wrap
    const words = textToRender.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Compute text vertical centering
    const lineHeight = fontSize * 1.5;
    const totalTextHeight = lines.length * lineHeight;
    const availableAreaTop = currentY + 70;
    const availableAreaBottom = height - 160;
    const quoteStartY = Math.max(availableAreaTop, (availableAreaTop + availableAreaBottom - totalTextHeight) / 2);

    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, quoteStartY + index * lineHeight);
    });

    // Bottom Footer Area
    const footerY = height - 120;

    // Subtle bottom divider
    ctx.strokeStyle = '#DFCBA0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 120, footerY - 20);
    ctx.lineTo(width / 2 + 120, footerY - 20);
    ctx.stroke();

    // Date (if enabled)
    ctx.fillStyle = '#7C725F';
    ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';

    let footerLabel = 'A Personal Reflection';
    if (includeDate) {
      try {
        const d = new Date(entry.date + 'T12:00:00');
        const formattedDate = d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        footerLabel = formattedDate;
      } catch {
        footerLabel = entry.date || entry.id;
      }
    }

    ctx.fillText(footerLabel, width / 2, footerY + 6);

    // Tiny privacy / authentic marker
    ctx.fillStyle = '#A39985';
    ctx.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Client-Side Reflection Artifact', width / 2, footerY + 36);

    setIsRendering(false);
  }, [isOpen, selectedText, aspectRatio, includeDate, includeMood, entry]);

  // Download image file
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `inner-sanctum-reflection-${entry.date || 'card'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download image:', err);
      setCopyFeedback('Download failed. Please try copying instead.');
      setTimeout(() => setCopyFeedback(null), 3500);
    }
  };

  // Copy image to clipboard
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Blob generation failed');
        }
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setIsCopied(true);
          setCopyFeedback('Image copied to clipboard!');
          setTimeout(() => {
            setIsCopied(false);
            setCopyFeedback(null);
          }, 3000);
        } else {
          // Fallback: copy text quote
          await navigator.clipboard.writeText(`"${selectedText}" — Inner Sanctum Reflection`);
          setIsCopied(true);
          setCopyFeedback('Text quote copied to clipboard (browser does not support direct image copying)');
          setTimeout(() => {
            setIsCopied(false);
            setCopyFeedback(null);
          }, 3500);
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Direct image clipboard copy failed, falling back to text:', err);
      try {
        await navigator.clipboard.writeText(`"${selectedText}" — Inner Sanctum Reflection`);
        setIsCopied(true);
        setCopyFeedback('Text quote copied to clipboard!');
        setTimeout(() => {
          setIsCopied(false);
          setCopyFeedback(null);
        }, 3000);
      } catch {
        setCopyFeedback('Could not copy. Please use the Download button.');
        setTimeout(() => setCopyFeedback(null), 3500);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-shareable-reflection-card"
      role="dialog"
      aria-modal="true"
      aria-label="Shareable Reflection Card"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border-2 border-[#DFCBA0] bg-[#FAF3E1] text-[#222222] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DFCBA0] bg-[#F5E7C6]/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FA8112] text-white shadow-xs">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#111111] leading-tight">
                Shareable Reflection Card
              </h2>
              <p className="text-xs text-[#5C5549] font-serif">
                Create a private, editorial graphic artifact of your chosen insight
              </p>
            </div>
          </div>

          <button
            id="btn-close-share-modal"
            onClick={onClose}
            className="p-2 text-[#7C786A] hover:text-[#111111] hover:bg-[#EBE2CC] rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Controls & Excerpt Selection */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            {/* Zero Leakage Privacy Guarantee Banner */}
            <div className="rounded-2xl border border-[#DFCBA0] bg-[#F5E7C6]/50 p-3.5 text-xs text-[#5C5549] flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#FA8112] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-[#111111]">100% Client-Side & Private:</strong> Generated on your local device canvas. Your identity, email, and unselected reflections are never included or sent anywhere.
              </div>
            </div>

            {/* Excerpt Selector Pills */}
            <div>
              <label className="block text-xs font-serif font-bold text-[#111111] mb-2 flex items-center gap-1.5">
                <Quote className="h-3.5 w-3.5 text-[#FA8112]" />
                <span>Select Excerpt to Feature:</span>
              </label>

              {availableExcerpts.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {availableExcerpts.map((excerpt) => {
                    const isSelected = selectedText === excerpt.text;
                    return (
                      <button
                        key={excerpt.id}
                        onClick={() => setSelectedText(excerpt.text)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FA8112]/10 border-[#FA8112] text-[#111111] font-medium shadow-2xs'
                            : 'bg-[#FDFCF9] border-[#DFCBA0]/80 text-[#333333] hover:bg-[#F5E7C6]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1 text-[#7C786A]">
                          <span>{excerpt.label}</span>
                          {isSelected && <span className="text-[#FA8112]">Selected</span>}
                        </div>
                        <p className="line-clamp-2 italic font-serif leading-relaxed">
                          "{excerpt.text}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#7C786A] italic">
                  No previous turns recorded yet. Write your custom quote below.
                </p>
              )}
            </div>

            {/* Editable Quote Textarea */}
            <div>
              <label className="block text-xs font-serif font-bold text-[#111111] mb-1.5">
                Quote Text (Customize as desired):
              </label>
              <textarea
                id="textarea-card-quote"
                rows={4}
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                maxLength={400}
                placeholder="Type or refine your reflection quote..."
                className="w-full rounded-xl border border-[#DFCBA0] bg-[#FFFFFF] p-3 text-xs sm:text-sm text-[#111111] font-serif placeholder-[#9C988B] focus:border-[#FA8112] focus:outline-none focus:ring-1 focus:ring-[#FA8112]"
              />
              <div className="flex justify-between text-[11px] text-[#7C786A] mt-1">
                <span>{selectedText.length} / 400 characters</span>
                <span>Keep brief for best visual elegance</span>
              </div>
            </div>

            {/* Design & Privacy Options */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-serif font-semibold text-[#111111] mb-1.5">
                  Aspect Ratio:
                </label>
                <div className="flex rounded-xl border border-[#DFCBA0] bg-[#F5E7C6]/40 p-1">
                  <button
                    onClick={() => setAspectRatio('square')}
                    className={`flex-1 py-1.5 text-xs font-serif font-semibold rounded-lg transition-all cursor-pointer ${
                      aspectRatio === 'square'
                        ? 'bg-[#FA8112] text-white shadow-xs'
                        : 'text-[#5C5549] hover:text-[#111111]'
                    }`}
                  >
                    1:1 Square
                  </button>
                  <button
                    onClick={() => setAspectRatio('portrait')}
                    className={`flex-1 py-1.5 text-xs font-serif font-semibold rounded-lg transition-all cursor-pointer ${
                      aspectRatio === 'portrait'
                        ? 'bg-[#FA8112] text-white shadow-xs'
                        : 'text-[#5C5549] hover:text-[#111111]'
                    }`}
                  >
                    4:5 Story
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-serif font-semibold text-[#111111] mb-1.5">
                  Badge Options:
                </label>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-xs text-[#333333] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDate}
                      onChange={(e) => setIncludeDate(e.target.checked)}
                      className="rounded border-[#DFCBA0] text-[#FA8112] focus:ring-[#FA8112]"
                    />
                    <span>Include Date</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#333333] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMood}
                      onChange={(e) => setIncludeMood(e.target.checked)}
                      className="rounded border-[#DFCBA0] text-[#FA8112] focus:ring-[#FA8112]"
                    />
                    <span>Include Mood Badge</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Card Canvas Preview & Export */}
          <div className="lg:col-span-6 flex flex-col items-center justify-between space-y-4">
            <div className="w-full flex items-center justify-between text-xs text-[#5C5549] font-serif">
              <span className="font-semibold text-[#111111]">Card Preview:</span>
              <span className="text-[11px] text-[#7C786A]">High-DPI Canvas Rendering</span>
            </div>

            {/* Canvas Preview Container */}
            <div className="relative w-full flex items-center justify-center p-3 rounded-2xl border border-[#DFCBA0] bg-[#F5E7C6]/30 shadow-inner overflow-hidden min-h-[320px]">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[380px] w-auto h-auto rounded-xl shadow-lg border border-[#DFCBA0]"
              />
              {isRendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#FAF3E1]/70 backdrop-blur-2xs">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#FA8112]" />
                </div>
              )}
            </div>

            {/* Copy Feedback Alert */}
            {copyFeedback && (
              <div className="w-full rounded-xl border border-[#DFCBA0] bg-[#F5E7C6] p-2.5 text-xs text-[#994500] font-medium text-center animate-in fade-in">
                {copyFeedback}
              </div>
            )}

            {/* Export Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                id="btn-copy-card-image"
                onClick={handleCopyImage}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#DFCBA0] bg-[#F5E7C6] hover:bg-[#EBDDB6] px-4 py-2.5 text-xs font-serif font-bold text-[#111111] transition-all cursor-pointer shadow-2xs"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-[#994500]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-[#FA8112]" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              <button
                id="btn-download-card-image"
                onClick={handleDownload}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FA8112] hover:bg-[#E0720D] px-4 py-2.5 text-xs font-serif font-bold text-white transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                <Download className="h-4 w-4" />
                <span>Download Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

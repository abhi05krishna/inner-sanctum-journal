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
  RefreshCw,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import type { JournalEntry, MoodType } from '../types';
import { 
  extractCleanReply, 
  stripMarkdownAndMediaLinks, 
  generateCuratedPullQuote, 
  truncateExcerptToLimit,
  splitIntoCleanSentences, 
  buildCuratedExcerptsList,
  type CuratedExcerptItem 
} from '../utils/cardExcerpt';

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
  const [selectedExcerptId, setSelectedExcerptId] = useState<string>('target-pullquote');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'portrait'>('square');
  const [includeDate, setIncludeDate] = useState<boolean>(true);
  const [includeMood, setIncludeMood] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Available short quote excerpts extracted from the entry and target turn
  const availableExcerpts = useMemo(() => {
    return buildCuratedExcerptsList(entry, initialExcerpt);
  }, [entry, initialExcerpt]);

  // Initial text population: always select a naturally SHORT, curated 1-2 sentence excerpt (max 280 chars) by default
  useEffect(() => {
    if (!isOpen) return;

    if (initialExcerpt && initialExcerpt.trim()) {
      const cleanContent = stripMarkdownAndMediaLinks(extractCleanReply(initialExcerpt));
      // Curate a naturally short 1-2 sentence pull quote (max 220 chars) rather than dumping the full response
      const pullQuote = generateCuratedPullQuote(cleanContent, 220);
      const defaultQuote = truncateExcerptToLimit(pullQuote || cleanContent, 280);
      setSelectedText(defaultQuote);
      setSelectedExcerptId('target-pullquote');
    } else if (availableExcerpts.length > 0) {
      setSelectedText(truncateExcerptToLimit(availableExcerpts[0].text, 280));
      setSelectedExcerptId(availableExcerpts[0].id);
    } else if (entry.title && entry.title !== 'Untitled Reflection') {
      setSelectedText(truncateExcerptToLimit(entry.title, 280));
      setSelectedExcerptId('entry-title');
    } else {
      setSelectedText('A quiet moment of reflection, discovering clarity within.');
      setSelectedExcerptId('default-quote');
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

    // Background: Warm Sand #FAF3E1
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

    // Decorative corner diamond flourishes
    const drawDiamond = (cx: number, cy: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      ctx.fill();
    };

    ctx.fillStyle = '#FA8112';
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

    // Subheader
    ctx.fillStyle = '#7C725F';
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('DAILY MINDFUL REFLECTION', width / 2, emblemY + 82);

    // Divider Line
    ctx.strokeStyle = '#DFCBA0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 160, emblemY + 116);
    ctx.lineTo(width / 2 + 160, emblemY + 116);
    ctx.stroke();

    let currentY = emblemY + 140;

    // Mood Badge Pill (if enabled)
    if (includeMood && entry.mood) {
      const moodInfo = MOOD_META[entry.mood] || { emoji: '🌿', label: 'Reflective' };
      const moodText = `${moodInfo.emoji} ${moodInfo.label.toUpperCase()}`;

      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(moodText);
      const pillW = textMetrics.width + 44;
      const pillH = 40;
      const pillX = width / 2 - pillW / 2;
      const pillY = currentY;

      // Pill Background
      ctx.fillStyle = '#F5E7C6';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 20);
      ctx.fill();

      // Pill Border
      ctx.strokeStyle = '#DFCBA0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pill Text
      ctx.fillStyle = '#4A3B18';
      ctx.textBaseline = 'middle';
      ctx.fillText(moodText, width / 2, pillY + pillH / 2);

      currentY += 60;
    } else {
      currentY += 20;
    }

    // Large Decorative Opening Quotation Mark
    ctx.fillStyle = '#E5D3AE';
    ctx.font = 'italic 150px "Playfair Display", Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('“', width / 2, currentY + 28);

    // Guaranteed clean, markdown-free, JSON-free, and bounded text
    const rawClean = stripMarkdownAndMediaLinks(extractCleanReply(selectedText)).trim();
    // Cap at 280 chars as a firm invariant
    const textToRender = truncateExcerptToLimit(rawClean, 280) || 'A quiet moment of reflection, discovering clarity within.';
    const maxTextWidth = width - 260; // 940px safe readable width

    // Boundary calculations for the quote text block:
    // Top boundary starts right below the decorative quotation mark
    const availableAreaTop = currentY + 65;
    // Bottom boundary stops well above the footer divider (footerY = height - 120)
    const footerY = height - 120;
    const availableAreaBottom = footerY - 45;
    const maxAvailableHeight = Math.max(200, availableAreaBottom - availableAreaTop);

    // Dynamic Font-Size Auto-Scaling:
    // Candidate font sizes to test, ordered from generous display size down to compact
    const candidateFontSizes = [44, 40, 36, 32, 28, 25, 22];

    // Helper to calculate wrapped lines and total height for a given font size
    const computeLayoutForFontSize = (fSize: number) => {
      ctx.font = `italic ${fSize}px "Playfair Display", Georgia, serif`;
      const paragraphs = textToRender.split(/\n+/);
      const wrappedLines: string[] = [];

      paragraphs.forEach((para, pIdx) => {
        const words = para.trim().split(/\s+/).filter(Boolean);
        let cur = '';
        for (let i = 0; i < words.length; i++) {
          const test = cur ? `${cur} ${words[i]}` : words[i];
          if (ctx.measureText(test).width > maxTextWidth && cur) {
            wrappedLines.push(cur);
            cur = words[i];
          } else {
            cur = test;
          }
        }
        if (cur) wrappedLines.push(cur);
        if (pIdx < paragraphs.length - 1 && wrappedLines.length < 7) {
          wrappedLines.push(''); // blank spacing line between paragraphs
        }
      });

      const lineHeight = Math.round(fSize * 1.45);
      const totalHeight = wrappedLines.length * lineHeight;
      return { lines: wrappedLines, lineHeight, totalHeight, fontSize: fSize };
    };

    // 1. Dynamic Auto-Scale: Test font sizes from largest to smallest; choose the first that fits comfortably
    let chosenLayout = computeLayoutForFontSize(candidateFontSizes[candidateFontSizes.length - 1]);
    for (const size of candidateFontSizes) {
      const layout = computeLayoutForFontSize(size);
      if (layout.totalHeight <= maxAvailableHeight) {
        chosenLayout = layout;
        break;
      }
    }

    // 2. Hard Truncation Fallback:
    // If content would still exceed available height even at the smallest font size (22px),
    // truncate at the last complete word before the maximum line count and append "..."
    let finalLines = [...chosenLayout.lines];
    const finalLineHeight = chosenLayout.lineHeight;
    const finalFontSize = chosenLayout.fontSize;

    if (chosenLayout.totalHeight > maxAvailableHeight) {
      const maxLines = Math.max(1, Math.floor(maxAvailableHeight / finalLineHeight));
      if (finalLines.length > maxLines) {
        finalLines = finalLines.slice(0, maxLines);
        let lastLine = finalLines[maxLines - 1];

        // If the cut-off line is blank from paragraph spacing, take previous line
        if (!lastLine.trim() && maxLines > 1) {
          finalLines.pop();
          lastLine = finalLines[finalLines.length - 1];
        }

        ctx.font = `italic ${finalFontSize}px "Playfair Display", Georgia, serif`;
        const ellipsis = '...';
        const words = lastLine.trim().split(/\s+/);

        while (words.length > 0 && ctx.measureText(words.join(' ') + ellipsis).width > maxTextWidth) {
          words.pop();
        }

        const truncatedLine = words.length > 0
          ? words.join(' ').replace(/[.,!?;:\s]+$/, '') + ellipsis
          : ellipsis;

        finalLines[finalLines.length - 1] = truncatedLine;
      }
    }

    // Vertically center the text within the available quote area
    const actualTextHeight = finalLines.length * finalLineHeight;
    const quoteStartY = Math.max(
      availableAreaTop,
      (availableAreaTop + availableAreaBottom - actualTextHeight) / 2
    );

    ctx.fillStyle = '#222222';
    ctx.font = `italic ${finalFontSize}px "Playfair Display", Georgia, serif`;
    ctx.textBaseline = 'top';

    finalLines.forEach((line, index) => {
      if (line) {
        ctx.fillText(line, width / 2, quoteStartY + index * finalLineHeight);
      }
    });

    // Bottom Footer Area
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

    ctx.fillText(footerLabel, width / 2, footerY + 8);

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
          const clean = stripMarkdownAndMediaLinks(extractCleanReply(selectedText));
          await navigator.clipboard.writeText(`"${clean}" — Inner Sanctum Reflection`);
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
        const clean = stripMarkdownAndMediaLinks(extractCleanReply(selectedText));
        await navigator.clipboard.writeText(`"${clean}" — Inner Sanctum Reflection`);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-[#DFCBA0] bg-[#FAF3E1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-share-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFCBA0] bg-[#F5E7C6]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FA8112]/10 text-[#FA8112]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-share-title" className="text-base sm:text-lg font-serif font-bold text-[#111111]">
                Shareable Reflection Card
              </h2>
              <p className="text-xs text-[#5C5549] font-sans">
                Curate a short excerpt or quote to save and share gracefully
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
          {/* Left Column: Excerpt Selection & Card Customization */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            {/* Privacy Guarantee Banner */}
            <div className="rounded-2xl border border-[#DFCBA0] bg-[#F5E7C6]/50 p-3 text-xs text-[#5C5549] flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#FA8112] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-[#111111]">Private & Client-Side:</strong> Rendered directly on your device canvas. Your identity, email, and full journal remain 100% private.
              </div>
            </div>

            {/* Selection Step: Curated Short Excerpts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold text-[#111111] flex items-center gap-1.5">
                  <Quote className="h-3.5 w-3.5 text-[#FA8112]" />
                  <span>Choose Short Excerpt (1–2 Sentences):</span>
                </label>
                <span className="text-[11px] text-[#7C786A] font-sans">
                  {availableExcerpts.length} option{availableExcerpts.length === 1 ? '' : 's'} available
                </span>
              </div>

              {availableExcerpts.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 rounded-2xl border border-[#DFCBA0]/70 bg-[#FDFCF9]/80 p-2">
                  {availableExcerpts.map((excerpt) => {
                    const isSelected = selectedExcerptId === excerpt.id || selectedText === excerpt.text;
                    return (
                      <button
                        key={excerpt.id}
                        type="button"
                        onClick={() => {
                          setSelectedExcerptId(excerpt.id);
                          setSelectedText(truncateExcerptToLimit(excerpt.text, 280));
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FA8112]/15 border-[#FA8112] text-[#111111] font-medium shadow-xs ring-1 ring-[#FA8112]/40'
                            : 'bg-white border-[#DFCBA0]/80 text-[#333333] hover:bg-[#F5E7C6]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                          <span className={excerpt.isRecommended ? 'text-[#FA8112] flex items-center gap-1' : 'text-[#7C786A]'}>
                            {excerpt.isRecommended && <Sparkles className="h-3 w-3 inline" />}
                            {excerpt.label}
                          </span>
                          {isSelected && (
                            <span className="text-[#FA8112] text-[10px] font-semibold bg-[#FA8112]/10 px-1.5 py-0.5 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="italic font-serif text-[13px] leading-relaxed text-[#1A1A1A]">
                          "{excerpt.text}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-[#DFCBA0] bg-[#F5E7C6]/30 text-xs text-[#7C786A] italic">
                  No conversation turns recorded yet. Type your custom quote below.
                </div>
              )}
            </div>

            {/* Editable Quote Textarea for Fine-Tuning */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold text-[#111111] flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#5C5549]" />
                  <span>Card Text (Customize or Refine):</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-sans ${selectedText.length >= 270 ? 'text-[#FA8112] font-semibold' : 'text-[#7C786A]'}`}>
                    {selectedText.length} / 280 characters
                  </span>
                  {selectedText.length >= 280 && (
                    <span className="text-[10px] bg-[#FA8112]/15 text-[#994500] font-semibold px-1.5 py-0.5 rounded">
                      Limit reached
                    </span>
                  )}
                </div>
              </div>
              <textarea
                id="textarea-card-quote"
                rows={3}
                value={selectedText}
                onChange={(e) => {
                  const val = e.target.value;
                  // Hard limit at 280 chars
                  if (val.length > 280) {
                    setSelectedText(val.slice(0, 280));
                  } else {
                    setSelectedText(val);
                  }
                  setSelectedExcerptId('custom-text');
                }}
                maxLength={280}
                placeholder="Type or customize your reflection quote..."
                className="w-full rounded-xl border border-[#DFCBA0] bg-[#FFFFFF] p-3 text-xs sm:text-sm text-[#111111] font-serif placeholder-[#9C988B] focus:border-[#FA8112] focus:outline-none focus:ring-1 focus:ring-[#FA8112] leading-relaxed shadow-xs"
              />
              <p className="text-[11px] text-[#7C786A]">
                Maximum 280 characters. Formatting and media links are automatically stripped, and font size auto-scales to fit the card boundaries cleanly.
              </p>
            </div>

            {/* Design & Badge Options */}
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
                  Card Accents:
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

          {/* Right Column: Live Card Canvas Preview & Export Actions */}
          <div className="lg:col-span-6 flex flex-col items-center justify-between space-y-4">
            <div className="w-full flex items-center justify-between text-xs text-[#5C5549] font-serif">
              <span className="font-semibold text-[#111111]">Card Preview:</span>
              <span className="text-[11px] text-[#7C786A]">High-DPI Clean Typography</span>
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

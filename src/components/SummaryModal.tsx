import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Check, 
  ListChecks, 
  Lightbulb, 
  HeartHandshake,
  Download
} from 'lucide-react';
import type { JournalEntry } from '../types';

interface SummaryModalProps {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  entry,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !entry) return null;

  const handleCopySummary = () => {
    const summaryText = `### ${entry.title || 'Journal Reflection'}\n\n**Executive Summary:**\n${entry.summary || 'No summary available.'}\n\n**Key Takeaways:**\n${(entry.takeaways || []).map((t) => `- ${t}`).join('\n')}\n\n**Action Items:**\n${(entry.actionItems || []).map((a) => `- [ ] ${a}`).join('\n')}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `# ${entry.title || 'Reflection Summary'}\nDate: ${new Date(entry.updatedAt).toLocaleDateString()}\n\n## Executive Summary\n${entry.summary || ''}\n\n## Key Takeaways\n${(entry.takeaways || []).map((t) => `* ${t}`).join('\n')}\n\n## Action Items\n${(entry.actionItems || []).map((a) => `* [ ] ${a}`).join('\n')}\n\n## Dialogue Transcript\n${entry.turns.map((t) => `### ${t.role === 'user' ? 'User Reflection' : 'Gemini Reflection'}\n${t.content}\n`).join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(entry.title || 'reflection').toLowerCase().replace(/\s+/g, '-')}-summary.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-2xl rounded-2xl bg-[#FDFCF9] p-6 shadow-xl border border-[#E6E2D3] z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E2D3]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0ECE1] text-[#4A5D4E] border border-[#E6E2D3]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-semibold text-[#1A1A1A]">
                Gemini Synthesis & Key Takeaways
              </h2>
              <p className="text-xs text-[#7C786A]">
                {entry.title || 'Untitled Session'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* Executive Summary */}
          {entry.summary ? (
            <div className="rounded-xl bg-[#F9F7F0] border border-[#DCD7C5] p-4">
              <div className="flex items-center gap-2 text-xs font-serif font-semibold text-[#1A1A1A] mb-1.5">
                <HeartHandshake className="h-4 w-4 text-[#4A5D4E]" />
                <span>Executive Summary</span>
              </div>
              <p className="text-xs sm:text-sm text-[#1A1A1A] font-serif leading-relaxed">
                {entry.summary}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#7C786A] italic font-serif">
              No executive summary generated yet. Click &quot;Synthesize Entry&quot; in the editor.
            </p>
          )}

          {/* Key Takeaways */}
          {entry.takeaways && entry.takeaways.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-serif font-semibold text-[#1A1A1A] mb-2.5">
                <Lightbulb className="h-4 w-4 text-[#996515]" />
                <span>Key Takeaways</span>
              </div>
              <ul className="space-y-2">
                {entry.takeaways.map((takeaway, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-[#E6E2D3] bg-[#FFFFFF] p-3 text-xs sm:text-sm text-[#1A1A1A] font-serif shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#4A5D4E] shrink-0 mt-0.5" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {entry.actionItems && entry.actionItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-serif font-semibold text-[#1A1A1A] mb-2.5">
                <ListChecks className="h-4 w-4 text-[#4A5D4E]" />
                <span>Actionable Steps</span>
              </div>
              <ul className="space-y-2">
                {entry.actionItems.map((action, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-[#E6E2D3] bg-[#FFFFFF] p-3 text-xs sm:text-sm text-[#1A1A1A] shadow-2xs font-serif"
                  >
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-[#DCD7C5] text-[#4A5D4E] focus:ring-[#4A5D4E] mt-0.5 cursor-pointer accent-[#4A5D4E]" 
                    />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E6E2D3]">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E2D3] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F9F7F0] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .MD</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4A5D4E] px-4 py-1.5 text-xs font-medium text-[#FDFCF9] hover:bg-[#3C4C3F] transition-colors shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Synthesis</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#E6E2D3] bg-[#F0ECE1] px-3 py-1.5 text-xs font-medium text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#EBE7DE] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Utility functions for extracting clean, markdown-free, JSON-free reflection quotes
 * and curated 1-2 sentence excerpts for Shareable Reflection Cards.
 */

import type { JournalEntry } from '../types';

/**
 * Extracts clean, human-readable text from a raw turn or API response.
 * Completely unwraps any leaked JSON object or string (e.g. {"reply": "..."}),
 * resolves escaped newlines (\n) to real line breaks, and prevents [object Object] artifacts.
 */
export function extractCleanReply(raw: unknown): string {
  if (raw === null || raw === undefined) return '';

  let str = '';
  if (typeof raw === 'string') {
    str = raw.trim();
  } else if (typeof raw === 'object') {
    const obj = raw as Record<string, any>;
    if (typeof obj.reply === 'string') {
      str = obj.reply.trim();
    } else if (typeof obj.content === 'string') {
      str = obj.content.trim();
    } else if (typeof obj.text === 'string') {
      str = obj.text.trim();
    } else {
      try {
        str = JSON.stringify(raw);
      } catch {
        return '';
      }
    }
  } else {
    str = String(raw).trim();
  }

  // Strip code block wrappers if any (```json ... ``` or ``` ...)
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Check if string contains JSON representation of reply
  if (str.startsWith('{') || str.includes('"reply"')) {
    // 1. Try standard JSON parse
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.reply === 'string') {
          str = parsed.reply;
        } else if (typeof parsed.content === 'string') {
          str = parsed.content;
        } else if (typeof parsed.text === 'string') {
          str = parsed.text;
        }
      }
    } catch {
      // 2. If standard JSON parse failed (e.g. unescaped newlines/control characters):
      // Extract the content of "reply": "..."
      const replyMatch = str.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (replyMatch && replyMatch[1]) {
        try {
          str = JSON.parse(`"${replyMatch[1]}"`);
        } catch {
          str = replyMatch[1];
        }
      } else {
        // Multi-line match before next key or closing brace
        const multiLineMatch = str.match(/"reply"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"[a-zA-Z0-9_]+"\s*:|\s*\}|\s*$)/);
        if (multiLineMatch && multiLineMatch[1]) {
          str = multiLineMatch[1];
        } else if (str.startsWith('{')) {
          const idx = str.indexOf('"reply"');
          if (idx !== -1) {
            let after = str.slice(idx + 7).replace(/^[\s:]+"?/, '');
            after = after.replace(/"?\s*\}?\s*$/, '');
            str = after;
          }
        }
      }
    }
  }

  // Convert literal escaped \n, \r\n, \r, \t, \" into real formatting (including doubly escaped)
  str = str
    .replace(/\\\\r\\\\n/g, '\n')
    .replace(/\\\\n/g, '\n')
    .replace(/\\\\r/g, '\n')
    .replace(/\\\\t/g, ' ')
    .replace(/\\\\"/g, '"')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  return str.trim();
}

/**
 * Strips markdown formatting, Spotify recommendations, and links to leave pristine plain text.
 */
export function stripMarkdownAndMediaLinks(text: string): string {
  if (!text) return '';

  let clean = text;

  // If text looks like a raw JSON string (e.g. pasted or leaked), unwrap it first
  if (clean.includes('"reply"') || clean.startsWith('{')) {
    clean = extractCleanReply(clean);
  }

  // 1. Remove music/Spotify recommendation sentences entirely (e.g. "I recommend listening to [Song](url)...")
  clean = clean.replace(/(?:^|\n|[.!?]\s+)[^.!?\n]*open\.spotify\.com[^.!?\n]*(?:[.!?]|$)/gi, '');
  clean = clean.replace(/(?:^|\n|[.!?]\s+)[^.!?\n]*(?:spotify|soundtrack|listen to this song|companion playlist)[^.!?\n]*(?:[.!?]|$)/gi, '');

  // 2. Convert standard markdown links [Text](url) to just Text
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 3. Remove raw URLs (http://, https://, or www.)
  clean = clean.replace(/https?:\/\/[^\s)]+/g, '');
  clean = clean.replace(/www\.[^\s)]+/g, '');

  // 4. Strip markdown bold, italic, strikethrough, backticks, blockquotes, headers
  clean = clean
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[*-]\s+/gm, '');

  // 5. Clean up lingering markdown brackets, stray asterisks, or unrendered syntax
  clean = clean
    .replace(/\[\s*\]/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[*_~`]/g, '') // remove any stray unclosed markdown markers
    .replace(/\\n/g, '\n') // catch any remaining literal \n
    .replace(/\\"/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  return clean;
}

/**
 * Truncates text at the last complete word before the given character limit and appends '...'.
 * Ensures the excerpt never exceeds maxChars under any circumstance.
 */
export function truncateExcerptToLimit(text: string, maxChars = 280): string {
  const clean = stripMarkdownAndMediaLinks(extractCleanReply(text)).trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;

  // We need to fit within maxChars including the ellipsis '...'
  const targetLen = maxChars - 3;
  const sliced = clean.slice(0, targetLen);
  
  // Find last whitespace to break on complete word
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace > targetLen * 0.6) {
    return sliced.slice(0, lastSpace).replace(/[.,!?;:\s]+$/, '') + '...';
  }
  
  return sliced.replace(/[.,!?;:\s]+$/, '') + '...';
}

/**
 * Splits text into individual distinct, clean sentences.
 */
export function splitIntoCleanSentences(text: string): string[] {
  const clean = stripMarkdownAndMediaLinks(extractCleanReply(text));
  if (!clean) return [];

  // Match sentences ending in ., !, ? or double newline
  const rawSentences = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15); // filter out single words or tiny fragments

  // Filter out sentences that still reference URLs or music keywords
  return rawSentences.filter((s) => !/https?:|\bspotify\b/i.test(s));
}

/**
 * Selects an optimal 1-2 sentence pull quote from a text.
 * Prefers emotionally resonant, reflective sentences between 40 and 160 characters.
 * Strictly guarantees output is capped within maxChars (default 220, max 280).
 */
export function generateCuratedPullQuote(text: string, maxChars = 220): string {
  const sentences = splitIntoCleanSentences(text);
  if (sentences.length === 0) {
    const raw = stripMarkdownAndMediaLinks(extractCleanReply(text));
    return truncateExcerptToLimit(raw, maxChars);
  }

  // If only 1 sentence, return it directly or truncated
  if (sentences.length === 1) {
    return truncateExcerptToLimit(sentences[0], maxChars);
  }

  // Score sentences based on reflective resonance and ideal quote length
  const scored = sentences.map((s, idx) => {
    let score = 10;
    const len = s.length;
    if (len >= 45 && len <= 130) score += 18;
    else if (len >= 30 && len <= 170) score += 10;
    else score -= 6;

    // Reward sentences with thoughtful words
    if (/(courage|clarity|peace|pause|breathe|strength|growth|gentle|moment|space|grounded|wisdom|heart|mind|perspective|presence)/i.test(s)) {
      score += 12;
    }
    // Penalize conversational greeting openers like "I hear you"
    if (idx === 0 && /^(i hear you|thank you|welcome|hello|sure|certainly|let's|i'm here|it sounds like)/i.test(s)) {
      score -= 14;
    }

    return { sentence: s, score, idx };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // If the best sentence is short (< 75 chars) and subsequent sentence exists and fits within maxChars, combine for a richer 2-sentence quote
  if (best.sentence.length < 75 && sentences[best.idx + 1]) {
    const nextSentence = sentences[best.idx + 1];
    const combined = `${best.sentence} ${nextSentence}`;
    if (combined.length <= maxChars) {
      return combined;
    }
  }

  return truncateExcerptToLimit(best.sentence, maxChars);
}

export interface CuratedExcerptItem {
  id: string;
  label: string;
  text: string;
  source: 'pullquote' | 'sentence' | 'takeaway' | 'user' | 'gemini';
  isRecommended?: boolean;
}

/**
 * Builds a curated list of short, 1-2 sentence excerpts from an entry and optional target turn content.
 * Every item in the list is guaranteed to be within the 280 character limit.
 */
export function buildCuratedExcerptsList(
  entry: JournalEntry,
  targetContent?: string
): CuratedExcerptItem[] {
  const list: CuratedExcerptItem[] = [];

  // 1. If user clicked "Share" on a specific turn:
  if (targetContent && targetContent.trim()) {
    const cleanContent = stripMarkdownAndMediaLinks(extractCleanReply(targetContent));
    const pullQuote = generateCuratedPullQuote(cleanContent, 220);
    const sentences = splitIntoCleanSentences(cleanContent);

    if (pullQuote) {
      list.push({
        id: 'target-pullquote',
        label: 'Curated Pull-Quote (Recommended)',
        text: truncateExcerptToLimit(pullQuote, 280),
        source: 'pullquote',
        isRecommended: true,
      });
    }

    // Add individual sentences if there are multiple
    sentences.forEach((s, idx) => {
      const truncatedSentence = truncateExcerptToLimit(s, 280);
      if (truncatedSentence !== pullQuote) {
        list.push({
          id: `target-sentence-${idx}`,
          label: `Sentence #${idx + 1}`,
          text: truncatedSentence,
          source: 'sentence',
        });
      }
    });
  }

  // 2. Synthesized Takeaways (high-value 1-2 sentence insights)
  if (entry.takeaways && entry.takeaways.length > 0) {
    entry.takeaways.forEach((t, i) => {
      const cleanT = truncateExcerptToLimit(t, 280);
      if (cleanT) {
        list.push({
          id: `takeaway-${i}`,
          label: `Key Takeaway #${i + 1}`,
          text: cleanT,
          source: 'takeaway',
          isRecommended: list.length === 0,
        });
      }
    });
  } else if (entry.summary) {
    const cleanSummary = stripMarkdownAndMediaLinks(extractCleanReply(entry.summary));
    const summaryPull = generateCuratedPullQuote(cleanSummary, 220);
    if (summaryPull) {
      list.push({
        id: 'summary-pullquote',
        label: 'Summary Core Insight',
        text: truncateExcerptToLimit(summaryPull, 280),
        source: 'takeaway',
        isRecommended: list.length === 0,
      });
    }
  }

  // 3. User reflections (extract short sentences)
  entry.turns
    .filter((t) => t.role === 'user' && t.content.trim().length > 0)
    .forEach((t, i) => {
      const clean = stripMarkdownAndMediaLinks(extractCleanReply(t.content));
      const sList = splitIntoCleanSentences(clean);
      if (sList.length > 0) {
        const best = truncateExcerptToLimit(sList[0], 240);
        list.push({
          id: `user-sentence-${t.id || i}`,
          label: `My Reflection #${i + 1}`,
          text: best,
          source: 'user',
        });
      }
    });

  // 4. Gemini responses (extract short, poignant pull quotes)
  entry.turns
    .filter((t) => t.role === 'gemini' && t.content.trim().length > 0)
    .forEach((t, i) => {
      const clean = stripMarkdownAndMediaLinks(extractCleanReply(t.content));
      const pull = generateCuratedPullQuote(clean, 220);
      if (pull && !list.some((existing) => existing.text === pull)) {
        list.push({
          id: `gemini-quote-${t.id || i}`,
          label: `Gemini Inquiry #${i + 1}`,
          text: truncateExcerptToLimit(pull, 280),
          source: 'gemini',
        });
      }
    });

  return list;
}

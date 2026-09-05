/**
 * Utility to safely extract a human-readable error string from any error or API response payload.
 * Prevents [object Object] errors and React 19 crashes from rendering objects directly.
 */
export function extractErrorMessage(errData: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (!errData) return fallback;
  if (typeof errData === 'string') {
    const trimmed = errData.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        const extracted = extractErrorMessage(parsed, '');
        if (extracted) return extracted;
      } catch {
        // not json
      }
    }
    return trimmed;
  }
  if (errData instanceof Error) return errData.message || fallback;

  if (typeof errData === 'object') {
    const obj = errData as Record<string, any>;

    if (obj.error) {
      if (typeof obj.error === 'string' && obj.error.trim()) {
        return obj.error.trim();
      }
      if (typeof obj.error === 'object') {
        const nested = extractErrorMessage(obj.error, '');
        if (nested && nested !== fallback) {
          return nested;
        }
      }
    }

    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message.trim();
    }
    if (typeof obj.error_description === 'string' && obj.error_description.trim()) {
      return obj.error_description.trim();
    }
    if (typeof obj.description === 'string' && obj.description.trim()) {
      return obj.description.trim();
    }
    if (typeof obj.details === 'string' && obj.details.trim()) {
      return obj.details.trim();
    }
    if (typeof obj.statusText === 'string' && obj.statusText.trim()) {
      return obj.statusText.trim();
    }
  }

  return fallback;
}

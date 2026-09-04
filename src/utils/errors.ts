/**
 * Utility to safely extract a human-readable error string from any error or API response payload.
 * Prevents [object Object] errors and React 19 crashes from rendering objects directly.
 */
export function extractErrorMessage(errData: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (!errData) return fallback;
  if (typeof errData === 'string') return errData.trim() || fallback;
  if (errData instanceof Error) return errData.message || fallback;

  if (typeof errData === 'object') {
    const obj = errData as Record<string, any>;
    if (typeof obj.error === 'string' && obj.error.trim()) {
      return obj.error.trim();
    }
    if (obj.error && typeof obj.error === 'object') {
      if (typeof obj.error.message === 'string' && obj.error.message.trim()) {
        return obj.error.message.trim();
      }
    }
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message.trim();
    }
    if (typeof obj.statusText === 'string' && obj.statusText.trim()) {
      return obj.statusText.trim();
    }
  }

  return fallback;
}

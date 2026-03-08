/**
 * Simple sessionStorage-based prompt cache with 1-hour TTL.
 * Uses a deterministic hash of the prompt string as the cache key.
 */

const CACHE_PREFIX = "flux_prompt_cache_";
const TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  response: string;
  expiresAt: number;
}

function hashPrompt(prompt: string): string {
  // Simple djb2-style hash for fast, collision-resistant keys
  let hash = 5381;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash * 33) ^ prompt.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function getCachedResponse(prompt: string): string | null {
  try {
    const key = CACHE_PREFIX + hashPrompt(prompt);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.response;
  } catch {
    return null;
  }
}

export function setCachedResponse(prompt: string, response: string): void {
  try {
    const key = CACHE_PREFIX + hashPrompt(prompt);
    const entry: CacheEntry = { response, expiresAt: Date.now() + TTL_MS };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore quota errors silently
  }
}

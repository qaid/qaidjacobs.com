/**
 * Data loading utilities with TypeScript generics
 */

/**
 * Load and parse JSON from a path
 * @param path - Path to JSON file
 * @returns Parsed JSON data
 * @throws Error if fetch fails
 */
export async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * FNV-1a hash function - generates deterministic integer from string
 * Used for consistent positioning based on node IDs
 * @param str - String to hash
 * @returns Positive integer hash
 */
export function hashStringToInt(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Get a color from a thread palette based on hash
 * @param palettes - Thread color palettes
 * @param threadKey - Which thread palette to use
 * @param seed - Optional seed for variation within palette
 * @returns Color string
 */
export function getThreadColor(
  palettes: Record<string, string[]>,
  threadKey: string,
  seed = 0
): string {
  const palette = palettes[threadKey] || palettes['questions'];
  return palette[seed % palette.length];
}

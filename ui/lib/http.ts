/** Reads a JSON API response; empty or non-JSON bodies (for example a crashed function) become a readable error. */
export async function readJson<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : '';
    throw new Error(message || `The server could not complete this request (HTTP ${response.status}). Try again shortly.`);
  }
  if (data === undefined) throw new Error('The server returned an unreadable response. Try again shortly.');
  return data as T;
}

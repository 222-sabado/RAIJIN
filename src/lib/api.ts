export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      const text = await res.text();
      console.warn(`[API] Non-JSON or HTTP ${res.status} response from ${url}:`, text.slice(0, 150));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[API] Fetch failed for ${url}:`, err);
    return null;
  }
}

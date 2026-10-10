/**
 * Canva downloads uploaded images itself and refuses URLs that redirect.
 * QRX image URLs may redirect to the storage host, so follow them here and
 * hand Canva the final address. Falls back to the original URL when the
 * lookup isn't possible (for example, when the host doesn't allow CORS).
 */
export async function resolveImageUrl(
  url: string,
  fetchImpl: typeof fetch | undefined = typeof fetch === "function"
    ? fetch
    : undefined,
): Promise<string> {
  if (!fetchImpl) return url;
  try {
    const response = await fetchImpl(url, { method: "HEAD" });
    if (response.ok && response.url?.startsWith("https://")) {
      return response.url;
    }
  } catch {
    // Not resolvable from the browser: use the URL as given.
  }
  return url;
}

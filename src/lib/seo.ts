/**
 * Get the canonical URL for the current page
 * @param path - The path of the current page (e.g., "/alerts", "/user")
 * @returns The full canonical URL
 */
export function getCanonicalUrl(path: string = ""): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get alternate language links for SEO
 * Currently supports Polish only
 */
export function getAlternateLanguages(path: string = "") {
  const canonicalUrl = getCanonicalUrl(path);
  return {
    "x-default": canonicalUrl,
    pl: canonicalUrl,
  };
}

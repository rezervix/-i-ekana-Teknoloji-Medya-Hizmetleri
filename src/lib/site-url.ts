export const CANONICAL_SITE_URL = "https://www.cicekanatechmedia.com";

/**
 * Resolve the public site origin without allowing temporary builder domains
 * or non-canonical host variants to leak into metadata and structured data.
 */
export function getSiteUrl(configuredUrl = process.env.NEXT_PUBLIC_SITE_URL): string {
  const candidate = (configuredUrl || "").trim().replace(/\/+$/, "");

  if (!candidate || /builtwithrocket\.new/i.test(candidate)) {
    return CANONICAL_SITE_URL;
  }

  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== "www.cicekanatechmedia.com"
    ) {
      return CANONICAL_SITE_URL;
    }
  } catch {
    return CANONICAL_SITE_URL;
  }

  return CANONICAL_SITE_URL;
}

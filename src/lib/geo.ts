import dns from "dns/promises";

// In-memory cache for verified bot IPs (TTL: 24 hours)
const verifiedBotCache = new Map<string, { isVerified: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const BOT_USER_AGENTS = [
  "googlebot",
  "adsbot-google",
  "google-inspectiontool",
  "storebot-google",
  "mediapartners-google",
  "apis-google",
  "feedfetcher-google",
  "google-read-aloud",
  "bingbot",
];

export function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot));
}

/**
 * Validates Googlebot/AdsBot via official Forward/Reverse DNS verification.
 * 1. PTR lookup on IP -> must end with .googlebot.com or .google.com
 * 2. Forward lookup on that hostname -> must resolve back to the original IP
 */
export async function verifyGoogleBot(ip: string): Promise<boolean> {
  const now = Date.now();
  const cached = verifiedBotCache.get(ip);
  if (cached && cached.expiresAt > now) {
    return cached.isVerified;
  }

  // Private/Local IPs cannot be reverse-resolved
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return false;
  }

  try {
    const hostnames = await dns.reverse(ip);
    const validDomain = hostnames.find(
      (h) => h.endsWith(".googlebot.com") || h.endsWith(".google.com")
    );

    if (!validDomain) {
      verifiedBotCache.set(ip, { isVerified: false, expiresAt: now + CACHE_TTL_MS });
      return false;
    }

    const resolvedIps = await dns.resolve(validDomain);
    const isVerified = resolvedIps.includes(ip);

    verifiedBotCache.set(ip, { isVerified, expiresAt: now + CACHE_TTL_MS });
    return isVerified;
  } catch {
    verifiedBotCache.set(ip, { isVerified: false, expiresAt: now + 60 * 60 * 1000 });
    return false;
  }
}

/**
 * Anonymizes an IP address for KVKK / GDPR compliant logging.
 * e.g. 198.51.100.42 -> 198.51.100.xxx
 */
export function maskIp(ip: string): string {
  if (!ip) return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + ":xxxx";
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  return ip;
}

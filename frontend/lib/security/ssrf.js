import dns from "node:dns/promises";
import net from "node:net";

/**
 * Enterprise SSRF (Server-Side Request Forgery) Guard
 * Blocks localhost, private LAN, cloud metadata services, and internal infrastructure.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "metadata.azure.com",
  "instance-data",
  "kubernetes.default.svc",
]);

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

/**
 * Checks if an IPv4 address is in a private/restricted range.
 */
function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private-Use Networks)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private-Use Networks)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private-Use Networks)
  if (a === 192 && b === 168) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved for future use)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private/restricted range.
 */
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();

  // Loopback ::1
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true;

  // Unspecified ::
  if (normalized === "::") return true;

  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (normalized.startsWith("::ffff:")) {
    const ipv4 = normalized.replace("::ffff:", "");
    if (net.isIPv4(ipv4)) return isPrivateIPv4(ipv4);
  }

  // Unique Local Address fc00::/7 (fc00... or fd00...)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-Local fe80::/10 (fe8..., fe9..., fea..., feb...)
  if (/^fe[89ab]/i.test(normalized)) return true;

  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities before any network requests.
 * Resolves DNS to ensure the destination IP is public.
 *
 * @param {string} rawUrl
 * @returns {Promise<{ valid: boolean, error?: string, normalizedUrl?: string }>}
 */
export async function validateUrlForSSRF(rawUrl, options = {}) {
  // Localhost is strictly blocked by default. Only permitted if explicitly set options.allowLocalhost === true
  const allowLocalhost = options.allowLocalhost === true;
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Please provide a valid website URL." };
  }

  let parsed;
  try {
    // Add protocol if user entered example.com
    const withProto = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
    parsed = new URL(withProto);
  } catch (e) {
    return { valid: false, error: "Malformed URL syntax. Example format: https://example.com" };
  }

  // 1. Check protocol
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { valid: false, error: `Protocol "${parsed.protocol}" is not allowed. Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Allow localhost during local development/testing
  if (allowLocalhost && (hostname === "localhost" || hostname === "127.0.0.1")) {
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "") || "/"}`;
    return { valid: true, normalizedUrl: normalized, hostname: parsed.hostname };
  }

  // 2. Check port
  if (!ALLOWED_PORTS.has(parsed.port)) {
    return { valid: false, error: `Port "${parsed.port}" is not permitted for website indexing.` };
  }

  // 3. Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { valid: false, error: "Access to local or internal addresses is strictly forbidden." };
  }

  // 4. Check raw IP directly if host is an IP
  if (net.isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { valid: false, error: "Target IP address belongs to a private or restricted network range." };
    }
  } else if (net.isIPv6(hostname)) {
    if (isPrivateIPv6(hostname)) {
      return { valid: false, error: "Target IPv6 address belongs to a private or restricted network range." };
    }
  } else {
    // 5. DNS Resolution check (prevents DNS rebinding and private domains)
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return { valid: false, error: `Could not resolve domain name: ${hostname}` };
      }

      for (const addr of addresses) {
        if (addr.family === 4 && isPrivateIPv4(addr.address)) {
          return { valid: false, error: `Domain ${hostname} resolves to a private IP (${addr.address}) and cannot be indexed.` };
        }
        if (addr.family === 6 && isPrivateIPv6(addr.address)) {
          return { valid: false, error: `Domain ${hostname} resolves to a private IPv6 address (${addr.address}).` };
        }
      }
    } catch (dnsErr) {
      return { valid: false, error: `DNS resolution failed for ${hostname}: ${dnsErr.message}` };
    }
  }

  // URL is safe, normalize to lowercase origin + pathname
  const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "") || "/"}`;
  return { valid: true, normalizedUrl: normalized, hostname: parsed.hostname };
}

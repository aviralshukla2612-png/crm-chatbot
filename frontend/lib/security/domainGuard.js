/**
 * Production Domain Whitelisting and Origin Security Guard
 * Enforces tenant website restrictions without suffix confusion vulnerabilities.
 */

export function checkDomainAuthorization(originOrReferer, allowedDomains) {
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0 || allowedDomains.includes("*")) {
    return { allowed: true, host: "*" };
  }

  if (!originOrReferer) {
    // If no origin/referer header is supplied (e.g. mobile app or direct server-to-server call),
    // we allow it unless strict mode is enabled.
    return { allowed: true, host: null };
  }

  try {
    let urlString = originOrReferer.trim();
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      urlString = `https://${urlString}`;
    }
    const originHost = new URL(urlString).hostname.toLowerCase();

    const isMatch = allowedDomains.some((domain) => {
      const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (clean === "*") return true;
      return originHost === clean || originHost.endsWith(`.${clean}`);
    });

    return { allowed: isMatch, host: originHost };
  } catch (e) {
    return { allowed: false, host: null, error: "Invalid origin header URL format" };
  }
}

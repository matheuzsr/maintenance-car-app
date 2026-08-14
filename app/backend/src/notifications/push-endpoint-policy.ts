const WILDCARD_PREFIX = '*.';

export function isAllowedPushEndpoint(
  endpoint: string,
  configuredHosts: string,
): boolean {
  let hostname: string;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') return false;
    hostname = url.hostname.toLowerCase();
  } catch {
    return false;
  }

  return configuredHosts
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (!rule.startsWith(WILDCARD_PREFIX)) return hostname === rule;
      const suffix = rule.slice(1);
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    });
}

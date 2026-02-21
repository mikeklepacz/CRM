const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function splitCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function withProtocol(value: string, preferredProtocol: "http" | "https"): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${preferredProtocol}://${value}`;
}

function asUrl(value?: string): URL | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getRailwayPublicDomain(): string | undefined {
  return (
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.RAILWAY_PUBLIC_URL ||
    undefined
  );
}

export function getPort(): number {
  const parsed = Number(process.env.PORT ?? 3000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
}

export function getAppBaseUrl(port = getPort()): URL {
  const fromAppUrl = asUrl(withProtocol(process.env.APP_URL?.trim() || "", "https"));
  if (fromAppUrl) {
    return fromAppUrl;
  }

  const replitDomain = splitCsv(process.env.REPLIT_DOMAINS)[0];
  if (replitDomain) {
    const replitUrl = asUrl(withProtocol(replitDomain, "https"));
    if (replitUrl) return replitUrl;
  }

  const railwayDomain = getRailwayPublicDomain();
  if (railwayDomain) {
    const railwayUrl = asUrl(withProtocol(railwayDomain, "https"));
    if (railwayUrl) return railwayUrl;
  }

  return new URL(`http://localhost:${port}`);
}

export function buildAppUrl(pathname: string, port = getPort()): string {
  return new URL(pathname, getAppBaseUrl(port)).toString();
}

export function getAuthStrategyDomains(port = getPort()): string[] {
  const hosts = new Set<string>();

  for (const value of splitCsv(process.env.REPLIT_DOMAINS)) {
    const url = asUrl(withProtocol(value, "https"));
    if (url?.hostname) hosts.add(url.hostname);
  }

  const appUrlHost = getAppBaseUrl(port).hostname;
  if (appUrlHost) hosts.add(appUrlHost);

  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return [...hosts];
}

export function getWebSocketOriginHost(port = getPort()): string {
  const base = getAppBaseUrl(port);
  if (LOCAL_HOSTS.has(base.hostname) && !base.port) {
    return `${base.hostname}:${port}`;
  }
  return base.host;
}

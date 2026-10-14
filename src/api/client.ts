import { API_ORIGIN } from "@/src/config";

/**
 * Client HTTP minimal pour l'API statique.
 *
 * Règles publiées par l'API :
 * - au plus une requête par seconde
 * - pas de rafraîchissement de thread sous 10 secondes (ici : uniquement au geste)
 * - envoyer If-Modified-Since
 *
 * React Native interdit de remplacer le header User-Agent depuis JS.
 * On ne l'envoie donc pas : le client natif met le sien.
 */

const MIN_INTERVAL_MS = 1100;

type CacheEntry = {
  modified?: string;
  body: unknown;
};

const cache = new Map<string, CacheEntry>();

let chain: Promise<unknown> = Promise.resolve();
let lastStartedAt = 0;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastStartedAt));
    if (wait > 0) await delay(wait);
    lastStartedAt = Date.now();
    return task();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function messageForStatus(status: number): string {
  if (status === 404) return "Not found. That board or thread is gone.";
  if (status === 0) return "No network, or the API is not responding.";
  return `The API returned ${status}.`;
}

export async function getJson<T>(path: string): Promise<T> {
  return schedule(async () => {
    const url = `${API_ORIGIN}${path}`;
    const cached = cache.get(url);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cached?.modified) headers["If-Modified-Since"] = cached.modified;

    let response: Response;
    try {
      // AbortSignal.timeout n'est pas garanti sur toutes les versions d'Hermes.
      const signal =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(20_000)
          : undefined;
      response = await fetch(url, { headers, signal });
    } catch {
      throw new ApiError(0, messageForStatus(0));
    }

    if (response.status === 304 && cached) return cached.body as T;

    if (!response.ok) throw new ApiError(response.status, messageForStatus(response.status));

    const raw = await response.text();
    let body: T;
    try {
      body = JSON.parse(raw) as T;
    } catch {
      throw new ApiError(response.status, "The API response could not be read.");
    }

    cache.set(url, {
      modified: response.headers.get("Last-Modified") ?? undefined,
      body,
    });
    return body;
  });
}

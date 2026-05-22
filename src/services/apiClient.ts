// src/services/apiClient.ts

/**
 * Typed error thrown by the API client for both HTTP-level failures
 * (status 4xx/5xx) and non-HTTP failures (network timeout, JSON parse
 * errors, etc.).  Non-HTTP failures use status 0.
 */
export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.message = message;
    this.status = status;
    // Restore prototype chain so `instanceof ApiError` works after transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Shared HTTP client used by every service module in real mode.
 *
 * Mock mode  — `NEXT_PUBLIC_API_BASE_URL` is not set:
 *   Throws immediately so callers know they must use the Mock Adapter
 *   instead of delegating to this function.
 *
 * Real mode  — `NEXT_PUBLIC_API_BASE_URL` is set:
 *   Calls `fetch(baseUrl + path, …)`, parses the JSON response, and
 *   throws `ApiError` on non-2xx responses or any network/parse failure.
 */
export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    // Mock mode — service modules should never reach this path; they
    // return mock data directly before calling request().
    throw new Error('Mock mode: use service Mock Adapter directly');
  }

  const url = baseUrl + path;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);

    if (!res.ok) {
      // HTTP error — extract a human-readable message from the body when
      // possible, then throw with the real HTTP status code.
      let message: string;
      try {
        message = await res.text();
      } catch {
        message = res.statusText;
      }
      throw new ApiError(message || res.statusText || `HTTP ${res.status}`, res.status);
    }

    // Parse JSON response.
    try {
      return (await res.json()) as T;
    } catch (parseErr) {
      throw new ApiError(
        (parseErr as Error).message || 'Failed to parse JSON response',
        0
      );
    }
  } catch (err) {
    // Re-throw ApiError instances unchanged.
    if (err instanceof ApiError) throw err;

    // Wrap any other error (network timeout, DNS failure, etc.) as an
    // ApiError with status 0.
    throw new ApiError((err as Error).message || 'Network error', 0);
  }
}

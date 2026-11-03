import { type ApiErrorView, toErrorView } from "@/lib/api-error";

/**
 * The only place the UI talks HTTP: sets the mock-auth header and turns an
 * error response into an ApiError carrying the view the UI renders.
 */
export class ApiError extends Error {
  constructor(public readonly view: ApiErrorView) {
    super(view.message);
    this.name = "ApiError";
  }
}

const UNREACHABLE: ApiErrorView = {
  kind: "technical",
  title: "Technical failure",
  message: "Cannot reach the service. Check that the server is running.",
};

export async function request<T>(
  path: string,
  options: { userId?: string; method?: string; body?: unknown } = {},
): Promise<T> {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.userId) headers.set("x-user-id", options.userId);

  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(UNREACHABLE);
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(toErrorView(res.status, data));
  }
  return data as T;
}

/** Error view for anything a query or mutation can throw. */
export function errorView(error: unknown): ApiErrorView {
  return error instanceof ApiError ? error.view : UNREACHABLE;
}

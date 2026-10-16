const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function httpClient<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = new URL(url, BASE_URL || window.location.origin);
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(fullUrl.toString(), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw new Error(
      `HTTP Error ${response.status} ${response.statusText}: ${JSON.stringify(errorBody)}`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export default httpClient;

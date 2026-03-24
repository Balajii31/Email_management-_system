export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorBody: any = null;

    try {
      errorBody = await response.json();
    } catch {
      // Ignore JSON parse errors and fall back to status-based messages.
    }

    const message =
      errorBody?.message ||
      errorBody?.error ||
      response.statusText ||
      'An error occurred while fetching data';

    throw new Error(message);
  }

  return response.json();
}

export const apiClient = {
  get: <T>(url: string) => fetcher<T>(url),
  post: <T>(url: string, body?: any) => 
    fetcher<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: any) => 
    fetcher<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => 
    fetcher<T>(url, { method: 'DELETE' }),
};

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'An error occurred while fetching data');
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

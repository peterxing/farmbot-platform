export const API_BASE = '/api';

export async function apiGet<T>(path: string, sessionToken?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: any, sessionToken?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export class BattleRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function battleRequest<T>(url: string, body?: object): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new BattleRequestError(data.error ?? 'ติดต่อห้องแข่งไม่ได้', response.status);
  return data as T;
}

export const battleApi = '/api/simulator/battle';
export const flightLabel = { parallel: 'บินพร้อมกัน', turns: 'บินทีละคน' };

export function seconds(ms: number) {
  return `${(Math.max(0, ms) / 1000).toFixed(1)} วิ`;
}

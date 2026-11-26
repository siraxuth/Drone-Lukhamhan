import type { ManualStick } from './environment';

export const PHONE_REMOTE_API = '/api/simulator/phone';
export const STICK_TIMEOUT_MS = 650;
export const REMOTE_TIMEOUT_MS = 1600;
export type PhonePair = { code: string; secret: string; addresses: string[]; qr: string; url: string };
export type PhoneDisplay = { mode: 'manual' | 'code' | 'rescue'; hint: string };
export type PhoneKey = { id: number; key: number };
export const PHONE_VIEWS = ['off', 'fpv', 'chase', 'top', 'side'] as const;
export type PhoneView = (typeof PHONE_VIEWS)[number];
export type CapturePhoneFrame = (view: Exclude<PhoneView, 'off'>) => Promise<Blob | null>;
export const FRAME_INTERVAL_MS = 125;
export type PhoneInput = { connected: boolean; stick: ManualStick; keys: PhoneKey[]; camera: PhoneView };

export async function remoteRequest<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(PHONE_REMOTE_API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal,
  });
  const data = await response.json();
  if (!response.ok) throw new RemoteError(data.error ?? 'เชื่อมต่อไม่ได้ ลองอีกครั้ง', response.status);
  return data as T;
}

export class RemoteError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

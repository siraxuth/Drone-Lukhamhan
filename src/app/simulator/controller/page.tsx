import type { Metadata, Viewport } from 'next';
import { PhoneController } from '@/flight/PhoneController';

export const metadata: Metadata = {
  title: 'รีโมทมือถือ',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { viewportFit: 'cover' };

export default function ControllerPage() {
  return <PhoneController />;
}

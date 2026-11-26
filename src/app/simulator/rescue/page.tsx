import type { Metadata } from 'next';
import { RescueSimulator } from '@/flight/RescueSimulator';
import { shareMetadata } from '@/lib/og';

const title = 'ฝึกบินกู้ภัยด้วยรีโมท';
const description = 'สนามจำลองแยกสำหรับรีโมท LiteBee Ghost ฝึกค้นหา ส่งของช่วยเหลือ และลงจอดในแผนที่ 3 มิติ';
const path = '/simulator/rescue';

export const metadata: Metadata = { title, description, alternates: { canonical: path }, ...shareMetadata({ title, description, path }) };

export default function Page() {
  return <RescueSimulator />;
}

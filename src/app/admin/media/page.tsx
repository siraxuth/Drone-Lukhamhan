import { MediaManager } from '@/components/image/MediaManager';
import { PageHead } from '../ui';

export default function MediaPage() {
  return (
    <>
      <PageHead title="คลังรูป" desc="รูปทั้งหมดใน R2 ของชมรม ครอบตัดก่อนอัปโหลดได้ ลบหรือคัดลอกลิงก์ได้" />
      <MediaManager mode="page" uploadFolder="content" />
    </>
  );
}

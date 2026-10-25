import { db } from '@/lib/db';
import { plain } from '@/lib/rich';

export type Work = {
  id: string;
  title: string;
  year: number | null;
  summary: string;
  description: string;
  image: string | null;
  /** แกลเลอรี (ไม่รวมภาพปก) */
  images: string[];
  videoUrl: string | null;
  location: string;
  sample: boolean;
};

/** ตัวอย่างที่แสดงเมื่อฐานข้อมูลยังไม่มีผลงาน — ภาพมาจากสนามจำลองของเว็บนี้ ไม่ใช่ผลงานจริงของชมรม */
export const sampleWorks: Work[] = [
  {
    id: 'sample-mission',
    title: 'โดรนปล่อยลูกบอลลงแท่น',
    year: null,
    summary: 'บินจากแท่นกลางสนามไปทิ้งลูกบอลลงแท่นทั้ง 4 มุม แล้วกลับมาลงจอด',
    description: 'ตัวอย่างหน้าผลงาน\n\nภารกิจนี้ให้โดรนขึ้นจากแท่นกลางสนาม บินไปทิ้งลูกบอลลงแท่นสีน้ำเงินทั้ง 4 มุม แล้วบินกลับมาลงจอดที่แท่นเดิม ทีมต้องกะระยะและเวลาให้แม่น เพราะโดรนไม่มีเซนเซอร์วัดตำแหน่งทุกจุด\n\nเมื่อมีผลงานจริง ครูหรือสมาชิกเพิ่มได้ที่หน้า admin ใส่ชื่อผลงาน ปี รายชื่อทีม รูป และลิงก์วิดีโอ แล้วหน้านี้จะแสดงแทนตัวอย่างทันที',
    image: '/field/mission-3d.webp',
    images: [],
    videoUrl: null,
    location: '',
    sample: true,
  },
  {
    id: 'sample-aviation',
    title: 'เจาะลูกโป่งกลางอากาศ',
    year: null,
    summary: 'บินไปแตะลูกโป่ง 12 ลูกบนเสา แล้วลงจอดที่แท่นวงกลมทั้ง 4',
    description: 'ตัวอย่างหน้าผลงาน\n\nประเภทนี้ให้โดรนบินไปแตะลูกโป่ง 12 ลูกที่ตั้งบนเสาคนละความสูง แล้วลงจอดที่แท่นวงกลมทั้ง 4 ก่อนกลับมาหยุดเวลา ต้องคุมความสูงให้พอดีกับลูกโป่งแต่ละลูก\n\nข้อความนี้เป็นตัวอย่างเท่านั้น',
    image: '/field/aviation-3d.webp',
    images: [],
    videoUrl: null,
    location: '',
    sample: true,
  },
  {
    id: 'sample-innovation',
    title: 'ยิงเป้าด้วยเซอร์โว',
    year: null,
    summary: 'บินไปยิงลูกดอกใส่เป้าครบ 4 จุด แล้วกลับมาลงจอดกลางสนาม',
    description: 'ตัวอย่างหน้าผลงาน\n\nโดรนต้องบินไปยิงลูกดอกใส่เป้าทั้ง 4 จุด ยิงได้ 1 ลูกต่อเป้า แล้วกลับมาลงจอดที่แท่นสีแดงกลางสนาม ส่วนที่ท้าทายคือกลไกยิงและการเล็ง\n\nข้อความนี้เป็นตัวอย่างเท่านั้น',
    image: '/field/innovation-3d.webp',
    images: [],
    videoUrl: null,
    location: '',
    sample: true,
  },
  {
    id: 'sample-sim',
    title: 'สนามจำลอง 3 มิติ',
    year: null,
    summary: 'ซ้อมบินในสนามขนาดจริงบนหน้าเว็บ ก่อนลงสนามจริง',
    description: 'ตัวอย่างหน้าผลงาน\n\nสนามจำลองขนาด 10×10 เมตรที่วางตำแหน่งตามเอกสารกติกา ใช้ซ้อมเขียนคำสั่งและดูคะแนนได้ก่อนลงสนามจริง\n\nข้อความนี้เป็นตัวอย่างเท่านั้น',
    image: '/field/mat-1024.webp',
    images: [],
    videoUrl: null,
    location: '',
    sample: true,
  },
];

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

/** ผลงานทั้งหมดที่เผยแพร่แล้ว (ล่าสุดก่อน) · ถ้าฐานข้อมูลว่างหรือเชื่อมไม่ได้ ใช้ตัวอย่าง */
export async function getWorks(take = 60): Promise<Work[]> {
  try {
    const rows = await db.project.findMany({ where: { published: true }, orderBy: [{ year: 'desc' }, { createdAt: 'desc' }], take });
    if (rows.length) {
      return rows.map((r) => ({
        id: r.id, title: r.title, year: r.year, summary: clip(plain(r.description)),
        description: r.description, image: r.image, images: r.images, videoUrl: r.videoUrl, location: r.location, sample: false,
      }));
    }
  } catch {
    /* ไม่มีฐานข้อมูล → ใช้ตัวอย่าง */
  }
  return sampleWorks;
}

export async function getWork(id: string): Promise<Work | null> {
  if (id.startsWith('sample-')) return sampleWorks.find((w) => w.id === id) ?? null;
  try {
    const r = await db.project.findFirst({ where: { id, published: true } });
    if (!r) return null;
    return { id: r.id, title: r.title, year: r.year, summary: clip(plain(r.description)), description: r.description, image: r.image, images: r.images, videoUrl: r.videoUrl, location: r.location, sample: false };
  } catch {
    return null;
  }
}

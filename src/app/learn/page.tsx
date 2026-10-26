import { requireUser } from '@/lib/auth';

export default async function LearnHome() {
  const session = await requireUser();
  const name = session?.user.name?.split(' ')[0] ?? 'ผู้เรียน';
  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 pb-32 pt-28 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">สวัสดี {name}</h1>
      <p className="text-lg leading-8 text-muted-foreground">เข้าสู่ระบบด้วยบัญชีโรงเรียนสำเร็จ พื้นที่เรียนแบบทีละขั้นกำลังสร้างอยู่ จะเปิดให้ใช้ในเวอร์ชันถัดไป</p>
    </main>
  );
}

import { LANDING_DRONE_MODEL } from '@/lib/drone-assets';
import { SmoothScroll } from '@/motion/SmoothScroll';
import { SceneLayer } from '@/scene/SceneLayer';
import { Header } from '@/sections/Header';
import { Stage } from '@/sections/Stage';
import { Ribbon } from '@/sections/Ribbon';
import { About } from '@/sections/About';
import { Numbers } from '@/sections/Numbers';
import { Events } from '@/sections/Events';
import { Lettering } from '@/sections/Lettering';
import { Steps } from '@/sections/Steps';
import { Field } from '@/sections/Field';
import { Showcase } from '@/sections/Showcase';
import { Closing } from '@/sections/Closing';
import { Tour } from '@/components/Tour';
import { homeTour } from '@/lib/tours';

export const revalidate = 60;

export default function Home() {
  return (
    <>
      {/* ดึงไฟล์โมเดลล่วงหน้าตั้งแต่ HTML มาถึง: ใช้ URL รุ่นเดียวกับตัวแสดง 3D เพื่อไม่โหลดซ้ำ */}
      <link rel="preload" href={LANDING_DRONE_MODEL.high} as="fetch" crossOrigin="anonymous" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" href={LANDING_DRONE_MODEL.low} as="fetch" crossOrigin="anonymous" media="(max-width: 767px)" fetchPriority="high" />
      <SmoothScroll />
      <SceneLayer />
      <Tour id="home" steps={homeTour} waitForLoader />
      <Header frame />
      <main className="relative z-10">
        <Stage />
        <Ribbon words={['ชมรมโดรน', 'ลือคำหาญฯ', 'เรียน', 'ซ้อม', 'แข่ง']} />
        <About />
        {/* <Numbers /> */}
        <Events />
        <Lettering />
        <Ribbon words={['ผลงาน', 'ของพวกเรา', 'ทุกปี', 'ทุกรุ่น']} reverse />
        <Showcase />
        <Field />
        <Steps />
        <Closing />
      </main>
    </>
  );
}

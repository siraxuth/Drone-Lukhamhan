import type { ReadImage, ReadVideo, Track } from '../types';

const M = `${process.env.R2_PUBLIC_URL ?? 'https://cdn.dekgp.com'}/drone_lukhamhan/lessons/lettering`;
const img = (name: string, alt: string, caption: string, page: string): ReadImage => ({ src: `${M}/${name}.webp`, alt, caption, href: `/docs/lettering/${page}` });
const clip = (name: string, title: string): ReadVideo => ({ title, src: `${M}/${name}.mp4`, poster: `${M}/${name}-poster.webp` });

/**
 * สาย D: โดรนแปรอักษร (ออกแบบโชว์ใน Blender 4.5 LTS) เรียงตามบทใน /docs/lettering
 * ตรวจได้เฉพาะแบบฝึกเลือกตอบและเติมคำ เพราะงานจริงทำใน Blender ตัวจำลองบินตรวจให้ไม่ได้
 */
export const letteringTrack: Track = {
  id: 'lettering',
  title: 'โดรนแปรอักษร',
  tagline: 'ออกแบบโชว์โดรนเป็นตัวอักษรและรูปทรงด้วย Blender 4.5 LTS ตั้งแต่ติดตั้งจนลงสี',
  optional: true,
  accent: 'amber',
  units: [
    {
      id: 'lt-start', title: 'เริ่มต้น: Blender และ add-on', summary: 'ลง Blender 4.5 LTS ติดตั้ง add-on แล้วหาแถบ RCSA ให้เจอ', minutes: 7, xp: 40,
      docs: [{ label: 'บทเรียนเต็ม: ติดตั้ง Blender', href: '/docs/lettering/install-blender' }, { label: 'บทเรียนเต็ม: ติดตั้ง add-on', href: '/docs/lettering/rcsa-addon' }],
      steps: [
        { kind: 'read', title: 'โดรนแปรอักษรทำงานยังไง', body: ['โดรนแต่ละลำเป็นหนึ่งจุดแสง พอบินพร้อมกันหลายสิบลำก็เรียงเป็นตัวอักษรหรือรูปทรงบนท้องฟ้า', 'งานนี้ไม่ได้เขียนโค้ดสั่งบินทีละลำ แต่ออกแบบฉากใน Blender ว่าแต่ละลำอยู่ตรงไหน เปลี่ยนสีเมื่อไร แล้วส่งไฟล์เข้าระบบแข่งขัน'], images: [img('demo-result', 'ตัวอย่างงานแปรอักษรใน Blender: ลายสิงโตกับข้อความ 2569', 'ตัวอย่างที่ออกแบบใน Blender ประกอบจากจุดโดรนเป็นร้อยจุด', '')] },
        { kind: 'read', title: 'ใช้ Blender 4.5.x LTS เท่านั้น', body: ['ดาวน์โหลดจากหน้ารวมรุ่น 4.5 ของ blender.org แล้วเลือกแถบ 4.5 LTS', 'สไลด์ของชมรมใช้รุ่น 4.5.6 LTS ถ้ามีรุ่นย่อยใหม่กว่าในตระกูล 4.5 ใช้ได้เหมือนกัน แต่ให้ทุกคนในทีมใช้รุ่นเดียวกัน'], tip: 'ไฟล์ .blend จากรุ่นใหม่ เปิดในรุ่นเก่าอาจเพี้ยน', images: [img('blender-download', 'หน้าดาวน์โหลด Blender 4.5 LTS', 'หน้าดาวน์โหลด Blender 4.5 LTS', 'install-blender')] },
        { kind: 'read', title: 'ติดตั้ง add-on ด้วย Install from Disk', body: ['โหลดไฟล์ add-on (.zip) จาก Google Drive ของชมรม แล้วอย่าแตกไฟล์', 'ไปที่ Edit → Preferences → Add-ons กดลูกศรลงมุมขวาบน เลือก Install from Disk ชี้ไปที่ไฟล์ .zip แล้วติ๊กเปิดใช้งาน', 'เอาเมาส์ไว้กลาง Viewport กดปุ่ม `N` จะเห็นแถบ RCSA ที่ขอบขวา'], video: clip('addon-install', 'ติดตั้ง add-on RCSA ใน Blender 4.5') },
      ],
    },
    {
      id: 'lt-setup', title: 'ตั้งค่าโปรเจกต์เริ่มต้น', summary: 'สร้างคอเล็กชั่น Drones, Empty, Pictures แล้วบันทึกเป็น Startup File', minutes: 6, xp: 40,
      docs: [{ label: 'บทเรียนเต็ม: ตั้งค่าเริ่มต้น', href: '/docs/lettering/startup-collections' }],
      steps: [
        { kind: 'read', title: 'สามคอเล็กชั่นที่ทุกงานต้องมี', body: ['Collection คือโฟลเดอร์ใน Outliner ฝั่งขวาบน คลิกขวาที่ว่าง เลือก New Collection แล้วกด `F2` เพื่อตั้งชื่อ', '`Drones` เก็บทรงกลมที่แทนโดรน, `Empty` เก็บกล่องล่องหนที่ใช้ขยับโดรนทั้งกลุ่ม, `Pictures` เก็บภาพต้นแบบ'] },
        { kind: 'read', title: 'บันทึกเป็นค่าเริ่มต้น', body: ['ถ้าไม่บันทึก โปรเจกต์ใหม่จะไม่มีคอเล็กชั่นพวกนี้', 'เมนู File → Defaults → Save Startup File จากนั้นปิดแล้วเปิด Blender ใหม่ เลือก New → General ถ้าเห็นคอเล็กชั่นครบ แปลว่าสำเร็จ'], tip: 'ค่านี้เก็บในเครื่องที่ตั้ง ถ้าย้ายไปเครื่องอื่นต้องทำใหม่', video: clip('collections-startup', 'สร้างคอเล็กชั่นและบันทึก Startup File') },
      ],
    },
    {
      id: 'lt-viewport', title: 'มุมมองและการเคลื่อนกล้อง', summary: 'ใช้ Numpad, ปุ่ม ` และเมาส์ให้ได้มุมหน้าโชว์ที่ถูกต้อง', minutes: 7, xp: 40,
      docs: [{ label: 'บทเรียนเต็ม: มุมมองและการเคลื่อนกล้อง', href: '/docs/lettering/viewport' }],
      steps: [
        { kind: 'read', title: 'ฉากนี้คือท้องฟ้าจำลอง', body: ['เส้นตารางแทนพื้นดิน ทรงกลม (UV Sphere) 1 ลูกแทนโดรน 1 ลำ ยิ่งสูงจากเส้นตาราง โดรนยิ่งสูงจากพื้นจริง', 'คนดูมองจากด้านหน้า จึงต้องออกแบบในมุม Front Orthographic เสมอ'], images: [img('cube-grid', 'ฉากเริ่มต้นของ Blender', 'เส้นตารางคือพื้นดิน', 'viewport')] },
        { kind: 'read', title: 'Numpad เปลี่ยนมุมมอง', body: ['`Numpad 1` = Front (หน้า), `Ctrl + Numpad 1` = Back (หลัง), `Numpad 3` = Right, `Numpad 7` = Top, `Numpad 5` สลับ Perspective กับ Orthographic', 'อีกวิธีคือกดปุ่มตัวหนอน ` ค้างไว้ เลื่อนเมาส์ไปทิศที่ต้องการแล้วปล่อย'], images: [img('view-pie', 'วงกลมเมนูเลือกมุมมอง', 'View Pie Menu จากปุ่ม `', 'viewport')] },
        { kind: 'read', title: 'ไม่มี Numpad หรือไม่มีปุ่มกลางเมาส์', body: ['แล็ปท็อป: Edit → Preferences → Input ติ๊ก Emulate Numpad แล้วใช้ตัวเลขแถวบนแทน', 'แทร็กแพด: ติ๊ก Emulate 3 Button Mouse แล้วใช้ Alt + คลิกซ้ายแทนปุ่มกลาง'] },
      ],
    },
    {
      id: 'lt-material', title: 'พื้นผิว สี และ 10 FPS', summary: 'สร้าง Material แยกรายลำ ตั้ง Standard ให้สีสด และตั้ง 10 FPS', minutes: 8, xp: 50,
      docs: [{ label: 'บทเรียนเต็ม: พื้นผิว สี FPS', href: '/docs/lettering/material-color-fps' }],
      steps: [
        { kind: 'read', title: 'Material ต้องแยกรายลำ', body: ['ลบ Material เดิมก่อน แล้วเอาเมาส์ไว้กลาง Viewport กด `N` เลือกแถบ RCSA กด New Material (ALL) ตามด้วย New Material (EACH)', 'ถ้าลืม EACH ทุกลำจะใช้ Material เดียวกัน เปลี่ยนสีลำเดียว ทุกลำเปลี่ยนตาม'], images: [img('material-panel', 'แผง Material ที่เป็น Emission', 'Surface เป็น Emission ช่อง Color เป็นสีที่ต้องการ', 'material-color-fps')] },
        { kind: 'read', title: 'Color Management ตั้งเป็น Standard', body: ['แท็บ Render ในแผง Properties ขวาล่าง เลื่อนหา Color Management แล้วเปลี่ยน View Transform เป็น Standard', 'ค่าเริ่มต้นของ Blender 4.x ทำให้สีนุ่มและซีดลง Standard ให้สีตรงกับไฟ LED ที่เห็นจริง'], images: [img('color-management', 'ตั้งค่า Color Management', 'Display Device sRGB, View Transform Standard', 'material-color-fps')] },
        { kind: 'read', title: 'ตั้ง 10 FPS ตามกติกาแข่งขัน', body: ['แท็บ Output หา Frame Rate เลือก Custom แล้วพิมพ์ 10 ในช่อง FPS', 'งานแข่งใช้ 10 FPS เพื่อไม่ให้โดรนบินเร็วเกินไป'], images: [img('fps-settings', 'ตั้งค่า FPS เป็น 10', 'Frame Rate: Custom, FPS 10', 'material-color-fps')], video: clip('material-color-fps', 'ตั้งค่า Material, Color Management และ FPS') },
      ],
    },
    {
      id: 'lt-safety', title: 'Safety Check', summary: 'ตรวจระยะห่าง ความสูง และความเร็วของโดรน', minutes: 6, xp: 40,
      docs: [{ label: 'บทเรียนเต็ม: Safety Check', href: '/docs/lettering/safety-check' }],
      steps: [
        { kind: 'read', title: 'สามสิ่งที่ถูกเตือน', body: ['ในแถบ RCSA ติ๊ก Safety Check แล้วเปิดการเตือน 3 อย่าง: Show proximity warnings (โดรนใกล้กันเกิน), Show altitude warnings (สูงหรือต่ำเกินช่วงที่ตั้ง), Show velocity warnings (เร็วเกินที่ตั้ง)', 'ระยะห่างเริ่มต้น 1.8 เมตร ความเร็วเริ่มต้นราว 1.8–2 เมตรต่อวินาที ปรับได้ และถ้ากติกาของรอบนั้นกำหนดต่างไปให้ยึดกติกา'], images: [img('rcsa-panel', 'แผง RCSA มีหัวข้อ Safety Check', 'หัวข้อ Safety Check ในแผง RCSA', 'safety-check')] },
        { kind: 'read', title: 'โดรนขึ้นสีเหลืองแปลว่าอะไร', body: ['ปักตำแหน่งที่เฟรมหนึ่ง แล้วย้ายไปเฟรมที่ 10 ย้ายโดรนไปตำแหน่งใหม่ ถ้าห่างเกินไปโดรนจะขึ้นสีเหลือง แปลว่าต้องบินเร็วกว่าที่กำหนด', 'แก้ได้สองทาง: ย้ายให้ใกล้ขึ้น หรือเว้นเฟรมให้ห่างขึ้น (ที่ 10 FPS ย้าย 2 เมตรใน 10 เฟรมคือ 2 เมตรต่อวินาที)'], tip: 'ดูตัวเลข Min distance ที่มุมซ้ายบนของ Viewport ทุกครั้งที่ย้ายโดรนเป็นกลุ่ม' },
      ],
    },
    {
      id: 'lt-objects', title: 'สร้างวัตถุ Empty และคีย์ลัด', summary: 'เพิ่มโดรน สร้าง Empty และใช้ F2, G, R, S, Shift + D', minutes: 8, xp: 50,
      docs: [{ label: 'บทเรียนเต็ม: สร้างวัตถุและคีย์ลัด', href: '/docs/lettering/objects-shortcuts' }],
      steps: [
        { kind: 'read', title: 'เพิ่มโดรนและ Empty', body: ['คลิกคอเล็กชั่น Drones ให้ไฮไลต์ก่อน แล้วกด Add Sphere ในแถบ RCSA (หรือ Shift + A → Mesh → UV Sphere) ของที่เพิ่มใหม่จะเข้าคอเล็กชั่นที่เลือกอยู่', 'Empty คือวัตถุล่องหน ใช้ขยับโดรนทั้งกลุ่มพร้อมกัน สร้างด้วย Shift + A → Empty → Plain Axes ในคอเล็กชั่น Empty'], images: [img('add-menu', 'เมนู Add ใน Blender', 'เมนู Add เปิดด้วย Shift + A', 'objects-shortcuts')] },
        { kind: 'read', title: 'คีย์ลัดชุดหลัก', body: ['`F2` เปลี่ยนชื่อ, `G` ย้าย, `R` หมุน, `S` ย่อขยาย, `Shift + D` ทำสำเนา, `Alt + G` ล้างตำแหน่งกลับศูนย์', '`G` ตามด้วย `X`, `Y` หรือ `Z` ย้ายเฉพาะแกนนั้น พิมพ์ตัวเลขต่อได้ เช่น G, X, 2, Enter = เลื่อนไปทางแกน X 2 หน่วย'], tip: 'ย้อนกลับด้วย Ctrl + Z ส่วน Alt + G คือเอาตำแหน่งกลับไปที่ศูนย์ ไม่ใช่ย้อนกลับ', video: clip('objects-empty-shortcuts', 'สร้างวัตถุ Empty และตั้งคีย์ลัด') },
      ],
    },
    {
      id: 'lt-gradient', title: 'การไล่สี', summary: 'ใช้ LED Control กำหนดสีหลัก สีรอง แล้วไล่สีข้ามโดรนหลายลำ', minutes: 6, xp: 40,
      docs: [{ label: 'บทเรียนเต็ม: การไล่สี', href: '/docs/lettering/gradient' }],
      steps: [
        { kind: 'read', title: 'Primary, Secondary และ Fade', body: ['เลือกโดรนที่ต้องการ แล้วใช้หัวข้อ LED Control ในแถบ RCSA: ช่อง Primary คือสีตั้งต้น ช่อง Secondary คือสีปลายทาง ปุ่ม Fade to ไล่ระดับสีข้ามโดรนที่เลือก', 'ทิศของการไล่สีขึ้นกับลำดับของโดรน ถ้าสีสลับแปลก ให้ดูชื่อเรียงลำดับใน Outliner'], images: [img('spheres-scene', 'โดรนเจ็ดลำพร้อมแผง LED Control', 'แผง LED Control ในแถบ RCSA', 'gradient')], video: clip('gradient', 'ไล่สีโดรนเจ็ดลำด้วย LED Control') },
        { kind: 'read', title: 'เลือกคู่สีให้อ่านง่ายบนฟ้า', body: ['ฟ้ายามค่ำทำให้ LED ดูสว่างกว่าในจอ สีที่ใกล้กันมากแยกยากบนฟ้าจริง เลือกคู่สีที่ต่างกันชัด เช่น น้ำเงินไปม่วง', 'แดงไปเขียนตรงๆ ช่วงกลางจะขุ่น'] },
      ],
    },
    {
      id: 'lt-reference', title: 'แนบภาพต้นฉบับ', summary: 'วางภาพต้นแบบ ย่อขยาย ล็อก Selectable และย้ายเข้า Pictures', minutes: 7, xp: 50,
      docs: [{ label: 'บทเรียนเต็ม: แนบภาพต้นฉบับ', href: '/docs/lettering/reference-image' }],
      steps: [
        { kind: 'read', title: 'วางภาพเป็นแม่แบบ', body: ['เลือกภาพที่เส้นขอบชัดและพื้นหลังเรียบ เช่น ตัวอักษรหนาหรือหัวใจ', 'กด Numpad 1 ให้เป็น Front Orthographic คลิกคอเล็กชั่น Pictures แล้วกด Shift + A เลือก Image → Reference ภาพจะวางกลางฉาก'], images: [img('add-image-menu', 'เมนูเพิ่มภาพต้นแบบ', 'Add → Image → Reference', 'reference-image')] },
        { kind: 'read', title: 'ขยายภาพให้พอดีกับจำนวนโดรน', body: ['กด `S` ย่อหรือขยายภาพ ขนาดภาพสัมพันธ์กับจำนวนโดรน ภาพใหญ่ขึ้นทำให้โดรนบนเส้นขอบห่างกันมากขึ้น', 'ขยายจนระยะระหว่างโดรนสองลำที่ติดกันไม่ต่ำกว่าค่า Safety Check (เริ่มต้น 1.8 เมตร)'], video: clip('scale-image', 'ขยายภาพต้นฉบับด้วยปุ่ม S') },
        { kind: 'read', title: 'ล็อกภาพไม่ให้เผลอเลือก', body: ['ปิด Selectable ของคอเล็กชั่น Pictures ใน Outliner ภาพจะไม่ติดมาตอนลากกรอบเลือกโดรน', 'ถ้าภาพไปอยู่ผิดกลุ่ม เลือกภาพแล้วกด `M` เลือกคอเล็กชั่นปลายทาง'], video: clip('move-collection', 'ปิด Selectable และย้ายคอเล็กชั่นด้วยปุ่ม M') },
      ],
    },
    {
      id: 'lt-heart', title: 'ทำรูปหัวใจและลงสีเคลื่อนไหว', summary: 'วางโดรนตามเส้นหัวใจ ลงสี ปักคีย์เฟรมสี และตรวจก่อนส่งงาน', minutes: 9, xp: 60,
      docs: [{ label: 'บทเรียนเต็ม: สาธิตทำรูปหัวใจ', href: '/docs/lettering/heart-demo' }, { label: 'บทเรียนเต็ม: ลงสีและภาพเคลื่อนไหว', href: '/docs/lettering/color-animation' }, { label: 'แก้ปัญหาที่เจอบ่อย', href: '/docs/lettering/troubleshooting' }],
      steps: [
        { kind: 'read', title: 'วางโดรนตามเส้นขอบ', body: ['แนบภาพหัวใจเส้นหนา ขยายให้พอดี แล้ววางโดรนลำแรกที่จุดล่างสุด ใช้ Shift + D ทำสำเนาแล้ว G ย้ายไปจุดถัดไปตามเส้น', 'เทคนิคเร็ว: วางจุดสำคัญก่อน (ล่างสุด ยอดสองข้าง จุดบุ๋ม) หรือทำครึ่งซีกแล้วทำสำเนากลับด้านด้วย S, X, -1'], images: [img('heart-dots', 'โดรนเรียงตามเส้นหัวใจ', 'โดรนที่วางตามเส้นขอบหัวใจ', 'heart-demo')], video: clip('heart-demo', 'สาธิตวางโดรนเป็นรูปหัวใจ') },
        { kind: 'read', title: 'ลงสีและปักคีย์เฟรม', body: ['เลือกโดรน ตั้งสีในแผง RCSA แล้วกด Apply ถ้าต้องการสีที่แม่น ใช้ช่อง Hex ในหน้าต่างเลือกสี', 'ให้สีเปลี่ยนตามเวลา: ปักคีย์เฟรมสีที่เฟรมแรก (กดรูปข้าวหลามตัดข้างช่อง Color) ไปเฟรมถัดไป เปลี่ยนสี แล้วปักอีกครั้ง กด Shift + ลูกศรซ้ายย้อนไปเฟรมแรก แล้วกด Space เล่นดู'], images: [img('heart-pink', 'หัวใจที่ลงสีชมพูแล้ว', 'หัวใจที่ลงสีแล้ว', 'color-animation')], video: clip('color-play', 'เล่นสีและปักคีย์เฟรม') },
        { kind: 'read', title: 'เช็กก่อนส่งงาน', body: ['Blender 4.5.x LTS, มี Drones/Empty/Pictures, 10 FPS, View Transform เป็น Standard, Material แยกรายลำ', 'Safety Check ผ่านหมด ไม่มีโดรนสีเหลือง มุม Front Orthographic อ่านถูกด้าน บันทึกไฟล์แล้วเปิดใหม่เล่นได้'], tip: 'เก็บไฟล์หลายเวอร์ชัน เช่น heart_v1.blend อย่าเขียนทับไฟล์เดียวตลอด' },
      ],
    },
  ],
};

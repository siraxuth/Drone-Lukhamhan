"""ทำ contact sheet จากคลิป: ดึงภาพนิ่งหลายจุด เรียงเป็นตาราง พร้อมเวลาและกรอบ safe area

ใช้:
  python3 contact-sheet.py out/preview-9x16.mp4 --safe 9x16
  python3 contact-sheet.py out/preview-16x9.mp4 --times 0.5,3,10,20 --out /tmp/sheet.jpg

ต้องมี ffmpeg/ffprobe และ Pillow
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

# safe area เป็นพิกเซลของภาพเต็มขนาด (บน, ล่าง, ซ้าย, ขวา)
SAFE = {'9x16': (220, 380, 80, 120), '16x9': (96, 96, 120, 120)}


def duration(video: str) -> float:
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video])
    return float(out.decode().strip())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--times', help='วินาทีคั่นด้วยจุลภาค (ไม่ใส่ = ทุก 3 วินาที)')
    ap.add_argument('--safe', choices=SAFE.keys(), help='วาดกรอบ safe area สีแดง')
    ap.add_argument('--cols', type=int, default=0)
    ap.add_argument('--out', default='/tmp/contact-sheet.jpg')
    a = ap.parse_args()

    dur = duration(a.video)
    times = [float(t) for t in a.times.split(',')] if a.times else [round(t * 3 + 0.5, 1) for t in range(int(dur // 3))]
    tmp = Path(tempfile.mkdtemp())
    frames = []
    for t in times:
        f = tmp / f'{t:06.2f}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', a.video, '-frames:v', '1', str(f)], check=True)
        frames.append((t, Image.open(f).convert('RGB')))

    w0, h0 = frames[0][1].size
    portrait = h0 > w0
    tw, th = (240, int(240 * h0 / w0)) if portrait else (400, int(400 * h0 / w0))
    cols = a.cols or (7 if portrait else 4)
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * th), 'white')
    for i, (t, im) in enumerate(frames):
        im = im.resize((tw, th))
        d = ImageDraw.Draw(im)
        if a.safe:
            top, bottom, left, right = SAFE[a.safe]
            # สเกลจากขนาดเต็ม (1080 หรือ 1920 ด้านกว้าง) มาเป็นภาพย่อ
            full_w = 1080 if a.safe == '9x16' else 1920
            k = tw / full_w
            d.rectangle([left * k, top * k, tw - right * k, th - bottom * k], outline=(255, 0, 0), width=2)
        d.rectangle([0, 0, 52, 18], fill=(0, 0, 0))
        d.text((4, 3), f'{t:.1f}s', fill=(255, 255, 255))
        sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    sheet.save(a.out, quality=88)
    print(f'saved {a.out} ({len(frames)} frames, {cols}x{rows})')


if __name__ == '__main__':
    main()

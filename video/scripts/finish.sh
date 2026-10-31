#!/usr/bin/env bash
# ปรับความดังเสียงให้ได้ราว -14 LUFS (ระดับที่ YouTube/TikTok/Reels ใช้) โดยไม่เข้ารหัสภาพใหม่
set -euo pipefail
for f in out/raw-*.mp4; do
  out="out/${f#out/raw-}"
  ffmpeg -v error -y -i "$f" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k "$out"
  echo "saved $out"
done

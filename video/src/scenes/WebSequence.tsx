import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { useLayout } from '../layout';
import { C, fontFamily } from '../theme';

export type WebShot = { file: string; title: string; note?: string };

/** Sequence of real homepage captures with a restrained camera push and readable chapter label. */
export function WebSequence({ desktop, mobile, duration, poster = false }: {
  desktop: WebShot[];
  mobile: WebShot[];
  duration: number;
  poster?: boolean;
}) {
  const L = useLayout();
  const frame = useCurrentFrame();
  const shots = L.portrait ? mobile : desktop;
  const shotFrames = duration / shots.length;
  const index = Math.min(shots.length - 1, Math.floor(frame / shotFrames));
  const local = frame - index * shotFrames;
  const shot = shots[index];
  const push = interpolate(local, [0, shotFrames], [1, 1.045], { extrapolateRight: 'clamp' });
  const reveal = interpolate(local, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.dark, overflow: 'hidden' }}>
      <Img src={staticFile(`img/${shot.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${push})` }} />
      {poster && <Img src={staticFile('img/drone-poster.webp')} style={{ position: 'absolute', left: L.portrait ? '18%' : '54%', top: L.portrait ? '15%' : '14%', width: L.portrait ? '64%' : '36%', height: 'auto', opacity: 0.94, objectFit: 'contain', transform: `translateY(${Math.sin(frame / 18) * (L.portrait ? 8 : 12)}px) rotate(${Math.sin(frame / 28) * 1.2}deg)` }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,12,16,0.02) 45%, rgba(10,12,16,0.72) 100%)' }} />
      {(shot.title || shot.note) && (
        <div style={{ position: 'absolute', left: L.safe.left, right: L.safe.right, bottom: L.safe.bottom, maxWidth: L.portrait ? '82%' : '70%', padding: L.portrait ? '18px 22px' : '20px 28px', borderLeft: `5px solid ${C.blueOnDark}`, borderRadius: 18, background: 'rgba(12,15,20,0.84)', color: '#fff', fontFamily, opacity: reveal, transform: `translateY(${(1 - reveal) * 20}px)` }}>
          {shot.note && <div style={{ fontSize: L.portrait ? 24 : 24, color: '#b9bec8', fontWeight: 600, marginBottom: 4 }}>{shot.note}</div>}
          <div style={{ fontSize: L.portrait ? 44 : 52, lineHeight: 1.12, fontWeight: 800, textWrap: 'balance' }}>{shot.title}</div>
        </div>
      )}
    </AbsoluteFill>
  );
}

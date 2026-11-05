import { Composition } from 'remotion';
import { DURATION, Intro } from './Intro';
import { FPS } from './theme';

export function Root() {
  const Preview = () => <Intro withNarration={false} />;
  return (
    <>
      <Composition id="Intro16x9" component={Intro} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
      <Composition id="Intro9x16" component={Intro} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="Preview16x9" component={Preview} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
      <Composition id="Preview9x16" component={Preview} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
    </>
  );
}

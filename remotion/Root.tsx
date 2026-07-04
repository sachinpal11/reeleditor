import { Composition } from 'remotion';
import { ReelComposition, ReelCompositionProps } from './Composition';

export const RemotionRoot: React.FC = () => {
  const defaultText = 'Two students built a $30 car filter that converts exhaust pollution into oxygen using algae';
  const defaultWords = defaultText.split(/\s+/).map((word) => {
    const cleanWord = word.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    const isHighlight = cleanWord === 'oxygen' || cleanWord === 'algae';
    return {
      text: word,
      color: isHighlight ? '#22c55e' : '#ffffff',
      weight: 'bold' as const,
      font: 'outfit' as const
    };
  });

  const defaultProps: ReelCompositionProps = {
    videoPath: '',
    words: defaultWords,
    config: {
      id: 'default',
      name: 'Default Tech Layout',
      layoutMode: 'auto',
      layoutGap: 24,
      backgroundSrc: '/assets/background.png',
      backgroundScale: 1.0,
      header: {
        src: '/assets/header.png',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        scale: 1.0
      },
      video: {
        x: 0,
        y: 540,
        width: 1080,
        height: 620
      },
      headline: {
        x: 70,
        y: 165,
        width: 940,
        fontSize: 58,
        lineHeight: 1.2
      },
      watermark: {
        src: '/assets/watermark.png',
        x: 'center',
        bottom: 40,
        width: 55,
        scale: 1.0,
        alignToVideo: true
      }
    }
  };

  return (
    <>
      <Composition
        id="SocialMediaReel"
        component={ReelComposition as any}
        durationInFrames={450} // 15 seconds at 30 fps (overridden at render time based on video duration)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};

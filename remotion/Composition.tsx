import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import { Template, WordStyle } from '../types';
import { useEffect, useState, useRef } from 'react';

export interface ReelCompositionProps {
  videoPath: string; // Absolute local file path or public URL
  words: WordStyle[]; // Uses the updated per-word styles array
  config: Template;
}

export const ReelComposition: React.FC<ReelCompositionProps> = ({
  videoPath,
  words,
  config
}) => {
  const { width: compWidth, height: compHeight } = useVideoConfig();
  const [fontSize, setFontSize] = useState(config.headline.fontSize);
  const textRef = useRef<HTMLDivElement>(null);

  // Auto-scale font size inside Remotion's headless execution
  useEffect(() => {
    setFontSize(config.headline.fontSize);
  }, [words, config.headline.fontSize, config.headline.width]);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const singleLineHeight = fontSize * config.headline.lineHeight;
    const maxHeight = singleLineHeight * 3; // Maximum 3 lines
    const minFontSize = 24;

    if (element.scrollHeight > maxHeight + 2 && fontSize > minFontSize) {
      setFontSize((prev) => Math.max(minFontSize, prev - 1));
    }
  }, [words, fontSize, config.headline.lineHeight, config.headline.width]);

  const [measuredHeadlineHeight, setMeasuredHeadlineHeight] = useState(150);

  useEffect(() => {
    if (textRef.current) {
      setMeasuredHeadlineHeight(textRef.current.scrollHeight);
    }
  }, [words, fontSize, config.headline.width, config.headline.lineHeight, config.layoutMode, config.layoutGap]);

  // Robust mathematical fallback approximation for server-side or immediate render ticks
  const approxLineCount = Math.ceil((words.map(w => w.text).join(' ').length * (fontSize * 0.55)) / config.headline.width);
  const approxHeight = Math.max(fontSize * config.headline.lineHeight, approxLineCount * fontSize * config.headline.lineHeight);
  const headlineHeight = measuredHeadlineHeight || approxHeight;

  // Compute bottom-up flow Y coordinates (Video Y position is the master)
  const computedHeadlineY = config.layoutMode === 'auto'
    ? config.video.y - config.layoutGap - headlineHeight
    : config.headline.y;

  const computedHeaderY = config.layoutMode === 'auto'
    ? computedHeadlineY - config.layoutGap - (config.header.height * (config.header.scale || 1.0))
    : config.header.y;

  // Normalizes asset paths for staticFile (e.g. "/assets/logo.png" -> "assets/logo.png")
  const getCleanAssetPath = (src: string) => {
    if (!src) return 'assets/background.png';
    return src.startsWith('/') ? src.substring(1) : src;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* Preload Google Fonts dynamically inside headless Puppeteer */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Outfit:wght@400;700&family=Inter:wght@400;700&display=swap"
        rel="stylesheet"
      />

      {/* Layer 1: Background Layer with zoom/scale */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <img
          src={staticFile(getCleanAssetPath(config.backgroundSrc))}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${config.backgroundScale || 1.0})`,
            transformOrigin: 'center center',
          }}
          alt="Background"
        />
      </div>

      {/* Layer 2: Custom Positioned and Scaled Header */}
      <div
        style={{
          position: 'absolute',
          left: config.header.x,
          top: computedHeaderY,
          width: config.header.width,
          height: config.header.height,
          transform: `scale(${config.header.scale || 1.0})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <img
          src={staticFile(getCleanAssetPath(config.header.src))}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
          alt="Header Overlay"
        />
      </div>

      {/* Layer 3: Headline Text (Word-by-word styled rendering) */}
      <div
        ref={textRef}
        style={{
          position: 'absolute',
          left: config.headline.x,
          top: computedHeadlineY,
          width: config.headline.width,
          fontSize: `${fontSize}px`,
          lineHeight: config.headline.lineHeight,
          wordBreak: 'break-word',
          overflow: 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          zIndex: 20
        }}
      >
        {words.map((word, i) => {
          // Resolve font family mappings
          let fontFamily = 'Outfit, system-ui, sans-serif';
          if (word.font === 'poppins') fontFamily = 'Poppins, sans-serif';
          else if (word.font === 'inter') fontFamily = 'Inter, sans-serif';
          else if (word.font === 'geist') fontFamily = 'system-ui, -apple-system, sans-serif';

          return (
            <span
              key={i}
              style={{
                color: word.color || '#ffffff',
                fontWeight: word.weight === 'bold' ? 700 : 400,
                fontFamily,
                marginRight: '0.22em',
                display: 'inline-block'
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>

      {/* Layer 4: Reference Video */}
      {videoPath && (
        (() => {
          const cropWidth = config.video.cropWidth;
          const cropHeight = config.video.cropHeight;
          const cropX = config.video.cropX || 0;
          const cropY = config.video.cropY || 0;
          const originalWidth = config.video.originalWidth || 1080;
          const originalHeight = config.video.originalHeight || 1920;

          if (cropWidth && cropHeight) {
            const scaleFactor = config.video.width / cropWidth;
            return (
              <div
                style={{
                  position: 'absolute',
                  left: config.video.x,
                  top: config.video.y, // Video Y is the master Y coordinate
                  width: config.video.width,
                  height: config.video.height,
                  overflow: 'hidden',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  zIndex: 15
                }}
              >
                <div
                  style={{
                    width: `${cropWidth}px`,
                    height: `${cropHeight}px`,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: 'top left',
                    overflow: 'hidden'
                  }}
                >
                  <OffthreadVideo
                    src={videoPath}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: `${originalWidth}px`,
                      height: `${originalHeight}px`,
                      transform: `translate(${-cropX}px, ${-cropY}px)`,
                      transformOrigin: 'top left',
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                  />
                </div>
              </div>
            );
          }

          // Fallback uncropped version
          return (
            <div
              style={{
                position: 'absolute',
                left: config.video.x,
                top: config.video.y,
                width: config.video.width,
                height: config.video.height,
                overflow: 'hidden',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 15
              }}
            >
              <OffthreadVideo
                src={videoPath}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          );
        })()
      )}

      {/* Layer 5: Custom Positioned and Scaled Watermark */}
      {(() => {
        // If alignToVideo is true, we position the watermark relative to the bottom edge of the video slot
        const watermarkBottom = config.watermark.alignToVideo !== false
          ? 1920 - (config.video.y + config.video.height) + config.watermark.bottom
          : config.watermark.bottom;

        return (
          <img
            src={staticFile(getCleanAssetPath(config.watermark.src))}
            style={{
              position: 'absolute',
              bottom: watermarkBottom,
              left: config.watermark.x === 'center' ? '50%' : config.watermark.x,
              transform: config.watermark.x === 'center' 
                ? `translateX(-50%) scale(${config.watermark.scale || 1.0})` 
                : `scale(${config.watermark.scale || 1.0})`,
              transformOrigin: 'bottom center',
              width: config.watermark.width,
              height: 'auto',
              objectFit: 'contain',
              opacity: config.watermark.opacity !== undefined ? config.watermark.opacity : 1.0,
              zIndex: 25
            }}
            alt="Watermark Overlay"
          />
        );
      })()}
    </AbsoluteFill>
  );
};

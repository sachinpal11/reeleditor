'use client';

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Video as VideoIcon } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { useAutoscalingText } from '../hooks/useAutoscalingText';

export const PreviewCanvas: React.FC = () => {
  const { headline, words, video, config, previewZoom, setPreviewZoom } = useEditorStore();

  const scale = previewZoom / 100;
  const canvasWidth = 1080;
  const canvasHeight = 1920;

  // Use the auto-scaling hook in the live preview (measuring raw headline text)
  const { fontSize: autoscaledFontSize, containerRef } = useAutoscalingText(
    headline,
    config.headline.width,
    config.headline.fontSize,
    config.headline.lineHeight,
    3 // max 3 lines
  );

  const [measuredHeadlineHeight, setMeasuredHeadlineHeight] = React.useState(150);

  React.useEffect(() => {
    if (containerRef.current) {
      setMeasuredHeadlineHeight(containerRef.current.scrollHeight);
    }
  }, [headline, autoscaledFontSize, config.headline.width, config.headline.lineHeight, config.layoutMode, config.layoutGap]);

  // Robust mathematical fallback approximation for server-side or immediate render ticks
  const approxLineCount = Math.ceil((headline.length * (autoscaledFontSize * 0.55)) / config.headline.width);
  const approxHeight = Math.max(autoscaledFontSize * config.headline.lineHeight, approxLineCount * autoscaledFontSize * config.headline.lineHeight);
  const headlineHeight = measuredHeadlineHeight || approxHeight;

  // Compute bottom-up flow Y coordinates (Video Y position is the master)
  const computedHeadlineY = config.layoutMode === 'auto'
    ? config.video.y - config.layoutGap - headlineHeight
    : config.headline.y;

  const computedHeaderY = config.layoutMode === 'auto'
    ? computedHeadlineY - config.layoutGap - (config.header.height * (config.header.scale || 1.0))
    : config.header.y;

  // Standardizes file paths (assures leading slash for web serving in Next.js)
  const getAssetUrl = (src: string) => {
    if (!src) return '/assets/background.png';
    return src.startsWith('/') ? src : `/${src}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 bg-neutral-900/10 border border-neutral-850 p-6 rounded-2xl w-full">
      {/* Canvas Top Bar / Zoom Actions */}
      <div className="flex items-center justify-between w-full border-b border-neutral-800/60 pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Maximize2 className="h-3.5 w-3.5" />
          Live Preview
        </h3>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewZoom(Math.max(15, previewZoom - 5))}
            className="rounded p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <input
            type="range"
            min="15"
            max="60"
            value={previewZoom}
            onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
            className="w-20 accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
          />
          
          <button
            onClick={() => setPreviewZoom(Math.min(60, previewZoom + 5))}
            className="rounded p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <span className="text-xs font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
            {previewZoom}%
          </span>
        </div>
      </div>

      {/* Canvas Outer Containment */}
      <div className="relative flex justify-center items-center w-full min-h-[580px] bg-neutral-950/60 rounded-xl overflow-hidden border border-neutral-850 shadow-inner p-4">
        {/* Scaled Canvas Container */}
        <div
          style={{
            width: `${canvasWidth * scale}px`,
            height: `${canvasHeight * scale}px`,
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            transition: 'width 0.15s ease-out, height 0.15s ease-out'
          }}
          className="rounded-lg overflow-hidden border border-neutral-800 bg-black flex-shrink-0"
        >
          {/* Internal Fixed 1080x1920 Workspace (Scaled down via CSS Transform) */}
          <div
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              position: 'absolute',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              backgroundColor: '#000000',
              pointerEvents: 'none'
            }}
          >
            {/* Layer 1: Background Layer with Dynamic Scale */}
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
                src={getAssetUrl(config.backgroundSrc)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `scale(${config.backgroundScale || 1.0})`,
                  transformOrigin: 'center center',
                }}
                className="select-none"
                alt="Template Background"
              />
            </div>

            {/* Layer 2: Custom Positioned and Scaled Header Overlay */}
            <div
              style={{
                position: 'absolute',
                left: config.header.x,
                top: computedHeaderY,
                width: config.header.width,
                height: config.header.height,
                transform: `scale(${config.header.scale || 1.0})`,
                transformOrigin: 'top left',
                zIndex: 10
              }}
            >
              <img
                src={getAssetUrl(config.header.src)}
                className="w-full h-full object-contain select-none"
                alt="Template Header"
              />
            </div>

            {/* Layer 3: Headline Text (Word-by-word custom styling) */}
            <div
              ref={containerRef}
              style={{
                position: 'absolute',
                left: config.headline.x,
                top: computedHeadlineY,
                width: config.headline.width,
                fontSize: `${autoscaledFontSize}px`,
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
                // Map style properties to CSS fonts
                let fontFamily = 'Outfit, sans-serif';
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
            {video ? (
              (() => {
                const cropWidth = config.video.cropWidth;
                const cropHeight = config.video.cropHeight;
                const cropX = config.video.cropX || 0;
                const cropY = config.video.cropY || 0;
                const originalWidth = config.video.originalWidth || video.width;
                const originalHeight = config.video.originalHeight || video.height;

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
                      className="bg-neutral-900"
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
                          overflow: 'hidden',
                          pointerEvents: 'none'
                        }}
                      >
                        <video
                          src={video.localUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
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

                // Standard uncropped version
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
                    className="bg-neutral-900"
                  >
                    <video
                      src={video.localUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })()
            ) : (
              /* Video Area Placeholder */
              <div
                style={{
                  position: 'absolute',
                  left: config.video.x,
                  top: config.video.y,
                  width: config.video.width,
                  height: config.video.height,
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  zIndex: 15
                }}
                className="bg-neutral-900 flex items-center justify-center"
              >
                <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-lg w-[95%] h-[95%]">
                  <VideoIcon className="h-10 w-10 text-neutral-700 mb-2" />
                  <span className="text-neutral-500 font-medium text-lg uppercase tracking-wide">Video Container</span>
                  <span className="text-neutral-600 text-xs mt-1">
                    {config.video.width} × {config.video.height}
                  </span>
                </div>
              </div>
            )}

            {/* Layer 5: Custom Positioned and Scaled Watermark Overlay */}
            {(() => {
              // If alignToVideo is true, we position the watermark relative to the bottom edge of the video slot
              const watermarkBottom = config.watermark.alignToVideo !== false
                ? 1920 - (config.video.y + config.video.height) + config.watermark.bottom
                : config.watermark.bottom;

              return (
                <img
                  src={getAssetUrl(config.watermark.src)}
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
                  alt="Template Watermark"
                />
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

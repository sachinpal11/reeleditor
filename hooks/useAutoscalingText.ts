import { useEffect, useState, useRef } from 'react';

export function useAutoscalingText(
  text: string,
  width: number,
  baseFontSize: number,
  lineHeight: number,
  maxLines: number = 3
) {
  const [fontSize, setFontSize] = useState(baseFontSize);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset font size when the base font size, text, or width changes
  useEffect(() => {
    setFontSize(baseFontSize);
  }, [text, baseFontSize, width]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Run font adjustment loop
    const singleLineHeight = fontSize * lineHeight;
    const maxHeight = singleLineHeight * maxLines;
    const minFontSize = 24; // Minimum allowed font size to maintain readability

    // Using +2 offset for subpixel layout rounding discrepancies in browsers
    if (element.scrollHeight > maxHeight + 2 && fontSize > minFontSize) {
      // Decrease font size and let React trigger the next layout pass
      setFontSize((prev) => Math.max(minFontSize, prev - 1));
    }
  }, [text, fontSize, lineHeight, maxLines, width]);

  return { fontSize, containerRef };
}

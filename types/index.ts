export interface ElementLayout {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface WatermarkLayout {
  src: string;
  x: string | number;
  bottom: number; // Gap from bottom of video (if aligned) or bottom of canvas
  width: number;
  scale: number;
  opacity?: number;
  alignToVideo?: boolean; // If true, positions the watermark relative to the bottom of the video card
}

export interface Template {
  id: string;
  name: string;
  layoutMode: 'auto' | 'custom'; // 'auto' stacks vertically with gap, 'custom' uses absolute y
  layoutGap: number; // Gap size in pixels
  backgroundSrc: string;
  backgroundScale: number;
  header: ElementLayout;
  video: {
    x: number;
    y: number;
    width: number;
    height: number;
    cropX?: number;
    cropY?: number;
    cropWidth?: number;
    cropHeight?: number;
    originalWidth?: number;
    originalHeight?: number;
  };
  headline: {
    x: number;
    y: number;
    width: number;
    fontSize: number;
    lineHeight: number;
  };
  watermark: WatermarkLayout;
}

export interface TemplatesConfig {
  activeTemplateId: string;
  templates: Record<string, Template>;
}

export interface UploadedVideo {
  name: string;
  size: number;
  type: string;
  localUrl: string; // Object URL for preview
  serverUrl?: string; // Server relative path
  duration: number;
  width: number;
  height: number;
}

export interface WordStyle {
  text: string;
  color: string; // Hex color code (e.g. "#ffffff")
  weight: 'bold' | 'regular';
  font: 'geist' | 'inter' | 'poppins' | 'outfit';
}

export interface RenderTask {
  id: string;
  words: WordStyle[]; // Replaces headline and highlightWords
  videoName: string;
  videoUrl: string; // Servable URL or local file path
  duration: number; // in seconds
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number; // 0 to 100
  date: string;
  downloadUrl?: string;
  error?: string;
}

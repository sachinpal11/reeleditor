'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Film, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import toast from 'react-hot-toast';
import { createWorker } from 'tesseract.js';

// Client-side auto-crop detector (compares seek frames to isolate moving video from static titles/headers/logos)
const detectVideoCrop = (videoUrl: string): Promise<{ x: number; y: number; width: number; height: number }> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = 160; // Scale down for high-performance scanning
      canvas.height = Math.round((160 * height) / width);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({ x: 0, y: 0, width, height });
        return;
      }
      
      // Sample three frame seek intervals (20%, 50%, 80%) to detect moving video pixels
      const seekTimes = [video.duration * 0.2, video.duration * 0.5, video.duration * 0.8];
      const frames: Uint8ClampedArray[] = [];
      let seekIndex = 0;
      
      const captureFrame = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          frames.push(new Uint8ClampedArray(imgData.data));
        } catch (e) {
          console.error('Frame capture failed', e);
        }
        
        seekIndex++;
        if (seekIndex < seekTimes.length) {
          video.currentTime = seekTimes[seekIndex];
        } else {
          video.remove();
          analyzeMotion();
        }
      };
      
      const analyzeMotion = () => {
        if (frames.length < 2) {
          resolve({ x: 0, y: 0, width, height });
          return;
        }
        
        let minX = canvas.width;
        let maxX = 0;
        let minY = -1;
        let maxY = -1;
        
        // Threshold for pixel color difference to qualify as active motion (0-255)
        const motionThreshold = 24;
        
        // Scan bottom-up (from canvas.height - 1 down to 0) to find the video boundaries
        for (let y = canvas.height - 1; y >= 0; y--) {
          let rowMotionCount = 0;
          let rowMinX = canvas.width;
          let rowMaxX = 0;
          
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            
            // Motion between frame 1 and frame 2
            const rDiff01 = Math.abs(frames[0][idx] - frames[1][idx]);
            const gDiff01 = Math.abs(frames[0][idx+1] - frames[1][idx+1]);
            const bDiff01 = Math.abs(frames[0][idx+2] - frames[1][idx+2]);
            
            let hasMotion = rDiff01 > motionThreshold || gDiff01 > motionThreshold || bDiff01 > motionThreshold;
            
            // Motion between frame 2 and frame 3
            if (!hasMotion && frames[2]) {
              const rDiff12 = Math.abs(frames[1][idx] - frames[2][idx]);
              const gDiff12 = Math.abs(frames[1][idx+1] - frames[2][idx+1]);
              const bDiff12 = Math.abs(frames[1][idx+2] - frames[2][idx+2]);
              hasMotion = rDiff12 > motionThreshold || gDiff12 > motionThreshold || bDiff12 > motionThreshold;
            }
            
            if (hasMotion) {
              rowMotionCount++;
              if (x < rowMinX) rowMinX = x;
              if (x > rowMaxX) rowMaxX = x;
            }
          }
          
          // Require at least 5 pixels of motion in a row to count as an active video row (filters static watermarks/noise)
          if (rowMotionCount >= 5) {
            if (maxY === -1) {
              maxY = y; // First active row from the bottom is the bottom ending of the video card
            }
            minY = y; // Keeps updating as we go up, ending at the top starting of the video card
            
            if (rowMinX < minX) minX = rowMinX;
            if (rowMaxX > maxX) maxX = rowMaxX;
          }
        }
        
        // If no motion is detected (e.g. static presentation slides), fall back to basic color scanning
        if (maxY === -1 || minY === -1 || maxX <= minX) {
          fallbackColorCheck();
        } else {
          resolveCropBox(minX, minY, maxX, maxY);
        }
      };
      
      const fallbackColorCheck = () => {
        let minX = canvas.width;
        let maxX = 0;
        let minY = -1;
        let maxY = -1;
        const colorThreshold = 22;
        
        const data = frames[0] || new Uint8ClampedArray(0);
        
        // Scan bottom-up for active color boundaries
        for (let y = canvas.height - 1; y >= 0; y--) {
          let rowColorCount = 0;
          let rowMinX = canvas.width;
          let rowMaxX = 0;
          
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            if (data[idx] > colorThreshold || data[idx+1] > colorThreshold || data[idx+2] > colorThreshold) {
              rowColorCount++;
              if (x < rowMinX) rowMinX = x;
              if (x > rowMaxX) rowMaxX = x;
            }
          }
          
          // Require at least 5 pixels of content to count as a valid row
          if (rowColorCount >= 5) {
            if (maxY === -1) {
              maxY = y; // Bottom boundary
            }
            minY = y; // Top boundary
            
            if (rowMinX < minX) minX = rowMinX;
            if (rowMaxX > maxX) maxX = rowMaxX;
          }
        }
        
        if (maxY === -1 || minY === -1 || maxX <= minX) {
          resolve({ x: 0, y: 0, width, height });
        } else {
          resolveCropBox(minX, minY, maxX, maxY);
        }
      };
      
      const resolveCropBox = (mx: number, my: number, ax: number, ay: number) => {
        const scaleX = width / canvas.width;
        const scaleY = height / canvas.height;
        
        const rx = Math.max(0, Math.floor(mx * scaleX));
        const ry = Math.max(0, Math.floor(my * scaleY));
        const rw = Math.min(width - rx, Math.ceil((ax - mx) * scaleX));
        const rh = Math.min(height - ry, Math.ceil((ay - my) * scaleY));
        
        // Padded boundary to avoid border crop artifacts
        const paddedX = Math.max(0, rx - 4);
        const paddedY = Math.max(0, ry - 4);
        const paddedW = Math.min(width - paddedX, rw + 8);
        const paddedH = Math.min(height - paddedY, rh + 8);
        
        resolve({ x: paddedX, y: paddedY, width: paddedW, height: paddedH });
      };
      
      video.onseeked = captureFrame;
      video.currentTime = seekTimes[0];
    };
    
    video.onerror = () => {
      resolve({ x: 0, y: 0, width: video.videoWidth || 1080, height: video.videoHeight || 1920 });
    };
  });
};

// Client-side OCR Headline text extractor (crops dynamically above the detected video start coordinates)
const extractHeadlineText = async (videoUrl: string, originalWidth: number, originalHeight: number, videoStartSub?: number): Promise<string> => {
  return new Promise(async (resolve) => {
    try {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        // Seek to 1 second where headline is fully displayed and stable
        video.currentTime = Math.min(1.0, video.duration / 2);
        
        video.onseeked = async () => {
          try {
            const canvas = document.createElement('canvas');
            
            // Dynamic crop boundary relative to the detected video starting position
            const videoStart = videoStartSub || Math.round(originalHeight * 0.28);
            
            // Set crop top to minY - 320 (gives ample height for 3 lines of headline text)
            // Clamp top at Math.round(originalHeight * 0.085) [~163px in 1920p] to prevent bleeding into top logo/username area
            const cropTopY = Math.max(Math.round(originalHeight * 0.085), videoStart - Math.round(originalHeight * 0.17));
            
            // Set crop bottom to minY - 30 (leaves 30px padding above the video content to avoid video frame bleeding)
            const cropBottomY = Math.max(0, videoStart - Math.round(originalHeight * 0.02));
            const cropH = Math.max(50, cropBottomY - cropTopY);
            
            const cropX = Math.round(originalWidth * 0.05);
            const cropW = Math.round(originalWidth * 0.90);

            canvas.width = cropW;
            canvas.height = cropH;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve('');
              return;
            }

            // Draw ONLY the headline region to the canvas
            ctx.drawImage(video, cropX, cropTopY, cropW, cropH, 0, 0, cropW, cropH);
            
            // Run Tesseract eng OCR
            const worker = await createWorker('eng');
            const ret = await worker.recognize(canvas);
            await worker.terminate();

            let cleanText = ret.data.text
              .replace(/\r?\n|\r/g, ' ') // replace line breaks with space
              .replace(/\s+/g, ' ') // remove double spaces
              .trim();

            // Discard everything before and including the '@logoname' word (which can be any word starting with '@')
            const atMatch = cleanText.match(/@\S+/);
            if (atMatch) {
              const atIndex = cleanText.indexOf(atMatch[0]);
              cleanText = cleanText.substring(atIndex + atMatch[0].length).trim();
            }
              
            video.remove();
            resolve(cleanText);
          } catch (err) {
            console.error('OCR analysis error:', err);
            video.remove();
            resolve('');
          }
        };
      };

      video.onerror = () => {
        resolve('');
      };
    } catch (e) {
      console.error('Failed to initialize OCR video elements:', e);
      resolve('');
    }
  });
};

export const UploadCard: React.FC = () => {
  const { video, setVideo, updateActiveTemplateValue, setHeadline } = useEditorStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setUploadProgress(10); // initial start indicator
      setThumbnailUrl(null);

      const localUrl = URL.createObjectURL(file);

      // Create a temporary video element to extract duration, resolution, and thumbnail
      const videoEl = document.createElement('video');
      videoEl.src = localUrl;
      videoEl.preload = 'metadata';

      const extractMetadata = (): Promise<{ duration: number; width: number; height: number; thumbnail: string }> => {
        return new Promise((resolve) => {
          videoEl.onloadedmetadata = () => {
            const duration = videoEl.duration;
            const width = videoEl.videoWidth;
            const height = videoEl.videoHeight;

            // Seek to 0.5s to extract thumbnail frame
            videoEl.currentTime = Math.min(0.5, duration / 2);
            videoEl.onseeked = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 320;
              canvas.height = (320 * height) / width;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
              }
              const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              resolve({ duration, width, height, thumbnail: thumbDataUrl });
            };
          };
          videoEl.onerror = () => {
            resolve({ duration: 0, width: 1080, height: 1920, thumbnail: '' });
          };
        });
      };

      try {
        const metadata = await extractMetadata();
        setThumbnailUrl(metadata.thumbnail);
        setUploadProgress(20);

        // Asynchronously trigger crop boundary scanning in background while file is uploading!
        const cropPromise = detectVideoCrop(localUrl);

        // Upload to API
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 50) + 20; // Scale 20-70%
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = async () => {
          setUploadProgress(80);
          const crop = await cropPromise;
          
          // Asynchronously trigger OCR text headline extraction, passing the detected video top boundary (crop.y)!
          toast.loading('Extracting headline text from video...', { id: 'ocr-toast' });
          const extractedHeadline = await extractHeadlineText(localUrl, metadata.width, metadata.height, crop.y);
          toast.dismiss('ocr-toast');

          setUploadProgress(100);
          setIsUploading(false);

          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText);
            if (res.success) {
              setVideo({
                name: file.name,
                size: file.size,
                type: file.type,
                localUrl,
                serverUrl: res.serverUrl,
                duration: metadata.duration,
                width: metadata.width,
                height: metadata.height,
                cropX: crop.x,
                cropY: crop.y,
                cropWidth: crop.width,
                cropHeight: crop.height,
              } as any);

              // Scale the cropped region to the full width of the canvas (1080px)
              const scaleFactor = 1080 / crop.width;
              const scaledHeight = Math.round(crop.height * scaleFactor);

              // Dynamically align active template video parameters to cropped region bounds scaled to full width!
              updateActiveTemplateValue('video', 'cropX', crop.x);
              updateActiveTemplateValue('video', 'cropY', crop.y);
              updateActiveTemplateValue('video', 'cropWidth', crop.width);
              updateActiveTemplateValue('video', 'cropHeight', crop.height);
              updateActiveTemplateValue('video', 'originalWidth', metadata.width);
              updateActiveTemplateValue('video', 'originalHeight', metadata.height);
              
              // Set horizontal position to 0, stretch container width to 1080px, and scale height proportionally
              updateActiveTemplateValue('video', 'x', 0);
              updateActiveTemplateValue('video', 'width', 1080);
              updateActiveTemplateValue('video', 'height', scaledHeight);

              // If OCR successfully extracted headline text, populate the text editor!
              if (extractedHeadline && extractedHeadline.length > 0) {
                setHeadline(extractedHeadline);
                toast.success(`Video uploaded, cropped, and headline extracted!`);
              } else {
                toast.success(`Video uploaded & auto-cropped to content area: ${crop.width}x${crop.height}!`);
              }
            } else {
              toast.error(res.error || 'Failed to process video.');
            }
          } else {
            const res = JSON.parse(xhr.responseText || '{}');
            toast.error(res.error || 'Server error uploading file.');
          }
        };

        xhr.onerror = () => {
          setIsUploading(false);
          toast.error('Network connection error during upload.');
        };

        xhr.send(formData);
      } catch (err: any) {
        console.error('File drop error:', err);
        setIsUploading(false);
        toast.error('Failed to parse video file.');
      }
    },
    [setVideo]
  );

  const removeVideo = () => {
    if (video?.localUrl) {
      URL.revokeObjectURL(video.localUrl);
    }
    setVideo(null);
    setThumbnailUrl(null);

    // Reset template variables to defaults and clear active crop parameters
    updateActiveTemplateValue('video', 'cropX', undefined);
    updateActiveTemplateValue('video', 'cropY', undefined);
    updateActiveTemplateValue('video', 'cropWidth', undefined);
    updateActiveTemplateValue('video', 'cropHeight', undefined);
    updateActiveTemplateValue('video', 'originalWidth', undefined);
    updateActiveTemplateValue('video', 'originalHeight', undefined);
    updateActiveTemplateValue('video', 'width', 1080);
    updateActiveTemplateValue('video', 'height', 620);

    toast.success('Removed reference video & reset layout crops');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500 MB
    accept: {
      'video/*': ['.mp4', '.mov', '.webm'],
    },
  });

  return (
    <div className="w-full">
      {!video && !isUploading ? (
        <div
          {...getRootProps()}
          className={`relative group cursor-pointer flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all min-h-[220px] ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-neutral-800 bg-neutral-900/20 hover:border-neutral-700 hover:bg-neutral-900/40'
          }`}
        >
          <input {...getInputProps()} />
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 group-hover:border-neutral-700 transition-all text-neutral-400 group-hover:text-indigo-400 shadow-inner">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h3 className="mb-1 text-sm font-medium text-white">Upload reference video</h3>
          <p className="mb-2 text-xs text-neutral-400">Drag and drop here, or click to choose file</p>
          <p className="text-[10px] text-neutral-500">MP4, MOV, or WebM up to 500MB</p>
        </div>
      ) : isUploading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/20 p-8 min-h-[220px]">
          <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
            <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
          </div>
          <h3 className="mb-2 text-sm font-medium text-white">Uploading video...</h3>
          
          <div className="w-full max-w-xs bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="mt-2 text-xs text-neutral-400 font-mono">{uploadProgress}% completed</span>
        </div>
      ) : (
        /* Video info card */
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 transition-all hover:bg-neutral-900/45">
          <div className="flex gap-4 items-start">
            {/* Thumbnail */}
            <div className="relative aspect-[9/16] w-20 overflow-hidden rounded-lg bg-neutral-950 border border-neutral-800 flex-shrink-0">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} className="h-full w-full object-cover" alt="Thumbnail" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-600">
                  <Film className="h-6 w-6" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col flex-grow min-w-0">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Ready to render</span>
              </div>
              <h4 className="text-sm font-medium text-white truncate" title={video?.name}>
                {video?.name}
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                {video?.width} × {video?.height} • {formatBytes(video?.size || 0)}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300 font-mono border border-neutral-700/50">
                  {formatDuration(video?.duration || 0)}s
                </span>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300 font-mono border border-neutral-700/50">
                  30 FPS
                </span>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300 font-mono border border-neutral-700/50">
                  {video?.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={removeVideo}
              className="rounded-lg p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all flex-shrink-0"
              title="Delete video"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

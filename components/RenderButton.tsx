'use client';

import React from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export const RenderButton: React.FC = () => {
  const { video, triggerRender, renders } = useEditorStore();

  // Check if there is an active render in the queue
  const activeRender = renders.find(
    (r) => r.status === 'pending' || r.status === 'rendering'
  );
  
  const isRendering = !!activeRender;
  const currentProgress = activeRender ? activeRender.progress : 0;

  const handleRender = async () => {
    if (!video || isRendering) return;
    await triggerRender();
  };

  const getButtonContent = () => {
    if (isRendering) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4.5 w-4.5 animate-spin" />
          <span>Generating Video ({currentProgress}%)</span>
        </span>
      );
    }

    if (!video) {
      return (
        <span className="flex items-center justify-center gap-2">
          <AlertCircle className="h-4.5 w-4.5" />
          <span>Upload reference video first</span>
        </span>
      );
    }

    return (
      <span className="flex items-center justify-center gap-2">
        <Play className="h-4 w-4 fill-white" />
        <span>Generate Final Video</span>
      </span>
    );
  };

  return (
    <div className="w-full">
      <button
        onClick={handleRender}
        disabled={!video || isRendering}
        className={`w-full rounded-xl py-3 px-4 text-sm font-semibold tracking-wide transition-all duration-300 shadow-md ${
          isRendering
            ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed shadow-none'
            : !video
            ? 'bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white hover:shadow-indigo-500/20 active:scale-[0.99] border border-indigo-500/30'
        }`}
      >
        {getButtonContent()}
      </button>
    </div>
  );
};

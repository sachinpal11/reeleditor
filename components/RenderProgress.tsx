'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Film, Clock } from 'lucide-react';
import { RenderTask } from '../types';

interface QueueItemProps {
  task: RenderTask;
}

const QueueItem: React.FC<QueueItemProps> = ({ task }) => {
  const [elapsed, setElapsed] = useState(0);

  // Track elapsed time during active rendering
  useEffect(() => {
    if (task.status !== 'rendering') return;
    
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [task.status]);

  // Calculate estimated time remaining
  const getEtaString = () => {
    if (task.status === 'pending') return 'Waiting in queue...';
    if (task.progress <= 5) return 'Estimating remaining time...';

    const p = task.progress / 100;
    const estimatedTotal = elapsed / p;
    const remaining = Math.max(0, Math.round(estimatedTotal - elapsed));
    
    if (remaining > 60) {
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      return `${min}m ${sec}s remaining`;
    }
    return `${remaining}s remaining`;
  };

  // Reconstruct headline from word styles, with fallback for old versions
  const headlineText = task.words 
    ? task.words.map((w) => w.text).join(' ') 
    : (task as any).headline || 'Untitled Video';

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col gap-3">
      {/* Task Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2.5 items-start min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
            <Film className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate" title={headlineText}>
              {headlineText}
            </h4>
            <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
              File: {task.videoName} • {task.duration}s
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30 flex-shrink-0 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {task.status === 'pending' ? 'Pending' : 'Rendering'}
        </span>
      </div>

      {/* Progress Bar & ETA */}
      <div className="flex flex-col gap-1.5">
        <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${task.progress}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-indigo-400 font-bold">{task.progress}%</span>
          <span className="text-neutral-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getEtaString()}
          </span>
        </div>
      </div>
    </div>
  );
};

interface RenderProgressProps {
  renders: RenderTask[];
}

export const RenderProgress: React.FC<RenderProgressProps> = ({ renders }) => {
  const activeRenders = renders.filter(
    (r) => r.status === 'pending' || r.status === 'rendering'
  );

  if (activeRenders.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Active Renders
      </h3>
      <div className="flex flex-col gap-3">
        {activeRenders.map((task) => (
          <QueueItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

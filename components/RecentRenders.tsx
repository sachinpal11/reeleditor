'use client';

import React, { useState } from 'react';
import { Download, Trash2, Video, AlertCircle, Calendar, Film } from 'lucide-react';
import { RenderTask } from '../types';
import { useEditorStore } from '../store/useEditorStore';
import toast from 'react-hot-toast';

interface RenderCardProps {
  task: RenderTask;
  onDelete: (id: string) => Promise<void>;
}

const RenderCard: React.FC<RenderCardProps> = ({ task, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(task.id);
      toast.success('Render deleted successfully');
    } catch (e) {
      toast.error('Failed to delete render');
    } finally {
      setIsDeleting(false);
    }
  };

  const getThumbnailStyle = () => {
    return {
      background: 'linear-gradient(135deg, #0f0f12 0%, #181424 100%)',
    };
  };

  // Reconstruct headline from word styles, with fallback for old versions
  const headlineText = task.words 
    ? task.words.map((w) => w.text).join(' ') 
    : (task as any).headline || 'Untitled Video';

  return (
    <div className={`group relative flex flex-col justify-between rounded-xl border p-4 bg-neutral-900/10 transition-all ${
      task.status === 'failed' 
        ? 'border-red-950/40 hover:bg-red-500/[0.02]' 
        : 'border-neutral-800 hover:border-neutral-700/80 hover:bg-neutral-900/20'
    }`}>
      {/* Top Section */}
      <div className="flex gap-4">
        {/* Visual Mini Placeholder */}
        <div 
          style={getThumbnailStyle()}
          className="relative aspect-[9/16] w-14 overflow-hidden rounded-lg border border-neutral-800 flex-shrink-0 flex items-center justify-center p-1"
        >
          {task.status === 'failed' ? (
            <AlertCircle className="h-4.5 w-4.5 text-red-500" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <Film className="h-4 w-4 text-indigo-400 opacity-60 mb-1" />
              <span className="text-[6px] text-neutral-400 font-bold line-clamp-3 leading-tight px-0.5">
                {headlineText}
              </span>
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col flex-grow min-w-0">
          <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug" title={headlineText}>
            {headlineText}
          </h4>
          
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[10px] text-neutral-500 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {task.date}
            </span>
            <span>•</span>
            <span>{task.duration}s</span>
          </div>

          {task.status === 'failed' && (
            <div className="mt-2 text-[10px] text-red-400 bg-red-950/20 border border-red-900/30 rounded p-1.5 line-clamp-2 font-sans">
              Error: {task.error || 'Unknown rendering error'}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 mt-4 border-t border-neutral-800/40 pt-3">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all flex-shrink-0"
          title="Delete Render"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {task.status === 'completed' && task.downloadUrl && (
          <a
            href={task.downloadUrl}
            download
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 border border-neutral-800 hover:border-neutral-700/80 hover:bg-neutral-850 transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
        )}
      </div>
    </div>
  );
};

export const RecentRenders: React.FC = () => {
  const { renders, removeRender } = useEditorStore();

  const finishedRenders = renders.filter(
    (r) => r.status === 'completed' || r.status === 'failed'
  );

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/history?id=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      removeRender(id);
    } else {
      throw new Error('Failed to delete render');
    }
  };

  if (finishedRenders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-neutral-500">
        <Video className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
        <p className="text-xs font-medium">No recent renders found</p>
        <p className="text-[10px] text-neutral-600 mt-1">Generated videos will be listed here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Recent Renders ({finishedRenders.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {finishedRenders.map((task) => (
          <RenderCard key={task.id} task={task} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
};

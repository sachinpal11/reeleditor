'use client';

import React, { useEffect } from 'react';
import { UploadCard } from './UploadCard';
import { HeadlineEditor } from './HeadlineEditor';
import { PreviewCanvas } from './PreviewCanvas';
import { RenderButton } from './RenderButton';
import { RenderProgress } from './RenderProgress';
import { RecentRenders } from './RecentRenders';
import { SettingsModal } from './SettingsModal';
import { useEditorStore } from '../store/useEditorStore';

export const Dashboard: React.FC = () => {
  const {
    fetchConfig,
    fetchHistory,
    templates,
    activeTemplateId,
    setActiveTemplateId,
    setIsSettingsOpen,
    renders
  } = useEditorStore();

  // Load configuration and history upon component mounting
  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, [fetchConfig, fetchHistory]);

  return (
    <main className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8 flex-1">
      {/* Top Split Panel (Editor & Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Editor Sidebar (cols = 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Social Video Generator
            </h1>
            <p className="text-xs text-neutral-400">
              Drop your reference video, type a headline, and render your branded video in under 15 seconds.
            </p>
          </div>

          {/* Template Swapping Dropdown Selector */}
          <div className="flex items-center justify-between gap-3 bg-neutral-900/30 border border-neutral-800 rounded-xl p-3.5 mt-0.5">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 font-bold">
                Layout Template Preset
              </span>
              <select
                value={activeTemplateId}
                onChange={(e) => setActiveTemplateId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer mt-1 pr-4 truncate"
              >
                {Object.values(templates).map((t) => (
                  <option key={t.id} value={t.id} className="bg-neutral-950 text-white text-xs">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700/80 px-3 py-1.5 rounded-lg transition-all"
            >
              Configure
            </button>
          </div>

          <UploadCard />
          <HeadlineEditor />
          <RenderButton />
          <RenderProgress renders={renders} />
        </div>

        {/* Right Side: Live Canvas Preview (cols = 7) */}
        <div className="lg:col-span-7 flex justify-center items-start w-full">
          <PreviewCanvas />
        </div>
      </div>

      {/* Bottom Panel: Render History & Queue */}
      <div className="w-full border-t border-neutral-800/80 pt-8 mt-4">
        <RecentRenders />
      </div>

      {/* Slide-out Sidebar Drawer for layout configuration */}
      <SettingsModal />
    </main>
  );
};

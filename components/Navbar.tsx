'use client';

import React from 'react';
import { Sliders, Video, HelpCircle, Activity } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export const Navbar: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, renders } = useEditorStore();
  
  const activeRendersCount = renders.filter(
    (r) => r.status === 'pending' || r.status === 'rendering'
  ).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6 max-w-7xl mx-auto">
        {/* Left Section: Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20">
            <Video className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
            ReelEditor
            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              v1.0
            </span>
          </span>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-4">
          {/* Active rendering indicator */}
          {activeRendersCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-400 border border-indigo-500/20 animate-pulse">
              <Activity className="h-3.5 w-3.5 animate-spin" />
              <span>{activeRendersCount} rendering</span>
            </div>
          )}

          {/* Help button */}
          <button 
            title="Help"
            className="rounded-lg p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <HelpCircle className="h-4.5 w-4.5" />
          </button>

          {/* Vertical divider */}
          <div className="h-4 w-px bg-neutral-800" />

          {/* Settings Toggle Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isSettingsOpen
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Layout Config</span>
          </button>
        </div>
      </div>
    </header>
  );
};

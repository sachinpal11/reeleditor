'use client';

import React, { useEffect, useState } from 'react';
import { X, Save, RotateCcw, Video, AlignLeft, ShieldAlert, Image, Plus, Trash2, Maximize } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import toast from 'react-hot-toast';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    config,
    activeTemplateId,
    templates,
    assets,
    updateActiveTemplateValue,
    updateActiveTemplateRootValue,
    saveAsNewTemplate,
    deleteTemplate,
    fetchAssets,
    saveConfig,
    setConfig
  } = useEditorStore();

  const [newTemplateName, setNewTemplateName] = useState('');

  // Fetch available asset files from public/assets whenever settings panel opens
  useEffect(() => {
    if (isSettingsOpen) {
      fetchAssets();
    }
  }, [isSettingsOpen, fetchAssets]);

  if (!isSettingsOpen) return null;

  const handleSaveActive = async () => {
    try {
      await saveConfig();
      toast.success(`Template "${config.name}" saved successfully to disk!`);
    } catch (e) {
      toast.error('Failed to save template configuration.');
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name.');
      return;
    }
    try {
      await saveAsNewTemplate(newTemplateName);
      toast.success(`Cloned layout to new template: ${newTemplateName}`);
      setNewTemplateName('');
    } catch (e) {
      toast.error('Failed to create new template.');
    }
  };

  const handleDelete = async () => {
    if (activeTemplateId === 'default') {
      toast.error('Cannot delete the default template.');
      return;
    }
    if (confirm(`Are you sure you want to delete the template "${config.name}"?`)) {
      try {
        await deleteTemplate(activeTemplateId);
        toast.success('Template deleted successfully');
      } catch (e) {
        toast.error('Failed to delete template');
      }
    }
  };

  const handleResetDefault = () => {
    if (confirm('Revert active layout to defaults? (Unsaves local edits)')) {
      const defaultConfigPreset = {
        id: activeTemplateId,
        name: config.name,
        layoutMode: 'auto' as const,
        layoutGap: 24,
        backgroundSrc: '/assets/background.png',
        backgroundScale: 1.0,
        header: {
          src: '/assets/header.png',
          x: 0,
          y: 0,
          width: 1080,
          height: 200,
          scale: 1.0
        },
        video: {
          x: 0,
          y: 540,
          width: 1080,
          height: 620
        },
        headline: {
          x: 70,
          y: 165,
          width: 940,
          fontSize: 58,
          lineHeight: 1.2
        },
        watermark: {
          src: '/assets/watermark.png',
          x: 'center',
          bottom: 40,
          width: 55,
          scale: 1.0
        }
      };
      setConfig(defaultConfigPreset);
      toast.success('Reset template to standard presets');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col justify-between transition-all duration-300 animate-slide-in">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/40">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Editing Template</span>
          <span className="text-xs font-bold text-white truncate max-w-[180px]">{config.name}</span>
        </div>
        <button
          onClick={() => setIsSettingsOpen(false)}
          className="rounded p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Inputs List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        
        {/* SECTION 1: Asset Customization (Background, Header, Watermark) */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
            <Image className="h-3.5 w-3.5" />
            Branded Assets
          </h4>
          
          <div className="flex flex-col gap-3.5 text-xs">
            {/* Background Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 font-medium">Background Image</label>
              <select
                value={config.backgroundSrc}
                onChange={(e) => updateActiveTemplateRootValue('backgroundSrc', e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                {assets.map((asset) => (
                  <option key={asset} value={`/assets/${asset}`}>{asset}</option>
                ))}
                {assets.length === 0 && <option value="/assets/background.png">background.png</option>}
              </select>
            </div>

            {/* Header Image Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 font-medium">Header Image</label>
              <select
                value={config.header.src}
                onChange={(e) => updateActiveTemplateValue('header', 'src', e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                {assets.map((asset) => (
                  <option key={asset} value={`/assets/${asset}`}>{asset}</option>
                ))}
                {assets.length === 0 && <option value="/assets/header.png">header.png</option>}
              </select>
            </div>

            {/* Watermark Logo Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 font-medium">Watermark Logo</label>
              <select
                value={config.watermark.src}
                onChange={(e) => updateActiveTemplateValue('watermark', 'src', e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                {assets.map((asset) => (
                  <option key={asset} value={`/assets/${asset}`}>{asset}</option>
                ))}
                {assets.length === 0 && <option value="/assets/watermark.png">watermark.png</option>}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Scaling Customization */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
            <Maximize className="h-3.5 w-3.5" />
            Layer Scales
          </h4>
          
          <div className="flex flex-col gap-3.5 text-xs">
            {/* Background Zoom */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-mono">
                <span className="text-neutral-400">Background Scale</span>
                <span className="text-indigo-400 font-bold">{config.backgroundScale || 1.0}x</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="2.5"
                step="0.05"
                value={config.backgroundScale || 1.0}
                onChange={(e) => updateActiveTemplateRootValue('backgroundScale', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Header Scale */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-mono">
                <span className="text-neutral-400">Header Scale</span>
                <span className="text-indigo-400 font-bold">{config.header.scale || 1.0}x</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="2.0"
                step="0.05"
                value={config.header.scale || 1.0}
                onChange={(e) => updateActiveTemplateValue('header', 'scale', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Watermark Scale */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-mono">
                <span className="text-neutral-400">Watermark Scale</span>
                <span className="text-indigo-400 font-bold">{config.watermark.scale || 1.0}x</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="2.0"
                step="0.05"
                value={config.watermark.scale || 1.0}
                onChange={(e) => updateActiveTemplateValue('watermark', 'scale', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2.5: Flow Alignment Layout */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
            <AlignLeft className="h-3.5 w-3.5" />
            Flow Alignment Layout
          </h4>
          <div className="flex flex-col gap-3.5 text-xs">
            {/* Mode Select */}
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 font-medium">Layout Spacing Mode</label>
              <select
                value={config.layoutMode || 'auto'}
                onChange={(e) => updateActiveTemplateRootValue('layoutMode', e.target.value as 'auto' | 'custom')}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto Stack (Dynamic Flow)</option>
                <option value="custom">Custom Absolute Position</option>
              </select>
            </div>

            {/* Layout Gap (only visible in Auto Mode) */}
            {config.layoutMode === 'auto' && (
              <div className="flex flex-col gap-1 animate-fade-in">
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Layout Vertical Gap</span>
                  <span className="text-indigo-400 font-bold">{config.layoutGap || 24}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="2"
                  value={config.layoutGap || 24}
                  onChange={(e) => updateActiveTemplateRootValue('layoutGap', parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Header Position & Size */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
            <Video className="h-3.5 w-3.5" />
            Header Layout
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Position X (px)</label>
              <input
                type="number"
                value={config.header.x}
                onChange={(e) => updateActiveTemplateValue('header', 'x', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Position Y (px)</label>
              <input
                type="number"
                disabled={config.layoutMode === 'auto'}
                value={config.header.y}
                onChange={(e) => updateActiveTemplateValue('header', 'y', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                title={config.layoutMode === 'auto' ? "Managed automatically by Flow layout" : ""}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Width (px)</label>
              <input
                type="number"
                value={config.header.width}
                onChange={(e) => updateActiveTemplateValue('header', 'width', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Height (px)</label>
              <input
                type="number"
                value={config.header.height}
                onChange={(e) => updateActiveTemplateValue('header', 'height', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Original Inputs (Headline & Video & Watermark Coordinates) */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
            <AlignLeft className="h-3.5 w-3.5" />
            Headline Layout
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Position X (px)</label>
              <input
                type="number"
                value={config.headline.x}
                onChange={(e) => updateActiveTemplateValue('headline', 'x', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Position Y (px)</label>
              <input
                type="number"
                disabled={config.layoutMode === 'auto'}
                value={config.headline.y}
                onChange={(e) => updateActiveTemplateValue('headline', 'y', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                title={config.layoutMode === 'auto' ? "Managed automatically by Flow layout" : ""}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Width (px)</label>
              <input
                type="number"
                value={config.headline.width}
                onChange={(e) => updateActiveTemplateValue('headline', 'width', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Base Font (px)</label>
              <input
                type="number"
                value={config.headline.fontSize}
                onChange={(e) => updateActiveTemplateValue('headline', 'fontSize', parseInt(e.target.value) || 24)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-neutral-400">Line Height</label>
              <input
                type="number"
                step="0.1"
                value={config.headline.lineHeight}
                onChange={(e) => updateActiveTemplateValue('headline', 'lineHeight', parseFloat(e.target.value) || 1.0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
            <Video className="h-3.5 w-3.5" />
            Video Layout
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Position X (px)</label>
              <input
                type="number"
                value={config.video.x}
                onChange={(e) => updateActiveTemplateValue('video', 'x', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Position Y (px)</label>
              <input
                type="number"
                value={config.video.y}
                onChange={(e) => updateActiveTemplateValue('video', 'y', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Width (px)</label>
              <input
                type="number"
                value={config.video.width}
                onChange={(e) => updateActiveTemplateValue('video', 'width', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Height (px)</label>
              <input
                type="number"
                value={config.video.height}
                onChange={(e) => updateActiveTemplateValue('video', 'height', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Watermark Layout
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-neutral-400">Horizontal Align</label>
              <select
                value={config.watermark.x === 'center' ? 'center' : 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  updateActiveTemplateValue('watermark', 'x', val === 'center' ? 'center' : 512);
                }}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="center">Centered (Horizontal)</option>
                <option value="custom">Custom Position</option>
              </select>
            </div>

            {/* Vertical Alignment Option */}
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-neutral-400">Vertical Alignment</label>
              <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => updateActiveTemplateValue('watermark', 'alignToVideo', true)}
                  className={`flex-1 flex items-center justify-center py-1 rounded-md text-[10px] font-semibold transition-all ${
                    config.watermark.alignToVideo !== false
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  On Video Bottom
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveTemplateValue('watermark', 'alignToVideo', false)}
                  className={`flex-1 flex items-center justify-center py-1 rounded-md text-[10px] font-semibold transition-all ${
                    config.watermark.alignToVideo === false
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  On Canvas Bottom
                </button>
              </div>
            </div>
            
            {config.watermark.x !== 'center' && (
              <div className="flex flex-col gap-1 col-span-2 animate-fade-in">
                <label className="text-neutral-400">Position X (px)</label>
                <input
                  type="number"
                  value={typeof config.watermark.x === 'number' ? config.watermark.x : 0}
                  onChange={(e) => updateActiveTemplateValue('watermark', 'x', parseInt(e.target.value) || 0)}
                  className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">
                {config.watermark.alignToVideo !== false ? 'Video Gap (px)' : 'Canvas Gap (px)'}
              </label>
              <input
                type="number"
                value={config.watermark.bottom}
                onChange={(e) => updateActiveTemplateValue('watermark', 'bottom', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                title={config.watermark.alignToVideo !== false ? "Gap offset from bottom of reference video card" : "Gap offset from bottom of reel canvas"}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">Width (px)</label>
              <input
                type="number"
                value={config.watermark.width}
                onChange={(e) => updateActiveTemplateValue('watermark', 'width', parseInt(e.target.value) || 0)}
                className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Opacity Control */}
            <div className="flex flex-col gap-1 col-span-2 mt-2">
              <div className="flex justify-between font-mono">
                <span className="text-neutral-400">Opacity</span>
                <span className="text-indigo-400 font-bold">{Math.round((config.watermark.opacity !== undefined ? config.watermark.opacity : 1.0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={config.watermark.opacity !== undefined ? config.watermark.opacity : 1.0}
                onChange={(e) => updateActiveTemplateValue('watermark', 'opacity', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Save as New Template Cloner */}
        <form onSubmit={handleCreateNew} className="flex flex-col gap-3 border-t border-neutral-800 pt-5">
          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Clone to New Template
          </h4>
          <div className="flex flex-col gap-2 text-xs">
            <input
              type="text"
              placeholder="e.g. My Branded Preset"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="w-full bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-neutral-800 hover:border-neutral-700 py-1.5 rounded text-[11px] font-semibold text-neutral-300 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Template</span>
            </button>
          </div>
        </form>

        {/* SECTION 6: Delete Custom Template */}
        {activeTemplateId !== 'default' && (
          <div className="border-t border-neutral-800 pt-4 flex flex-col gap-2">
            <button
              onClick={handleDelete}
              className="w-full bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/60 text-red-400 py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Template Preset</span>
            </button>
          </div>
        )}

      </div>

      {/* Footer / Actions */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/40 flex items-center justify-between gap-2.5">
        <button
          onClick={handleResetDefault}
          className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
        <button
          onClick={handleSaveActive}
          className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Save active</span>
        </button>
      </div>
    </div>
  );
};

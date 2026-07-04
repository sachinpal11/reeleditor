'use client';

import React, { useState } from 'react';
import { Undo2, Redo2, Type, Sparkles, Bold, Baseline, Check, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { WordStyle } from '../types';
import toast from 'react-hot-toast';

export const HeadlineEditor: React.FC = () => {
  const {
    words,
    headline,
    setHeadline,
    updateWordStyle,
    historyPast,
    historyFuture,
    undo,
    redo
  } = useEditorStore();

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHeadline(e.target.value);
    // Clear selections when text changes
    setSelectedIndices([]);
  };

  const handleWordClick = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const allIndicesSelected = selectedIndices.length === words.length && words.length > 0;

  const handleSelectAll = () => {
    if (allIndicesSelected) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(words.map((_, i) => i));
    }
  };

  // Determine current active styles when multiple words are selected
  const getCommonStyleValue = <K extends keyof WordStyle>(key: K): WordStyle[K] | null => {
    if (selectedIndices.length === 0) return null;

    const firstVal = words[selectedIndices[0]]?.[key];
    const allMatch = selectedIndices.every((idx) => words[idx]?.[key] === firstVal);

    return allMatch ? firstVal : null;
  };

  const activeColor = getCommonStyleValue('color');
  const activeWeight = getCommonStyleValue('weight');
  const activeFont = getCommonStyleValue('font');

  const handleApplyColor = (color: string) => {
    selectedIndices.forEach((idx) => {
      updateWordStyle(idx, { color });
    });
    toast.success(`Applied color to ${selectedIndices.length} words`);
  };

  const handleApplyWeight = (weight: 'bold' | 'regular') => {
    selectedIndices.forEach((idx) => {
      updateWordStyle(idx, { weight });
    });
    toast.success(`Applied weight to ${selectedIndices.length} words`);
  };

  const handleApplyFont = (font: WordStyle['font']) => {
    selectedIndices.forEach((idx) => {
      updateWordStyle(idx, { font });
    });
    toast.success(`Applied font to ${selectedIndices.length} words`);
  };

  const handleResetSelected = () => {
    selectedIndices.forEach((idx) => {
      updateWordStyle(idx, {
        color: '#ffffff',
        weight: 'bold',
        font: 'outfit',
      });
    });
    toast.success(`Reset styling for ${selectedIndices.length} words`);
  };

  const colorPresets = [
    { name: 'White', value: '#ffffff' },
    { name: 'Green', value: '#cefa0d' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Pink', value: '#ec4899' },
  ];

  const wordLimit = 250;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-300">
          <Type className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Headline Editor</h3>
        </div>

        {/* Undo / Redo controls */}
        <div className="flex items-center gap-1 bg-neutral-900/80 rounded-lg p-0.5 border border-neutral-850">
          <button
            onClick={undo}
            disabled={historyPast.length === 0}
            className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-all"
            title="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={historyFuture.length === 0}
            className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-all"
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          value={headline}
          onChange={handleTextChange}
          maxLength={wordLimit}
          rows={3}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900/35 p-3 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
          placeholder="Enter a punchy video headline..."
        />
        <div className="absolute bottom-3 right-3 text-[10px] font-mono text-neutral-500">
          {headline.length} / {wordLimit} chars
        </div>
      </div>

      {/* Interactive Word Selector List */}
      <div className="flex flex-col gap-2 border-t border-neutral-800/60 pt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span className="font-medium">Word Customizer (Select words to style)</span>
          </div>

          {words.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {allIndicesSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {words.length === 0 ? (
          <p className="text-[11px] text-neutral-500 italic">Type a headline to customize typography.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
            {words.map((word, index) => {
              const isSelected = selectedIndices.includes(index);
              const hasCustomStyles = word.color !== '#ffffff' || word.weight !== 'bold' || word.font !== 'outfit';

              let fontBadge = '';
              if (word.font === 'poppins') fontBadge = 'P';
              else if (word.font === 'inter') fontBadge = 'I';
              else if (word.font === 'geist') fontBadge = 'G';

              return (
                <button
                  key={`${word.text}-${index}`}
                  onClick={() => handleWordClick(index)}
                  style={{
                    color: word.color,
                    fontWeight: word.weight === 'bold' ? 700 : 400
                  }}
                  className={`relative rounded-md px-2.5 py-1 text-xs transition-all border ${isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/30'
                      : hasCustomStyles
                        ? 'bg-neutral-900 border-neutral-700/80 hover:bg-neutral-850'
                        : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-neutral-300 hover:bg-neutral-850'
                    }`}
                >
                  <span>{word.text}</span>
                  {fontBadge && (
                    <span className="absolute -top-1 -right-1 bg-indigo-500 text-[7px] text-white rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold">
                      {fontBadge}
                    </span>
                  )}
                  {hasCustomStyles && !fontBadge && (
                    <span className="absolute -top-0.5 -right-0.5 bg-neutral-500 rounded-full w-1 h-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Word Styling Controls Panel */}
      {selectedIndices.length > 0 && (
        <div className="flex flex-col gap-3 bg-neutral-950/60 rounded-xl border border-neutral-800 p-3.5 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Baseline className="h-3.5 w-3.5 text-indigo-400" />
              {selectedIndices.length === 1 ? (
                `Styling: "${words[selectedIndices[0]]?.text}"`
              ) : (
                `Styling: ${selectedIndices.length} Selected Words`
              )}
            </span>
            <button
              onClick={() => setSelectedIndices([])}
              className="text-[10px] font-semibold text-neutral-500 hover:text-white transition-colors"
            >
              Deselect All
            </button>
          </div>

          {/* Color Selector */}
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="text-neutral-400 font-medium">Text Color</span>
            <div className="flex flex-wrap items-center gap-2">
              {colorPresets.map((preset) => {
                const isSelected = activeColor && activeColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleApplyColor(preset.value)}
                    style={{ backgroundColor: preset.value }}
                    className={`h-5 w-5 rounded-full border relative transition-all ${isSelected
                        ? 'border-indigo-500 scale-110 shadow shadow-indigo-500/50'
                        : 'border-neutral-800 hover:scale-105'
                      }`}
                    title={preset.name}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-neutral-900 absolute inset-0 m-auto font-bold stroke-[3]" />
                    )}
                  </button>
                );
              })}

              {/* Custom RGB Color Picker and Hex text input */}
              <div className="flex items-center gap-1.5 border border-neutral-800 rounded-lg p-1 bg-neutral-900/60 ml-1">
                <input
                  type="color"
                  value={activeColor && activeColor.startsWith('#') && activeColor.length === 7 ? activeColor : '#ffffff'}
                  onChange={(e) => handleApplyColor(e.target.value)}
                  className="h-5.5 w-5.5 rounded cursor-pointer border border-neutral-700 bg-transparent"
                  title="Custom RGB Color Picker"
                />
                <input
                  type="text"
                  value={activeColor || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('#') && val.length === 7) {
                      handleApplyColor(val);
                    } else if (!val.startsWith('#') && val.length === 6) {
                      handleApplyColor(`#${val}`);
                    }
                  }}
                  placeholder="#HEX"
                  className="bg-transparent text-white font-mono text-[10px] w-14 outline-none border-none text-center p-0"
                />
              </div>
            </div>
          </div>

          {/* Typography Settings (Weight & Font Family) */}
          <div className="grid grid-cols-2 gap-3.5 text-xs mt-1.5">
            {/* Weight Toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-neutral-400 font-medium">Font Weight</span>
              <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
                <button
                  onClick={() => handleApplyWeight('bold')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-all ${activeWeight === 'bold'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                >
                  <Bold className="h-3 w-3" />
                  <span>Bold</span>
                </button>
                <button
                  onClick={() => handleApplyWeight('regular')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-all ${activeWeight === 'regular'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                >
                  <span>Regular</span>
                </button>
              </div>
            </div>

            {/* Font Family Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-neutral-400 font-medium">Font Family</span>
              <select
                value={activeFont || 'mixed'}
                onChange={(e) => {
                  if (e.target.value !== 'mixed') {
                    handleApplyFont(e.target.value as WordStyle['font']);
                  }
                }}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {!activeFont && <option value="mixed">Mixed Fonts</option>}
                <option value="poppins">Poppins</option>
                <option value="outfit">Outfit</option>
                <option value="inter">Inter</option>
                <option value="geist">Geist</option>
              </select>
            </div>
          </div>

          {/* Reset selected button */}
          <button
            onClick={handleResetSelected}
            className="w-full text-center text-[10px] text-neutral-500 hover:text-neutral-300 font-semibold py-1 border border-dashed border-neutral-850 hover:border-neutral-700 rounded-lg mt-1 transition-all flex items-center justify-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset Styles for Selected</span>
          </button>
        </div>
      )}
    </div>
  );
};

import { create } from 'zustand';
import { Template, UploadedVideo, RenderTask, WordStyle } from '../types';

interface EditorState {
  // Content State
  words: WordStyle[];
  headline: string; // derived helper for simple string inputs
  video: UploadedVideo | null;
  
  // Templates Config
  templates: Record<string, Template>;
  activeTemplateId: string;
  config: Template; // Active template helper for backward compatibility
  assets: string[]; // List of files in public/assets

  // App/UI States
  previewZoom: number; // percentage (e.g. 35)
  isSettingsOpen: boolean;
  renders: RenderTask[];
  
  // Undo/Redo Stacks
  historyPast: WordStyle[][];
  historyFuture: WordStyle[][];

  // Actions
  setHeadline: (text: string) => void;
  updateWordStyle: (index: number, updates: Partial<WordStyle>) => void;
  setVideo: (video: UploadedVideo | null) => void;
  
  // Template Actions
  setActiveTemplateId: (id: string) => void;
  setConfig: (config: Template) => void; // override active template
  updateActiveTemplateValue: <K extends 'header' | 'video' | 'headline' | 'watermark', S extends keyof Template[K]>(
    section: K,
    key: S,
    value: Template[K][S]
  ) => void;
  updateActiveTemplateRootValue: <K extends 'backgroundSrc' | 'backgroundScale' | 'layoutMode' | 'layoutGap'>(
    key: K,
    value: Template[K]
  ) => void;
  saveAsNewTemplate: (name: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  fetchAssets: () => Promise<void>;
  
  setPreviewZoom: (zoom: number) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setRenders: (renders: RenderTask[]) => void;
  addRender: (task: RenderTask) => void;
  updateRender: (id: string, updates: Partial<RenderTask>) => void;
  removeRender: (id: string) => void;
  
  // Undo/Redo Actions
  undo: () => void;
  redo: () => void;
  
  // API Sync Actions
  fetchConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  triggerRender: () => Promise<void>;
}

// Diff-based syncer that maintains word styles when the string text is edited
function syncWordsWithText(newText: string, oldWords: WordStyle[]): WordStyle[] {
  const tokens = newText.split(/\s+/).filter((t) => t.length > 0);
  
  return tokens.map((token, i) => {
    // 1. If the token is at the exact same index and matches, keep the style
    const existing = oldWords[i];
    if (existing && existing.text.toLowerCase().trim() === token.toLowerCase().trim()) {
      return {
        ...existing,
        text: token // keep new casing/punctuation
      };
    }
    
    // 2. If it moved, check if the token exists anywhere else in the old list to copy its style
    const matching = oldWords.find((w) => w.text.toLowerCase().trim() === token.toLowerCase().trim());
    if (matching) {
      return {
        ...matching,
        text: token
      };
    }
    
    // 3. Fallback to default style
    return {
      text: token,
      color: '#ffffff',
      weight: 'bold',
      font: 'outfit'
    };
  });
}

// Default presets
const defaultPresetTemplate: Template = {
  id: 'default',
  name: 'Default Tech Layout',
  layoutMode: 'auto',
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
    bottom: 24, // 24px offset by default
    width: 55,
    scale: 1.0,
    opacity: 1.0,
    alignToVideo: true // align relative to video bottom by default
  }
};

const initialText = 'Two students built a $30 car filter that converts exhaust pollution into oxygen using algae';
const initialWords: WordStyle[] = initialText.split(/\s+/).map((word) => {
  const cleanWord = word.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
  const isHighlight = cleanWord === 'oxygen' || cleanWord === 'algae';
  return {
    text: word,
    color: isHighlight ? '#22c55e' : '#ffffff', // green for highlight words by default
    weight: 'bold',
    font: 'outfit'
  };
});

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial States
  words: initialWords,
  headline: initialText,
  video: null,
  templates: { default: defaultPresetTemplate },
  activeTemplateId: 'default',
  config: defaultPresetTemplate,
  assets: [],
  previewZoom: 35,
  isSettingsOpen: false,
  renders: [],
  historyPast: [],
  historyFuture: [],

  // Set Headline Text and Sync Word Objects
  setHeadline: (newText) => {
    const currentWords = get().words;
    const newWords = syncWordsWithText(newText, currentWords);
    
    // Check if the resulting headline string actually changed to prevent redundant commits
    const newHeadline = newWords.map(w => w.text).join(' ');
    if (get().headline === newHeadline) return;

    set((state) => ({
      historyPast: [...state.historyPast, currentWords],
      historyFuture: [],
      words: newWords,
      headline: newHeadline
    }));
  },

  // Edit specific word styling properties
  updateWordStyle: (index, updates) => {
    set((state) => {
      const currentWords = state.words;
      const updatedWords = currentWords.map((w, idx) => 
        idx === index ? { ...w, ...updates } : w
      );
      return {
        historyPast: [...state.historyPast, currentWords],
        historyFuture: [],
        words: updatedWords,
        headline: updatedWords.map(w => w.text).join(' ')
      };
    });
  },

  setVideo: (video) => set({ video }),
  
  // Select active template preset
  setActiveTemplateId: (id) => {
    set((state) => {
      const active = state.templates[id] || state.templates['default'];
      return {
        activeTemplateId: id,
        config: active
      };
    });
  },
  
  setConfig: (config) => {
    set((state) => ({
      config,
      templates: {
        ...state.templates,
        [state.activeTemplateId]: config
      }
    }));
  },
  
  // Update nested section properties
  updateActiveTemplateValue: (section, key, value) => {
    set((state) => {
      const activeTemplate = state.templates[state.activeTemplateId];
      if (!activeTemplate) return {};

      const updatedTemplate = {
        ...activeTemplate,
        [section]: {
          ...activeTemplate[section],
          [key]: value
        }
      };

      return {
        templates: {
          ...state.templates,
          [state.activeTemplateId]: updatedTemplate
        },
        config: updatedTemplate
      };
    });
  },

  // Update root-level template properties (e.g. backgroundScale)
  updateActiveTemplateRootValue: (key, value) => {
    set((state) => {
      const activeTemplate = state.templates[state.activeTemplateId];
      if (!activeTemplate) return {};

      const updatedTemplate = {
        ...activeTemplate,
        [key]: value
      };

      return {
        templates: {
          ...state.templates,
          [state.activeTemplateId]: updatedTemplate
        },
        config: updatedTemplate
      };
    });
  },

  // Clone active template as a new template
  saveAsNewTemplate: async (name) => {
    const id = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (!id) return;
    
    set((state) => {
      const activeTemplate = state.templates[state.activeTemplateId];
      const newTemplate: Template = {
        ...activeTemplate,
        id,
        name
      };
      
      const updatedTemplates = {
        ...state.templates,
        [id]: newTemplate
      };

      return {
        templates: updatedTemplates,
        activeTemplateId: id,
        config: newTemplate
      };
    });

    await get().saveConfig();
  },

  // Delete custom template
  deleteTemplate: async (id) => {
    if (id === 'default') return;

    set((state) => {
      const newTemplates = { ...state.templates };
      delete newTemplates[id];

      let nextActiveId = state.activeTemplateId;
      if (nextActiveId === id) {
        nextActiveId = 'default';
      }

      return {
        templates: newTemplates,
        activeTemplateId: nextActiveId,
        config: newTemplates[nextActiveId]
      };
    });

    await get().saveConfig();
  },

  // Fetch available asset files from server
  fetchAssets: async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        set({ assets: data });
      }
    } catch (e) {
      console.error('Error fetching assets list:', e);
    }
  },

  setPreviewZoom: (previewZoom) => set({ previewZoom }),
  
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  
  setRenders: (renders) => set({ renders }),

  addRender: (task) => set((state) => ({ renders: [task, ...state.renders] })),

  updateRender: (id, updates) =>
    set((state) => ({
      renders: state.renders.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    })),

  removeRender: (id) =>
    set((state) => ({
      renders: state.renders.filter((task) => task.id !== id),
    })),

  // Undo/Redo Engine
  undo: () => {
    const { historyPast, words } = get();
    if (historyPast.length === 0) return;
    
    const previous = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, -1);
    
    set((state) => ({
      historyPast: newPast,
      historyFuture: [words, ...state.historyFuture],
      words: previous,
      headline: previous.map(w => w.text).join(' ')
    }));
  },

  redo: () => {
    const { historyFuture, words } = get();
    if (historyFuture.length === 0) return;
    
    const next = historyFuture[0];
    const newFuture = historyFuture.slice(1);
    
    set((state) => ({
      historyPast: [...state.historyPast, words],
      historyFuture: newFuture,
      words: next,
      headline: next.map(w => w.text).join(' ')
    }));
  },

  // API Async Calls
  fetchConfig: async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        const activeId = data.activeTemplateId || 'default';
        set({
          templates: data.templates,
          activeTemplateId: activeId,
          config: data.templates[activeId] || data.templates['default']
        });
      }
    } catch (err) {
      console.error('Error fetching templates config:', err);
    }
  },

  saveConfig: async () => {
    try {
      const { templates, activeTemplateId } = get();
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates, activeTemplateId }),
      });
    } catch (err) {
      console.error('Error saving templates database:', err);
    }
  },

  fetchHistory: async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        set({ renders: data });
      }
    } catch (err) {
      console.error('Error fetching render history:', err);
    }
  },

  triggerRender: async () => {
    const { video, words, config } = get();
    if (!video || !video.serverUrl) return;

    const renderId = Math.random().toString(36).substring(2, 11);
    const newTask: RenderTask = {
      id: renderId,
      words,
      videoName: video.name,
      videoUrl: video.serverUrl,
      duration: video.duration,
      status: 'pending',
      progress: 0,
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    get().addRender(newTask);

    try {
      get().updateRender(renderId, { status: 'rendering', progress: 5 });

      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: renderId,
          videoPath: video.serverUrl,
          words, // Sends the styled word objects
          config, // Sends the active Template structure
          duration: video.duration
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start render stream');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream from API');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.replace(/^data:\s*/, '').trim();
          if (!cleanLine) continue;

          try {
            const data = JSON.parse(cleanLine);
            if (data.status === 'rendering') {
              get().updateRender(renderId, { progress: Math.min(Math.round(data.progress * 100), 99) });
            } else if (data.status === 'completed') {
              get().updateRender(renderId, {
                status: 'completed',
                progress: 100,
                downloadUrl: data.url
              });
              get().fetchHistory();
            } else if (data.status === 'failed') {
              get().updateRender(renderId, {
                status: 'failed',
                error: data.error || 'Rendering failed'
              });
            }
          } catch (e) {
            console.error('Failed to parse stream line:', cleanLine, e);
          }
        }
      }
    } catch (err: any) {
      console.error('Render trigger failed:', err);
      get().updateRender(renderId, {
        status: 'failed',
        error: err.message || 'Network error occurred during rendering'
      });
    }
  }
}));

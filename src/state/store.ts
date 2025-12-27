import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { produce } from 'immer';
import { KeyModel, ProjectModel, PaperSettings, KeyElement, KeyboardLayout } from '../types';
import { paperSizeMm } from '../utils/units';
import { createKey, DEFAULT_KEY_GAP, DEFAULT_KEY_SIZE } from '../utils/keys';
import {
  buildCheapinoTemplate,
  buildGridTemplate,
  buildAnsi104Template,
  buildIso105Template,
  buildAnsi60Template,
  buildIso60Template
} from '../utils/importers';

interface HistoryState {
  past: ProjectModel[];
  future: ProjectModel[];
}

interface EditorState {
  project: ProjectModel;
  history: HistoryState;
  selectedKeys: string[];
  zoom: number;
  snapToGrid: boolean;
  gridSize: number;
  setProject: (project: ProjectModel) => void;
  updatePaper: (paper: Partial<PaperSettings>) => void;
  addKey: (key?: Partial<KeyModel>) => void;
  updateKey: (id: string, patch: Partial<KeyModel>) => void;
  setSelectedKeys: (ids: string[]) => void;
  addElementToKey: (keyId: string, el: KeyElement) => void;
  updateElement: (keyId: string, elId: string, patch: Partial<KeyElement>) => void;
  removeElement: (keyId: string, elId: string) => void;
  removeSelected: () => void;
  moveSelectedKeys: (positions: { id: string; x: number; y: number }[]) => void;
  duplicateRow: (offsetMm: number) => void;
  duplicateColumn: (offsetMm: number) => void;
  applyTemplate: (rows: number, cols: number, keySize?: number, gap?: number) => void;
  applyCheapinoTemplate: () => void;
  applyAnsi104: () => void;
  applyIso105: () => void;
  applyAnsi60: () => void;
  applyIso60: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
  swapSelected: () => void;
  undo: () => void;
  redo: () => void;
}

function blankLayout(name = 'New Layout'): KeyboardLayout {
  return {
    id: nanoid(),
    name,
    keys: []
  };
}

function defaultProject(): ProjectModel {
  return {
    id: nanoid(),
    name: 'Keyboarder',
    paper: {
      size: 'A4',
      orientation: 'portrait',
      marginMm: 6,
      dpi: 300
    },
    layout: blankLayout('Macro Pad'),
    updatedAt: new Date().toISOString()
  };
}

function withHistory(set: any, get: any, updater: (draft: ProjectModel) => void) {
  set((state: EditorState) => {
    const snapshot = JSON.parse(JSON.stringify(state.project)) as ProjectModel;
    const next = produce(state.project, updater);
    return {
      project: next,
      history: {
        past: [...state.history.past.slice(-30), snapshot],
        future: []
      }
    };
  });
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: defaultProject(),
  history: { past: [], future: [] },
  selectedKeys: [],
  zoom: 1,
  snapToGrid: true,
  gridSize: 2,
  setProject: (project) =>
    set({
      project,
      history: { past: [], future: [] },
      snapToGrid: project.paper?.snap?.enabled ?? true,
      gridSize: project.paper?.snap?.mm ?? 2
    }),
  updatePaper: (paper) =>
    withHistory(set, get, (draft) => {
      draft.paper = { ...draft.paper, ...paper };
      if (!draft.paper.snap) draft.paper.snap = { enabled: get().snapToGrid, mm: get().gridSize };
      if (paper.snap) {
        if (typeof paper.snap.enabled === 'boolean') get().snapToGrid = paper.snap.enabled;
        if (typeof paper.snap.mm === 'number') get().gridSize = paper.snap.mm;
      }
      draft.updatedAt = new Date().toISOString();
    }),
  addKey: (key = {}) =>
    withHistory(set, get, (draft) => {
      const width = key.width ?? DEFAULT_KEY_SIZE;
      const height = key.height ?? DEFAULT_KEY_SIZE;
      const gap = DEFAULT_KEY_GAP;
      const keys = draft.layout.keys;

      const collides = (x: number, y: number) =>
        keys.some((k) => {
          const buffer = gap;
          return !(
            x + width + buffer <= k.x ||
            k.x + k.width + buffer <= x ||
            y + height + buffer <= k.y ||
            k.y + k.height + buffer <= y
          );
        });

      let placeX = 0;
      let placeY = 0;
      const stepX = width + gap;
      const stepY = height + gap;
      const maxX = 800;
      const maxY = 800;
      let found = false;
      for (let y = 0; y < maxY && !found; y += stepY) {
        for (let x = 0; x < maxX; x += stepX) {
          if (!collides(x, y)) {
            placeX = x;
            placeY = y;
            found = true;
            break;
          }
        }
      }

      draft.layout.keys.push(
        createKey({
          ...key,
          x: placeX,
          y: placeY,
          width,
          height
        })
      );
      draft.updatedAt = new Date().toISOString();
    }),
  updateKey: (id, patch) =>
    withHistory(set, get, (draft) => {
      const key = draft.layout.keys.find((k) => k.id === id);
      if (key) {
        Object.assign(key, patch);
        draft.updatedAt = new Date().toISOString();
      }
    }),
  setSelectedKeys: (ids) => set({ selectedKeys: ids }),
  addElementToKey: (keyId, el) =>
    withHistory(set, get, (draft) => {
      const key = draft.layout.keys.find((k) => k.id === keyId);
      if (key) {
        key.elements.push(el);
        draft.updatedAt = new Date().toISOString();
      }
    }),
  updateElement: (keyId, elId, patch) =>
    withHistory(set, get, (draft) => {
      const key = draft.layout.keys.find((k) => k.id === keyId);
      if (!key) return;
      const el = key.elements.find((e) => e.id === elId);
      if (el) Object.assign(el, patch);
      draft.updatedAt = new Date().toISOString();
    }),
  removeElement: (keyId, elId) =>
    withHistory(set, get, (draft) => {
      const key = draft.layout.keys.find((k) => k.id === keyId);
      if (!key) return;
      key.elements = key.elements.filter((e) => e.id !== elId);
      draft.updatedAt = new Date().toISOString();
    }),
  removeSelected: () =>
    withHistory(set, get, (draft) => {
      draft.layout.keys = draft.layout.keys.filter((k) => !get().selectedKeys.includes(k.id));
      draft.updatedAt = new Date().toISOString();
      get().setSelectedKeys([]);
    }),
  moveSelectedKeys: (positions) =>
    withHistory(set, get, (draft) => {
      positions.forEach((pos) => {
        const key = draft.layout.keys.find((k) => k.id === pos.id);
        if (key) {
          key.x = pos.x;
          key.y = pos.y;
        }
      });
      draft.updatedAt = new Date().toISOString();
    }),
  duplicateRow: (offsetMm) =>
    withHistory(set, get, (draft) => {
      const keys = draft.layout.keys.filter((k) => get().selectedKeys.includes(k.id));
      keys.forEach((k) => {
        draft.layout.keys.push({ ...k, id: nanoid(), y: k.y + offsetMm });
      });
      draft.updatedAt = new Date().toISOString();
    }),
  duplicateColumn: (offsetMm) =>
    withHistory(set, get, (draft) => {
      const keys = draft.layout.keys.filter((k) => get().selectedKeys.includes(k.id));
      keys.forEach((k) => {
        draft.layout.keys.push({ ...k, id: nanoid(), x: k.x + offsetMm });
      });
      draft.updatedAt = new Date().toISOString();
    }),
  applyTemplate: (rows, cols, keySize = DEFAULT_KEY_SIZE, gap = DEFAULT_KEY_GAP) =>
    withHistory(set, get, (draft) => {
      draft.layout.keys = buildGridTemplate(rows, cols, keySize, gap);
      draft.layout.name = `${rows}x${cols} grid`;
      draft.updatedAt = new Date().toISOString();
    }),
  applyAnsi104: () =>
    withHistory(set, get, (draft) => {
      draft.layout.keys = buildAnsi104Template();
      draft.layout.name = 'ANSI 104';
      draft.paper.size = draft.paper.size === 'A4' ? 'A3' : draft.paper.size;
      draft.paper.orientation = 'landscape';
      draft.updatedAt = new Date().toISOString();
    }),
  applyIso105: () =>
    withHistory(set, get, (draft) => {
      draft.layout.keys = buildIso105Template();
      draft.layout.name = 'ISO 105';
      draft.paper.size = draft.paper.size === 'A4' ? 'A3' : draft.paper.size;
      draft.paper.orientation = 'landscape';
      draft.updatedAt = new Date().toISOString();
    }),
  applyAnsi60: () =>
    withHistory(set, get, (draft) => {
      draft.layout.keys = buildAnsi60Template();
      draft.layout.name = 'ANSI 60%';
      draft.paper.orientation = 'landscape';
      draft.updatedAt = new Date().toISOString();
    }),
  applyIso60: () =>
    withHistory(set, get, (draft) => {
      draft.layout.keys = buildIso60Template();
      draft.layout.name = 'ISO 60%';
      draft.paper.orientation = 'landscape';
      draft.updatedAt = new Date().toISOString();
    }),
  applyCheapinoTemplate: () => {
    withHistory(set, get, (draft) => {
      // Force paper settings to the Miryoku sample defaults
      draft.paper.size = 'A4';
      draft.paper.orientation = 'landscape';
      draft.paper.marginMm = 6;
      if (!draft.paper.snap) draft.paper.snap = { enabled: true, mm: 1 };
      draft.paper.snap.mm = 1;
      draft.paper.snap.enabled = true;
      const { width } = paperSizeMm(draft.paper.size, draft.paper.orientation);
      draft.layout.keys = buildCheapinoTemplate(DEFAULT_KEY_SIZE, width);
      draft.layout.name = 'Cheapino / Miryoku';
      draft.updatedAt = new Date().toISOString();
    });
    // Also sync UI snap controls to the template default
    set({ snapToGrid: true, gridSize: 1 });
  },
  nudgeSelected: (dx, dy) =>
    withHistory(set, get, (draft) => {
      const snap = get().snapToGrid ? get().gridSize : 0;
      draft.layout.keys.forEach((k) => {
        if (get().selectedKeys.includes(k.id)) {
          let nextX = k.x + dx;
          let nextY = k.y + dy;
          if (snap) {
            nextX = Math.round(nextX / snap) * snap;
            nextY = Math.round(nextY / snap) * snap;
          }
          k.x = nextX;
          k.y = nextY;
        }
      });
      draft.updatedAt = new Date().toISOString();
    }),
  swapSelected: () =>
    withHistory(set, get, (draft) => {
      const [aId, bId] = get().selectedKeys;
      if (!aId || !bId) return;
      const a = draft.layout.keys.find((k) => k.id === aId);
      const b = draft.layout.keys.find((k) => k.id === bId);
      if (!a || !b) return;
      const posA = { x: a.x, y: a.y };
      a.x = b.x;
      a.y = b.y;
      b.x = posA.x;
      b.y = posA.y;
      draft.updatedAt = new Date().toISOString();
    }),
  undo: () => {
    const { history, project } = get();
    const previous = history.past[history.past.length - 1];
    if (!previous) return;
    set({
      project: previous,
      history: {
        past: history.past.slice(0, -1),
        future: [project, ...history.future].slice(0, 30)
      }
    });
  },
  redo: () => {
    const { history, project } = get();
    const next = history.future[0];
    if (!next) return;
    set({
      project: next,
      history: {
        past: [...history.past, project].slice(-30),
        future: history.future.slice(1)
      }
    });
  }
}));

function slotAlign(slot?: string) {
  switch (slot) {
    case 'top-left':
      return { alignX: 'left', alignY: 'top', align: 'left' as const };
    case 'top-center':
      return { alignX: 'center', alignY: 'top', align: 'center' as const };
    case 'top-right':
      return { alignX: 'right', alignY: 'top', align: 'right' as const };
    case 'middle-left':
      return { alignX: 'left', alignY: 'middle', align: 'left' as const };
    case 'middle-center':
      return { alignX: 'center', alignY: 'middle', align: 'center' as const };
    case 'middle-right':
      return { alignX: 'right', alignY: 'middle', align: 'right' as const };
    case 'bottom-left':
      return { alignX: 'left', alignY: 'bottom', align: 'left' as const };
    case 'bottom-center':
      return { alignX: 'center', alignY: 'bottom', align: 'center' as const };
    case 'bottom-right':
      return { alignX: 'right', alignY: 'bottom', align: 'right' as const };
    default:
      return { alignX: 'center', alignY: 'middle', align: 'center' as const };
  }
}

export function createTextElement(text = 'Label', slot?: string): KeyElement {
  const alignInfo = slotAlign(slot);
  return {
    id: nanoid(),
    type: 'text',
    text,
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: 600,
    color: '#f8fafc',
    x: 0,
    y: 0,
    width: DEFAULT_KEY_SIZE,
    height: DEFAULT_KEY_SIZE,
    align: alignInfo.align,
    alignX: alignInfo.alignX,
    alignY: alignInfo.alignY,
    padding: 2,
    zIndex: 2,
    slot
  } as KeyElement;
}

export function createShapeElement(color = '#243142'): KeyElement {
  return {
    id: nanoid(),
    type: 'shape',
    background: color,
    x: 0,
    y: 0,
    width: DEFAULT_KEY_SIZE,
    height: DEFAULT_KEY_SIZE,
    cornerRadius: 2,
    zIndex: 0
  } as KeyElement;
}

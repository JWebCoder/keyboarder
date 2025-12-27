import React, { useEffect, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { Inspector } from './components/Inspector';
import { Sidebar } from './components/Sidebar';
import { useEditorStore } from './state/store';
import { exportProjectToPdf, exportProjectToSvg } from './utils/exporters';
import { paperSizeMm } from './utils/units';

async function download(bytes: Uint8Array | string, filename: string, type: string) {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  if (isTauri) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs')
    ]);
    const chosenPath = await save({
      defaultPath: filename,
      filters: [{ name: type.includes('pdf') ? 'PDF' : type.includes('svg') ? 'SVG' : 'File', extensions: [filename.split('.').pop() || 'dat'] }]
    });
    if (!chosenPath) return;
    const payload = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
    await writeFile(chosenPath, payload);
    return;
  }

  const blobPart: BlobPart = typeof bytes === 'string' ? bytes : new Uint8Array(bytes);
  const blob = new Blob([blobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function toDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

async function embedImages(project: any) {
  const clone = structuredClone(project);
  const tasks: Promise<void>[] = [];
  clone.layout?.keys?.forEach((key: any) => {
    key.elements?.forEach((el: any) => {
      if (el.type === 'image' && el.dataUrl && !el.dataUrl.startsWith('data:')) {
        tasks.push(
          (async () => {
            const data = await toDataUrl(el.dataUrl);
            if (data) el.dataUrl = data;
          })()
        );
      }
    });
  });
  await Promise.all(tasks);
  return clone;
}

function buildCutProject(project: any, gap = 0.3) {
  const clone = structuredClone(project);
  const { width } = paperSizeMm(project.paper.size, project.paper.orientation || 'portrait');
  const margin = project.paper.marginMm;
  const usableWidth = width - margin * 2;
  const sorted = [...project.layout.keys].sort((a, b) => a.y - b.y || a.x - b.x);
  if (!sorted.length) return clone;
  const maxW = Math.max(...sorted.map((k) => k.width));
  const maxH = Math.max(...sorted.map((k) => k.height));
  const perRow = Math.max(1, Math.floor((usableWidth + gap) / (maxW + gap)));
  const arranged = sorted.map((key, idx) => {
    const row = Math.floor(idx / perRow);
    const col = idx % perRow;
    return {
      ...key,
      x: margin + col * (maxW + gap),
      y: margin + row * (maxH + gap),
      rotation: 0
    };
  });
  clone.layout.keys = arranged;
  clone.layout.name = `${project.layout.name || 'Layout'} (cut sheet)`;
  return clone;
}

export default function App() {
  const storageKey = 'keyboarder-project';
  const {
    project,
    selectedKeys,
    removeSelected,
    undo,
    redo,
    nudgeSelected,
    zoom,
    snapToGrid,
    gridSize,
    setSelectedKeys,
    setProject,
    swapSelected
  } = useEditorStore();
  const [zoomValue, setZoomValue] = useState(1);
  const [includeRuler, setIncludeRuler] = useState(false);
  const [viewMode, setViewMode] = useState<'layout' | 'cut'>('layout');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => setZoomValue(zoom), [zoom]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        useEditorStore.setState({ project: JSON.parse(saved) });
      } catch (err) {
        console.error('Failed to load autosave', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable);
      if (isFormField) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedKeys.length) removeSelected();
      }
      const step = snapToGrid ? gridSize : 1;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') nudgeSelected(0, -step);
        if (e.key === 'ArrowDown') nudgeSelected(0, step);
        if (e.key === 'ArrowLeft') nudgeSelected(-step, 0);
        if (e.key === 'ArrowRight') nudgeSelected(step, 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKeys, removeSelected, redo, undo, nudgeSelected]);

  const handleExportPdf = async () => {
    const toExport = viewMode === 'cut' ? buildCutProject(project) : project;
    const bytes = await exportProjectToPdf(toExport, includeRuler);
    await download(bytes, `${project.name || 'layout'}.pdf`, 'application/pdf');
  };

  const handleExportSvg = async () => {
    const toExport = viewMode === 'cut' ? buildCutProject(project) : project;
    const svg = exportProjectToSvg(toExport);
    await download(svg, `${project.name || 'layout'}.svg`, 'image/svg+xml');
  };

  const saveProject = async () => {
    const snapshot = await embedImages(project);
    await download(JSON.stringify(snapshot, null, 2), `${project.name || 'layout'}.json`, 'application/json');
  };

  const loadProject = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    evt.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        setProject(parsed);
        setSelectedKeys([]);
      } catch (err) {
        console.error('Invalid project file', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <header className="app-header">
        <div className="toolbar">
          <button onClick={saveProject}>Save project</button>
          <button onClick={() => document.getElementById('load-project-input')?.click()}>Load project</button>
          <input
            id="load-project-input"
            type="file"
            style={{ display: 'none' }}
            accept="application/json"
            onChange={loadProject}
          />
          <button onClick={handleExportPdf}>Export PDF</button>
          <button onClick={handleExportSvg}>Export SVG</button>
          <label className="badge" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeRuler}
              onChange={(e) => setIncludeRuler(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span style={{ lineHeight: 1 }}>50mm test bar</span>
          </label>
          <button
            className="button-ghost"
            onClick={() => setViewMode(viewMode === 'layout' ? 'cut' : 'layout')}
          >
            {viewMode === 'layout' ? 'Cut sheet view' : 'Layout view'}
          </button>
          <button
            className="button-ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="button-ghost" onClick={() => setShowHelp(true)}>
            Help
          </button>
        </div>
      </header>
      <div className="canvas-area">
        <div className="canvas-controls">
          <span>Zoom</span>
          <input
            className="small-input"
            type="range"
            min={0.4}
            max={2}
            step={0.1}
            value={zoomValue}
            onChange={(e) => {
              const value = Number(e.target.value);
              setZoomValue(value);
              useEditorStore.setState({ zoom: value });
            }}
          />
          <span>{(zoomValue * 100).toFixed(0)}%</span>
          <label className="badge" style={{ marginLeft: 12 }}>
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => useEditorStore.setState({ snapToGrid: e.target.checked })}
            />
            Snap {gridSize}mm
          </label>
          <input
            className="small-input"
            type="number"
            value={gridSize}
            min={1}
            max={10}
            onChange={(e) => useEditorStore.setState({ gridSize: Number(e.target.value) })}
          />
        </div>
        <CanvasStage viewMode={viewMode} theme={theme} />
      </div>
      <div className="inspector">
        <Inspector />
      </div>
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>How to use Keyboarder</h2>
              <button className="button-ghost" onClick={() => setShowHelp(false)}>
                Close
              </button>
            </div>
            <div className="modal-grid">
              <div>
                <h3>Basics</h3>
                <ul>
                  <li>Click a key to select it; use Shift/Ctrl/Cmd to multi-select.</li>
                  <li>Drag on empty canvas to draw a selection box; hold Ctrl/Cmd to add to an existing selection.</li>
                  <li>Arrow keys nudge selections; snap amount follows the grid step when snap is on.</li>
                  <li>Drag selected keys to move; only selected keys move.</li>
                  <li>Delete/Backspace removes selected keys.</li>
                </ul>
              </div>
              <div>
                <h3>Editing keys</h3>
                <ul>
                  <li>Inspector shows size (mm), padding, radius, background, and elements for the selection.</li>
                  <li>Text: 9 slots (top/center/bottom, left/center/right) with individual font size, weight, and color.</li>
                  <li>Images: upload, choose fit (contain/cover), align, opacity; drag & drop onto a key works.</li>
                  <li>Shapes: add/remove a background shape layer and adjust its size/radius/color.</li>
                  <li>Swap selected: pick two keys and swap their positions/content via the sidebar control.</li>
                </ul>
              </div>
              <div>
                <h3>Views & layout</h3>
                <ul>
                  <li>Layout view shows the real keyboard geometry.</li>
                  <li>Cut sheet view lines keys in rows with a small gap for bulk cutting; exports respect the current view.</li>
                  <li>Snap to grid applies to drag and arrow nudges; toggle and set grid size in the sidebar.</li>
                  <li>Templates: start from preset grids or keyboard layouts, then customize as needed.</li>
                </ul>
              </div>
              <div>
                <h3>Saving & exporting</h3>
                <ul>
                  <li>Save project creates a portable JSON with embedded images.</li>
                  <li>Load project opens JSON files created by this app.</li>
                  <li>Export PDF/SVG keeps true mm sizing; optional 50mm test bar helps verify print scale.</li>
                  <li>Paper: choose A4/Letter and portrait/landscape; margins apply to both editing and export.</li>
                </ul>
              </div>
              <div>
                <h3>Tips</h3>
                <ul>
                  <li>Use multi-select + inspector to batch apply fonts, colors, or clear images.</li>
                  <li>Use undo/redo (Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z) to step through changes.</li>
                  <li>Switch to light mode for dark text; dark mode for light text.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

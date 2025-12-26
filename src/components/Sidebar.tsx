import React from 'react';
import { useEditorStore } from '../state/store';
import { ProjectModel } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_KEY_GAP, DEFAULT_KEY_SIZE } from '../utils/keys';

export function Sidebar() {
  const {
    project,
    updatePaper,
    addKey,
    applyTemplate,
    applyCheapinoTemplate,
    applyAnsi104,
    applyIso105,
    applyAnsi60,
    applyIso60,
    setProject,
    setSelectedKeys,
    duplicateRow,
    duplicateColumn,
    selectedKeys,
    swapSelected
  } = useEditorStore();

  const newProject = () => {
    const blank: ProjectModel = {
      id: nanoid(),
      name: 'Untitled',
      paper: project.paper,
      layout: { id: nanoid(), name: 'Layout', keys: [] },
      updatedAt: new Date().toISOString()
    };
    setProject(blank);
    setSelectedKeys([]);
  };

  const loadSample = (rows: number, cols: number) => {
    applyTemplate(rows, cols, DEFAULT_KEY_SIZE, DEFAULT_KEY_GAP);
  };

  return (
    <div className="sidebar">
      <div className="section">
        <h3>Paper</h3>
        <label>
          Size
          <select
            value={project.paper.size}
            onChange={(e) => updatePaper({ size: e.target.value as any })}
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="A3">A3</option>
            <option value="Tabloid">Tabloid</option>
          </select>
        </label>
        <label>
          Orientation
          <select
            value={project.paper.orientation}
            onChange={(e) => updatePaper({ orientation: e.target.value as any })}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
        <label>
          Margin (mm)
          <input
            type="number"
            value={project.paper.marginMm}
            onChange={(e) => updatePaper({ marginMm: Number(e.target.value) })}
          />
        </label>
        <label>
          Preview DPI
          <input
            type="number"
            value={project.paper.dpi}
            onChange={(e) => updatePaper({ dpi: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="section">
        <h3>Templates</h3>
        <div className="row">
          <button onClick={() => loadSample(3, 3)}>3x3</button>
          <button onClick={() => loadSample(4, 4)}>4x4</button>
          <button onClick={() => loadSample(5, 4)}>5x4</button>
        </div>
        <div className="row">
          <button onClick={() => applyTemplate(1, 12, DEFAULT_KEY_SIZE, 1)}>Row 12</button>
          <button onClick={() => applyTemplate(2, 6, DEFAULT_KEY_SIZE, 1)}>2x6</button>
        </div>
        <div className="row">
          <button onClick={applyCheapinoTemplate}>Cheapino / Miryoku</button>
          <button onClick={applyAnsi60}>ANSI 60%</button>
        </div>
        <div className="row">
          <button onClick={applyIso60}>ISO 60%</button>
          <button onClick={applyAnsi104}>ANSI 104</button>
        </div>
        <div className="row">
          <button onClick={applyIso105}>ISO 105</button>
        </div>
      </div>

      <div className="section">
        <h3>Layout</h3>
        <div className="row">
          <button onClick={() => addKey()}>Add key</button>
          <button className="button-ghost" onClick={newProject}>
            Clear
          </button>
        </div>
        <button disabled={selectedKeys.length !== 2} onClick={swapSelected}>
          Swap selected
        </button>
        <div className="row">
          <button disabled={!selectedKeys.length} onClick={() => duplicateRow(20)}>
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}

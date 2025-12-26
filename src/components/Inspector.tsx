import React, { useMemo, useState, useEffect } from 'react';
import { useEditorStore, createTextElement, createShapeElement } from '../state/store';
import { KeyModel, TextElement } from '../types';
import { loadFileAsDataUrl } from '../utils/importers';

const TEXT_GROUPS = [
  {
    title: 'Cima',
    slots: [
      { id: 'top-left', label: 'Esquerda' },
      { id: 'top-center', label: 'Centro' },
      { id: 'top-right', label: 'Direita' }
    ]
  },
  {
    title: 'Centro',
    slots: [
      { id: 'middle-left', label: 'Esquerda' },
      { id: 'middle-center', label: 'Centro' },
      { id: 'middle-right', label: 'Direita' }
    ]
  },
  {
    title: 'Baixo',
    slots: [
      { id: 'bottom-left', label: 'Esquerda' },
      { id: 'bottom-center', label: 'Centro' },
      { id: 'bottom-right', label: 'Direita' }
    ]
  }
];

export function Inspector() {
  const { project, selectedKeys, updateKey, addElementToKey, updateElement, removeElement, swapSelected } =
    useEditorStore();
  const selected = useMemo(
    () => project.layout.keys.filter((k) => selectedKeys.includes(k.id)),
    [project.layout.keys, selectedKeys]
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selected.length) return;
    const primary = selected[0];
    const initial: Record<string, boolean> = {};
    TEXT_GROUPS.forEach((group) => {
      const hasContent = group.slots.some((slot) =>
        primary.elements.some((e) => e.type === 'text' && (e as TextElement).slot === slot.id && (e as TextElement).text)
      );
      initial[group.title] = hasContent;
    });
    setExpandedGroups(initial);
  }, [selected]);

  if (!selected.length) {
    return (
      <div className="section">
        <h3>Inspector</h3>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Select a key to edit its style and content.</p>
      </div>
    );
  }

  const primary = selected[0];
  const updateAll = (patch: Partial<KeyModel>) => {
    selected.forEach((k) => updateKey(k.id, patch));
  };

  const firstShape = primary.elements.find((e) => e.type === 'shape');
  const firstImage = primary.elements.find((e) => e.type === 'image');

  const KEY_TYPE_PRESETS: Array<{ id: string; label: string; w: number; h: number; keyType: KeyModel['keyType'] }> = [
    { id: '1u', label: 'Normal (1u)', w: 13.5, h: 13.5, keyType: 'rect' },
    { id: '1_25u', label: '1.25u (Caps/Fn)', w: 16.9, h: 13.5, keyType: 'rect' },
    { id: '1_5u', label: '1.5u (Tab/Enter)', w: 20.3, h: 13.5, keyType: 'rect' },
    { id: '1_75u', label: '1.75u (Shift)', w: 23.6, h: 13.5, keyType: 'rect' },
    { id: '2u', label: '2u (Backspace)', w: 27, h: 13.5, keyType: 'rect' },
    { id: '2_25u', label: '2.25u (Enter)', w: 30.4, h: 13.5, keyType: 'rect' },
    { id: '2_75u', label: '2.75u (Shift longo)', w: 37.1, h: 13.5, keyType: 'rect' },
    { id: 'iso_enter', label: 'Enter ISO (L)', w: 20.25, h: 27, keyType: 'iso-enter' },
    { id: 'big_enter', label: 'Enter Big-ass (L)', w: 33.75, h: 27, keyType: 'big-enter' },
    { id: '6_25u', label: 'Space 6.25u', w: 84.4, h: 13.5, keyType: 'rect' }
  ];

  const findTextBySlot = (slot: string) =>
    primary.elements.find((e) => e.type === 'text' && (e as TextElement).slot === slot) as TextElement | undefined;

  const ensureTextForSlot = (slot: string, seed?: Partial<TextElement>) => {
    const existing = findTextBySlot(slot);
    if (existing) return existing;
    const created = createTextElement(seed?.text || '', slot) as TextElement;
    if (seed) Object.assign(created, seed);
    addElementToKey(primary.id, created);
    return created;
  };

  const handleImageUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const dataUrl = await loadFileAsDataUrl(file);
    addElementToKey(primary.id, {
      id: crypto.randomUUID(),
      type: 'image',
      dataUrl,
      fit: 'contain',
      x: 0,
      y: 0,
      width: primary.width,
      height: primary.height,
      opacity: 1,
      zIndex: 3
    });
  };

  return (
    <div className="section">
      <h3>Inspector ({selected.length})</h3>
      <label>
        Tipo de tecla
        <select
          value={
            (KEY_TYPE_PRESETS.find(
              (p) => Math.abs(p.w - primary.width) < 0.2 && Math.abs(p.h - primary.height) < 0.2
            ) || KEY_TYPE_PRESETS[0]).id
          }
          onChange={(e) => {
            const preset = KEY_TYPE_PRESETS.find((p) => p.id === e.target.value);
            if (preset) {
              updateAll({ width: preset.w, height: preset.h, keyType: preset.keyType || 'rect' });
            }
          }}
        >
          {KEY_TYPE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <label>
          Width (mm)
          <input
            type="number"
            value={primary.width}
            onChange={(e) => updateAll({ width: Number(e.target.value) })}
          />
        </label>
        <label>
          Height (mm)
          <input
            type="number"
            value={primary.height}
            onChange={(e) => updateAll({ height: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Padding (mm)
          <input
            type="number"
            value={primary.padding}
            onChange={(e) => updateAll({ padding: Number(e.target.value) })}
          />
        </label>
        <label>
          Radius (mm)
          <input
            type="number"
            value={primary.cornerRadius}
            onChange={(e) => updateAll({ cornerRadius: Number(e.target.value) })}
          />
        </label>
      </div>
      <label>
        Background
        <input
          type="color"
          value={primary.background || '#1f2937'}
          onChange={(e) => updateAll({ background: e.target.value })}
        />
      </label>
      <label>
        Rotação (deg)
        <input
          type="number"
          value={primary.rotation || 0}
          onChange={(e) => updateAll({ rotation: Number(e.target.value) })}
        />
      </label>

      <div className="row">
        <button onClick={() => addElementToKey(primary.id, createShapeElement('#2c3a50'))}>Add shape</button>
        {firstShape ? (
          <button className="button-ghost" onClick={() => removeElement(primary.id, firstShape.id)}>
            Remove shape
          </button>
        ) : null}
      </div>
      <label>
        Add image (png/svg)
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </label>

      <div className="section" style={{ padding: 10 }}>
        <h3 style={{ fontSize: 13, marginBottom: 6 }}>Textos (9 posições)</h3>
        {TEXT_GROUPS.map((group) => {
          const isOpen = expandedGroups[group.title] ?? false;
          return (
            <div key={group.title} className="section" style={{ padding: 8, gap: 8 }}>
              <div className="row" style={{ alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>{group.title}</strong>
                <button
                  className="button-ghost"
                  style={{ maxWidth: 90 }}
                  onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.title]: !isOpen }))}
                >
                  {isOpen ? 'Fechar' : 'Abrir'}
                </button>
              </div>
              {isOpen ? (
                <div className="table-list" style={{ gap: 6 }}>
                  {group.slots.map((slot) => {
                    const el = findTextBySlot(slot.id);
                    return (
                      <div
                        key={slot.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          padding: '8px 10px',
                          background: 'var(--panel-2)',
                          borderRadius: 10
                        }}
                      >
                        <strong style={{ fontSize: 12 }}>{slot.label}</strong>
                        <div className="row" style={{ gap: 8 }}>
                          <input
                            style={{ flex: 1 }}
                            placeholder="Texto"
                            value={el?.text ?? ''}
                            onChange={(e) => {
                              if (el) {
                                updateElement(primary.id, el.id, { text: e.target.value });
                              } else {
                                const created = createTextElement(e.target.value, slot.id);
                                addElementToKey(primary.id, created);
                              }
                            }}
                          />
                          <input
                            className="small-input"
                            type="number"
                            title="Tamanho"
                            value={el?.fontSize ?? 11}
                            onChange={(e) => {
                              const size = Number(e.target.value);
                              const target = el || ensureTextForSlot(slot.id, { fontSize: size });
                              updateElement(primary.id, target.id, { fontSize: size });
                            }}
                          />
                        </div>
                        <div className="row" style={{ gap: 8 }}>
                          <select
                            value={el?.fontWeight ?? 600}
                            onChange={(e) => {
                              const weight = Number(e.target.value);
                              const target = el || ensureTextForSlot(slot.id, { fontWeight: weight });
                              updateElement(primary.id, target.id, { fontWeight: weight });
                            }}
                            style={{ flex: 1 }}
                          >
                            <option value={300}>Light</option>
                            <option value={400}>Regular</option>
                            <option value={500}>Medium</option>
                            <option value={600}>SemiBold</option>
                            <option value={700}>Bold</option>
                          </select>
                          <input
                            type="color"
                            title="Cor"
                            value={el?.color ?? '#f8fafc'}
                            onChange={(e) => {
                              const color = e.target.value;
                              const target = el || ensureTextForSlot(slot.id, { color });
                              updateElement(primary.id, target.id, { color });
                            }}
                            style={{ width: 42, padding: 0 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {firstImage ? (
        <div className="section" style={{ padding: 10 }}>
          <h3 style={{ fontSize: 13, marginBottom: 6 }}>Image</h3>
          <button className="button-ghost" onClick={() => removeElement(primary.id, firstImage.id)}>
            Remove image
          </button>
          <div className="row">
            <label>
              Width (mm)
              <input
                type="number"
                value={firstImage.width || primary.width}
                onChange={(e) => updateElement(primary.id, firstImage.id, { width: Number(e.target.value) })}
              />
            </label>
            <label>
              Height (mm)
              <input
                type="number"
                value={firstImage.height || primary.height}
                onChange={(e) => updateElement(primary.id, firstImage.id, { height: Number(e.target.value) })}
              />
            </label>
          </div>
          <label>
            Opacity
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={firstImage.opacity ?? 1}
              onChange={(e) => updateElement(primary.id, firstImage.id, { opacity: Number(e.target.value) })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

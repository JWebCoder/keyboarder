import { Stage, Layer, Rect, Group, Text, Image as KonvaImage, Line } from 'react-konva';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useImage from 'use-image';
import { useEditorStore } from '../state/store';
import { paperSizeMm, mmToPixels } from '../utils/units';
import { KeyElement, KeyModel } from '../types';
import { loadFileAsDataUrl } from '../utils/importers';

interface ElementProps {
  keyModel: KeyModel;
  element: KeyElement;
  dpi: number;
}

function ElementRenderer({ keyModel, element, dpi }: ElementProps) {
  const [image] = useImage(element.type === 'image' ? element.dataUrl : undefined);
  const x = mmToPixels((element.x || 0) + keyModel.padding, dpi);
  const y = mmToPixels((element.y || 0) + keyModel.padding, dpi);
  const width = mmToPixels(element.width || keyModel.width, dpi) - mmToPixels(keyModel.padding * 2, dpi);
  const height = mmToPixels(element.height || keyModel.height, dpi) - mmToPixels(keyModel.padding * 2, dpi);

  if (element.type === 'shape') {
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={element.background || '#1e293b'}
        cornerRadius={element.cornerRadius || 0}
        opacity={element.opacity ?? 1}
      />
    );
  }

  if (element.type === 'text') {
    return (
      <Text
        x={x}
        y={y}
        width={width}
        height={height}
        text={element.text}
        fontFamily={element.fontFamily}
        fontSize={element.fontSize}
        fontStyle={element.fontWeight >= 600 ? 'bold' : 'normal'}
        fill={element.color}
        align={element.align || 'center'}
        verticalAlign={element.alignY || 'middle'}
        opacity={element.opacity ?? 1}
      />
    );
  }

  if (element.type === 'image' && image) {
    const availW = width;
    const availH = height;
    let drawW = availW;
    let drawH = availH;

    const naturalRatio = image.width / image.height;
    const areaRatio = availW / availH;

    if (element.fit === 'contain') {
      if (areaRatio > naturalRatio) {
        drawH = availH;
        drawW = availH * naturalRatio;
      } else {
        drawW = availW;
        drawH = availW / naturalRatio;
      }
    } else if (element.fit === 'cover') {
      if (areaRatio < naturalRatio) {
        drawH = availH;
        drawW = availH * naturalRatio;
      } else {
        drawW = availW;
        drawH = availW / naturalRatio;
      }
    }

    const alignX = element.alignX || 'center';
    const alignY = element.alignY || 'center';
    const offsetX =
      alignX === 'center' ? x + (availW - drawW) / 2 : alignX === 'right' ? x + (availW - drawW) : x;
    const offsetY =
      alignY === 'center' ? y + (availH - drawH) / 2 : alignY === 'bottom' ? y + (availH - drawH) : y;

    return (
      <KonvaImage
        x={offsetX}
        y={offsetY}
        width={drawW}
        height={drawH}
        image={image}
        opacity={element.opacity ?? 1}
      />
    );
  }

  return null;
}

export function CanvasStage({ viewMode, theme }: { viewMode: 'layout' | 'cut'; theme: 'dark' | 'light' }) {
  const stageRef = useRef<any>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, any>>({});
  const dragState = useRef<{
    originX: number;
    originY: number;
    positions: Record<string, { x: number; y: number }>;
  } | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 900, height: 700 });
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null
  );
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const selectionBase = useRef<string[]>([]);
  const {
    project,
    selectedKeys,
    setSelectedKeys,
    updateKey,
    addElementToKey,
    zoom,
    snapToGrid,
    gridSize,
    moveSelectedKeys
  } = useEditorStore();
  const { width, height } = paperSizeMm(project.paper.size, project.paper.orientation || 'portrait');
  const pageWidthPx = mmToPixels(width, project.paper.dpi);
  const pageHeightPx = mmToPixels(height, project.paper.dpi);

  const fitScale = Math.min(
    (frameSize.width - 80) / pageWidthPx,
    (frameSize.height - 120) / pageHeightPx,
    1
  );
  const effectiveScale = zoom * (Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1);
  const pageWidthScaled = pageWidthPx * effectiveScale;
  const pageHeightScaled = pageHeightPx * effectiveScale;
  const canvasBg = theme === 'light' ? '#f4f6fb' : '#0d1117';
  const borderColor = theme === 'light' ? '#cbd5e1' : '#3a455a';
  const dashColor = theme === 'light' ? '#cbd5e1' : '#263141';

  const handleSelect = (id: string, multi = false) => {
    if (multi) {
      const next = selectedKeys.includes(id)
        ? selectedKeys.filter((k) => k !== id)
        : [...selectedKeys, id];
      setSelectedKeys(next);
    } else {
      setSelectedKeys([id]);
    }
  };

  const derivedKeys = useMemo(() => {
    if (viewMode === 'layout') return project.layout.keys;
    const gap = 0.8;
    const sorted = [...project.layout.keys].sort((a, b) => a.y - b.y || a.x - b.x);
    const maxW = Math.max(...sorted.map((k) => k.width));
    const maxH = Math.max(...sorted.map((k) => k.height));
    const usableWidth = width - project.paper.marginMm * 2;
    const perRow = Math.max(1, Math.floor((usableWidth + gap) / (maxW + gap)));
    const placed: typeof project.layout.keys = [];
    sorted.forEach((key, idx) => {
      const row = Math.floor(idx / perRow);
      const col = idx % perRow;
      const x = project.paper.marginMm + col * (maxW + gap);
      const y = project.paper.marginMm + row * (maxH + gap);
      placed.push({ ...key, x, y, rotation: 0 });
    });
    return placed;
  }, [viewMode, project.layout.keys, width, project.paper.marginMm]);

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !selectedKeys.length) return;
    const dataUrl = await loadFileAsDataUrl(file);
    addElementToKey(selectedKeys[0], {
      id: crypto.randomUUID(),
      type: 'image',
      dataUrl,
      fit: 'contain',
      x: 0,
      y: 0,
      width: project.layout.keys.find((k) => k.id === selectedKeys[0])?.width || 18,
      height: project.layout.keys.find((k) => k.id === selectedKeys[0])?.height || 18,
      zIndex: 3
    });
  };

  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el) return;
    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
    };
    el.addEventListener('dragover', onDragOver);
    return () => el.removeEventListener('dragover', onDragOver);
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (rect) setFrameSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div
      ref={(el) => {
        frameRef.current = el;
        dropZoneRef.current = el;
      }}
      className="canvas-frame"
      onDrop={onDrop}
    >
      <Stage
        ref={stageRef}
        width={pageWidthScaled + 60}
        height={pageHeightScaled + 60}
        onMouseDown={(e) => {
          const target = e.target;
          const stage = target.getStage();
          const isStage = target === stage;
          const isBg = target?.name && (target.name() === 'canvas-bg' || target.name() === 'print-area');
          if (isStage || isBg) {
            const additive = e.evt.ctrlKey || e.evt.metaKey;
            selectionBase.current = additive ? [...selectedKeys] : [];
            if (!additive) setSelectedKeys([]);
            const pos = stage?.getPointerPosition();
            if (pos) {
              selectionStart.current = pos;
              setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
            }
          }
        }}
        onMouseMove={(e) => {
          if (!selectionStart.current) return;
          const pos = e.target.getStage()?.getPointerPosition();
          if (!pos) return;
          const w = pos.x - selectionStart.current.x;
          const h = pos.y - selectionStart.current.y;
          setSelectionRect({
            x: w < 0 ? pos.x : selectionStart.current.x,
            y: h < 0 ? pos.y : selectionStart.current.y,
            width: Math.abs(w),
            height: Math.abs(h)
          });
        }}
        onMouseUp={() => {
          if (selectionRect) {
            const rect = selectionRect;
            const inside: string[] = [];
            derivedKeys.forEach((key) => {
              const xPx = mmToPixels(project.paper.marginMm + key.x, project.paper.dpi) * effectiveScale + 30;
              const yPx = mmToPixels(project.paper.marginMm + key.y, project.paper.dpi) * effectiveScale + 30;
              const wPx = mmToPixels(key.width, project.paper.dpi) * effectiveScale;
              const hPx = mmToPixels(key.height, project.paper.dpi) * effectiveScale;
              const left = xPx;
              const right = xPx + wPx;
              const top = yPx;
              const bottom = yPx + hPx;
              const rectRight = rect.x + rect.width;
              const rectBottom = rect.y + rect.height;
              const intersects = !(right < rect.x || left > rectRight || bottom < rect.y || top > rectBottom);
              if (intersects) inside.push(key.id);
            });
            if (inside.length) {
              const combined = new Set(selectionBase.current.concat(inside));
              setSelectedKeys(Array.from(combined));
            }
          }
          selectionStart.current = null;
          selectionBase.current = [];
          setSelectionRect(null);
        }}
      >
        <Layer>
          <Rect
            name="canvas-bg"
            x={30}
            y={30}
            width={pageWidthScaled}
            height={pageHeightScaled}
            fill={canvasBg}
            shadowColor="#000"
            shadowBlur={24}
            cornerRadius={12}
          />
          <Rect
            name="print-area"
            x={30 + mmToPixels(project.paper.marginMm, project.paper.dpi) * effectiveScale}
            y={30 + mmToPixels(project.paper.marginMm, project.paper.dpi) * effectiveScale}
            width={pageWidthScaled - mmToPixels(project.paper.marginMm * 2, project.paper.dpi) * effectiveScale}
            height={pageHeightScaled - mmToPixels(project.paper.marginMm * 2, project.paper.dpi) * effectiveScale}
            stroke={dashColor}
            strokeWidth={1}
            dash={[6, 6]}
          />
          {selectionRect ? (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              stroke="#61dafb"
              dash={[4, 4]}
              strokeWidth={1}
              fill="rgba(97,218,251,0.08)"
            />
          ) : null}
          {derivedKeys.map((key) => {
            const xPx = mmToPixels(project.paper.marginMm + key.x, project.paper.dpi) * effectiveScale + 30;
            const yPx = mmToPixels(project.paper.marginMm + key.y, project.paper.dpi) * effectiveScale + 30;
            const wPx = mmToPixels(key.width, project.paper.dpi) * effectiveScale;
            const hPx = mmToPixels(key.height, project.paper.dpi) * effectiveScale;
            const isSelected = selectedKeys.includes(key.id);
            const rotation = key.rotation || 0;

            return (
              <Group
                key={key.id}
                x={xPx + wPx / 2}
                y={yPx + hPx / 2}
                offsetX={wPx / 2}
                offsetY={hPx / 2}
                rotation={rotation}
                draggable={viewMode === 'layout' && isSelected}
                onClick={(evt) => {
                  const multi = evt.evt.metaKey || evt.evt.ctrlKey || evt.evt.shiftKey;
                  handleSelect(key.id, multi);
                }}
                ref={(node) => {
                  groupRefs.current[key.id] = node;
                }}
                onDragStart={
                  viewMode === 'layout'
                    ? (evt) => {
                        const positions: Record<string, { x: number; y: number }> = {};
                        selectedKeys.forEach((id) => {
                          const node = groupRefs.current[id];
                          if (node) positions[id] = { x: node.x(), y: node.y() };
                        });
                        dragState.current = {
                          originX: evt.target.x(),
                          originY: evt.target.y(),
                          positions
                        };
                      }
                    : undefined
                }
                onDragMove={
                  viewMode === 'layout'
                    ? (evt) => {
                        if (!dragState.current) return;
                        const dx = evt.target.x() - dragState.current.originX;
                        const dy = evt.target.y() - dragState.current.originY;
                        selectedKeys.forEach((id) => {
                          if (id === key.id) return;
                          const start = dragState.current?.positions[id];
                          const node = groupRefs.current[id];
                          if (start && node) {
                            node.x(start.x + dx);
                            node.y(start.y + dy);
                          }
                        });
                      }
                    : undefined
                }
                onDragEnd={
                  viewMode === 'layout'
                    ? () => {
                        const snap = snapToGrid ? gridSize : 0;
                        const pxToMm = 1 / (mmToPixels(1, project.paper.dpi) * effectiveScale);
                        const updated: { id: string; x: number; y: number }[] = [];
                        // apply snap to all selected keys uniformly based on their own sizes
                        selectedKeys.forEach((id) => {
                          const node = groupRefs.current[id];
                          if (!node) return;
                          const widthPx = mmToPixels(
                            project.layout.keys.find((k) => k.id === id)?.width || key.width,
                            project.paper.dpi
                          ) * effectiveScale;
                          const heightPx = mmToPixels(
                            project.layout.keys.find((k) => k.id === id)?.height || key.height,
                            project.paper.dpi
                          ) * effectiveScale;
                          const mmX = (node.x() - widthPx / 2 - 30) * pxToMm;
                          const mmY = (node.y() - heightPx / 2 - 30) * pxToMm;
                          const snappedX = snap ? Math.round(mmX / snap) * snap : mmX;
                          const snappedY = snap ? Math.round(mmY / snap) * snap : mmY;
                          const xMm = snappedX - project.paper.marginMm;
                          const yMm = snappedY - project.paper.marginMm;
                          // reposition node to snapped pixel to avoid visual drift
                          node.x(
                            mmToPixels(project.paper.marginMm + xMm, project.paper.dpi) * effectiveScale +
                              widthPx / 2 +
                              30
                          );
                          node.y(
                            mmToPixels(project.paper.marginMm + yMm, project.paper.dpi) * effectiveScale +
                              heightPx / 2 +
                              30
                          );
                          updated.push({ id, x: xMm, y: yMm });
                        });
                        if (updated.length) moveSelectedKeys(updated);
                        dragState.current = null;
                      }
                    : undefined
                }
              >
                {key.keyType === 'iso-enter' ? (
                  (() => {
                    const topH = hPx / 2; // 1u
                    const squareW = hPx / 2; // 1u square on the right
                    const pts = [
                      0,
                      0,
                      wPx,
                      0,
                      wPx,
                      hPx,
                      wPx - squareW,
                      hPx,
                      wPx - squareW,
                      topH,
                      0,
                      topH
                    ];
                    return (
                      <Line
                        points={pts}
                        closed
                        fill={key.background || 'transparent'}
                        stroke={isSelected ? '#61dafb' : borderColor}
                        strokeWidth={isSelected ? 2 : 1.4}
                      />
                    );
                  })()
                ) : key.keyType === 'big-enter' ? (
                  (() => {
                    const topH = hPx / 2; // 1u
                    const squareW = Math.min(wPx, mmToPixels(20.25, project.paper.dpi) * effectiveScale); // 1.5u
                    const pts = [
                      0,
                      hPx,
                      wPx,
                      hPx,
                      wPx,
                      0,
                      wPx - squareW,
                      0,
                      wPx - squareW,
                      topH,
                      0,
                      topH
                    ];
                    return (
                      <Line
                        points={pts}
                        closed
                        fill={key.background || 'transparent'}
                        stroke={isSelected ? '#61dafb' : borderColor}
                        strokeWidth={isSelected ? 2 : 1.4}
                      />
                    );
                  })()
                ) : (
                  <Rect
                    width={wPx}
                    height={hPx}
                    cornerRadius={key.cornerRadius}
                    fill={key.background || 'transparent'}
                    stroke={isSelected ? '#61dafb' : borderColor}
                    strokeWidth={isSelected ? 2 : 1.4}
                  />
                )}
                <Group clipX={0} clipY={0} clipWidth={wPx} clipHeight={hPx}>
                  {[...key.elements]
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((el) => (
                      <ElementRenderer
                        key={el.id}
                        keyModel={key}
                        element={el}
                        dpi={project.paper.dpi * effectiveScale}
                      />
                    ))}
                </Group>
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

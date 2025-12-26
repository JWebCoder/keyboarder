import { KeyModel } from '../types';
import { paperSizeMm } from './units';
import { createKey, DEFAULT_KEY_GAP, DEFAULT_KEY_SIZE } from './keys';

type CellDef = { u?: number; h?: number; type?: KeyModel['keyType'] };

const UNIT_MM = DEFAULT_KEY_SIZE;
const GAP_MM = DEFAULT_KEY_GAP;
const STEP_MM = UNIT_MM + GAP_MM;

function buildUniformGrid(
  rows: number,
  cols: number,
  keySizeMm: number,
  gapMm: number,
  startX = 0,
  startY = 0
): KeyModel[] {
  const keys: KeyModel[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      keys.push(
        createKey({
          x: startX + c * (keySizeMm + gapMm),
          y: startY + r * (keySizeMm + gapMm),
          width: keySizeMm,
          height: keySizeMm
        })
      );
    }
  }
  return keys;
}

export function buildGridTemplate(rows: number, cols: number, keySizeMm: number, gapMm: number): KeyModel[] {
  return buildUniformGrid(rows, cols, keySizeMm, gapMm);
}

function buildMatrixTemplate(rowDefs: CellDef[][], startX = 0, startY = 0): KeyModel[] {
  const keys: KeyModel[] = [];
  rowDefs.forEach((row, r) => {
    let x = startX;
    const y = startY + r * STEP_MM;
    row.forEach((cell) => {
      const w = (cell.u ?? 1) * UNIT_MM;
      const h = (cell.h ?? 1) * UNIT_MM;
      keys.push(
        createKey({
          x,
          y,
          width: w,
          height: h,
          keyType: cell.type
        })
      );
      x += w + GAP_MM;
    });
  });
  return keys;
}

const makeRow = (count: number): CellDef[] => Array.from({ length: count }, () => ({}));

const ANSI_FROW: CellDef[][] = [makeRow(15)];

const ANSI_MAIN_ROWS: CellDef[][] = [
  [...makeRow(12), { u: 2 }],
  [{ u: 1.5 }, ...makeRow(11), { u: 1.5 }],
  [{ u: 1.75 }, ...makeRow(11), { u: 2.25 }],
  [{ u: 2.25 }, ...makeRow(10), { u: 2.75 }],
  [{ u: 1.25 }, { u: 1.25 }, { u: 1.25 }, { u: 6.25 }, { u: 1.25 }, { u: 1.25 }, { u: 1.25 }]
];

const ISO_MAIN_ROWS: CellDef[][] = [
  [...makeRow(12), { u: 2 }],
  [{ u: 1.5 }, ...makeRow(11), { u: 1, type: 'iso-enter' }],
  [{ u: 1.75 }, ...makeRow(11), { u: 1 }],
  [{ u: 1.25 }, { u: 1 }, ...makeRow(10), { u: 1, type: 'iso-enter' }],
  [{ u: 1.25 }, { u: 1.25 }, { u: 1.25 }, { u: 6.25 }, { u: 1.25 }, { u: 1.25 }, { u: 1.25 }]
];

const ARROW_CLUSTER: CellDef[][] = [makeRow(2), makeRow(3)];

const NUMPAD_CLUSTER: CellDef[][] = [
  makeRow(4),
  [{}, {}, {}, { h: 2 }],
  [{}, {}, {}, { h: 2 }],
  makeRow(4),
  [{ u: 2 }, {}, { u: 1, h: 2 }],
  makeRow(1)
];

function buildArrowCluster(offsetX: number, offsetY: number): KeyModel[] {
  return buildMatrixTemplate(ARROW_CLUSTER, offsetX, offsetY);
}

function buildNumpadCluster(offsetX: number, offsetY: number): KeyModel[] {
  return buildMatrixTemplate(NUMPAD_CLUSTER, offsetX, offsetY);
}

const ANSI_60_LAYOUT: Array<{ x: number; y: number; w: number; h: number; keyType: KeyModel['keyType'] }> = [
  { x: 0, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 13.75, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 27.5, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 41.25, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 55, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 68.75, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 82.5, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 96.25, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 110, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 123.75, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 137.5, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 151.25, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 178.75, y: 0, w: 27, h: 13.5, keyType: 'rect' },
  { x: 0, y: 13.75, w: 20.25, h: 13.5, keyType: 'rect' },
  { x: 20.5, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 34.25, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 48, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 61.75, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 75.5, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 89.25, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 103, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 116.75, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 130.5, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 144.25, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 158, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 185.5, y: 13.75, w: 20.25, h: 13.5, keyType: 'rect' },
  { x: 0, y: 27.5, w: 23.625, h: 13.5, keyType: 'rect' },
  { x: 24, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 37.75, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 51.5, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 65.25, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 79, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 92.75, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 106.5, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 120.25, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 134, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 147.75, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 161.5, y: 27.5, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 175.25, y: 27.5, w: 30.375, h: 13.5, keyType: 'rect' },
  { x: 0, y: 41.25, w: 30.375, h: 13.5, keyType: 'rect' },
  { x: 30.75, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 44.5, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 58.25, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 72, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 85.75, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 99.5, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 113.25, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 127, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 140.75, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 154.5, y: 41.25, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 168.5, y: 41.25, w: 37.125, h: 13.5, keyType: 'rect' },
  { x: 0, y: 55, w: 16.875, h: 13.5, keyType: 'rect' },
  { x: 17.25, y: 55, w: 16.875, h: 13.5, keyType: 'rect' },
  { x: 34.5, y: 55, w: 16.875, h: 13.5, keyType: 'rect' },
  { x: 52, y: 55, w: 84.375, h: 13.5, keyType: 'rect' },
  { x: 137, y: 55, w: 16.875, h: 13.5, keyType: 'rect' },
  { x: 154.25, y: 55, w: 16.875, h: 13.5, keyType: 'rect' },
  { x: 171.5, y: 55, w: 16.875, h: 13.5, keyType: 'rect' },
  { x: 165, y: 0, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 171.75, y: 13.75, w: 13.5, h: 13.5, keyType: 'rect' },
  { x: 188.75, y: 55, w: 16.9, h: 13.5, keyType: 'rect' }
];

export function buildAnsi104Template(): KeyModel[] {
  const keys: KeyModel[] = [];
  keys.push(...buildMatrixTemplate(ANSI_FROW, 0, 0));
  keys.push(...buildMatrixTemplate(ANSI_MAIN_ROWS, 0, STEP_MM));
  const arrowOffsetX = 15 * STEP_MM;
  const arrowOffsetY = STEP_MM * 2.5;
  keys.push(...buildArrowCluster(arrowOffsetX, arrowOffsetY));
  const numpadOffsetX = arrowOffsetX + 4 * STEP_MM;
  keys.push(...buildNumpadCluster(numpadOffsetX, STEP_MM));
  return keys;
}

export function buildIso105Template(): KeyModel[] {
  const keys: KeyModel[] = [];
  keys.push(...buildMatrixTemplate(ISO_MAIN_ROWS, 0, STEP_MM));
  const arrowOffsetX = 15 * STEP_MM;
  const arrowOffsetY = STEP_MM * 2.5;
  keys.push(...buildArrowCluster(arrowOffsetX, arrowOffsetY));
  const numpadOffsetX = arrowOffsetX + 4 * STEP_MM;
  keys.push(...buildNumpadCluster(numpadOffsetX, STEP_MM));
  return keys;
}

export function buildAnsi60Template(): KeyModel[] {
  return ANSI_60_LAYOUT.map((key) =>
    createKey({
      x: key.x,
      y: key.y,
      width: key.w,
      height: key.h,
      keyType: key.keyType
    })
  );
}

export function buildIso60Template(): KeyModel[] {
  return buildMatrixTemplate(ISO_MAIN_ROWS, 0, 0);
}

const MIRYOKU_LEFT: Array<{ x: number; y: number; rotation: number }> = [
  { x: 27, y: 32, rotation: 0 },
  { x: 27, y: 48, rotation: 0 },
  { x: 27, y: 64, rotation: 0 },
  { x: 43, y: 26, rotation: 0 },
  { x: 43, y: 42, rotation: 0 },
  { x: 43, y: 58, rotation: 0 },
  { x: 59, y: 20, rotation: 0 },
  { x: 59, y: 36, rotation: 0 },
  { x: 59, y: 52, rotation: 0 },
  { x: 75, y: 26, rotation: 0 },
  { x: 75, y: 42, rotation: 0 },
  { x: 75, y: 58, rotation: 0 },
  { x: 91, y: 28, rotation: 0 },
  { x: 91, y: 45, rotation: 0 },
  { x: 91, y: 61, rotation: 0 },
  // Thumbs
  { x: 82, y: 82, rotation: 0 },
  { x: 99, y: 83, rotation: 6 },
  { x: 116, y: 86, rotation: 12 }
];

export function buildCheapinoTemplate(keySizeMm: number, paperWidthMm: number): KeyModel[] {
  const keys: KeyModel[] = [];

  const maxLeftX = Math.max(...MIRYOKU_LEFT.map((p) => p.x));
  const minCenter = maxLeftX + keySizeMm + 6;
  // Pull halves closer together, matched to the Miryoku sample geometry.
  const mirrorLine = Math.min(paperWidthMm - keySizeMm - 6, minCenter + 5.75);

  const addKey = (pos: { x: number; y: number; rotation: number }) => {
    keys.push(
      createKey({
        x: pos.x,
        y: pos.y,
        width: keySizeMm,
        height: keySizeMm,
        rotation: pos.rotation
      })
    );
  };

  MIRYOKU_LEFT.forEach((pos) => addKey(pos));
  MIRYOKU_LEFT.forEach((pos) => {
    addKey({
      x: mirrorLine * 2 - pos.x - keySizeMm,
      y: pos.y,
      rotation: pos.rotation ? -pos.rotation : 0
    });
  });

  return keys;
}

export function loadFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

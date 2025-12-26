export type PaperSize = 'A4' | 'Letter' | 'A3' | 'Tabloid';
export type Units = 'mm';
export type Orientation = 'portrait' | 'landscape';

export interface PaperSettings {
  size: PaperSize;
  orientation: Orientation;
  marginMm: number;
  dpi: number;
  snap?: {
    enabled: boolean;
    mm: number;
  };
}

export interface BaseElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
  alignX?: 'left' | 'center' | 'right';
  alignY?: 'top' | 'center' | 'bottom';
  padding?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  autoFit?: boolean;
  slot?: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  dataUrl: string;
  fit: 'contain' | 'cover';
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  background: string;
  cornerRadius?: number;
}

export type KeyElement = TextElement | ImageElement | ShapeElement;

export interface KeyModel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  keyType?: 'rect' | 'iso-enter' | 'big-enter';
  rotation?: number;
  padding: number;
  cornerRadius: number;
  background?: string;
  elements: KeyElement[];
}

export interface KeyboardLayout {
  id: string;
  name: string;
  keys: KeyModel[];
}

export interface ProjectModel {
  id: string;
  name: string;
  paper: PaperSettings;
  layout: KeyboardLayout;
  updatedAt: string;
}

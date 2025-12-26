import { nanoid } from 'nanoid';
import { KeyModel } from '../types';

export const DEFAULT_KEY_SIZE = 13.5;
export const DEFAULT_KEY_GAP = 2;

type KeyInput = Partial<KeyModel> & Pick<KeyModel, 'x' | 'y' | 'width' | 'height'>;

export function createKey(input: KeyInput): KeyModel {
  return {
    id: input.id ?? nanoid(),
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    keyType: input.keyType ?? 'rect',
    rotation: input.rotation ?? 0,
    padding: input.padding ?? 2,
    cornerRadius: input.cornerRadius ?? 2,
    background: input.background ?? 'transparent',
    elements: input.elements ?? []
  };
}

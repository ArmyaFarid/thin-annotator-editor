// toolAtoms.ts
import {atom} from 'jotai';
import {Tool} from '@/app/types.ts';
import {atomWithStorage} from 'jotai/utils';

export interface RLEMask {
  counts: string;
  size: [number, number];
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Mask {
  id: number;
  label: string;
  point_labels: number[];
  point_coords: [number, number][];
  bbox_list?: [number, number, number, number][];
  rleMask: RLEMask;
  color: {r: number; g: number; b: number; a: number};
}

export interface Prompt {
  id: number;
  type: string;
  point_labels: number;
  point_coords: [number, number];
  bbox?: Box;
}

export const activeToolAtom = atom<Tool>('select-add');
export const promptsAtom = atom<Prompt[]>([]);
export const masksAtom = atom<Mask[]>([]);
export const currentMaskAtom = atom<number>(0);
export const editorOnAtom = atom<boolean>(false);
export const sessionIdAtom = atom<string | undefined>(undefined);
// export const sessionIdAtom = atomWithStorage<string | undefined>(
//   'annotator:sessionId',
//   undefined,
// );

export type FilterGammaCombination = {
  filter: string | null;
  gamma: string | null;
};

export const filterGammaCombinationAtom = atom<FilterGammaCombination>({
  filter: null,
  gamma: null,
});

export type LoadedFilterGammaConfig = {
  filters: string[];
  gammas: number[];
};

export const loadedFilterGammaConfigAtom = atom<LoadedFilterGammaConfig>({
  filters: [],
  gammas: [],
});

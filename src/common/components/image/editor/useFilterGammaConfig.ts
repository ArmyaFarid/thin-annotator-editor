import {useAtom} from 'jotai';
import {
  LoadedFilterGammaConfig,
  loadedFilterGammaConfigAtom,
} from '@/app/atom.ts';

type State = [
  config: LoadedFilterGammaConfig,
  setConfig: (c: LoadedFilterGammaConfig) => void,
];

export default function useFilterGammaConfig(): State {
  return useAtom(loadedFilterGammaConfigAtom);
}

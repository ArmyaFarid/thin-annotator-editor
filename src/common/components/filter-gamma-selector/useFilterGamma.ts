import {useAtom} from 'jotai';
import {
  filterGammaCombinationAtom,
  FilterGammaCombination,
} from '@/app/atom.ts';

type State = [
  combination: FilterGammaCombination,
  setCombination: (c: FilterGammaCombination) => void,
];

export default function useFilterGamma(): State {
  return useAtom(filterGammaCombinationAtom);
}

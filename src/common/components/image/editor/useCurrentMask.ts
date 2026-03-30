import {currentMaskAtom} from '@/app/atom.ts';
import {useAtom} from 'jotai';

type State = [number, (index: number) => void];

export default function useCurrentMask(): State {
  return useAtom(currentMaskAtom);
}

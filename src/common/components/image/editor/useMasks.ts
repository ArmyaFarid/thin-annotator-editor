import {Mask, masksAtom} from '@/app/atom.ts';
import {SetStateAction, useAtom} from 'jotai';

type State = [Mask[], (value: SetStateAction<Mask[]>) => void];

export default function useMasks(): State {
  return useAtom(masksAtom);
}

import {Tool} from '@/app/types.ts';
import {useAtom} from 'jotai';
import {activeToolAtom} from '@/app/atom.ts';

type State = [tool: Tool, setTool: (tool: Tool) => void];

export default function useAnnotatorToolbar(): State {
  return useAtom(activeToolAtom);
}

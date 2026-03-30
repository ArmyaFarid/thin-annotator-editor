import {useAtom} from 'jotai';
import {sessionIdAtom} from '@/app/atom.ts';

type State = [
  sessionId: string | undefined,
  setSessionId: (id: string | undefined) => void,
];

export default function useSessionId(): State {
  return useAtom(sessionIdAtom);
}

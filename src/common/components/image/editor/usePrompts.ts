// usePrompts.ts
import {SetStateAction, useAtom} from "jotai";
import {Prompt, promptsAtom} from "@/app/atom.ts";

type State = [Prompt[], (value: SetStateAction<Prompt[]>) => void];

export default function usePrompts(): State {
    return useAtom(promptsAtom);
}

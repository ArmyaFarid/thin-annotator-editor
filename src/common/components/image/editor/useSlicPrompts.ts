import {SetStateAction, useAtom} from "jotai";
import {SlicPrompt, slicPromptsAtom} from "@/app/atom.ts";

type State = [SlicPrompt | undefined, (value: SetStateAction<SlicPrompt | undefined>) => void];

export default function useSlicPrompts(): State {
    return useAtom(slicPromptsAtom);
}

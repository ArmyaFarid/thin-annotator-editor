// usePrompts.ts
import {SetStateAction, useAtom} from "jotai";
import {SlicPrompt, slicPromptsAtom} from "@/app/atom.ts";

type State = [SlicPrompt, (value: SetStateAction<SlicPrompt>) => void];

export default function useSlicPrompts(): State {
    return useAtom(slicPromptsAtom);
}

// export default function useSlicPrompts(): State {
//   return <[SlicPrompt, (value: SetStateAction<SlicPrompt>) => void]>(
//       useAtom(slicPromptsAtom)
//   );
// }

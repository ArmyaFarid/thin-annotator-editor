import {useAtomValue} from "jotai";
import {idlePromptAtom, type IdlePrompt} from "@/telemetry/atoms.ts";

export default function useIdlePrompt(): IdlePrompt | null {
    return useAtomValue(idlePromptAtom);
}

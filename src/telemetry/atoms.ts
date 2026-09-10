import {atom} from "jotai";

// Telemetry's own state, not the app's. The module writes it; the idle-prompt
// component reads it and owns everything that happens next — the dialog, the
// save, the exit. Nothing here touches annotation state.

export interface IdlePrompt {
    idleSinceWallMs: number;
    deadlineWallMs: number;
}

export const idlePromptAtom = atom<IdlePrompt | null>(null);

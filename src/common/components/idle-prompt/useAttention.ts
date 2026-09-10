import {useEffect} from "react";

// A modal is invisible to someone looking into the microscope, so the prompt
// also has to be audible. Both signals are permission-free; an OS notification
// would need Notification.requestPermission() and is deliberately not used.

const BEEP_INTERVAL_MS = 4_000;
const TITLE_FLASH_MS = 900;

function beep(): void {
    try {
        const Ctor =
            window.AudioContext ??
            (window as {webkitAudioContext?: typeof AudioContext})
                .webkitAudioContext;
        if (!Ctor) {
            return;
        }
        const context = new Ctor();
        // Suspended until the page has user activation; annotating provides it.
        void context.resume();
        const now = context.currentTime;
        for (const [index, frequency] of [880, 660].entries()) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const start = now + index * 0.18;
            oscillator.frequency.value = frequency;
            oscillator.type = "sine";
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.18);
        }
        setTimeout(() => void context.close(), 1_000);
    } catch {
        /* blocked audio must never break the prompt */
    }
}

export default function useAttention(
    active: boolean,
    flashTitle: string,
): void {
    useEffect(() => {
        if (!active) {
            return;
        }
        const original = document.title;
        let alternate = false;

        beep();
        const beeper = setInterval(beep, BEEP_INTERVAL_MS);
        const flasher = setInterval(() => {
            alternate = !alternate;
            document.title = alternate ? flashTitle : original;
        }, TITLE_FLASH_MS);

        return () => {
            clearInterval(beeper);
            clearInterval(flasher);
            document.title = original;
        };
    }, [active, flashTitle]);
}

// Build-time default, runtime override: a coordinator can enable one machine
// with `localStorage.telemetry = "on"` without a rebuild.

function resolve(): boolean {
    try {
        const override = localStorage.getItem("telemetry");
        if (override === "on") {
            return true;
        }
        if (override === "off") {
            return false;
        }
    } catch {
        /* blocked storage — fall through to the build flag */
    }
    return import.meta.env.VITE_TELEMETRY === "on";
}

export const ENABLED: boolean = resolve();

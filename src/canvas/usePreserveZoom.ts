import {useAtom} from "jotai";
import {preserveZoomAtom} from "@/app/atom.ts";

export default function usePreserveZoom(): [boolean, (v: boolean) => void] {
    const [value, setValue] = useAtom(preserveZoomAtom);

    function set(v: boolean) {
        setValue(v);
        try { localStorage.setItem("preserveZoom", String(v)); } catch { /* ignore */ }
    }

    return [value, set];
}

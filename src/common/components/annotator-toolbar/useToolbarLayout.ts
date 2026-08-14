import {useAtom} from "jotai";
import {toolbarLayoutAtom, type ToolbarLayout} from "@/app/atom.ts";

export default function useToolbarLayout(): [
    ToolbarLayout,
    (v: ToolbarLayout) => void,
] {
    const [value, setValue] = useAtom(toolbarLayoutAtom);

    function set(v: ToolbarLayout) {
        setValue(v);
        try {
            localStorage.setItem("toolbarLayout", v);
        } catch {
            /* ignore */
        }
    }

    return [value, set];
}

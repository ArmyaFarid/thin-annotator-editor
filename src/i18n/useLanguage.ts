import {useAtom} from "jotai";
import {langAtom} from "@/app/atom.ts";
import {setLang, type Lang} from "@/i18n/index.ts";

// Keeps the i18n module and the atom in step: the module is what `t()` reads,
// the atom is what makes React re-render once it changes.
export default function useLanguage(): [Lang, (lang: Lang) => void] {
    const [lang, setAtom] = useAtom(langAtom);

    function set(next: Lang) {
        setLang(next);
        setAtom(next);
    }

    return [lang, set];
}

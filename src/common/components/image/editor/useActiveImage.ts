import {SetStateAction, useAtom} from "jotai";
import {ActiveImage, activeImage} from "@/app/atom.ts";

type State = [
    ActiveImage | null,
    (value: SetStateAction<ActiveImage | null>) => void,
];

export default function useActiveImage(): State {
    return useAtom(activeImage);
}

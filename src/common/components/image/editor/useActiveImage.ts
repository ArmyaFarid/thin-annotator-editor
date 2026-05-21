import {SetStateAction, useAtom} from "jotai";
import {ActiveImage, activeImage} from "@/app/atom.ts";

type State = [ActiveImage, (value: SetStateAction<ActiveImage>) => void];

export default function useActiveImage(): State {
    return useAtom(activeImage);
}

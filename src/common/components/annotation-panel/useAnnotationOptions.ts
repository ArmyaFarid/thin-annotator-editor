import {useAtomValue} from "jotai";
import {annotationOptionsAtom, type AnnotationOptions} from "@/app/atom.ts";

export default function useAnnotationOptions(): AnnotationOptions {
    return useAtomValue(annotationOptionsAtom);
}

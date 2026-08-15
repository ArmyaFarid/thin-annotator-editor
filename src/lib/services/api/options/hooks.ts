import {useEffect} from "react";
import {useQuery} from "@tanstack/react-query";
import {useSetAtom} from "jotai";
import {annotationOptionsAtom} from "@/app/atom.ts";
import {optionsService} from "@/lib/services/api/options/service.ts";

/**
 * Loads the backend option lists once at startup and publishes them to
 * `annotationOptionsAtom`, which the forms read.
 *
 * The contract that matters: on any failure the bundled fallback already in the
 * atom stands, so the app is fully usable with the backend down. The atom stays
 * the source of truth rather than the query cache, because a dozen components
 * read it synchronously during render.
 */
export default function useLoadAnnotationOptions(): void {
    const setOptions = useSetAtom(annotationOptionsAtom);
    const {data} = useQuery({
        queryKey: ["annotation-options"],
        queryFn: () => optionsService.get(),
    });

    useEffect(() => {
        if (data) {
            setOptions(data);
        }
    }, [data, setOptions]);
}

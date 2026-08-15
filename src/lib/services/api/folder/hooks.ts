import {useMutation} from "@tanstack/react-query";
import {folderService} from "@/lib/services/api/folder/service.ts";

/**
 * Opening the picker is a command with a side effect on the backend (a native
 * dialog), never a cacheable read — hence a mutation.
 */
export function usePickFolder() {
    return useMutation({
        mutationFn: () => folderService.pick(),
    });
}

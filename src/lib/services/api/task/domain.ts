import type {Mask} from "@/app/atom.ts";

export interface TaskFromFolder {
    pairsCode: string;
    sampleId: string;
    annotations: Mask[] | null;
}

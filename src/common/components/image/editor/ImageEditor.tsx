import React, {useEffect, useRef, useState} from "react";
import {graphql, useLazyLoadQuery, useMutation} from "react-relay";
import {useAtomValue, useSetAtom} from "jotai";
import {toast} from "sonner";
import {CanvasStack} from "@/canvas/CanvasStack.tsx";
import usePrompts from "@/common/components/image/editor/usePrompts.ts";
import useMasks from "@/common/components/image/editor/useMasks.ts";
import useCurrentMask from "@/common/components/image/editor/useCurrentMask.ts";
import useSessionId from "@/common/components/image/editor/useSessionId.ts";
import useFilterGamma from "@/common/components/filter-gamma-selector/useFilterGamma.ts";
import useFilterGammaConfig from "@/common/components/image/editor/useFilterGammaConfig.ts";
import {getDistinctColor} from "@/canvas/color.ts";
import {MASK_FILL_ALPHA} from "@/canvas/mask-style.ts";
import {refineModeAtom, activeImageSizeAtom} from "@/app/atom.ts";
import {RefineOverlay} from "@/common/components/image/editor/refine/RefineOverlay.tsx";
import type {ImageEditorImgQuery} from "@/common/components/image/editor/__generated__/ImageEditorImgQuery.graphql.ts";
import type {ImageEditorDefaultPairsQuery} from "@/common/components/image/editor/__generated__/ImageEditorDefaultPairsQuery.graphql.ts";

interface RLEMask {
    counts: string;
    size: [number, number];
}

type ActiveImage = {
    path: string;
    url: string;
    width: number;
    height: number;
};

interface ImageEditorProps {}

export const ImageEditor: React.FC<ImageEditorProps> = () => {
    const [activeImage, setActiveImage] = useState<ActiveImage | null>(null);
    const [activeFilterGammaCombination] = useFilterGamma();
    const [, setConfig] = useFilterGammaConfig();
    const [prompts] = usePrompts();
    const [, setMasks] = useMasks();
    const [currentMask, setCurrentMask] = useCurrentMask();
    const [sessionId, setSessionId] = useSessionId();
    const maskCounter = useRef(1);
    const refineMode = useAtomValue(refineModeAtom);
    const setImageSize = useSetAtom(activeImageSizeAtom);

    useLazyLoadQuery<ImageEditorImgQuery>(
        graphql`
            query ImageEditorImgQuery {
                defaultImage {
                    path
                    url
                    height
                    width
                }
            }
        `,
        {},
    );

    const pairsData = useLazyLoadQuery<ImageEditorDefaultPairsQuery>(
        graphql`
            query ImageEditorDefaultPairsQuery {
                defaultPairs {
                    id
                    polarizedFilterTypes
                    gammas
                    acquiredImages {
                        polarizedFilterType
                        gamma
                        image {
                            path
                            url
                            width
                            height
                        }
                    }
                }
            }
        `,
        {},
    );

    useEffect(() => {
        setConfig({
            filters: [...pairsData.defaultPairs.polarizedFilterTypes],
            gammas: pairsData.defaultPairs.gammas.filter((g): g is number => g != null),
        });
    }, [pairsData]);

    useEffect(() => {
        const match = pairsData.defaultPairs.acquiredImages.find(
            a =>
                a.polarizedFilterType === activeFilterGammaCombination.filter &&
                a.gamma === (activeFilterGammaCombination.gamma ?? 0),
        );
        const img = (match?.image as ActiveImage) ?? null;
        setActiveImage(img);
        if (img) setImageSize({w: img.width, h: img.height});
    }, [activeFilterGammaCombination, pairsData]);

    const StartSessionMutation = graphql`
        mutation ImageEditorStartSessionMutation($input: StartSessionInput!) {
            startSessionImage(input: $input) {
                sessionId
            }
        }
    `;

    const AddPointsMutation = graphql`
        mutation ImageEditorAddPointsMutation($input: AddPointsImageInput!) {
            addPointsImage(input: $input) {
                frameIndex
                rleMaskList {
                    objectId
                    rleMask {
                        counts
                        size
                    }
                }
            }
        }
    `;

    const [commitSession] = useMutation(StartSessionMutation);
    const [commitPoints] = useMutation(AddPointsMutation);

    function startSession() {
        if (!activeImage?.path) return;
        const toastId = toast.loading("Debut de la session...");
        commitSession({
            variables: {
                input: {
                    path: activeImage.path,
                    pairsCode: pairsData.defaultPairs.id,
                },
            },
            onCompleted: (res: any) => {
                const sid = res?.startSessionImage?.sessionId;
                if (sid) {
                    setSessionId(sid);
                    toast.success("Session en cours, sélectionner une zone pour commencer", {id: toastId});
                }
            },
            onError: (_err: Error) => { toast.error("Echec du démarrage de session", {id: toastId}); },
        });
    }

    function sendPrompt() {
        if (!sessionId) {
            startSession();
            return;
        }

        const bboxes: [number, number, number, number][] = prompts
            .filter(p => p.bbox != null)
            .map(p => {
                const {left, top, width, height} = p.bbox!;
                return [Math.round(left), top, left + width, top + height];
            });

        const pointPrompts = prompts.filter(p => !p.bbox);

        commitPoints({
            variables: {
                input: {
                    sessionId,
                    imagePath: activeImage?.path,
                    objectId: 1,
                    points: pointPrompts.map(p => p.point_coords),
                    labels: pointPrompts.map(p => p.point_labels),
                    bboxes,
                },
            },
            onCompleted: (res: any) => {
                const firstMask = res?.addPointsImage?.rleMaskList?.[0]?.rleMask as RLEMask | undefined;
                if (!firstMask) return;

                const coords = pointPrompts.map(p => p.point_coords);
                const labels = pointPrompts.map(p => p.point_labels);
                const layerId = Date.now() + 1;

                if (currentMask === 0) {
                    const id = Date.now();
                    const color = getDistinctColor(maskCounter.current, MASK_FILL_ALPHA);
                    maskCounter.current += 1;
                    setMasks(prev => [
                        ...prev,
                        {
                            id,
                            label: `Lame ${maskCounter.current - 1}`,
                            layers: [{id: layerId, rleMask: firstMask, source: "sam" as const}],
                            point_coords: coords,
                            point_labels: labels,
                            color,
                        },
                    ]);
                    setCurrentMask(id);
                } else {
                    // Replace the existing SAM layer or prepend one if absent
                    setMasks(prev =>
                        prev.map(m => {
                            if (m.id !== currentMask) return m;
                            const hasSam = m.layers.some(l => l.source === "sam");
                            const layers = hasSam
                                ? m.layers.map(l => l.source === "sam" ? {...l, rleMask: firstMask} : l)
                                : [{id: layerId, rleMask: firstMask, source: "sam" as const}, ...m.layers];
                            return {...m, layers, point_coords: coords, point_labels: labels};
                        }),
                    );
                }
            },
        });
    }

    useEffect(() => {
        if (prompts.length > 0) sendPrompt();
    }, [prompts]);

    useEffect(() => {
        if (sessionId === "START_SESSION") startSession();
    }, [sessionId]);

    return (
        <>
            <CanvasStack imageUrl={activeImage?.url} />
            {refineMode !== 0 && activeImage ? (
                <RefineOverlay
                    imageUrl={activeImage.url}
                    imageW={activeImage.width}
                    imageH={activeImage.height}
                />
            ) : null}
        </>
    );
};

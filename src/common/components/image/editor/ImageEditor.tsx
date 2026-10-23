import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {CanvasStack} from "@/canvas/CanvasStack.tsx";
import usePrompts from "@/common/components/image/editor/usePrompts.ts";
import useMasks from "@/common/components/image/editor/useMasks.ts";
import useCurrentMask from "@/common/components/image/editor/useCurrentMask.ts";
import useFilterGamma from "@/common/components/filter-gamma-selector/useFilterGamma.ts";
import useFilterGammaConfig from "@/common/components/image/editor/useFilterGammaConfig.ts";
import {getDistinctColor} from "@/canvas/color.ts";
import {MASK_FILL_ALPHA} from "@/canvas/canvas-theme.ts";
import {commitHistoryAtom} from "@/app/history.ts";
import {
    refineModeAtom,
    activeImageSizeAtom,
    acquiredImagesAtom,
    slicOverlayAtom,
} from "@/app/atom.ts";
import {RefineOverlay} from "@/common/components/image/editor/refine/RefineOverlay.tsx";
import {SlicOverlay} from "@/common/components/image/editor/slic/SlicOverlay.tsx";
import useSlicPrompts from "@/common/components/image/editor/useSlicPrompts.ts";
import useActiveImage from "@/common/components/image/editor/useActiveImage.ts";
import {
    useAddPoints,
    usePairs,
    useSlicLabelMap,
} from "@/lib/services/api/editor/hooks.ts";
import {t} from "@/i18n/index.ts";
import {toast} from "sonner";

interface ImageEditorProps {
    pairsCode: string;
    sampleId: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
    pairsCode,
    sampleId,
}) => {
    const [activeImage, setActiveImage] = useActiveImage();
    const [activeFilterGammaCombination] = useFilterGamma();
    const [, setConfig] = useFilterGammaConfig();
    const [prompts] = usePrompts();
    const [slicPrompt] = useSlicPrompts();
    const [, setMasks] = useMasks();
    const [currentMask, setCurrentMask] = useCurrentMask();
    const maskCounter = useRef(1);
    const refineMode = useAtomValue(refineModeAtom);
    const setImageSize = useSetAtom(activeImageSizeAtom);
    const setAcquiredImages = useSetAtom(acquiredImagesAtom);
    const [slicOverlay, setSlicOverlay] = useAtom(slicOverlayAtom);
    const commitHistory = useSetAtom(commitHistoryAtom);
    const [imageLoading, setImageLoading] = useState(false);
    const onImageSettled = useCallback(() => setImageLoading(false), []);

    const pairs = usePairs({pairsCode, sampleId});
    const addPoints = useAddPoints();
    const slicLabelMap = useSlicLabelMap();

    useEffect(() => {
        if (!pairs.data) {
            return;
        }
        setConfig({variants: pairs.data.variants});
        setAcquiredImages(pairs.data.acquiredImages);
    }, [pairs.data]);

    useEffect(() => {
        if (!pairs.data) {
            return;
        }
        const match = pairs.data.acquiredImages.find(
            ({combination}) =>
                combination.filter === activeFilterGammaCombination.filter &&
                combination.gamma === activeFilterGammaCombination.gamma &&
                combination.rotation === activeFilterGammaCombination.rotation,
        );
        const img = match?.image ?? null;
        setActiveImage(img);
        if (img) {
            setImageSize({w: img.width, h: img.height});
        }
    }, [activeFilterGammaCombination, pairs.data]);

    // Cleared by the <img>'s load/error event, forwarded by CanvasStack.
    useEffect(() => {
        setImageLoading(activeImage != null);
    }, [activeImage?.url]);

    function onInferenceError() {
        toast.error(t("inferenceError"));
    }

    function sendPrompt() {
        if (!activeImage) {
            return;
        }
        const pointPrompts = prompts.filter((p) => !p.bbox);
        addPoints.mutate(
            {image: activeImage, prompts},
            {
                onError: onInferenceError,
                onSuccess: (firstMask) => {
                    if (!firstMask) {
                        return;
                    }

                    const coords = pointPrompts.map((p) => p.point_coords);
                    const labels = pointPrompts.map((p) => p.point_labels);
                    const layerId = Date.now() + 1;

                    commitHistory({
                        action: "sam.result",
                        payload: {prompts: pointPrompts.length},
                    });

                    if (currentMask === 0) {
                        const id = Date.now();
                        const color = getDistinctColor(
                            maskCounter.current,
                            MASK_FILL_ALPHA,
                        );
                        maskCounter.current += 1;
                        setMasks((prev) => [
                            ...prev,
                            {
                                id,
                                label: `Lame ${maskCounter.current - 1}`,
                                layers: [
                                    {
                                        id: layerId,
                                        rleMask: firstMask,
                                        source: "sam" as const,
                                    },
                                ],
                                point_coords: coords,
                                point_labels: labels,
                                color,
                            },
                        ]);
                        setCurrentMask(id);
                    } else {
                        setMasks((prev) =>
                            prev.map((m) => {
                                if (m.id !== currentMask) {
                                    return m;
                                }
                                const hasSam = m.layers.some(
                                    (l) => l.source === "sam",
                                );
                                const layers = hasSam
                                    ? m.layers.map((l) =>
                                          l.source === "sam"
                                              ? {...l, rleMask: firstMask}
                                              : l,
                                      )
                                    : [
                                          {
                                              id: layerId,
                                              rleMask: firstMask,
                                              source: "sam" as const,
                                          },
                                          ...m.layers,
                                      ];
                                return {
                                    ...m,
                                    layers,
                                    point_coords: coords,
                                    point_labels: labels,
                                };
                            }),
                        );
                    }
                },
            },
        );
    }

    function sendSlicPrompt() {
        if (!slicPrompt?.bbox || !activeImage) {
            return;
        }
        slicLabelMap.mutate(
            {image: activeImage, bbox: slicPrompt.bbox},
            {
                onError: onInferenceError,
                onSuccess: (map) => {
                    setSlicOverlay({...map, targetMaskId: currentMask});
                },
            },
        );
    }

    useEffect(() => {
        if (prompts.length > 0) {
            sendPrompt();
        }
    }, [prompts]);

    useEffect(() => {
        if (slicPrompt) {
            sendSlicPrompt();
        }
    }, [slicPrompt]);

    const isLoading =
        pairs.isPending ||
        addPoints.isPending ||
        slicLabelMap.isPending ||
        imageLoading;

    function loadingLabel() {
        if (slicLabelMap.isPending) {
            return t("slicComputing");
        }
        return addPoints.isPending ? t("processing") : t("loadingImage");
    }

    return (
        <div style={{width: "100%", height: "100%", position: "relative"}}>
            <CanvasStack
                imageUrl={activeImage?.url}
                onImageSettled={onImageSettled}
            />
            {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 pointer-events-none z-10">
                    <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span className="text-white text-xs font-medium">
                        {loadingLabel()}
                    </span>
                </div>
            ) : null}
            {refineMode !== 0 && activeImage ? (
                <RefineOverlay
                    imageUrl={activeImage.url}
                    imageW={activeImage.width}
                    imageH={activeImage.height}
                />
            ) : null}
            {slicOverlay !== null && activeImage ? (
                <SlicOverlay imageUrl={activeImage.url} />
            ) : null}
        </div>
    );
};

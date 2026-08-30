import React, {useEffect, useRef} from "react";
import {graphql, useLazyLoadQuery, useMutation} from "react-relay";
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
    slicOverlayAtom,
    ActiveImage,
} from "@/app/atom.ts";
import {RefineOverlay} from "@/common/components/image/editor/refine/RefineOverlay.tsx";
import {SlicOverlay} from "@/common/components/image/editor/slic/SlicOverlay.tsx";
import type {ImageEditorGetPairsQuery} from "@/common/components/image/editor/__generated__/ImageEditorGetPairsQuery.graphql.ts";
import useSlicPrompts from "@/common/components/image/editor/useSlicPrompts.ts";
import useActiveImage from "@/common/components/image/editor/useActiveImage.ts";
import {t} from "@/i18n/index.ts";

interface RLEMask {
    counts: string;
    size: [number, number];
}

// The backend sends `arr.tobytes()` base64-encoded — raw, C-order, native
// (little-endian) byte order, so a typed-array view over the bytes is enough.
function decodeLabelMap(
    data: string,
    dtype: string,
    w: number,
    h: number,
): Uint16Array {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    switch (dtype) {
        case "uint16":
            return new Uint16Array(bytes.buffer, bytes.byteOffset, w * h);
        case "uint8":
            return Uint16Array.from(bytes.subarray(0, w * h));
        case "int32":
        case "uint32":
            return Uint16Array.from(
                new Uint32Array(bytes.buffer, bytes.byteOffset, w * h),
            );
        default:
            throw new Error(`unsupported SLIC label map dtype: ${dtype}`);
    }
}

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
    const [slicOverlay, setSlicOverlay] = useAtom(slicOverlayAtom);
    const commitHistory = useSetAtom(commitHistoryAtom);

    const pairsData = useLazyLoadQuery<ImageEditorGetPairsQuery>(
        graphql`
            query ImageEditorGetPairsQuery(
                $pairsCode: String!
                $sampleId: String!
            ) {
                getPairs(pairsCode: $pairsCode, sampleId: $sampleId) {
                    id
                    sampleId
                    polarizedFilterTypes
                    gammas
                    acquiredImages {
                        polarizedFilterType
                        gamma
                        image {
                            id
                            path
                            url
                            width
                            height
                        }
                    }
                }
            }
        `,
        {pairsCode, sampleId},
        {fetchKey: `${pairsCode}-${sampleId}`, fetchPolicy: "network-only"},
    );

    useEffect(() => {
        setConfig({
            filters: [...pairsData.getPairs.polarizedFilterTypes],
            gammas: pairsData.getPairs.gammas.filter(
                (g): g is number => g != null,
            ),
        });
    }, [pairsData]);

    useEffect(() => {
        const match = pairsData.getPairs.acquiredImages.find(
            (a) =>
                a.polarizedFilterType === activeFilterGammaCombination.filter &&
                a.gamma === (activeFilterGammaCombination.gamma ?? 0),
        );
        const img = (match?.image as ActiveImage) ?? null;
        setActiveImage(img);
        if (img) {
            setImageSize({w: img.width, h: img.height});
        }
    }, [activeFilterGammaCombination, pairsData]);

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

    const ComputeSlicLabelMapMutation = graphql`
        mutation ImageEditorComputeSlicLabelMapMutation(
            $input: SlicImageInput!
        ) {
            computeSlicImageGetLabelMap(input: $input) {
                data
                height
                width
                dtype
                bbox {
                    x
                    y
                    w
                    h
                }
            }
        }
    `;

    const [commitPoints, pointsInFlight] = useMutation(AddPointsMutation);
    const [commitComputeSlicMutationLabelMap, slicLabelMapInFlight] =
        useMutation(ComputeSlicLabelMapMutation);

    function sendPrompt() {
        const bboxes: [number, number, number, number][] = prompts
            .filter((p) => p.bbox != null)
            .map((p) => {
                const {left, top, width, height} = p.bbox!;
                return [Math.round(left), top, left + width, top + height];
            });

        const pointPrompts = prompts.filter((p) => !p.bbox);
        commitPoints({
            variables: {
                input: {
                    imagePath: activeImage?.path,
                    imageId: activeImage?.id,
                    objectId: 1,
                    points: pointPrompts.map((p) => p.point_coords),
                    labels: pointPrompts.map((p) => p.point_labels),
                    bboxes,
                },
            },
            onCompleted: (res: any) => {
                const firstMask = res?.addPointsImage?.rleMaskList?.[0]
                    ?.rleMask as RLEMask | undefined;
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
        });
    }

    function sendSlicPrompt() {
        if (!slicPrompt) {
            return;
        }

        const bbox: [number, number, number, number] | null = slicPrompt.bbox
            ? [
                  Math.round(slicPrompt.bbox.left),
                  Math.round(slicPrompt.bbox.top),
                  Math.round(slicPrompt.bbox.width),
                  Math.round(slicPrompt.bbox.height),
              ]
            : null;

        commitComputeSlicMutationLabelMap({
            variables: {
                input: {
                    imagePath: activeImage?.path,
                    imageId: activeImage?.id,
                    bbox,
                },
            },
            onCompleted: (res: any) => {
                const m = res?.computeSlicImageGetLabelMap;
                if (!m) {
                    return;
                }
                // width/height come from the array, not the request: the
                // backend's slice clips at the image edge.
                setSlicOverlay({
                    bbox: {x: m.bbox.x, y: m.bbox.y, w: m.width, h: m.height},
                    labelMap: {
                        labels: decodeLabelMap(
                            m.data,
                            m.dtype,
                            m.width,
                            m.height,
                        ),
                        w: m.width,
                        h: m.height,
                        x: m.bbox.x,
                        y: m.bbox.y,
                    },
                    targetMaskId: currentMask,
                });
            },
        });
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

    const isLoading = pointsInFlight || slicLabelMapInFlight;

    return (
        <div style={{width: "100%", height: "100%", position: "relative"}}>
            <CanvasStack imageUrl={activeImage?.url} />
            {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 pointer-events-none z-10">
                    <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span className="text-white text-xs font-medium">
                        {slicLabelMapInFlight
                            ? t("slicComputing")
                            : t("processing")}
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

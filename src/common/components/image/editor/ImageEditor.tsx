import React, {useEffect, useRef, useState} from 'react';
import useAnnotatorToolbar from '@/common/components/annotator-toolbar/useAnnotatorToolbar.ts';
import {graphql, useLazyLoadQuery, useMutation} from 'react-relay';
import {MaskOverlayDemoImageDefImgQuery} from '@/routes/__generated__/MaskOverlayDemoImageDefImgQuery.graphql.ts';
import {ImageEditorImgQuery} from '@/common/components/image/editor/__generated__/ImageEditorImgQuery.graphql.ts';
import {toast} from 'sonner';
import {decode} from '@/jscocotools/mask.ts';
import usePrompts from '@/common/components/image/editor/usePrompts.ts';
import useMasks from '@/common/components/image/editor/useMasks.ts';
import useCurrentMask from '@/common/components/image/editor/useCurrentMask.ts';
import {Prompt} from '@/app/atom.ts';
import useSessionId from '@/common/components/image/editor/useSessionId.ts';
import Box = module;
import AddMarkIcon from '@/assets/icons/add-mark.svg?react';
import RemoveMarkIcon from '@/assets/icons/remove-mark.svg?react';
import {ImageEditorDefaultPairsQuery} from '@/common/components/image/editor/__generated__/ImageEditorDefaultPairsQuery.graphql.ts';
import useFilterGammaConfig from '@/common/components/image/editor/useFilterGammaConfig.ts';
import useFilterGamma from '@/common/components/filter-gamma-selector/useFilterGamma.ts';

interface ImageEditorProps {}

interface RLEMask {
  counts: string;
  size: [number, number];
}

type Image = {
  height: number;
  id: string;
  path: string;
  thumbnailPath: string | null | undefined;
  thumbnailUrl: string | null | undefined;
  url: string;
  width: number;
};

// interface Mask {
//   id: number;
//   label: string;
//   point_labels: number[];
//   point_coords: [number, number][];
//   rleMask: RLEMask;
//   color: {r: number; g: number; b: number; a: number};
// }
//
// interface Prompt {
//   id: number;
//   type: string;
//   point_labels: number;
//   point_coords: [number, number];
// }

// Helper to convert HSL to RGB
// H [0-360], S [0-100], L [0-100]
const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.floor(f(0) * 255),
    g: Math.floor(f(8) * 255),
    b: Math.floor(f(4) * 255),
  };
};

/**
 * Generates a distinct color based on an index.
 * Uses the Golden Angle (137.5 degrees) to maximize separation.
 */
const getDistinctColor = (index: number, alpha: number = 0.6) => {
  console.log('color index', index);
  const goldenAngle = 137.508;
  const hue = (index * goldenAngle) % 360;

  // FIX: Vary Lightness based on the index
  // Even indices = Bright (60%), Odd indices = Dark (35%)
  // This creates contrast even if the Hues are similar.
  const lightness = index % 2 === 0 ? 60 : 35;

  const saturation = 80; // Keep saturation high

  const rgb = hslToRgb(hue, saturation, lightness);

  return {...rgb, a: alpha};
};

export const ImageEditor: React.FC<ImageEditorProps> = () => {
  const [activeImage, setActiveImage] = useState<Image | null>(null);

  const [activeTool, setActiveTool] = useAnnotatorToolbar();

  const [activeFilterGammacombination] = useFilterGamma();

  const [, setConfig] = useFilterGammaConfig();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [counter, setCounter] = useState(1);
  const [prompts, setPrompts] = usePrompts();
  const [masks, setMasks] = useMasks();
  const [currentMask, setCurrentMask] = useCurrentMask();
  const [sessionId, setSessionId] = useSessionId();
  const nextPromtId = useRef(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({x: 0, y: 0});
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [imageScale, setImageScale] = useState({x: 1, y: 1});
  const addPrompt = (x: number, y: number) => {
    const id = nextPromtId.current++;
    let label = 1;
    const type: string = activeTool;
    switch (activeTool) {
      case 'select-add':
        label = 1;
        break;
      case 'select-remove':
        label = 0;
        break;
      default:
        label = 1;
    }

    setPrompts((prev: Prompt[]) => [
      ...prev,
      {
        id,
        type: type as string, // or change Prompt.type (see below)
        point_labels: label,
        point_coords: [x, y] as [number, number],
      },
    ]);
  };

  const addMask = (
    rle: RLEMask,
    coords: [number, number][],
    labels: number[],
  ) => {
    const id = Date.now();
    const color = getDistinctColor(counter, 0.6);
    setMasks(prev => [
      ...prev,
      {
        id,
        label: `Lame ${counter}`,
        rleMask: rle,
        point_coords: coords,
        point_labels: labels,
        color: color,
      },
    ]);
    setCounter(c => c + 1);
    return id;
  };

  const upsertMask = (
    id: number,
    rle: RLEMask,
    coords: [number, number][],
    labels: number[],
  ) => {
    if (masks.length === 0) {
      addMask(rle, coords, labels);
      return;
    }

    setMasks(prev =>
      prev.map(mask =>
        mask.id === id
          ? {
              ...mask,
              rleMask: rle,
              point_coords: coords,
              point_labels: labels,
              // color intentionally untouched ✅
            }
          : mask,
      ),
    );
  };

  const removeMask = (id: number) => {
    setMasks(prev => prev.filter(m => m.id !== id));
  };

  const data = useLazyLoadQuery<ImageEditorImgQuery>(
    graphql`
      query ImageEditorImgQuery {
        defaultImage {
          path
          thumbnailPath
          url
          thumbnailUrl
          height
          width
        }
      }
    `,
    {},
  );

  const defaultPairsData = useLazyLoadQuery<ImageEditorDefaultPairsQuery>(
    graphql`
      query ImageEditorDefaultPairsQuery {
        defaultPairs {
          id
          sampleId
          label
          description
          polarizedFilterTypes
          gammas
          acquiredImages {
            polarizedFilterType
            gamma
            acquisitionLabel
            image {
              id
              path
              width
              height
              thumbnailPath
              url
              thumbnailUrl
            }
          }
        }
      }
    `,
    {},
  );

  useEffect(() => {
    setConfig({
      filters: defaultPairsData.defaultPairs.polarizedFilterTypes,
      gammas: defaultPairsData.defaultPairs.gammas,
    });
  }, [defaultPairsData]);

  useEffect(() => {
    console.log(activeFilterGammacombination);
    const matchingAcquiredSectionImage =
      defaultPairsData.defaultPairs.acquiredImages.filter(
        aqui =>
          aqui.polarizedFilterType === activeFilterGammacombination.filter &&
          aqui.gamma === (activeFilterGammacombination.gamma ?? 0),
      );
    setActiveImage(matchingAcquiredSectionImage[0]?.image ?? null);
  }, [activeFilterGammacombination]);

  useEffect(() => {
    console.log('Here a new version');
    console.log(activeImage);
  }, [activeImage]);

  // const imgW = data.defaultImage?.width ?? 1280;
  // const imgH = data.defaultImage?.height ?? 720;

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

  const [commit, isInFlight] = useMutation(StartSessionMutation);
  const [commitPoint, isAddingPoint] = useMutation(AddPointsMutation);

  const startSession = (
    path: string,
    onCompleted: (sessionId: string) => void,
  ) => {
    commit({
      variables: {
        input: {path},
      },
      onCompleted: (response: any) => {
        if (response.startSessionImage) {
          onCompleted(response.startSessionImage.sessionId);
        }
      },
      onError: err => console.error('Failed to start session:', err),
    });
  };

  function sessionStart() {
    const id = toast.loading('Debut de la session...');
    if (data.defaultImage.url) {
      startSession(data.defaultImage.path, sessionId => {
        setSessionId(sessionId);
        toast.success('Session en cours, selectioner une zone pour commencer', {
          id,
        });
      });
    }
    console.log('starting.....');
  }

  // const click = (x: number, y: number) => {
  //   if (!sessionId) {
  //     sessionStart();
  //     return;
  //   }
  //
  //   // Generate random x,y respecting image size
  //   let randomX = Math.floor(Math.random() * imgW);
  //   let randomY = Math.floor(Math.random() * imgH);
  //
  //   if (x) {
  //     randomX = x;
  //     randomY = y;
  //   }
  //
  //   commitPoint({
  //     variables: {
  //       input: {
  //         sessionId,
  //         objectId: 1, // Hardcoded for this demo
  //         points: [[randomX, randomY]],
  //         labels: [1],
  //       },
  //     },
  //     onCompleted: (res: any) => {
  //       // Just take the first mask returned
  //       const firstMask = res.addPointsImage.rleMaskList[0]?.rleMask;
  //       if (firstMask) {
  //         try {
  //           console.log(firstMask);
  //           addMask(firstMask, [[x, y]], [1]);
  //         } catch (e) {
  //           console.log(e);
  //         }
  //       }
  //     },
  //   });
  // };

  const sendPrompt = () => {
    if (!sessionId) {
      sessionStart();
      return;
    }

    const bboxes: [number, number, number, number][] = prompts
      .filter(p => p.bbox != null)
      .map(p => {
        const {left, top, width, height} = p.bbox!;
        return [
          Math.round(left), // x_min
          top, // y_min
          left + width, // x_max
          top + height, // y_max
        ];
      });

    const pointData = prompts.filter(p => !p.bbox);

    const points = pointData.map(p => p.point_coords);
    const labels = pointData.map(p => p.point_labels);
    console.log('sending prompt...');
    console.log(bboxes);

    commitPoint({
      variables: {
        input: {
          sessionId,
          objectId: 1, // Hardcoded for this demo
          points: points,
          labels: labels,
          bboxes: bboxes,
        },
      },
      onCompleted: (res: any) => {
        // Just take the first mask returned
        const firstMask = res.addPointsImage.rleMaskList[0]?.rleMask;
        if (firstMask) {
          try {
            console.log(firstMask);
            if (currentMask == 0) {
              const id = addMask(firstMask, points, labels);
              setCurrentMask(id);
            } else {
              upsertMask(currentMask, firstMask, points, labels);
            }
          } catch (e) {
            console.log(e);
          }
        }
      },
    });
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    // Find the image element inside the clicked container
    const img = container.querySelector('img');

    if (!img) {
      return;
    }

    if (activeTool !== 'select-add' && activeTool !== 'select-remove') {
      return;
    }

    // 1. Get the click coordinates relative to the displayed HTML element
    const rect = container.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;

    // 2. Calculate the Scaling Factor
    // naturalWidth = The actual resolution of the file (e.g., 2048px)
    // clientWidth  = The size displayed on screen (e.g., 900px)
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    setImageScale({x: scaleX, y: scaleY});

    // 3. Apply the scale to get the "Real" coordinates
    // This matches the coordinates needed for your mask logic / backend
    const realX = Math.floor(displayX * scaleX);
    const realY = Math.floor(displayY * scaleY);

    console.log(`Click on Screen: ${displayX}x${displayY}`);
    console.log(`Mapped to Image: ${realX}x${realY}`);

    // Now you can use realX and realY to interact with your mask arrays
    addPrompt(realX, realY);
    // click(realX, realY);
  };

  useEffect(() => {
    if (prompts.length > 0) {
      sendPrompt();
    }
  }, [prompts]);

  useEffect(() => {
    console.log('mask changes');

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    if (!masks.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Taille affichée de l'image
    const img = canvas.previousElementSibling as HTMLImageElement;
    const dispW = img.clientWidth;
    const dispH = img.clientHeight;

    canvas.width = dispW;
    canvas.height = dispH;

    ctx.clearRect(0, 0, dispW, dispH);

    masks.forEach(({rleMask, color}) => {
      const decodedMask = decode([rleMask]); // renvoie un DataArray {data: Uint8Array, shape: [H,W]}

      const [maskH, maskW] = decodedMask.shape;
      const dataArray = decodedMask.data as Uint8Array;

      console.log(dataArray);

      const rgbaData = new Uint8ClampedArray(maskH * maskW * 4);
      const borderThickness = 3;
      const darkenFactor = 0.6;
      for (let x = 0; x < maskW; x++) {
        for (let y = 0; y < maskH; y++) {
          // 1. Calculate the index for the Source (Column-Major / Fortran style)
          // It counts down the column (y) before moving to the next column (x)
          const sourceIndex = x * maskH + y;

          // 2. Calculate the index for the Target (Row-Major / Canvas style)
          // It counts across the row (x) before moving to the next row (y)
          // Multiply by 4 because RGBA has 4 channels
          const targetIndex = (y * maskW + x) * 4;

          if (dataArray[sourceIndex] === 1) {
            let isBorder = false;

            checkLoop: for (
              let dx = -borderThickness;
              dx <= borderThickness;
              dx++
            ) {
              for (let dy = -borderThickness; dy <= borderThickness; dy++) {
                // On calcule la position du voisin
                const nx = x + dx;
                const ny = y + dy;

                // 1. Si on sort de l'image (bords de l'écran), c'est une bordure
                if (nx < 0 || nx >= maskW || ny < 0 || ny >= maskH) {
                  isBorder = true;
                  break checkLoop;
                }

                // 2. Si le voisin est '0' (vide), c'est une bordure
                // Attention : sourceIndex doit être calculé en Column-Major pour le voisin aussi
                const neighborIndex = nx * maskH + ny;
                if (dataArray[neighborIndex] === 0) {
                  isBorder = true;
                  break checkLoop; // On arrête de chercher dès qu'on trouve un vide
                }
              }
            }

            if (x === 0 || dataArray[(x - 1) * maskH + y] === 0) {
              isBorder = true;
            } else if (
              x === maskW - 1 ||
              dataArray[(x + 1) * maskH + y] === 0
            ) {
              isBorder = true;
            } else if (y === 0 || dataArray[x * maskH + (y - 1)] === 0) {
              isBorder = true;
            } else if (
              y === maskH - 1 ||
              dataArray[x * maskH + (y + 1)] === 0
            ) {
              isBorder = true;
            }

            if (isBorder) {
              rgbaData[targetIndex] = Math.max(0, color.r * darkenFactor);
              rgbaData[targetIndex + 1] = Math.max(0, color.g * darkenFactor);
              rgbaData[targetIndex + 2] = Math.max(0, color.b * darkenFactor);
              rgbaData[targetIndex + 3] = 255; // 255 = 100% Opaque (Pas transparent)
            } else {
              rgbaData[targetIndex] = color.r;
              rgbaData[targetIndex + 1] = color.g;
              rgbaData[targetIndex + 2] = color.b;
              rgbaData[targetIndex + 3] = Math.floor(color.a * 255);
            }
          } else {
            rgbaData[targetIndex] = 0;
            rgbaData[targetIndex + 1] = 0;
            rgbaData[targetIndex + 2] = 0;
            rgbaData[targetIndex + 3] = 0;
          }
        }
      }
      const imgData = new ImageData(rgbaData, maskW, maskH);
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = maskW;
      tmpCanvas.height = maskH;
      tmpCanvas.getContext('2d')!.putImageData(imgData, 0, 0);
      ctx.drawImage(tmpCanvas, 0, 0, maskW, maskH, 0, 0, dispW, dispH);
    });
  }, [masks]);

  useEffect(() => {
    if (sessionId == 'START_SESSION') {
      sessionStart();
    }
  }, [sessionId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'bounding-box') {
      return;
    }

    if (!containerRef.current) {
      return;
    }

    // Get coordinates relative to the container
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({x, y});
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentBox({
      left: Math.min(x, startPos.x),
      top: Math.min(y, startPos.y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);

    // Safety check: Don't save if no box exists or it's too small
    if (
      !currentBox ||
      !containerRef.current ||
      currentBox.width < 5 ||
      currentBox.height < 5
    ) {
      setCurrentBox(null);
      return;
    }

    // 1. Get the image from the container to calculate scaling
    const img = containerRef.current.querySelector('img');
    if (!img) {
      return;
    }

    const id = nextPromtId.current++;

    // 2. Calculate the ratio between the original image size and the displayed size
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    setImageScale({x: scaleX, y: scaleY});

    // 3. Create a scaled version of the box
    // (We use Math.round because pixel coordinates are usually integers)
    const scaledBox = {
      left: currentBox.left * scaleX,
      top: currentBox.top * scaleY,
      width: currentBox.width * scaleX,
      height: currentBox.height * scaleY,
    };

    setPrompts((prev: Prompt[]) => [
      ...prev,
      {
        id,
        type: activeTool as string,
        point_labels: -1, // 1 usually means "include" in segmentation models
        // For a box, point_coords might be irrelevant, or you might want the center
        point_coords: [
          scaledBox.left + scaledBox.width / 2,
          scaledBox.top + scaledBox.height / 2,
        ] as [number, number],
        bbox: scaledBox,
      },
    ]);

    console.log('Box Created (Scaled):', scaledBox);

    // 4. Clear the temporary drawing box
    setCurrentBox(null);
  };

  return (
    <div
      style={{position: 'relative', overflow: 'hidden', height: '700px'}}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}>
      <img
        src={data.defaultImage.url}
        style={{display: 'block', height: '100%', width: 'auto'}}
        alt="background"
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />
      {prompts.map(prompt => {
        const box = prompt.bbox;
        if (box) {
          return (
            <div
              key={prompt.id + prompt.type}
              className="absolute border-2 border-[#4FC3F7] bg-[#4FC3F7]/20 pointer-events-none"
              style={{
                left: box.left / imageScale.x,
                top: box.top / imageScale.y,
                width: box.width / imageScale.x,
                height: box.height / imageScale.y,
              }}
            />
          );
        } else {
          const isPositive = prompt.point_labels === 1;
          // Calculate screen position from natural coordinates
          const screenX = prompt.point_coords[0] / imageScale.x;
          const screenY = prompt.point_coords[1] / imageScale.y;

          return (
            <div
              key={`${prompt.id}-${prompt.type}`}
              className={`absolute pointer-events-none drop-shadow-md flex items-center justify-center
          ${isPositive ? 'text-green-500' : 'text-red-500'}
        `}
              style={{
                left: screenX,
                top: screenY,
                transform: 'translate(-50%, -50%)', // Centers the icon on the click
                width: 24, // Explicit size helps centering
                height: 24,
              }}>
              {isPositive ? (
                // Green Plus SVG
                <AddMarkIcon className="w-6 h-6 text-green-500" />
              ) : (
                // Red Minus SVG
                <RemoveMarkIcon className="w-6 h-6 text-green-500" />
              )}
            </div>
          );
        }
      })}
      {currentBox && (
        <div
          className="absolute border-2 border-[#4FC3F7] bg-[#4FC3F7]/20 pointer-events-none"
          style={{
            left: currentBox.left,
            top: currentBox.top,
            width: currentBox.width,
            height: currentBox.height,
          }}
        />
      )}
    </div>
  );
};

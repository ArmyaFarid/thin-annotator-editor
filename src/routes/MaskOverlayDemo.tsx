import React, {useRef, useState, useEffect} from 'react';
import {graphql, useLazyLoadQuery, useMutation} from 'react-relay';
import {MaskOverlayDemoImageDefImgQuery} from '@/routes/__generated__/MaskOverlayDemoImageDefImgQuery.graphql.ts';
import {decode} from '@/jscocotools/mask.ts';

interface RLEMask {
  counts: string;
  size: [number, number];
}

interface Mask {
  id: number;
  label: string;
  point_labels: number[];
  point_coords: [number, number][];
  rleMask: RLEMask;
  color: {r: number; g: number; b: number; a: number};
}

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

const MaskOverlayDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [counter, setCounter] = useState(1);
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
  };

  const removeMask = (id: number) => {
    setMasks(prev => prev.filter(m => m.id !== id));
  };

  const data = useLazyLoadQuery<MaskOverlayDemoImageDefImgQuery>(
    graphql`
      query MaskOverlayDemoImageDefImgQuery {
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

  const imgW = data.defaultImage?.width ?? 1280;
  const imgH = data.defaultImage?.height ?? 720;
  useEffect(() => {
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

  const StartSessionMutation = graphql`
    mutation MaskOverlayDemoStartSessionMutation($input: StartSessionInput!) {
      startSessionImage(input: $input) {
        sessionId
      }
    }
  `;

  const AddPointsMutation = graphql`
    mutation MaskOverlayDemoAddPointsMutation($input: AddPointsImageInput!) {
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

  const [sessionId, setSessionId] = useState<string>();

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
    if (data.defaultImage.url) {
      startSession(data.defaultImage.path, sessionId =>
        setSessionId(sessionId),
      );
    }
    console.log('starting.....');
  }

  const click = (x: number, y: number) => {
    if (!sessionId) {
      return;
    }

    // Generate random x,y respecting image size
    let randomX = Math.floor(Math.random() * imgW);
    let randomY = Math.floor(Math.random() * imgH);

    if (x) {
      randomX = x;
      randomY = y;
    }

    commitPoint({
      variables: {
        input: {
          sessionId,
          objectId: 1, // Hardcoded for this demo
          points: [[randomX, randomY]],
          labels: [1],
        },
      },
      onCompleted: (res: any) => {
        // Just take the first mask returned
        const firstMask = res.addPointsImage.rleMaskList[0]?.rleMask;
        if (firstMask) {
          try {
            console.log(firstMask);
            addMask(firstMask, [[x, y]], [1]);
          } catch (e) {
            console.log(e);
          }
        }
      },
    });
  };

  useEffect(() => {
    console.log(data);
  }, [data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    // Find the image element inside the clicked container
    const img = container.querySelector('img');

    if (!img) {
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

    // 3. Apply the scale to get the "Real" coordinates
    // This matches the coordinates needed for your mask logic / backend
    const realX = Math.floor(displayX * scaleX);
    const realY = Math.floor(displayY * scaleY);

    console.log(`Click on Screen: ${displayX}x${displayY}`);
    console.log(`Mapped to Image: ${realX}x${realY}`);

    // Now you can use realX and realY to interact with your mask arrays
    click(realX, realY);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        fontFamily: 'sans-serif',
      }}>
      {/* Left Side: Canvas Preview */}

      <div
        style={{position: 'relative', overflow: 'hidden', width: '900px'}}
        onClick={handleClick}>
        <img
          src={data.defaultImage.url}
          style={{display: 'block', width: '100%', height: 'auto'}}
          alt="background"
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
      </div>

      {/* Right Side: Object List */}
      <div style={{width: '250px'}}>
        <button
          disabled={isInFlight}
          onClick={sessionStart}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            cursor: 'pointer',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}>
          Start session
        </button>
        {/*<button*/}
        {/*  onClick={addMask}*/}
        {/*  style={{*/}
        {/*    width: '100%',*/}
        {/*    padding: '10px',*/}
        {/*    marginBottom: '10px',*/}
        {/*    cursor: 'pointer',*/}
        {/*    background: '#007bff',*/}
        {/*    color: 'white',*/}
        {/*    border: 'none',*/}
        {/*    borderRadius: '4px',*/}
        {/*  }}>*/}
        {/*  + Add Object*/}
        {/*</button>*/}

        <button
          onClick={() => click(0, 0)}
          disabled={isAddingPoint}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            cursor: 'pointer',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}>
          + click image
        </button>

        <div
          style={{
            maxHeight: '310px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}>
          {masks.length === 0 && (
            <p style={{padding: '10px', color: '#999'}}>No objects detected.</p>
          )}
          {masks.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom: '1px solid #eee',
              }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: `rgba(${m.color.r},${m.color.g},${m.color.b},1)`,
                  }}
                />
                <span>{m.label}</span>
              </div>
              <button
                onClick={() => removeMask(m.id)}
                style={{
                  background: '#ff4d4f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '2px 8px',
                }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MaskOverlayDemo;

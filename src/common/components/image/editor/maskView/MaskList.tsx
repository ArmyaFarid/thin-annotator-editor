import {useAtom} from 'jotai';
import {
  currentMaskAtom,
  editorOnAtom,
  Mask,
  masksAtom,
  Prompt,
  promptsAtom,
  sessionIdAtom,
} from '@/app/atom.ts';

export default function MaskList() {
  const [masks, setMasks] = useAtom(masksAtom);
  const [prompts, setPrompts] = useAtom(promptsAtom);
  const [currentMask, setCurrentMask] = useAtom(currentMaskAtom);
  const [, setEditorOn] = useAtom(editorOnAtom);
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);

  function maskToPrompts(mask: Mask): Prompt[] {
    return mask.point_coords.map((coord, i) => ({
      id: i,
      type: 'select-add', // or infer if you store it
      point_labels: mask.point_labels[i],
      point_coords: coord,
    }));
  }

  function handleMaskClick(maskId: number) {
    const mask = masks.find(m => m.id === maskId);
    if (!mask) {
      return;
    }

    setPrompts(maskToPrompts(mask));
    setCurrentMask(mask.id);
    setEditorOn(true);
  }

  const activeMask =
    currentMask !== 0 ? masks.find(m => m.id === currentMask) : null;

  return (
    <div className="h-full w-full flex flex-col bg-secondary border border-white/20 rounded-md p-2 gap-2">
      {!sessionId && (
        <button
          onClick={() => {
            setSessionId('START_SESSION');
            setEditorOn(true);
          }}
          className="
            w-full mt-3
            rounded-md
            border border-white/20
            py-2
            text-sm
            hover:bg-[#2F2F2F]
            transition
          ">
          Commencer la session
        </button>
      )}

      {/* ===== EDIT MODE ===== */}
      {currentMask !== 0 && activeMask && (
        <>
          {/* Metadata */}
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: `rgba(${activeMask.color.r},${activeMask.color.g},${activeMask.color.b},${activeMask.color.a})`,
              }}
            />
            <textarea
              className="flex-1 bg-transparent border border-white/20 rounded px-2 py-1 text-sm resize-none"
              placeholder="Nom du minerai"
              value={activeMask.label}
              onChange={e =>
                setMasks(prev =>
                  prev.map(m =>
                    m.id === activeMask.id ? {...m, label: e.target.value} : m,
                  ),
                )
              }
            />
          </div>

          {/* Prompt list */}
          <div className="flex-1 overflow-auto border border-white/10 rounded p-2 text-sm">
            {prompts.map(p => (
              <div
                key={p.id}
                className="flex justify-between border-b border-white/10 py-1">
                <span>ID {p.id}</span>
                <span>
                  ({p.point_coords[0]}, {p.point_coords[1]})
                </span>
              </div>
            ))}
          </div>

          {/* Save */}
          <button
            className="mt-2 bg-[#2F2F2F] hover:bg-[#3A3A3A] text-sm py-2 rounded"
            onClick={() => {
              setPrompts([]);
              setCurrentMask(0);
              setEditorOn(false);
            }}>
            Enregistrer
          </button>
        </>
      )}

      {/* ===== LIST MODE ===== */}
      {currentMask === 0 && (
        <>
          <div className="flex-1 overflow-auto">
            {masks.map(mask => (
              <button
                key={mask.id}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-[#2F2F2F]"
                onClick={() => handleMaskClick(mask.id)}>
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: `rgba(${mask.color.r},${mask.color.g},${mask.color.b},${mask.color.a})`,
                  }}
                />
                <span className="text-sm truncate">
                  {mask.label || 'Sans nom'}
                </span>
              </button>
            ))}
          </div>

          {/* Add object */}
          <button
            className="mt-2 border border-white/20 text-sm py-2 rounded hover:bg-[#2F2F2F]"
            onClick={() => setEditorOn(true)}>
            Ajouter un objet
          </button>
        </>
      )}
    </div>
  );
}

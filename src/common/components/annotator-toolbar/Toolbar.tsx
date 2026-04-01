import React from 'react';
import SelectAddIcon from '@/assets/icons/select-add.svg?react';
import SelectRemoveIcon from '@/assets/icons/select-remove.svg?react';
import BoundingBox from '@/assets/icons/bounding-box.svg?react';
import ZoomIn from '@/assets/icons/zoom-in.svg?react';
import ZoomOut from '@/assets/icons/zoom-out.svg?react';
import {Tool} from '@/app/types.ts';
import useAnnotatorToolbar from '@/common/components/annotator-toolbar/useAnnotatorToolbar.ts';
import {TOOLS} from '@/app/AppConfig.tsx';
import FilterGammaToolbarPanel from '@/common/components/annotator-toolbar/FilterGammaToolbarPanel.tsx';

export const TOOL_ICONS: Record<
  Tool,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  'select-add': SelectAddIcon,
  'select-remove': SelectRemoveIcon,
  'bounding-box': BoundingBox,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
};

interface ToolbarProps {}

export const Toolbar: React.FC<ToolbarProps> = () => {
  const [activeTool, setActiveTool] = useAnnotatorToolbar();

  return (
    <div className="flex flex-col items-center gap-2 p-2 rounded-xl bg-secondary w-16">
      {TOOLS.map(tool => {
        const active = activeTool === tool;

        return (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className={`
              flex items-center justify-center
              w-12 h-12 rounded-lg
              transition-colors
              ${active ? 'bg-[#2F2F2F]' : 'bg-transparent'}
            `}>
            <PlaceholderIcon active={active} tool={tool} />
          </button>
        );
      })}
      <FilterGammaToolbarPanel />
    </div>
  );
};

interface PlaceholderIconProps {
  active: boolean;
  tool: Tool;
}

// const PlaceholderIcon: React.FC<PlaceholderIconProps> = ({active, tool}) => {
//   const Icon = TOOL_ICONS[tool];
//
//   return (
//     <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
//       <rect
//         x="2"
//         y="2"
//         width="16"
//         height="16"
//         rx="3"
//         fill={active ? '#4FC3F7' : '#B8B8B8'}
//       />
//     </svg>
//   );
// };

const FallbackSquare: React.FC<{active: boolean}> = ({active}) => (
  <svg
    viewBox="0 0 20 20"
    className={`
      w-5 h-5
      transition-colors
      ${active ? 'fill-[#4FC3F7]' : 'fill-[#B8B8B8]'}
    `}>
    <rect x="2" y="2" width="16" height="16" rx="3" />
  </svg>
);

export const PlaceholderIcon: React.FC<PlaceholderIconProps> = ({
  tool,
  active,
}) => {
  const Icon = TOOL_ICONS[tool];

  if (!Icon) {
    return <FallbackSquare active={active} />;
  }

  return (
    <Icon
      className={`
        w-5 h-5
        transition-colors
        ${active ? 'text-[#4FC3F7]' : 'text-[#B8B8B8]'}
      `}
    />
  );
};

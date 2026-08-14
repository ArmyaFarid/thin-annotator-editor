import {Tool} from '@/app/types.ts';

export const VIDEO_API_ENDPOINT = 'http://localhost:7263';
export const IMAGE_API_ENDPOINT = 'http://localhost:7263';
export const INFERENCE_API_ENDPOINT = 'http://localhost:7263';

export const TOOLS: Tool[] = [
    'idle',
    'select-add',
    'select-remove',
    'bounding-box',
    'freeform-draw',
    'polygon-lasso',
    'slic-bbox',
    'zoom-in',
    'zoom-out',
    'grab',
];

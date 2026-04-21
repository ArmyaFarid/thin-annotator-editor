import {type ErrorObject} from 'serialize-error';

export type RenderingErrorType = 'error';

export function getRenderErrorType(_error?: ErrorObject): RenderingErrorType {
    return 'error';
}

export function getErrorTitle({message}: Error): string {
    const idx = message.indexOf('\n');
    return idx < 0 ? message : message.substring(0, idx);
}

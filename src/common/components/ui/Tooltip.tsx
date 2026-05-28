import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
    /** Text or JSX shown when the trigger is hovered or focused. */
    content: React.ReactNode;
    /** The element the tooltip points at. Must be a single React node that accepts a ref. */
    children: React.ReactNode;
    /** Tooltip side relative to the trigger. Defaults to "top". */
    side?: "top" | "right" | "bottom" | "left";
    /** Alignment along the side. Defaults to "center". */
    align?: "start" | "center" | "end";
    /**
     * Override the delay before the tooltip shows, in ms.
     * When omitted, the global `TooltipPrimitive.Provider.delayDuration`
     * (currently 800 ms — intentional "long hover") is used.
     */
    delayMs?: number;
    /** Optional short keyboard hint rendered as a small badge next to the label. */
    shortcut?: string;
}

/**
 * App-wide tooltip wrapper around Radix's primitive.
 * Styled to match the dark UI; keyboard-accessible by default.
 *
 * The shared `TooltipPrimitive.Provider` is mounted once at App.tsx, so this
 * component can be used anywhere without extra setup.
 */
export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    side = "top",
    align = "center",
    delayMs,
    shortcut,
}) => (
    <TooltipPrimitive.Root delayDuration={delayMs}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                side={side}
                align={align}
                sideOffset={6}
                className="z-50 max-w-xs px-2 py-1 rounded text-xs leading-snug bg-black/90 text-white border border-white/15 shadow-lg flex items-center gap-2 select-none">
                <span>{content}</span>
                {shortcut ? (
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 border border-white/15 text-white/80 font-mono">
                        {shortcut}
                    </kbd>
                ) : null}
                <TooltipPrimitive.Arrow className="fill-black/90" />
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
);

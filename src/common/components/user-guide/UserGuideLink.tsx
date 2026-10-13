import React from "react";
import {getLang} from "@/i18n/index.ts";

interface UserGuideLinkProps
    extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    section?: string;
}

// The guide is static HTML copied into public/guide by scripts/copy-guide.mjs.
// A new tab keeps the task open in this one. forwardRef and the spread props
// let it sit inside Tooltip, whose trigger uses asChild.
export const UserGuideLink = React.forwardRef<HTMLAnchorElement, UserGuideLinkProps>(
    ({section, children, ...rest}, ref) => {
        const page = getLang() === "fr" ? "index.fr.html" : "index.html";
        const href = `/guide/${page}${section ? `#${section}` : ""}`;

        return (
            <a ref={ref} href={href} target="_blank" rel="noopener" {...rest}>
                {children}
            </a>
        );
    },
);
UserGuideLink.displayName = "UserGuideLink";

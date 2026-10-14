// Copies the static user guide into public/ so Vite serves it at /guide/.
import {cpSync, rmSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "docs/user-guide");
const dest = resolve(root, "public/guide");

rmSync(dest, {recursive: true, force: true});
cpSync(src, dest, {recursive: true});
console.log("User guide copied to public/guide");

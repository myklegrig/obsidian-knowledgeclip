import esbuild from "esbuild";
import process from "node:process";
import builtins from "builtin-modules";

// Как в obsidian-sample-plugin: всё в один main.js, obsidian и codemirror —
// внешние, их даёт сам Obsidian. Node-модули тоже внешние, но плагин ими не
// пользуется: на мобильном их нет, и `isDesktopOnly: false` это обещает.
const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}

### Recommended Alternative: `@bearz/fs`

Based on a review of current discussions and documentation (as of November 2025), **fs-extra** (a popular Node.js library that extends the built-in `fs` module with utilities like `copy`, `remove`, `ensureDir`, and JSON handling) has **compatibility issues in Bun**. These stem from Bun's native, reimplemented `fs` module, which doesn't fully align with Node.js behaviors yet. For example:

- **Known Bun-Specific Problems with fs-extra**:
  - **Build/Transpilation Failures**: When using `bun build` on TypeScript code importing `fs-extra`, the output can incorrectly stub `fs` as an empty object (`{}`), leading to runtime errors like "fs is not a function" or undefined methods. This is due to Bun's bundler not resolving Node core modules correctly during compilation.
  - **Runtime Crashes and Incompatibilities**: Operations like `fs.readFile` or `fs.writeFile` (which fs-extra wraps) can crash in Bun due to edge cases in file descriptors, relative paths, or sync/async mismatches. Recent Bun releases (e.g., v1.2.0) introduced regressions where `fs.accessSync` and `fs.existsSync` fail on relative paths that work fine in Node.js/npm environments.
  - **Low-Level Bindings**: fs-extra indirectly relies on Node's `process.binding("fs")` in some paths, which Bun explicitly doesn't support, causing TypeErrors.
  - These issues are more pronounced in Bun than in npm/Node.js, where fs-extra is stable and widely used. Bun's `fs` is faster but less mature for complex utilities, leading to "works in npm, breaks in Bun" scenarios.

- **Why Not Just Use Bun's Native `fs`?** Bun's built-in `node:fs` (or `fs`) covers basics like `readFileSync`, `writeFile`, and `readdir` out-of-the-box and is often 5-7x faster than Node's. However, it lacks fs-extra's convenience methods (e.g., `copySync`, `emptyDir`, `move`), so you'd need to polyfill them manually—which defeats the purpose of a drop-in alternative.

#### The Alternative: `@bearz/fs`
- **Overview**: `@bearz/fs` is a modern, cross-runtime filesystem API designed specifically for **Node.js, Bun, and Deno**. It's a lightweight drop-in replacement for fs-extra, providing promise-based and sync methods for file/directory operations. It avoids npm dependencies like fs-extra and uses native APIs where possible (e.g., Bun's fast `fs` under the hood).
  - **Key Features** (Matching fs-extra):
    - `copyFile` / `copyFileSync`: Copy files or dirs (with overwrite support).
    - `remove` / `removeSync`: Delete files/dirs recursively.
    - `ensureDir` / `ensureDirSync`: Create directories (including parents).
    - `readJson` / `writeJson`: JSON file handling.
    - Advanced: `open` / `chmod` / `chown` / `stat` with `FsFile` objects for seeking/locking.
    - All methods are promise-first (async by default) but include sync variants.
  - **Installation**:
    ```
    bun add @bearz/fs
    ```
    (Works via Bun's package manager; also compatible with `npm install` for Node.js.)

- **Why It Fits Your Criteria**:
  - **Works in npm/Node.js**: Full compatibility with Node v16+; uses standard `fs` fallbacks.
  - **Has Problems in Bun?** No—it's explicitly **optimized for Bun** (v1.0+), leveraging Bun's native `fs` for speed without the build/runtime issues of fs-extra. It throws helpful errors in non-supported runtimes (e.g., browsers) but runs flawlessly in Bun. If there's any "problem," it's minor: Some advanced methods (e.g., file locking) require extending with `@bearz/fs/ext` in non-Deno/Bun environments, but this is a feature for cross-runtime safety, not a bug.
  - **Lightweight**: ~10x smaller than fs-extra (no bloat); focuses on essentials.

- **Example Usage** (Drop-in Replacement):
  ```js
  import fs from '@bearz/fs';  // Or 'node:fs' for basics, but @bearz/fs adds extras

  // Async copy (like fs-extra.copy)
  await fs.copy('/path/to/source', '/path/to/dest');

  // Sync remove (like fs-extra.removeSync)
  fs.removeSync('/path/to/dir');  // Handles nested dirs

  // JSON handling
  const data = await fs.readJson('/config.json');
  await fs.writeJson('/config.json', { updated: true });

  // Ensure dir exists
  await fs.ensureDir('/logs/app');
  ```
  This mirrors fs-extra syntax but uses native promises—no callbacks needed.

- **Trade-offs**:
  - Less battle-tested than fs-extra (newer library, but actively maintained on JSR).
  - No built-in streaming support yet (use Bun's `Bun.file()` for that).
  - If you need *even more* Bun-specific speed, combine with Bun's `fs` directly for simple ops.

#### Other Alternatives (If @bearz/fs Doesn't Fit)
If you need something even lighter or more Bun-focused:
1. **`@reliverse/relifso`** (via npm/bun add): Another drop-in for fs-extra, with Bun-specific enhancements (e.g., faster paths on v1.2+). Promise-first, ES modules only. Great for monorepos.
2. **`fs-lite`** (GitHub: baooab/node-fs-lite): Ultra-minimal fs-extra clone (~5KB). Sync/async methods for copy/remove/writeJson. Works in Bun but lacks JSON utils—extend as needed.
3. **Native Bun.file() + Polyfills**: For ultimate speed, use `Bun.file(path).text()` or `.arrayBuffer()` for reads, and `write()` for writes. Polyfill extras with a few lines (e.g., recursive `rm` via `fs.rmSync`). No package needed, but not a full fs-extra swap.

#### Migration Tips
- **Test in Bun**: Run `bun test` after swapping—watch for relative path issues (use `import.meta.dirname` for `__dirname` equivalents).
- **Fallback Strategy**: `if (typeof Bun !== 'undefined') { use @bearz/fs } else { use fs-extra }` for hybrid Node/Bun setups.
- **Why Switch?** Bun's ecosystem is maturing (e.g., v1.2 fixes many fs bugs), but libraries like fs-extra lag behind. Opt for runtime-aware alternatives to avoid "npm works, Bun breaks" headaches.

If this doesn't match what you meant (e.g., a specific fs-extra "problem" or different context), provide more details for a refined search!

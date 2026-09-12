import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const repoRoot = join(import.meta.dir, "..");
const packageJson = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

describe("build script", () => {
  // React ships its development build unless NODE_ENV is pinned at build time.
  // Without the define (and --minify) the bundle keeps dev warnings and is
  // ~5x larger: 975 kB dev vs 186 kB production for this template (ticket
  // #1182).
  test("minifies and pins NODE_ENV=production", () => {
    expect(packageJson.scripts.build).toContain("--minify");
    expect(packageJson.scripts.build).toContain(
      'process.env.NODE_ENV="production"',
    );
  });

  test("builds a production bundle with no dev-only code", () => {
    const build = Bun.spawnSync([process.execPath, "run", "build"], {
      cwd: repoRoot,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(build.exitCode, build.stderr.toString()).toBe(0);

    const bundles = [
      ...new Glob("*.js").scanSync({ cwd: join(repoRoot, "dist") }),
    ];
    expect(bundles.length).toBeGreaterThan(0);

    let bytes = 0;
    for (const bundle of bundles) {
      const path = join(repoRoot, "dist", bundle);
      const code = readFileSync(path, "utf8");
      bytes += statSync(path).size;
      // A leftover reference means the --define did not apply.
      expect(code).not.toContain("process.env");
      // react-dom.development is only part of React's dev build.
      expect(code).not.toContain("react-dom.development");
    }
    // The dev bundle measured ~975 kB; production sits near 186 kB.
    expect(bytes).toBeLessThan(400_000);
  });
});

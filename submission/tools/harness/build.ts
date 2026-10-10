// Builds the screenshot harness into submission/tools/harness/dist.
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { build } from "@canva/app-scripts";

async function main() {
  const here = __dirname;
  await build({ configFile: "./submission/tools/harness/harness.config.ts" });
  const dist = path.join(here, "dist");
  fs.cpSync(path.join(here, "public"), dist, { recursive: true });
  fs.writeFileSync(
    path.join(dist, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>QRX panel</title>
    <style>
      html, body { margin: 0; height: 100%; background: #ffffff; }
      body[data-theme="dark"] { background: #252627; }
      /* Canva's panel gives the app a left gutter; the app adds the rest. */
      #root { height: 100%; box-sizing: border-box; padding-left: 16px; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="app.js"></script>
  </body>
</html>
`,
  );
  console.log(`Harness built in ${dist}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

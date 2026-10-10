import { defineConfig } from "@canva/app-scripts";
import { loadDotEnv } from "./scripts/env";
import { readQrxConfig } from "./utils/qrx_config";

export default defineConfig({
  config: (config, { mode }) => {
    loadDotEnv(__dirname);
    const qrx = readQrxConfig(process.env, {
      production: mode === "production",
    });

    return {
      ...config,
      source: {
        ...config.source,
        define: {
          ...config.source?.define,
          QRX_CONFIG: JSON.stringify(qrx),
        },
      },
    };
  },
});

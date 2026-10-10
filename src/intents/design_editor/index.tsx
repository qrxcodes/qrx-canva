import "@canva/app-ui-kit/styles.css";
import { AppI18nProvider } from "@canva/app-i18n-kit";
import { AppUiProvider } from "@canva/app-ui-kit";
import type { DesignEditorIntent } from "@canva/intents/design";
import type { Oauth } from "@canva/user";
import { createRoot } from "react-dom/client";
import { initQrxOauth } from "src/auth/use_qrx_auth";
import { config } from "src/config";
import { App } from "./app";

let oauth: Oauth | undefined;

async function render() {
  // OAuth is set up inside the intent, never at module load (Canva's rule).
  oauth ??= initQrxOauth(config);
  const root = createRoot(document.getElementById("root") as Element);

  root.render(
    <AppI18nProvider>
      <AppUiProvider>
        <App oauth={oauth} />
      </AppUiProvider>
    </AppI18nProvider>,
  );
}

const designEditor: DesignEditorIntent = { render };
export default designEditor;

if (module.hot) {
  module.hot.accept("./app", render);
}

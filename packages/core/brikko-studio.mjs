#!/usr/bin/env node
import { runStudio } from "./dist/studio/entrypoint.js";

const PORT = Number(process.env.BRIKKO_PORT ?? "3737");
const GATEWAY = process.env.BRIKKO_GATEWAY ?? "https://api.brikko.ru";
const WEB_UI_DIST = process.env.BRIKKO_WEB_UI_DIST ?? "/srv/web-ui/dist";

runStudio({ port: PORT, gatewayBase: GATEWAY, webUiDist: WEB_UI_DIST }).catch((err) => {
  console.error("brikko-studio failed to start:", err);
  process.exit(1);
});

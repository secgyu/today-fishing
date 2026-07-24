import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "today-fishing",
  brand: {
    displayName: "오늘출조",
    primaryColor: "#2F80ED",
    icon: "https://static.toss.im/appsintoss/45211/a2fcea0d-ac86-4cf5-ab9c-c4bdd3c4c270.png",
  },
  web: {
    host: "192.168.0.14",
    port: 5173,
    commands: {
      dev: "vite dev --host", // 0.0.0.0 바인딩 — 외부 기기 접속 허용
      build: "vite build",
    },
  },
  permissions: [{ name: "geolocation", access: "access" }],
  webViewProps: {
    type: "partner", // 비게임
  },
  outdir: "dist",
});

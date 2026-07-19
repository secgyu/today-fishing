import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "today-fishing",
  brand: {
    displayName: "오늘출조", // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: "#9575CD", // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: "", // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  web: {
    // 실기기 테스트: 폰이 접속할 수 있도록 Mac LAN IP 사용 (같은 Wi-Fi 필수)
    host: "192.168.0.14",
    port: 5173,
    commands: {
      dev: "vite dev --host", // 0.0.0.0 바인딩 — 외부 기기 접속 허용
      build: "vite build",
    },
  },
  permissions: [{ name: "geolocation", access: "access" }],
  outdir: "dist",
});

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 전역 에러 핸들러 추가
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  console.log("[MEMOWAY] React app mounting...");
  createRoot(rootElement).render(<App />);
  console.log("[MEMOWAY] React app mounted");
} catch (error) {
  console.error("Failed to render app:", error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; text-align: center; padding: 20px;">
      <div>
        <h1 style="color: #dc2626; margin-bottom: 10px;">앱 로딩 실패</h1>
        <p style="color: #666;">앱을 시작하는 중 오류가 발생했습니다.</p>
        <pre style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: left; overflow-x: auto;">
${error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    </div>
  `;
}

import { useEffect, useRef } from "react";

function getWebSocketUrl(): string {
  // Capacitor 환경 감지
  const isCapacitor = !!(window as any).Capacitor;
  
  if (isCapacitor) {
    // Capacitor 환경: Replit 배포 URL 사용
    const replitUrl = import.meta.env.VITE_REPLIT_URL || 'https://your-repl-url.replit.dev';
    return replitUrl.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws';
  }
  
  // 웹 브라우저 환경: 상대 경로 사용
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [onMessage]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { send };
}

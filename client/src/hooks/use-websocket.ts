import { useEffect, useRef, useState } from "react";

function getWebSocketUrl(): string {
  // Capacitor 네이티브 환경 감지 (더 안전한 방법)
  const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
  
  if (isNativePlatform) {
    // Capacitor 네이티브 환경: Replit 배포 URL 사용
    const replitUrl = import.meta.env.VITE_REPLIT_URL;
    
    if (!replitUrl) {
      console.error('VITE_REPLIT_URL is not configured. Set it in .env file.');
      throw new Error('VITE_REPLIT_URL environment variable is required for native app builds');
    }
    
    // URL 파싱 및 안전한 WebSocket URL 생성
    try {
      const url = new URL(replitUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      // trailing slash 제거
      const hostname = url.host;
      const pathname = url.pathname.replace(/\/$/, '');
      return `${wsProtocol}//${hostname}${pathname}/ws`;
    } catch (error) {
      console.error('Invalid VITE_REPLIT_URL:', replitUrl);
      throw new Error('VITE_REPLIT_URL must be a valid URL');
    }
  }
  
  // 웹 브라우저 환경: 상대 경로 사용
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    let shouldReconnect = true;

    const connect = () => {
      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // 연결 성공 시 재시도 카운터 리셋
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
          setIsConnected(false);
          
          // 자동 재연결 (exponential backoff)
          if (shouldReconnect) {
            const maxAttempts = 10;
            const baseDelay = 1000; // 1초
            const maxDelay = 30000; // 30초
            
            if (reconnectAttemptsRef.current < maxAttempts) {
              const delay = Math.min(
                baseDelay * Math.pow(2, reconnectAttemptsRef.current),
                maxDelay
              );
              
              console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxAttempts})`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttemptsRef.current++;
                connect();
              }, delay);
            } else {
              console.error("Max reconnection attempts reached. Please refresh the page.");
            }
          }
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    connect();

    return () => {
      shouldReconnect = false; // cleanup 시 재연결 중지
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [onMessage]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", data);
    }
  };

  return { send, isConnected };
}

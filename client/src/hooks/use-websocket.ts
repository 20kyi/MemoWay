import { useEffect, useRef, useState, useCallback } from "react";

/**
 * WebSocket URL을 안전하게 생성하는 함수
 * 모든 엣지 케이스를 처리하여 undefined나 잘못된 URL이 생성되지 않도록 보장
 */
function getWebSocketUrl(): string {
  // Capacitor 네이티브 환경 감지 (더 안전한 방법)
  const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
  
  if (isNativePlatform) {
    // Capacitor 네이티브 환경: Replit 배포 URL 사용
    const replitUrl = import.meta.env.VITE_REPLIT_URL;
    
    if (!replitUrl || typeof replitUrl !== 'string') {
      const errorMsg = 'VITE_REPLIT_URL is not configured. Set it in .env file.';
      console.error('[WebSocket]', errorMsg);
      throw new Error(errorMsg);
    }
    
    // URL 파싱 및 안전한 WebSocket URL 생성
    try {
      const url = new URL(replitUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = url.hostname || url.host;
      
      if (!hostname) {
        throw new Error('Invalid hostname in VITE_REPLIT_URL');
      }
      
      // 포트 처리: URL에 포트가 있으면 사용, 없으면 프로토콜에 따라 기본 포트
      let port = url.port;
      if (!port) {
        port = wsProtocol === 'wss:' ? '443' : '80';
      }
      
      // 기본 포트는 생략 (브라우저가 자동 처리)
      const portPart = (wsProtocol === 'wss:' && port === '443') || 
                       (wsProtocol === 'ws:' && port === '80')
                       ? '' : `:${port}`;
      
      const pathname = url.pathname.replace(/\/$/, '');
      const wsUrl = `${wsProtocol}//${hostname}${portPart}${pathname}/ws`;
      
      console.log('[WebSocket] Native platform URL:', wsUrl);
      return wsUrl;
    } catch (error) {
      const errorMsg = `Invalid VITE_REPLIT_URL: ${replitUrl}. ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[WebSocket]', errorMsg);
      throw new Error(errorMsg);
    }
  }
  
  // 웹 브라우저 환경: 현재 페이지의 호스트 정보를 사용
  try {
    // window.location의 각 속성을 안전하게 추출
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // 유효성 검증
    if (!protocol || !hostname) {
      throw new Error('Invalid window.location: protocol or hostname is missing');
    }
    
    // 프로토콜 결정 (https -> wss, http -> ws)
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    
    // 포트 처리: 명시적으로 포트가 있으면 사용, 없으면 기본 포트
    let portNumber: string | undefined = port;
    
    // 포트가 없거나 빈 문자열인 경우 기본 포트 사용
    if (!portNumber || portNumber === '') {
      portNumber = wsProtocol === 'wss:' ? '443' : '80';
    }
    
    // 기본 포트는 생략 (브라우저가 자동 처리)
    // 단, 개발 환경에서는 명시적으로 포트를 포함하는 것이 안전
    const isDevelopment = import.meta.env.DEV;
    const portPart = (wsProtocol === 'wss:' && portNumber === '443') || 
                     (wsProtocol === 'ws:' && portNumber === '80')
                     ? (isDevelopment ? `:${portNumber}` : '') 
                     : `:${portNumber}`;
    
    const wsUrl = `${wsProtocol}//${hostname}${portPart}/ws`;
    
    // URL 유효성 검증
    try {
      new URL(wsUrl); // URL 생성 가능 여부 확인
    } catch {
      throw new Error(`Invalid WebSocket URL constructed: ${wsUrl}`);
    }
    
    console.log('[WebSocket] Browser URL:', wsUrl, { protocol, hostname, port, isDevelopment });
    return wsUrl;
  } catch (error) {
    const errorMsg = `Failed to construct WebSocket URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[WebSocket]', errorMsg, {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      host: window.location.host,
    });
    throw new Error(errorMsg);
  }
}

/**
 * WebSocket 연결을 관리하는 커스텀 훅
 * 자동 재연결, 에러 핸들링, 메모리 누수 방지 등 모든 엣지 케이스를 처리
 */
export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const shouldReconnectRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const [isConnected, setIsConnected] = useState(false);

  // onMessage 변경 시 ref 업데이트 (의존성 배열 최적화)
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;

    let wsUrl: string;
    
    // WebSocket URL 생성 (에러 발생 시 graceful degradation)
    try {
      wsUrl = getWebSocketUrl();
    } catch (error) {
      console.error('[WebSocket] Failed to get WebSocket URL:', error);
      // URL 생성 실패 시 연결 시도하지 않음
      return;
    }

    const connect = () => {
      // 컴포넌트가 언마운트되었거나 재연결이 비활성화된 경우 중단
      if (!isMountedRef.current || !shouldReconnectRef.current) {
        return;
      }

      // 기존 연결이 있으면 정리
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN || 
              wsRef.current.readyState === WebSocket.CONNECTING) {
            wsRef.current.close();
          }
        } catch (error) {
          console.warn('[WebSocket] Error closing existing connection:', error);
        }
        wsRef.current = null;
      }

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMountedRef.current) {
            socket.close();
            return;
          }
          
          console.log('[WebSocket] Connected successfully to:', wsUrl);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // 연결 성공 시 재시도 카운터 리셋
        };

        socket.onmessage = (event) => {
          if (!isMountedRef.current) {
            return;
          }

          try {
            // 빈 메시지 처리
            if (!event.data || typeof event.data !== 'string') {
              console.warn('[WebSocket] Received invalid message:', event.data);
              return;
            }

            const data = JSON.parse(event.data);
            // onMessage는 ref를 통해 최신 버전 사용
            onMessageRef.current(data);
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error, {
              data: event.data,
              type: typeof event.data,
            });
          }
        };

        socket.onerror = (error) => {
          // 에러 이벤트는 상세 정보가 제한적이므로 로그만 남김
          console.error('[WebSocket] Connection error:', {
            url: wsUrl,
            readyState: socket.readyState,
            error,
          });
        };

        socket.onclose = (event) => {
          if (!isMountedRef.current) {
            return;
          }

          console.log('[WebSocket] Disconnected:', {
            code: event.code,
            reason: event.reason || 'No reason provided',
            wasClean: event.wasClean,
          });
          
          setIsConnected(false);
          
          // 정상 종료(wasClean=true)이거나 재연결이 비활성화된 경우 재연결 시도하지 않음
          if (event.wasClean || !shouldReconnectRef.current) {
            return;
          }

          // 자동 재연결 (exponential backoff with jitter)
          const maxAttempts = 10;
          const baseDelay = 1000; // 1초
          const maxDelay = 30000; // 30초
          
          if (reconnectAttemptsRef.current < maxAttempts) {
            // Exponential backoff with jitter (네트워크 동시성 문제 방지)
            const exponentialDelay = Math.min(
              baseDelay * Math.pow(2, reconnectAttemptsRef.current),
              maxDelay
            );
            // Jitter 추가 (±20%): 여러 클라이언트가 동시에 재연결하는 것을 방지
            const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
            const delay = Math.max(100, exponentialDelay + jitter);
            
            console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && shouldReconnectRef.current) {
                reconnectAttemptsRef.current++;
                connect();
              }
            }, delay);
          } else {
            console.error('[WebSocket] Max reconnection attempts reached. Please refresh the page.');
            // 최대 재시도 횟수 도달 시 사용자에게 알림 (필요시)
          }
        };
      } catch (error) {
        console.error('[WebSocket] Failed to create WebSocket connection:', error);
        setIsConnected(false);
        
        // 생성 실패 시에도 재연결 시도 (네트워크 문제일 수 있음)
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < 10) {
          const delay = 2000; // 2초 후 재시도
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && shouldReconnectRef.current) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        }
      }
    };

    // 초기 연결 시도
    connect();

    // Cleanup 함수: 컴포넌트 언마운트 시 모든 리소스 정리
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      
      // 재연결 타이머 취소
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // WebSocket 연결 종료
      if (wsRef.current) {
        try {
          // 이벤트 핸들러 제거 (메모리 누수 방지)
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          
          // 연결 종료
          if (wsRef.current.readyState === WebSocket.OPEN || 
              wsRef.current.readyState === WebSocket.CONNECTING) {
            wsRef.current.close(1000, 'Component unmounted');
          }
        } catch (error) {
          console.warn('[WebSocket] Error during cleanup:', error);
        } finally {
          wsRef.current = null;
        }
      }
    };
  }, []); // 빈 의존성 배열: onMessage는 ref를 통해 접근

  /**
   * WebSocket을 통해 메시지 전송
   * 연결 상태를 확인하고 안전하게 전송
   */
  const send = useCallback((data: any) => {
    if (!wsRef.current) {
      console.warn('[WebSocket] Cannot send: WebSocket is not initialized');
      return false;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send: WebSocket is not connected', {
        readyState: wsRef.current.readyState,
        data,
      });
      return false;
    }

    try {
      const message = JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error, { data });
      return false;
    }
  }, []);

  return { send, isConnected };
}

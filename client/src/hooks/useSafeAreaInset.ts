import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * safe-area-inset-top 값을 초기에 한 번만 계산하여 고정하고,
 * AppState resume 시에도 동일한 값을 유지하는 hook
 */
export function useSafeAreaInset() {
  const isInitializedRef = useRef(false);
  const computedValueRef = useRef<string>('0px');
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    // safe-area-inset-top 값을 계산하는 함수
    const calculateSafeAreaTop = (): string => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return '0px';
      
      // CSS env() 값을 직접 읽을 수 없으므로, 
      // getComputedStyle을 통해 실제 적용된 값을 가져옴
      const testElement = document.createElement('div');
      testElement.style.position = 'fixed';
      testElement.style.top = '0';
      testElement.style.left = '0';
      testElement.style.paddingTop = 'env(safe-area-inset-top)';
      testElement.style.visibility = 'hidden';
      testElement.style.pointerEvents = 'none';
      testElement.style.width = '1px';
      testElement.style.height = '1px';
      document.body.appendChild(testElement);
      
      const computedStyle = window.getComputedStyle(testElement);
      const paddingTop = computedStyle.paddingTop;
      
      document.body.removeChild(testElement);
      
      // px 값을 추출
      const pxValue = paddingTop === '0px' ? '0px' : paddingTop;
      
      console.log('[useSafeAreaInset] Calculated safe-area-inset-top:', pxValue);
      return pxValue;
    };

    // 초기 계산 (한 번만)
    if (!isInitializedRef.current) {
      // DOM이 완전히 로드된 후 계산
      const initialize = () => {
        const value = calculateSafeAreaTop();
        computedValueRef.current = value;
        isInitializedRef.current = true;
        
        // CSS 변수로 저장 (다른 컴포넌트에서도 사용 가능)
        document.documentElement.style.setProperty('--safe-area-inset-top-fixed', value);
        
        console.log('[useSafeAreaInset] ✅ Initial safe-area-inset-top fixed:', value);
      };

      // DOMContentLoaded 또는 약간의 지연 후 실행
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
        return () => document.removeEventListener('DOMContentLoaded', initialize);
      } else {
        // 이미 로드된 경우 약간의 지연을 두어 렌더링 완료 후 계산
        const timeoutId = setTimeout(initialize, 150);
        return () => clearTimeout(timeoutId);
      }
    }
  }, []);

  // AppState resume 이벤트 감지 (모바일 앱에서만)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = async (state: { isActive: boolean }) => {
      if (state.isActive && isInitializedRef.current) {
        // resume 시 기존 고정된 값을 유지
        const currentFixedValue = computedValueRef.current;
        document.documentElement.style.setProperty('--safe-area-inset-top-fixed', currentFixedValue);
        
        console.log('[useSafeAreaInset] 🔄 App resumed, maintaining fixed safe-area-inset-top:', currentFixedValue);
        
        // 실제 env() 값이 변경되었는지 확인 (디버깅용)
        const testElement = document.createElement('div');
        testElement.style.position = 'fixed';
        testElement.style.top = '0';
        testElement.style.left = '0';
        testElement.style.paddingTop = 'env(safe-area-inset-top)';
        testElement.style.visibility = 'hidden';
        testElement.style.pointerEvents = 'none';
        testElement.style.width = '1px';
        testElement.style.height = '1px';
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const currentEnvValue = computedStyle.paddingTop;
        document.body.removeChild(testElement);
        
        if (currentEnvValue !== currentFixedValue) {
          console.warn('[useSafeAreaInset] ⚠️ env(safe-area-inset-top) changed on resume:', {
            fixed: currentFixedValue,
            current: currentEnvValue,
            maintaining: currentFixedValue
          });
        } else {
          console.log('[useSafeAreaInset] ✅ env(safe-area-inset-top) unchanged on resume');
        }
      }
    };

    App.addListener('appStateChange', handleAppStateChange).then((listener) => {
      listenerRef.current = listener;
    });

    return () => {
      if (listenerRef.current) {
        App.removeListener(listenerRef.current);
      }
    };
  }, []);

  // viewport resize 이벤트 감지 (추가 안전장치)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const handleResize = () => {
      // resize 시에도 고정된 값을 유지
      const currentFixedValue = computedValueRef.current;
      document.documentElement.style.setProperty('--safe-area-inset-top-fixed', currentFixedValue);
      
      console.log('[useSafeAreaInset] 🔄 Viewport resized, maintaining fixed safe-area-inset-top:', currentFixedValue);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 컴포넌트가 마운트될 때마다 고정된 값 확인 (추가 안전장치)
  useEffect(() => {
    if (isInitializedRef.current && computedValueRef.current) {
      document.documentElement.style.setProperty('--safe-area-inset-top-fixed', computedValueRef.current);
    }
  });
}


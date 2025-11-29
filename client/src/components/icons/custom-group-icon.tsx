import React, { useMemo } from "react";

interface CustomGroupIconProps {
  className?: string;
  size?: number;
  isActive?: boolean;
}

export function CustomGroupIcon({ 
  className = "", 
  size = 24, 
  isActive = false 
}: CustomGroupIconProps) {
  const gradientIds = useMemo(() => {
    const uniqueId = Math.random().toString(36).substring(7);
    return {
      figureGradient: `figureGradient-${uniqueId}`,
      figureHighlight: `figureHighlight-${uniqueId}`,
    };
  }, []);

  // 활성/비활성에 따른 색상 - 라벤더/보라색
  const lavenderColor = isActive ? "#A78BFA" : "#C4B5FD";
  const shadowColor = isActive 
    ? "rgba(167, 139, 250, 0.4)" 
    : "rgba(196, 181, 253, 0.3)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ 
        filter: `drop-shadow(0 2px 4px ${shadowColor})`,
        color: "transparent"
      }}
    >
      <defs>
        {/* 인물 그라데이션 */}
        <linearGradient id={gradientIds.figureGradient} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lavenderColor} stopOpacity="1" />
          <stop offset="100%" stopColor={lavenderColor} stopOpacity="0.9" />
        </linearGradient>
        
        {/* 인물 하이라이트 */}
        <linearGradient id={gradientIds.figureHighlight} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* 뒤쪽 인물 - 부분적으로만 보임 */}
      {/* 뒤쪽 인물의 머리 (구) */}
      <circle
        cx="14"
        cy="8"
        r="3"
        fill={`url(#${gradientIds.figureGradient})`}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.5"
      />
      <ellipse
        cx="14.5"
        cy="7.5"
        rx="1.5"
        ry="1"
        fill={`url(#${gradientIds.figureHighlight})`}
        opacity="0.6"
      />
      
      {/* 뒤쪽 인물의 몸 (돔) */}
      <path
        d="M11 12 Q11 8 14 8 Q17 8 17 12 L17 16 L11 16 Z"
        fill={`url(#${gradientIds.figureGradient})`}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.5"
        opacity="0.85"
      />
      
      {/* 앞쪽 인물 */}
      {/* 앞쪽 인물의 머리 (구) */}
      <circle
        cx="10"
        cy="7"
        r="3.5"
        fill={`url(#${gradientIds.figureGradient})`}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.5"
      />
      <ellipse
        cx="10.5"
        cy="6.5"
        rx="2"
        ry="1.2"
        fill={`url(#${gradientIds.figureHighlight})`}
        opacity="0.6"
      />
      
      {/* 앞쪽 인물의 몸 (돔) */}
      <path
        d="M6.5 13 Q6.5 8 10 8 Q13.5 8 13.5 13 L13.5 18 L6.5 18 Z"
        fill={`url(#${gradientIds.figureGradient})`}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.5"
      />
      <path
        d="M6.5 13 Q6.5 8 10 8 Q13.5 8 13.5 13"
        fill={`url(#${gradientIds.figureHighlight})`}
        opacity="0.5"
      />
    </svg>
  );
}


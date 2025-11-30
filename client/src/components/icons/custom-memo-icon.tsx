import React, { useMemo } from "react";

interface CustomMemoIconProps {
  className?: string;
  size?: number;
  isActive?: boolean;
  color?: string;
}

export function CustomMemoIcon({ 
  className = "", 
  size = 24, 
  isActive = false,
  color
}: CustomMemoIconProps) {
  const gradientIds = useMemo(() => {
    const uniqueId = Math.random().toString(36).substring(7);
    return {
      baseGradient: `baseGradient-${uniqueId}`,
      baseHighlight: `baseHighlight-${uniqueId}`,
      barGradient: `barGradient-${uniqueId}`,
      barHighlight: `barHighlight-${uniqueId}`,
    };
  }, []);

  // 활성/비활성에 따른 색상 - 핑크색 (color prop이 있으면 사용)
  const pinkColor = color || (isActive ? "#FF69B4" : "#FFB6C1");
  const shadowColor = color 
    ? color === "#EB8FA6" 
      ? "rgba(235, 143, 166, 0.4)" 
      : "rgba(255, 105, 180, 0.4)"
    : (isActive 
      ? "rgba(255, 105, 180, 0.4)" 
      : "rgba(255, 182, 193, 0.3)");

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
        {/* 베이스 사각형 그라데이션 */}
        <linearGradient id={gradientIds.baseGradient} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pinkColor} stopOpacity="1" />
          <stop offset="100%" stopColor={pinkColor} stopOpacity="0.9" />
        </linearGradient>
        
        {/* 베이스 하이라이트 */}
        <linearGradient id={gradientIds.baseHighlight} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        
        {/* 바 그라데이션 */}
        <linearGradient id={gradientIds.barGradient} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pinkColor} stopOpacity="1" />
          <stop offset="100%" stopColor={pinkColor} stopOpacity="0.95" />
        </linearGradient>
        
        {/* 바 하이라이트 */}
        <linearGradient id={gradientIds.barHighlight} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* 베이스 사각형 - 둥근 모서리 */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
        ry="4"
        fill={`url(#${gradientIds.baseGradient})`}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.5"
      />
      
      {/* 베이스 하이라이트 */}
      <rect
        x="2"
        y="2"
        width="20"
        height="10"
        rx="4"
        ry="0"
        fill={`url(#${gradientIds.baseHighlight})`}
        opacity="0.7"
      />
      
      {/* 상단 바 (긴) */}
      <rect
        x="5"
        y="7"
        width="14"
        height="2.5"
        rx="1.25"
        fill={`url(#${gradientIds.barGradient})`}
        opacity="0.95"
      />
      <rect
        x="5"
        y="7"
        width="14"
        height="1.25"
        rx="1.25"
        fill={`url(#${gradientIds.barHighlight})`}
        opacity="0.8"
      />
      
      {/* 중간 바 (긴) */}
      <rect
        x="5"
        y="11.5"
        width="14"
        height="2.5"
        rx="1.25"
        fill={`url(#${gradientIds.barGradient})`}
        opacity="0.95"
      />
      <rect
        x="5"
        y="11.5"
        width="14"
        height="1.25"
        rx="1.25"
        fill={`url(#${gradientIds.barHighlight})`}
        opacity="0.8"
      />
      
      {/* 하단 바 (짧은) */}
      <rect
        x="5"
        y="16"
        width="8"
        height="2.5"
        rx="1.25"
        fill={`url(#${gradientIds.barGradient})`}
        opacity="0.95"
      />
      <rect
        x="5"
        y="16"
        width="8"
        height="1.25"
        rx="1.25"
        fill={`url(#${gradientIds.barHighlight})`}
        opacity="0.8"
      />
    </svg>
  );
}


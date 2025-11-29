import React, { useMemo } from "react";

interface CustomMapPinProps {
  className?: string;
  size?: number;
  color?: string;
  isActive?: boolean;
}

export function CustomMapPin({ 
  className = "", 
  size = 28, 
  color = "#B3E5FC",
  isActive = false 
}: CustomMapPinProps) {
  const gradientIds = useMemo(() => {
    const uniqueId = Math.random().toString(36).substring(7);
    return {
      pinGradient: `pinGradient-${uniqueId}`,
      pinHighlight: `pinHighlight-${uniqueId}`,
      holeShadow: `holeShadow-${uniqueId}`,
      holeHighlight: `holeHighlight-${uniqueId}`,
    };
  }, []);

  // 활성/비활성에 따른 색상 조정
  const activeColor = isActive ? "#81D4FA" : "#B3E5FC";
  const shadowColor = isActive 
    ? "rgba(129, 212, 250, 0.4)" 
    : "rgba(179, 229, 252, 0.3)";

  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 28 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ 
        filter: `drop-shadow(0 2px 4px ${shadowColor})`,
        color: "transparent"
      }}
    >
      <defs>
        {/* 핀 몸체 그라데이션 - 위에서 아래로 */}
        <linearGradient id={gradientIds.pinGradient} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={activeColor} stopOpacity="1" />
          <stop offset="50%" stopColor={activeColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={activeColor} stopOpacity="0.85" />
        </linearGradient>
        
        {/* 하이라이트 효과 - 왼쪽 상단에서 */}
        <linearGradient id={gradientIds.pinHighlight} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        
        {/* 구멍 내부 그림자 */}
        <radialGradient id={gradientIds.holeShadow} cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(0, 0, 0, 0.4)" stopOpacity="1" />
          <stop offset="70%" stopColor="rgba(0, 0, 0, 0.2)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0.1)" stopOpacity="0.5" />
        </radialGradient>
        
        {/* 구멍 내부 하이라이트 */}
        <radialGradient id={gradientIds.holeHighlight} cx="60%" cy="40%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" stopOpacity="1" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* 핀 몸체 - 둥근 상단, 뾰족한 하단 */}
      <path
        d="M14 2C8.477 2 4 6.477 4 12C4 17.523 14 34 14 34S24 17.523 24 12C24 6.477 19.523 2 14 2Z"
        fill={`url(#${gradientIds.pinGradient})`}
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="0.5"
      />
      
      {/* 하이라이트 효과 (왼쪽 상단) */}
      <path
        d="M14 2C8.477 2 4 6.477 4 12C4 14 6 12 8 10C10 8 12 6 14 4V2Z"
        fill={`url(#${gradientIds.pinHighlight})`}
        opacity="0.8"
      />
      
      {/* 구멍 외곽 테두리 */}
      <circle
        cx="14"
        cy="10"
        r="4.5"
        fill="none"
        stroke="rgba(0, 0, 0, 0.25)"
        strokeWidth="1.5"
      />
      
      {/* 구멍 내부 그림자 */}
      <circle
        cx="14"
        cy="10.5"
        r="3.5"
        fill={`url(#${gradientIds.holeShadow})`}
      />
      
      {/* 구멍 내부 하이라이트 (오른쪽 상단) */}
      <ellipse
        cx="15"
        cy="9"
        rx="2"
        ry="1.5"
        fill={`url(#${gradientIds.holeHighlight})`}
        opacity="0.6"
      />
      
      {/* 핀 끝부분 강조 */}
      <circle
        cx="14"
        cy="32"
        r="1.5"
        fill={activeColor}
        opacity="0.9"
      />
    </svg>
  );
}


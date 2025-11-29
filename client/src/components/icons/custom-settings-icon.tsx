import React, { useMemo } from "react";

interface CustomSettingsIconProps {
  className?: string;
  size?: number;
  isActive?: boolean;
}

export function CustomSettingsIcon({ 
  className = "", 
  size = 24, 
  isActive = false 
}: CustomSettingsIconProps) {
  const gradientIds = useMemo(() => {
    const uniqueId = Math.random().toString(36).substring(7);
    return {
      gearGradient: `gearGradient-${uniqueId}`,
      gearHighlight: `gearHighlight-${uniqueId}`,
    };
  }, []);

  // 활성/비활성에 따른 색상 - 파스텔 그린
  const pastelGreenColor = isActive ? "#81C784" : "#A5D6A7";
  const shadowColor = isActive 
    ? "rgba(129, 199, 132, 0.4)" 
    : "rgba(165, 214, 167, 0.3)";

  // 8개 톱니를 가진 톱니바퀴 경로 생성
  const gearPath = useMemo(() => {
    const centerX = 12;
    const centerY = 12;
    const outerRadius = 10;
    const innerRadius = 8;
    const teethRadius = 11;
    const teethWidth = 0.8;
    const numTeeth = 8;
    const angleStep = (2 * Math.PI) / numTeeth;

    let path = `M ${centerX + outerRadius} ${centerY}`;
    
    for (let i = 0; i < numTeeth; i++) {
      const angle1 = i * angleStep;
      const angle2 = (i + 0.5 - teethWidth / 2) * angleStep;
      const angle3 = (i + 0.5 + teethWidth / 2) * angleStep;
      const angle4 = (i + 1) * angleStep;
      
      // 톱니 시작점
      const x1 = centerX + Math.cos(angle2) * teethRadius;
      const y1 = centerY + Math.sin(angle2) * teethRadius;
      
      // 톱니 끝점
      const x2 = centerX + Math.cos(angle3) * teethRadius;
      const y2 = centerY + Math.sin(angle3) * teethRadius;
      
      // 내부 원 호
      const x3 = centerX + Math.cos(angle4) * innerRadius;
      const y3 = centerY + Math.sin(angle4) * innerRadius;
      
      path += ` L ${x1} ${y1}`;
      path += ` A ${teethRadius} ${teethRadius} 0 0 1 ${x2} ${y2}`;
      path += ` L ${x3} ${y3}`;
    }
    
    path += ' Z';
    return path;
  }, []);

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
        {/* 톱니바퀴 그라데이션 */}
        <radialGradient id={gradientIds.gearGradient} cx="50%" cy="50%">
          <stop offset="0%" stopColor={pastelGreenColor} stopOpacity="1" />
          <stop offset="70%" stopColor={pastelGreenColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={pastelGreenColor} stopOpacity="0.85" />
        </radialGradient>
        
        {/* 톱니바퀴 하이라이트 */}
        <linearGradient id={gradientIds.gearHighlight} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* 톱니바퀴 외곽 */}
      <path
        d={gearPath}
        fill={`url(#${gradientIds.gearGradient})`}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.5"
      />
      
      {/* 톱니바퀴 하이라이트 */}
      <ellipse
        cx="9"
        cy="9"
        rx="6"
        ry="6"
        fill={`url(#${gradientIds.gearHighlight})`}
        opacity="0.7"
        transform="rotate(-20 12 12)"
      />
      
      {/* 중앙 구멍 */}
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="rgba(0, 0, 0, 0.2)"
        strokeWidth="0.8"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        fill={`url(#${gradientIds.gearGradient})`}
        opacity="0.9"
      />
    </svg>
  );
}


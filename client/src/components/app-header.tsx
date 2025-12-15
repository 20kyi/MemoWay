import { useLanguage } from "@/lib/language-context";

interface AppHeaderProps {
  title?: string;
  variant?: "default" | "profile";
}

export function AppHeader({ title, variant = "default" }: AppHeaderProps) {
  const { language } = useLanguage();
  
  // title이 제공되지 않으면 기본적으로 "MemoWay" 표시
  // profile 탭의 경우 title을 "마이페이지" 등으로 설정할 수 있음
  let displayTitle = title;
  if (!displayTitle) {
    if (variant === "profile") {
      displayTitle = language === 'ko' ? '마이페이지' : language === 'en' ? 'Profile' : language === 'zh' ? '我的' : 'マイページ';
    } else {
      displayTitle = "MemoWay";
    }
  }

  // profile variant는 다른 스타일 적용
  if (variant === "profile") {
    return (
      <div className="fixed left-0 right-0 px-4 sm:px-5 pt-4 sm:pt-6 pb-5 border-b bg-card/95 backdrop-blur-sm flex-shrink-0 z-50" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-500">
          {displayTitle}
        </h1>
      </div>
    );
  }

  return (
    <div className="fixed left-0 right-0 px-4 pt-4 sm:pt-6 pb-5 border-b bg-card/95 backdrop-blur-sm flex-shrink-0 z-50" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary text-transparent bg-clip-text">
        {displayTitle}
      </h1>
    </div>
  );
}


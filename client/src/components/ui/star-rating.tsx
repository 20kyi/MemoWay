import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ 
  value, 
  onChange, 
  readOnly = false, 
  className,
  size = "md" 
}: StarRatingProps) {
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (newValue: number) => {
    if (!readOnly && onChange) {
      onChange(newValue === value ? 0 : newValue); // 같은 별 클릭 시 취소(0점)
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readOnly}
          className={cn(
            "transition-all duration-200 hover:scale-110 focus:outline-none",
            readOnly ? "cursor-default" : "cursor-pointer hover:opacity-80"
          )}
        >
          <Star
            className={cn(
              iconSizes[size],
              "transition-colors duration-200",
              star <= value
                ? "fill-amber-400 text-amber-400" // 채워진 별 (노란색)
                : "fill-transparent text-slate-300 dark:text-slate-600" // 빈 별 (회색)
            )}
          />
        </button>
      ))}
    </div>
  );
}


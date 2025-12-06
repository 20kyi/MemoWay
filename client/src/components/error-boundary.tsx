import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">오류가 발생했습니다</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            앱을 실행하는 도중 예기치 않은 오류가 발생했습니다.
            <br />
            문제가 지속되면 관리자에게 문의해주세요.
          </p>
          
          <div className="bg-secondary/50 p-4 rounded-lg mb-6 max-w-md w-full overflow-auto max-h-40 text-left">
            <p className="text-xs font-mono text-destructive">
              {this.state.error?.message || "Unknown error"}
            </p>
          </div>

          <Button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
          >
            홈으로 돌아가기
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}


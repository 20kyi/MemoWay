// 성능 진단 대시보드 (개발 모드용)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, TrendingUp, Trash2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PerformanceStats {
  stats: Record<string, {
    count: number;
    averageTime: number;
    maxTime: number;
    slowCount: number;
  }>;
  slowRequests: Array<{
    method: string;
    path: string;
    duration: number;
    statusCode: number;
    timestamp: string;
  }>;
  overallAverage: number;
}

export function PerformanceDashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PerformanceStats>({
    queryKey: ["/api/performance/stats"],
    queryFn: async () => {
      const response = await fetch("/api/performance/stats");
      if (!response.ok) {
        throw new Error("성능 통계를 가져올 수 없습니다.");
      }
      return response.json();
    },
    refetchInterval: 5000, // 5초마다 자동 갱신
    enabled: process.env.NODE_ENV === "development",
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/performance/clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance/stats"] });
    },
  });

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <p>성능 통계를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>성능 통계를 사용할 수 없습니다</AlertTitle>
        <AlertDescription>
          개발 모드에서만 성능 대시보드를 사용할 수 있습니다.
        </AlertDescription>
      </Alert>
    );
  }

  const statsEntries = Object.entries(data.stats).sort(
    (a, b) => b[1].averageTime - a[1].averageTime
  );

  const slowRequestCount = data.slowRequests.length;
  const isSlow = data.overallAverage > 500; // 500ms 이상이면 느린 것으로 간주

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              성능 대시보드
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => clearLogsMutation.mutate()}
                disabled={clearLogsMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                로그 초기화
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      전체 평균 응답 시간
                    </p>
                    <p className={`text-3xl font-bold ${isSlow ? "text-red-500" : "text-green-500"}`}>
                      {data.overallAverage}ms
                    </p>
                  </div>
                  <Clock className={`h-8 w-8 ${isSlow ? "text-red-500" : "text-green-500"}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      느린 요청 수
                    </p>
                    <p className={`text-3xl font-bold ${slowRequestCount > 0 ? "text-red-500" : "text-green-500"}`}>
                      {slowRequestCount}
                    </p>
                  </div>
                  <AlertCircle className={`h-8 w-8 ${slowRequestCount > 0 ? "text-red-500" : "text-green-500"}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      총 API 호출 수
                    </p>
                    <p className="text-3xl font-bold">
                      {Object.values(data.stats).reduce((sum, stat) => sum + stat.count, 0)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {slowRequestCount > 0 && (
            <Card className="mb-6 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  느린 요청 (1초 이상)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.slowRequests.slice(0, 10).map((req, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-red-50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive">{req.method}</Badge>
                        <code className="text-sm">{req.path}</code>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-600 font-bold">{req.duration}ms</span>
                        <Badge variant="outline">{req.statusCode}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>경로별 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsEntries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    아직 통계 데이터가 없습니다.
                  </p>
                ) : (
                  statsEntries.map(([path, stat]) => {
                    const slowPercentage = ((stat.slowCount / stat.count) * 100).toFixed(1);
                    const isSlowPath = stat.averageTime > 500;
                    
                    return (
                      <div
                        key={path}
                        className={`p-4 rounded-lg border ${isSlowPath ? "border-red-200 bg-red-50" : "border-gray-200"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-medium">{path}</code>
                          {isSlowPath && (
                            <Badge variant="destructive">느림</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">요청 수</p>
                            <p className="font-semibold">{stat.count}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">평균 시간</p>
                            <p className={`font-semibold ${isSlowPath ? "text-red-600" : ""}`}>
                              {stat.averageTime}ms
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">최대 시간</p>
                            <p className="font-semibold">{stat.maxTime}ms</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">느린 요청 비율</p>
                            <p className={`font-semibold ${stat.slowCount > 0 ? "text-red-600" : ""}`}>
                              {slowPercentage}%
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}




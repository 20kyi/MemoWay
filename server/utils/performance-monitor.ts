// 성능 모니터링 유틸리티
// API 응답 시간과 느린 요청을 추적

interface PerformanceLog {
  method: string;
  path: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  slowRequest?: boolean;
}

class PerformanceMonitor {
  private logs: PerformanceLog[] = [];
  private readonly maxLogs = 1000; // 최대 로그 수
  private readonly slowRequestThreshold = 1000; // 1초 이상 걸리는 요청을 느린 요청으로 간주

  log(method: string, path: string, duration: number, statusCode: number) {
    const log: PerformanceLog = {
      method,
      path,
      duration,
      statusCode,
      timestamp: new Date(),
      slowRequest: duration > this.slowRequestThreshold,
    };

    this.logs.push(log);

    // 로그가 너무 많아지면 오래된 것부터 삭제
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 느린 요청은 콘솔에 경고 출력
    if (log.slowRequest) {
      console.warn(`⚠️ [느린 요청 감지] ${method} ${path} - ${duration}ms (상태: ${statusCode})`);
    }
  }

  // 최근 느린 요청들 가져오기
  getSlowRequests(limit: number = 10): PerformanceLog[] {
    return this.logs
      .filter(log => log.slowRequest)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // 평균 응답 시간 계산
  getAverageResponseTime(path?: string): number {
    const filtered = path 
      ? this.logs.filter(log => log.path === path)
      : this.logs;
    
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, log) => acc + log.duration, 0);
    return Math.round(sum / filtered.length);
  }

  // 경로별 통계
  getStatsByPath(): Record<string, {
    count: number;
    averageTime: number;
    maxTime: number;
    slowCount: number;
  }> {
    const stats: Record<string, {
      count: number;
      totalTime: number;
      maxTime: number;
      slowCount: number;
    }> = {};

    this.logs.forEach(log => {
      if (!stats[log.path]) {
        stats[log.path] = {
          count: 0,
          totalTime: 0,
          maxTime: 0,
          slowCount: 0,
        };
      }

      stats[log.path].count++;
      stats[log.path].totalTime += log.duration;
      stats[log.path].maxTime = Math.max(stats[log.path].maxTime, log.duration);
      if (log.slowRequest) {
        stats[log.path].slowCount++;
      }
    });

    // 평균 계산
    const result: Record<string, {
      count: number;
      averageTime: number;
      maxTime: number;
      slowCount: number;
    }> = {};

    Object.entries(stats).forEach(([path, stat]) => {
      result[path] = {
        count: stat.count,
        averageTime: Math.round(stat.totalTime / stat.count),
        maxTime: stat.maxTime,
        slowCount: stat.slowCount,
      };
    });

    return result;
  }

  // 성능 리포트 출력
  printReport() {
    console.log('\n📊 ========== 성능 리포트 ==========');
    
    const slowRequests = this.getSlowRequests(5);
    if (slowRequests.length > 0) {
      console.log('\n🐌 가장 느린 요청 Top 5:');
      slowRequests.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.method} ${log.path} - ${log.duration}ms`);
      });
    } else {
      console.log('\n✅ 느린 요청 없음 (모든 요청이 1초 이하)');
    }

    console.log('\n📈 경로별 통계:');
    const stats = this.getStatsByPath();
    const sortedStats = Object.entries(stats)
      .sort((a, b) => b[1].averageTime - a[1].averageTime)
      .slice(0, 10);

    sortedStats.forEach(([path, stat]) => {
      const slowPercentage = ((stat.slowCount / stat.count) * 100).toFixed(1);
      console.log(`  ${path}`);
      console.log(`    - 요청 수: ${stat.count}, 평균: ${stat.averageTime}ms, 최대: ${stat.maxTime}ms`);
      console.log(`    - 느린 요청: ${stat.slowCount}개 (${slowPercentage}%)`);
    });

    console.log('\n=====================================\n');
  }

  // 로그 초기화
  clear() {
    this.logs = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// 성능 리포트를 주기적으로 출력 (10분마다)
let reportInterval: NodeJS.Timeout | null = null;

export function startPerformanceMonitoring(intervalMinutes: number = 10) {
  if (reportInterval) {
    clearInterval(reportInterval);
  }

  reportInterval = setInterval(() => {
    performanceMonitor.printReport();
  }, intervalMinutes * 60 * 1000);

  // 프로세스 종료 시 리포트 출력
  process.on('SIGINT', () => {
    performanceMonitor.printReport();
    if (reportInterval) {
      clearInterval(reportInterval);
    }
    process.exit(0);
  });
}


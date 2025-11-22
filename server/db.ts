/**
 * 데이터베이스 연결 설정 파일
 * Neon Database (PostgreSQL) 서버리스 연결을 설정합니다.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Neon Database는 WebSocket을 사용하므로 ws 라이브러리를 설정합니다
neonConfig.webSocketConstructor = ws;

// 환경 변수에서 DATABASE_URL이 설정되지 않았으면 에러를 발생시킵니다
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// PostgreSQL 연결 풀 생성 (서버리스 환경에 최적화됨)
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Drizzle ORM 인스턴스 생성 (타입 안전한 SQL 쿼리 빌더)
export const db = drizzle({ client: pool, schema });

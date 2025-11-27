import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// .env 파일 로드
config({ path: join(rootDir, '.env') });

const requiredVars = {
  'VITE_REPLIT_URL': 'https://memoway.replit.app',
  'KAKAO_CLIENT_ID': 'Kakao OAuth Client ID',
  'KAKAO_CLIENT_SECRET': 'Kakao OAuth Client Secret',
  'GOOGLE_CLIENT_ID': 'Google OAuth Client ID',
  'GOOGLE_CLIENT_SECRET': 'Google OAuth Client Secret',
  'DATABASE_URL': 'Database connection URL',
  'SESSION_SECRET': 'Session secret key',
};

let hasError = false;

console.log('🔍 환경 변수 검증 중...\n');

for (const [key, description] of Object.entries(requiredVars)) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ ${key} (${description}) - 설정되지 않음`);
    hasError = true;
  } else {
    // VITE_REPLIT_URL 검증
    if (key === 'VITE_REPLIT_URL') {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          console.error(`❌ ${key} - 잘못된 프로토콜: ${url.protocol}`);
          hasError = true;
        } else {
          console.log(`✅ ${key} = ${value}`);
        }
      } catch (e) {
        console.error(`❌ ${key} - 잘못된 URL 형식: ${value}`);
        hasError = true;
      }
    } else {
      // 민감한 정보는 마스킹
      const masked = value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '***';
      console.log(`✅ ${key} = ${masked}`);
    }
  }
}

if (hasError) {
  console.error('\n❌ 환경 변수 검증 실패. APK 빌드를 중단합니다.');
  console.error('💡 .env 파일을 확인하고 필요한 변수를 설정하세요.\n');
  process.exit(1);
}

console.log('\n✅ 모든 환경 변수가 올바르게 설정되었습니다.\n');











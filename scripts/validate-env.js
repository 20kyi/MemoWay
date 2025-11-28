/**
 * 안드로이드 빌드 전 환경 변수 검증 스크립트
 * 필수 환경 변수가 설정되어 있는지 확인합니다.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// .env 파일 로드
const envPath = resolve(rootDir, '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log('✅ .env 파일을 찾았습니다:', envPath);
} else {
  console.warn('⚠️  .env 파일을 찾을 수 없습니다:', envPath);
  console.warn('   환경 변수를 시스템 환경 변수에서 읽습니다.');
}

// 필수 환경 변수 목록
const requiredEnvVars = [
  'VITE_KAKAO_API_KEY',
  'VITE_GOOGLE_MAPS_API_KEY',
];

// 선택적 환경 변수 (없어도 빌드는 가능하지만 기능이 제한됨)
const optionalEnvVars = [
  'VITE_REPLIT_URL',
  'VITE_KAKAO_NATIVE_APP_KEY',
];

let hasErrors = false;

console.log('\n📋 환경 변수 검증 시작...\n');

// 필수 환경 변수 검증
console.log('🔍 필수 환경 변수 확인:');
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (!value || value.trim() === '') {
    console.error(`❌ ${envVar}: 설정되지 않음`);
    hasErrors = true;
  } else {
    const maskedValue = value.length > 10 
      ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
      : '***';
    console.log(`✅ ${envVar}: ${maskedValue} (길이: ${value.length})`);
  }
}

// 선택적 환경 변수 확인
console.log('\n📌 선택적 환경 변수 확인:');
for (const envVar of optionalEnvVars) {
  const value = process.env[envVar];
  if (!value || value.trim() === '') {
    console.warn(`⚠️  ${envVar}: 설정되지 않음 (선택사항)`);
  } else {
    const maskedValue = value.length > 10 
      ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
      : '***';
    console.log(`✅ ${envVar}: ${maskedValue}`);
  }
}

console.log('\n📊 환경 변수 요약:');
console.log('   - 필수 변수:', requiredEnvVars.length, '개');
console.log('   - 선택 변수:', optionalEnvVars.length, '개');
console.log('   - .env 파일:', existsSync(envPath) ? '존재함' : '없음');

if (hasErrors) {
  console.error('\n❌ 빌드 실패: 필수 환경 변수가 설정되지 않았습니다.');
  console.error('\n해결 방법:');
  console.error('1. 프로젝트 루트에 .env 파일을 생성하세요.');
  console.error('2. 다음 내용을 추가하세요:');
  console.error('   VITE_KAKAO_API_KEY=your_kakao_javascript_key_here');
  console.error('   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here');
  console.error('\n또는 시스템 환경 변수로 설정하세요.');
  process.exit(1);
} else {
  console.log('\n✅ 모든 필수 환경 변수가 설정되었습니다.');
  console.log('   빌드를 계속 진행합니다...\n');
  process.exit(0);
}

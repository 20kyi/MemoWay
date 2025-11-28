# Replit 빠른 배포 가이드

## Replit에서 Git/GitHub 기능 찾기

Replit 인터페이스는 버전에 따라 다를 수 있지만, 보통 다음 위치에 있습니다:

### 방법 1: 상단 탭에서 찾기
- Replit 상단에 여러 탭이 있습니다
- **"Git"** 또는 **"Source Control"** 탭 찾기
- 클릭하면 GitHub 관련 기능이 보입니다

### 방법 2: 사이드바 아이콘
- 왼쪽 사이드바에서 Git 브랜치 모양 아이콘 찾기
- 또는 GitHub 고양이 아이콘

### 방법 3: Settings에서 찾기
- 프로젝트 설정 (톱니바퀴 아이콘)
- "GitHub" 또는 "Version Control" 섹션
- "Connect GitHub Repository" 옵션

---

## 가장 빠른 방법: 파일 직접 복사

**Git 연동 없이 바로 배포하기:**

1. **Cursor에서 파일 열기**
   - `server/kakaoAuth.ts` 파일 열기
   - 전체 선택: `Ctrl+A`
   - 복사: `Ctrl+C`

2. **Replit 웹 에디터에서**
   - 파일 탐색기에서 `server/kakaoAuth.ts` 찾기
   - 파일 열기
   - 전체 선택: `Ctrl+A`
   - 삭제: `Delete`
   - 붙여넣기: `Ctrl+V`
   - 저장: `Ctrl+S`

3. **배포**
   - Replit 상단의 **"Publish"** 또는 **"Deploy"** 버튼 클릭
   - 배포 완료 대기 (몇 분 소요)

4. **다른 파일도 동일하게**
   - `client/src/App.tsx`도 동일하게 복사/붙여넣기

---

## 중요: 로그에서 발견한 문제

로그를 보니:
- ✅ 카카오 로그인 성공
- ❌ 이후 `/api/auth/user` 요청이 401 Unauthorized 반복

**이것은 세션 쿠키 문제입니다!** 외부 브라우저에서 설정된 쿠키가 앱 WebView로 전달되지 않고 있습니다.

해결 방법은 코드에 이미 추가되어 있지만, 배포가 필요합니다.

---

## 배포 순서

1. **Cursor에서 코드 확인** ✅ (이미 수정됨)
2. **Replit에 파일 복사** (위 방법 참고)
3. **Publish 클릭**
4. **테스트**


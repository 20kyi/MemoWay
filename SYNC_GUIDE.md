# 🔄 Replit ↔ Cursor 동기화 가이드

Replit과 Cursor 간 파일을 동기화하는 방법을 안내합니다.

## 📋 현재 상황

- ✅ Git 저장소 연결됨
- ✅ Cursor에서 작업한 변경사항 있음
- ⚠️ Replit과 Cursor의 내용이 다름

## 🚀 동기화 방법

### 방법 1: Git 사용 (추천) ⭐

Git을 사용하면 두 환경을 쉽게 동기화할 수 있습니다.

#### 1단계: Cursor에서 변경사항 커밋 및 푸시

```bash
# 변경사항 확인
git status

# 변경사항 추가
git add .

# 커밋
git commit -m "카카오 로그인 및 배포 설정 추가"

# 원격 저장소에 푸시
git push origin main
```

#### 2단계: Replit에서 변경사항 가져오기

Replit 터미널에서:

```bash
# 최신 변경사항 가져오기
git pull origin main

# 또는 강제로 가져오기 (충돌 시)
git fetch origin
git reset --hard origin/main
```

#### 3단계: Replit에서 의존성 설치 (필요 시)

```bash
npm install
```

---

### 방법 2: Replit에서 직접 파일 가져오기

Replit에서 변경한 내용이 있다면:

#### 1단계: Replit에서 변경사항 커밋 및 푸시

Replit 터미널에서:

```bash
git add .
git commit -m "Replit에서 작업한 내용"
git push origin main
```

#### 2단계: Cursor에서 가져오기

```bash
git pull origin main
```

---

### 방법 3: 수동 동기화 (Git 사용 불가 시)

#### Replit → Cursor

1. Replit에서 파일 다운로드
   - 파일 우클릭 → "Download"
   - 또는 전체 프로젝트 다운로드

2. Cursor에서 파일 교체
   - 다운로드한 파일로 교체

#### Cursor → Replit

1. Cursor에서 파일 업로드
   - Replit에서 파일 업로드 기능 사용
   - 또는 Git 사용 (방법 1 추천)

---

## ⚠️ 주의사항

### 충돌 해결

두 곳에서 동시에 같은 파일을 수정한 경우 충돌이 발생할 수 있습니다.

```bash
# 충돌 확인
git status

# 충돌 해결 후
git add .
git commit -m "충돌 해결"
git push origin main
```

### 환경 변수

`.env` 파일은 Git에 포함되지 않습니다 (`.gitignore`에 있음).

**Replit에서:**
- Secrets 탭에서 환경 변수 설정

**Cursor에서:**
- `.env` 파일 직접 생성

### Android 폴더

`android/` 폴더는 Git에 포함되지 않습니다.

**동기화 불필요:**
- `android/` 폴더는 각 환경에서 `npx cap sync`로 생성
- 빌드 결과물이므로 동기화할 필요 없음

---

## 🔄 작업 흐름 (권장)

### 개발 시

1. **Cursor에서 작업**
   ```bash
   # 작업 후
   git add .
   git commit -m "작업 내용"
   git push origin main
   ```

2. **Replit에서 가져오기**
   ```bash
   git pull origin main
   ```

### 배포 시

1. **Replit에서 배포**
   - Replit에서 "Publish" 클릭
   - 자동 배포됨

2. **변경사항이 있다면**
   ```bash
   git pull origin main  # Replit에서
   ```

---

## 📝 현재 변경사항

현재 Cursor에서 수정된 파일들:

- `client/src/App.tsx` - Deep Link 처리 추가
- `client/src/pages/landing.tsx` - 카카오 로그인 웹 OAuth 플로우
- `server/googleAuth.ts` - 다중 플랫폼 지원
- `server/kakaoAuth.ts` - 다중 플랫폼 지원 및 redirect 페이지
- `DEPLOYMENT.md` - 배포 가이드 (신규)
- `REPLIT_SETUP.md` - Replit 설정 가이드 (신규)

이 변경사항들을 Replit에 동기화해야 합니다.

---

## ✅ 빠른 동기화 명령어

### Cursor → Replit

```bash
# Cursor에서 실행
git add .
git commit -m "카카오 로그인 및 배포 설정 업데이트"
git push origin main
```

그 다음 Replit에서:
```bash
git pull origin main
```

### Replit → Cursor

Replit에서:
```bash
git add .
git commit -m "Replit 변경사항"
git push origin main
```

Cursor에서:
```bash
git pull origin main
```

---

## 🐛 문제 해결

### "Your branch is behind"

```bash
git pull origin main
```

### 충돌 발생

```bash
# 충돌 파일 확인
git status

# 수동으로 충돌 해결 후
git add .
git commit -m "충돌 해결"
```

### 변경사항 잃어버림

```bash
# 최근 커밋 확인
git log

# 특정 커밋으로 되돌리기
git reset --hard <commit-hash>
```

---

## 💡 팁

1. **작업 전 항상 pull**
   ```bash
   git pull origin main
   ```

2. **작업 후 바로 push**
   ```bash
   git add .
   git commit -m "작업 내용"
   git push origin main
   ```

3. **커밋 메시지 명확하게**
   - 무엇을 변경했는지 명확히 작성

4. **주기적으로 동기화**
   - 하루에 한 번 이상 pull/push


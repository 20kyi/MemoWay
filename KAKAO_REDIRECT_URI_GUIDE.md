# 📝 Kakao Redirect URI 등록 가이드

## ⚠️ 중요: Redirect URI는 전체 경로를 포함해야 합니다

Kakao Developer Console의 안내 메시지와 달리, **OAuth Redirect URI는 전체 경로를 포함**해야 합니다.

---

## ✅ 올바른 등록 방법

### 1. Kakao Developer Console 접속
1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → MemoWay 앱 선택
3. **제품 설정** → **카카오 로그인** → **Redirect URI** 탭

### 2. Redirect URI 등록

다음 URI들을 **전체 경로로** 등록하세요:

```
https://memo-way.replit.app/api/kakao/callback
```

**중요 사항:**
- ✅ **경로를 포함**해서 등록해야 함 (`/api/kakao/callback` 포함)
- ✅ `https://` 프로토콜 포함
- ✅ 도메인만이 아닌 **전체 URL** 등록

---

## 📋 여러 도메인 등록 (필요한 경우)

만약 여러 도메인을 사용한다면, 각각 전체 경로로 등록:

```
https://memo-way.replit.app/api/kakao/callback
https://memoway.replit.app/api/kakao/callback
http://localhost:5000/api/kakao/callback
```

**각 줄은 전체 URL (경로 포함)**이어야 합니다.

---

## ❌ 잘못된 등록 방법

다음과 같이 등록하면 **작동하지 않습니다**:

```
memo-way.replit.app          ❌ (프로토콜 없음)
https://memo-way.replit.app  ❌ (경로 없음)
memo-way.replit.app/api/kakao/callback  ❌ (프로토콜 없음)
```

---

## 🔍 현재 설정 확인

### 현재 코드 설정

코드에서는 다음 Redirect URI를 사용합니다:

**안드로이드 앱 요청:**
```
https://memo-way.replit.app/api/kakao/callback
```

**웹 브라우저 요청:**
- 프로덕션: `https://memo-way.replit.app/api/kakao/callback`
- 개발: `http://localhost:5000/api/kakao/callback`

---

## 🧪 등록 확인 방법

등록 후 다음 URL로 테스트:

```
https://memo-way.replit.app/api/kakao/login?lang=ko&platform=android
```

**정상 작동 시:**
- ✅ 카카오 로그인 페이지로 리다이렉트
- ✅ 로그인 후 `https://memo-way.replit.app/api/kakao/callback`로 리다이렉트
- ✅ KOE006 오류 없음

**오류 발생 시:**
- ❌ KOE006: "등록되지 않은 Redirect URI"
  - → Redirect URI가 정확히 일치하는지 확인
  - → 전체 경로(`/api/kakao/callback`)가 포함되었는지 확인

---

## 📝 체크리스트

Kakao Developer Console에서 확인:

- [ ] **내 애플리케이션** → MemoWay 선택됨
- [ ] **제품 설정** → **카카오 로그인** 활성화됨
- [ ] **Redirect URI**에 다음이 등록됨:
  - [ ] `https://memo-way.replit.app/api/kakao/callback` ✅
  - [ ] `http://localhost:5000/api/kakao/callback` (로컬 개발용, 선택사항)
- [ ] 전체 URL (프로토콜 + 도메인 + 경로)로 등록됨
- [ ] **저장** 버튼 클릭됨

---

## 🔧 문제 해결

### 문제: 여전히 KOE006 오류 발생

**확인 사항:**
1. Redirect URI가 **정확히 일치**하는지 확인
   - 공백, 슬래시(`/`) 위치, 대소문자 확인
2. **전체 경로**가 포함되었는지 확인
   - 도메인만이 아닌 `/api/kakao/callback` 포함
3. **저장 후 반영 시간** 대기 (몇 분 소요될 수 있음)

**실제 사용되는 URI 확인:**
- 서버 로그에서 확인:
  ```
  Kakao OAuth Redirect URI: https://memo-way.replit.app/api/kakao/callback
  ```
- 브라우저 개발자 도구 → Network 탭에서 리다이렉트 URL 확인

---

## 📚 참고

### Kakao OAuth Redirect URI 규칙

1. **정확한 일치 필요**: 등록된 URI와 사용되는 URI가 **정확히 일치**해야 함
2. **전체 경로 포함**: 도메인 + 경로 전체를 포함해야 함
3. **프로토콜 포함**: `https://` 또는 `http://` 포함
4. **쿼리 파라미터 무시**: `?code=...&state=...` 같은 파라미터는 비교 시 무시됨
5. **대소문자 구분**: 도메인은 소문자로 통일 권장

### 예시

**올바른 등록:**
```
https://memo-way.replit.app/api/kakao/callback
```

**잘못된 등록:**
```
memo-way.replit.app                                    ❌
https://memo-way.replit.app                            ❌
https://memo-way.replit.app/api/kakao                  ❌
HTTPS://MEMO-WAY.REPLIT.APP/api/kakao/callback         ❌ (대소문자)
https://memo-way.replit.app/api/kakao/callback/        ❌ (끝에 슬래시)
```


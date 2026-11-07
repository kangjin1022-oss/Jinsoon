# 🍷 와인 인식 앱

와인 라벨을 촬영하면 Claude가 라벨을 읽고 와인 정보를 알려주는 모바일 웹앱(PWA)입니다.
홈 화면에 추가하면 일반 앱처럼 전체 화면으로 실행됩니다.

## 기능

- **라벨 촬영 / 앨범에서 선택** → 와인 이름, 생산자, 빈티지, 국가·지역, 품종, 알코올 도수
- 바디·당도·산도·탄닌 그래프, 테이스팅 노트, 추천 음식, 서빙 온도, 음용 적기, 예상 가격
- **내 셀러**: 인식한 와인 저장, 별점·메모, 검색 (기기에 저장)
- 오프라인에서도 앱과 셀러 목록 열기 가능

## 사용 방법

1. 앱을 열고 **설정**에서 Anthropic API 키(`sk-ant-...`)를 입력합니다.
   키는 [Anthropic Console](https://console.anthropic.com/settings/keys)에서 발급받을 수 있습니다.
2. **인식** 탭에서 라벨을 촬영합니다.
3. 결과를 **내 셀러에 저장**하고 별점과 메모를 남깁니다.

### 폰에 앱으로 설치

- **iPhone (Safari)**: 공유 버튼 → "홈 화면에 추가"
- **Android (Chrome)**: 메뉴(⋮) → "앱 설치"

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 에 빌드
```

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml` 이 GitHub Pages에 배포합니다.
(저장소 Settings → Pages → Source 를 "GitHub Actions" 로 설정해야 합니다.)

## 참고

- API 키는 브라우저 localStorage에만 저장되고, 사진은 인식할 때만 Anthropic API로 직접 전송됩니다.
  개인용 앱 기준의 구성이므로, 여러 사람에게 공개 배포한다면 키를 서버에 두는 백엔드 프록시를 쓰세요.
- 모델: `claude-opus-5-5` (거절 시 서버 측 fallback 사용)

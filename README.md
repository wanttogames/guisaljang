# 귀살장 (GUISALJANG)

조선 오컬트 분위기의 타이밍 반격 액션 로그라이트 프로토타입입니다.

## 현재 구현

- Phaser 3 + TypeScript + Vite
- WASD / 방향키 이동
- SPACE / Z / 화면 터치 반격
- 적 공격 예고
- GREAT / PERFECT 타이밍 판정
- 연속 반격 배율 x2 ~ x32
- 혼 획득 / 처치 수
- 피격 및 게임 오버 / 재시작
- 간단한 프롤로그와 기억 파편 스토리
- GitHub Pages 자동 배포

## 핵심 루프

적의 공격을 읽고 마지막 순간에 반격해 배율을 올린다. 높은 배율을 유지할수록 더 많은 혼을 얻지만 한 번 피격되면 연격과 배율이 초기화된다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## 배포

`main` 브랜치에 push하면 `.github/workflows/deploy-pages.yml`이 GitHub Pages 배포를 실행합니다.

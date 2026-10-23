# v2 검증

- Node 자동 검증 26개 통과(기존 전체 흐름 11개와 충돌·배율 15개).
- 원본 자산 SHA-256 12개, 프레임 24개 좌표, PNG 크기·알파 및 모듈/HTML 경로 검사 통과.
- 분리 직후 침투 깊이 허용 오차: 0.002px 미만. 바닥 책더미/바구니/낮은·높은 책, 좌·우·위·아래 접촉, 최대 5000px/s 회전 책·0.5초 dt, 무적 중 동일/다른 소품, 기본 x 복귀·모서리 접촉 검증.
- hit-stop 동안 게임 시간·월드·반응 시계 정지, 점프 횟수 착지 회복, 마지막 체력 피격 뒤 실패 및 재도전 초기화 검증.
- 원본 엔딩 5컷 → 엽서 → 오답/조합 보호/정답 → 최종 완료 회귀 통과.

## 실제 배포 브라우저 확인 (2026-10-23)

대상: https://gamemakercho.github.io/catch-librarian/?v=20261023-v2

- 메인 화면에서 고양이 축소·사서 확대, 얇은 외곽선과 투명 배경 확인. 고양이 두 시트는 58/261, 사서는 180/391 고정 배율과 실측 source_rect·anchor_local 사용.
- 점프 버튼 두 번 입력 시 남은 점프 2 → 1 → 0 확인. 일시 정지·재개, 체력 소진 후 실패, 재도전 시 30초·체력 3·점프 2회 초기화 확인.
- 실제 엔진/렌더러를 사용하는 tests/collision-preview.html UI로 책더미·바구니·낮은 책·높은 책·위·아래 접촉 실행. 모든 충돌 순간 hitFrame=1, hitStop=0.07, penetration=0.
- 책더미 접촉 순간 체력 2, 고양이 vx=-155, 소품 vx=260. 0.1초 진행 두 번 후 hitFrame=3, x=217.36, y=11.875, 소품 vx=248.44, penetration=0으로 연속 반동 확인.
- 마지막 피격 순간 체력 0에서도 playing 상태와 충격 프레임을 먼저 표시. 이후 0.1초 진행 7회 뒤 failed 전환 확인.
- 수정된 메인과 새 개발 검증 탭의 콘솔 오류 0개. 이전 renderer 캐시와 새 JSON 혼합 문제를 막도록 전체 모듈 import에 동일한 v2 버전을 붙인 뒤 새 배포 탭에서 재검증.
- 실제 브라우저 스크린샷은 저장소 바깥 outputs/v2-browser-game.png, v2-browser-impact.png, v2-browser-recoil.png. 보조 v2-*-render.png는 Node Canvas 정지 프레임으로 구분.

## 변경과 설정

- 주요 구현: config.js, engine.js, renderer.js, app.js, index.html 및 새 collision.js.
- 새 자산: cat-run-thin-v2.png, cat-hit-recover-v2.png, sprite-layout-v2.json. 기존 배경/UI/사서/엔딩/퍼즐 자산 유지.
- 검사/번들: asset-verification.json, scripts/check-assets.mjs, build-offline.mjs 및 tests의 충돌·배율·흐름 검사.
- 최종 크기 catHeight=58 / librarianHeight=180. 고양이 충돌 상자는 발 기준 x=-21, y=-44, 폭 56, 높이 40.
- 회전 소품은 OBB 다각형. 이전 위치에서 swept SAT/TOI로 접촉을 찾고 적응형 서브스텝과 MTV 반복 분리로 겹침 해소. 무적/피해 소비와 물리 분리를 별도 처리.
- hit-stop 70ms, 경직 230ms, 최초 반동 vx=-155 / vy=195, 소품 화면 상대 vx=260, 접촉 여유 0.7px. F2 디버그 표시는 게임 기본 OFF.

## 검증 범위의 한계

30초 성공부터 만화·엽서·최종 완료까지는 Node DOM/Canvas 대역 통합 테스트로 통과했으며 실제 브라우저에서 전체 성공 경로를 끝까지 재플레이한 결과는 아님. 브라우저 화면 크기 설정이 실제 뷰포트에 반영되지 않아 모바일 크기 검증은 완료로 계산하지 않음. 실제 휴대전화 터치·한국어 IME는 실기기 미검증. 논리 좌표 비율과 DPR 처리는 자동 검사로 확인.

# 작업 기준

이 폴더는 GitHub Desktop의 독립 게임 catch-librarian 저장소다. 다른 cat-librarian 저장소를 수정하거나 자동 연결하지 않는다.

실행 진입은 루트 index.html, 설정은 config.js다. 원본 스프라이트·프레임 좌표·엔딩 만화 5장·접기 도식의 픽셀과 순서를 유지한다. 실제 엽서 참고 원본과 완성 장면을 정답 전에 노출하지 않는다. Sites ID나 다른 서비스의 배포 설정을 복사하지 않는다.

게임 로직 변경은 npm test, 자산·경로 변경은 npm run check를 실행한다. 실제 브라우저 확인과 Node의 대역 테스트를 구분해 보고한다. Github 업로드/커밋/푸시는 사용자가 요청한 GitHub Desktop에서 진행한다.

2026-10-23 v2 수정: 러너는 cat-run-thin-v2/cat-hit-recover-v2와 실측 sprite-layout-v2.json을 사용한다. 기존 엔딩/배경/UI/퍼즐은 유지한다. 고양이 58·사서 180을 기준 높이 261·391로 나누며 두 고양이 시트에 같은 배율을 쓴다. 모든 충돌은 피해 판정과 별개로 분리하고, 반동 소품에 월드 스크롤을 중복 적용하지 않는다. hit-stop·경직·착지 애니메이션·마지막 피격 지연은 같은 시뮬레이션 시계를 사용한다. 개발 충돌 표시는 기본 OFF이며 F2 또는 tests/collision-preview.html에서만 확인한다.

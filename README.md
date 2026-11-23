# RE:LIGHT MYEONGDONG
Interactive Urban Nightscape Simulation — React + TypeScript + Vite + Three.js (React Three Fiber, Drei, postprocessing) + Zustand + GSAP + Tailwind.

## 실행 방법
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입 체크 + 프로덕션 빌드
```
Node.js 18+ 필요 (WebGL2 지원 브라우저 권장, 데스크톱 Chrome/Edge).

## 조작
| 입력 | 동작 |
|---|---|
| W A S D / Shift | 이동 / 빠르게 이동 |
| 마우스 (클릭해서 캡처) · ESC | 시점 회전 · 캡처 해제 |
| Tab | WALK MODE ↔ EDIT MODE |
| WALK | 십자선으로 간판을 조준하고 클릭 |
| EDIT | 마우스 포인터로 간판 클릭 (마우스 시점 회전 비활성, 방향키/Q E로 회전) |
| 1 / 2 / 3 / 4 | ORIGINAL / IMPROVED / IMPROVE ALL / RESET ALL |
| 터치 | 왼쪽 가상 스틱 이동, 오른쪽 드래그 시점, 탭으로 간판 선택 |

## 구조
- `src/world/layout.ts` — 건물·간판(40개)·창/상점/조명 인스턴스 데이터 생성 (시드 고정)
- `src/world/Sign.tsx` — 간판 1개 = 독립 3D 오브젝트. 힌지 회전 → 벽면 평행 부착, 위치/크기/깊이 보간, 발광·채도 감소
- `src/world/Lights.tsx` — 가까운 간판 6개의 실제 PointLight, 블룸/톤매핑, 전체 개선율에 따른 글레어·보행 조도 변화
- `src/world/Controls.tsx`, `player.ts` — 1인칭 이동, 충돌, 간판 레이캐스트 선택
- `src/store.ts` — 모드/선택/개선 상태, IMPROVE ALL 시퀀스

## 고지
- 명동 상업거리의 분위기를 참고한 **근사적 3D 모델**이며 실제 거리의 디지털 트윈이 아닙니다.
- 상점 이름·로고는 모두 가상입니다.
- 디자인 대안 시각화 도구이며, 법규상 휘도(cd/m²)·조도(lx) 측정값을 재현하지 않습니다.

## 3D 디테일 업그레이드 (v2)
- **간판 타이포그래피:** 서체 28종(한글 고딕·좁은 고딕·붓글씨·손글씨·세리프, 영문 콘덴스드·스크립트, 일본어 고딕·명조, 중국어 고딕·서예). 일본어/중국어/한글/영문이 섞인 간판, 세로 간판은 글자 세우기 / 90° 눕히기 / 일본어 세로쓰기(tategaki) 3방식으로 구분.
- **교체 가능한 브랜드 에셋:** `src/world/brandAssets.ts`에 상점명→PNG/SVG 경로를 넣으면 해당 간판의 로고만 교체 (알파 채널을 마스크로 사용). 기본은 직접 그린 벡터 로고 20종. **모든 상점 이름은 가상**이며 실제 브랜드 로고를 사용하지 않음.
- **간판 본체:** 두께, 금속 프레임(5가지 마감), 모서리 체결부, 돌출 간판 지지대·벽판, 클리어코트 아크릴 면, 입체 글자 릴리프, 벽면 접촉 그림자.
- **보행자:** 관절 구조의 절차적 인체(외부 모델 없음), 인체 비례·얼굴·머리 5종·겨울 외투 5종·스커트·머플러·가방 3종, 걷기 사이클, 정지·고개 돌리기·쇼윈도 앞 멈춤·2~3인 그룹, 사람/기둥/카메라 회피, 원거리 LOD.
- **건축:** 벽돌·타일·금속 패널·콘크리트·스투코 5종 재질, 에어컨 실외기, 배관, 거리 횡단 전선.

## 사용 자산 및 라이선스
- 서체: Google Fonts (SIL Open Font License 1.1) — Noto Sans KR/JP/TC, Noto Serif KR, Black Han Sans, Do Hyeon, Jua, Gowun Batang, Nanum Pen Script, Nanum Brush Script, East Sea Dokdo, Gaegu, Sunflower, Yeon Sung, Gothic A1, Dela Gothic One, Yuji Syuku, Ma Shan Zheng, Bebas Neue, Anton, Oswald, Bungee, Orbitron, Righteous, Pacifico, Lobster, Playfair Display, Cinzel. 실행 시 Google Fonts CDN에서 불러옴.
- 3D 모델/텍스처 파일: 없음 (모든 지오메트리·텍스처는 코드로 생성).

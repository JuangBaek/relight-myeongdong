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

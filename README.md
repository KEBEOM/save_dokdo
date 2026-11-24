# 구해줘 독도! (Save Dokdo!)

정령과 독도 친구들을 구하며 독도의 역사와 자연을 배우는 Unity 2D 교육 게임입니다.
카드 뒤집기, 달리기, 정령 퍼즐, 기억 퍼즐을 거쳐 마지막 독도 퀴즈에 도전해요.

**▶ 웹에서 플레이:** _(Vercel 주소가 생기면 여기에 적기)_

## 조작법

| | PC | 휴대폰·태블릿 |
|---|---|---|
| 이동 | ← → 또는 A D (화면 버튼도 가능) | 화면의 왼쪽·오른쪽 버튼 |
| 점프 | Space, ↑ 또는 W (두 번 누르면 이단 점프) | 화면의 점프 버튼 |
| 선택 | 마우스 클릭 | 터치 |

휴대폰은 가로로 돌려서 플레이하세요. 오른쪽 위 ⛶ 버튼을 누르면 전체 화면이 돼요.

## 폴더 구조

```
web/     웹 빌드 결과물. Vercel이 이 폴더를 그대로 웹사이트로 보여 줌
unity/   Unity 프로젝트 원본 (Assets, Packages, ProjectSettings)
```

## 게임을 고친 뒤 웹에 다시 올리는 법

1. Unity Hub에서 `unity/` 폴더를 프로젝트로 엽니다 (Unity **2022.3.15f1**).
2. **File → Build Settings**에서 **WebGL**을 고르고 **Switch Platform**을 누릅니다.
   WebGL이 목록에 없으면 Unity Hub → 설치 → 톱니바퀴 → 모듈 추가에서 *WebGL Build Support*를 설치하세요.
3. **Player Settings → Resolution and Presentation**의 **WebGL Template**에서 **SaveDokdo**를 고릅니다.
4. **Player Settings → Publishing Settings**에서
   - **Compression Format**: Gzip
   - **Decompression Fallback**: ✅ 켜기 ← 꼭 켜야 Vercel에서 그대로 열려요
5. **Build**를 누르고 저장 위치로 이 저장소의 `web/` 폴더를 고릅니다. (안에 있던 파일은 지워도 됩니다)
6. 바뀐 내용을 GitHub에 커밋·푸시하면 Vercel이 1~2분 안에 자동으로 새 버전을 올립니다.

> `web/index.html`을 더블클릭하면 게임이 열리지 않아요. 브라우저가 보안 때문에 컴퓨터 안 파일에서는 Unity 게임을 막기 때문이에요.
> 내 컴퓨터에서 확인하려면 Unity의 **Build And Run**을 쓰세요.

## Vercel 연결 (처음 한 번만)

1. [vercel.com](https://vercel.com)에 GitHub 계정으로 로그인합니다.
2. **Add New → Project**에서 이 저장소를 **Import**합니다.
3. 설정은 건드리지 않고 **Deploy**를 누릅니다. 출력 폴더(`web`)는 `vercel.json`에 이미 적혀 있어요.

## 사용한 글꼴

- 도현체 (Do Hyeon) — SIL Open Font License 1.1
- 경기천년바탕 — 경기도 무료 배포 글꼴

<!-- 그림·음악 출처가 있으면 여기에 적어 주세요. -->

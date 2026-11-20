# SANTA vs RUDOLPH — 3D Snowball Fight (JamesWorks)

## CrazyGames 업로드 파일 만드는 법

1. 이 폴더 전체를 새 GitHub 저장소(예: `santa-vs-rudolph`)에 올리기
   - `SANTA_vs_RUDOLPH.html`
   - `tools/make_crazygames.py`
   - `.github/workflows/crazygames-build.yml`
2. 저장소 → Actions → **CrazyGames build** → Run workflow
   (`SANTA_vs_RUDOLPH.html`을 새로 올리면 자동으로도 돌아감)
3. 끝나면 저장소 → Releases 에 `santa-vs-rudolph-crazygames.zip` 이 생김
4. 그 zip을 CrazyGames Developer Portal에 HTML5 게임으로 업로드

워크플로가 하는 일: three.js r128과 로더들, 구글 폰트를 다운받아 `index.html` 하나에 전부 넣음.
CrazyGames SDK만 외부 주소로 남김 (SDK는 반드시 sdk.crazygames.com에서 불러와야 함).

## 게임 안 CrazyGames 연동 (이미 들어가 있음)

- 로딩 시작/끝 신호, 실제 플레이 중/멈춤 신호 (gameplayStart / gameplayStop)
- CrazyGames에서 열면 팀 선택 화면을 건너뛰고 바로 경기 시작 → "Play" 한 번 누르면 시작
- CrazyGames 로그인 유저는 그 유저 이름을 닉네임으로 사용
- (광고 꺼짐) 경기와 경기 사이 중간 광고(midgame)
- 승리하면 happytime 신호
- (광고 꺼짐) 죽었을 때 보상형 광고 부활 버튼 + No, thanks
- 광고 차단기가 있거나 SDK가 없어도 게임은 그대로 돌아감
- 다른 사이트에서 테스트할 때 주소 끝에 `?cg=1`을 붙이면 CrazyGames 시작 흐름을 미리 볼 수 있음
- 주소 끝에 `?adtest=1`을 붙이면 가짜 광고(3초)로 부활·중간 광고 흐름을 테스트할 수 있음 (`?cg=1&adtest=1` 같이 써도 됨)

## 광고 스위치 (지금은 꺼진 제출용)

`SANTA_vs_RUDOLPH.html` 안에서 `var ADS_ON = false;` 를 찾아 `true` 로 바꾸면
광고 부활 버튼·No, thanks·경기 사이 광고가 다시 켜짐.
Basic Launch(테스트 출시)에서는 광고가 원래 꺼져 있으니 그대로 제출하고,
Full Launch(정식 출시) 초대를 받으면 true 로 바꿔서 업데이트하면 됨.
(ADS_ON 이 true 일 때만 주소 끝 `?adtest=1` 가짜 광고 테스트도 작동)

## 포털에 붙여넣을 문구 (영어)

**Title**
Santa vs Rudolph: Snowball Fight

**Short description**
Team Santa vs Team Rudolph in a 12 vs 12 Christmas Eve snowball war across 3 maps and 4 modes! Pack snowballs, ride snowmobiles and flying sleighs, and unwrap absurd gift-box weapons.

**Description**
It's Christmas Eve and the North Pole has split in two. Pick a side — Team Santa or Team Rudolph — and battle it out in a 6-minute, 12 vs 12 snowball war under the northern lights.

- Pack your own snowballs: quick singles, triple shots or a giant Mega Ball that leaves a crater
- 3 maps picked at random every match: North Pole Village, Holly Lane Suburbs and Downtown Plaza
- 4 modes: Fort Conquest, Team Deathmatch, Capture the Flag and Free-for-All
- Swim across rivers and ponds, or dive under the ice-cold water to dodge snowballs
- Ride snowmobiles or take to the skies in a flying sleigh and drop gift bombs from above
- Grab floating gift boxes for ridiculous limited weapons: AK-47, double-barrel shotgun, RPG-7 and a candy cane club
- Every few K.O.s you level up your snowballs: fire, rock core, frost, lightning, firecracker, bouncy, magic homing and more
- Get snowed out and your upgrades melt — stay alive to stay strong!

**Controls**
WASD move · Shift sprint · Mouse look · Left click throw · R make snowballs · 1/2/3 or wheel snowball type · 4 special weapon · F enter/exit vehicle · Space jump / sleigh up · C sleigh down · Right click or G drop gift bomb · C dive (in water) · V first/third person · Hold Tab scoreboard · Esc pause (settings: sensitivity, FOV, graphics, shadows, invert Y)
Mobile: left thumb move, right side look, big red button throw (drag it to aim while firing)

**Tags (참고)**
Christmas, Snowball, Shooter, Team, 3D, Multiplayer-style bots, Vehicles

## 제출 전 진성이 직접 확인할 것

- CrazyGames 개발자 계정·지급 정보 (미성년자 → 부모님 명의/동의)
- 표지 이미지(썸네일) — 포털이 요구하는 크기로 준비
- 에셋 라이선스: 모델/텍스처 출처와 상업적 사용 가능 여부 다시 한 번 확인
- QA Tool에서 실제로 실행해 보기 (광고 테스트 포함)

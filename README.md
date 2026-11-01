# LU YU — Full-stack Web Developer

陆屿的个人博客 / 作品集。纯静态前端，React 19 单页应用，强调滚动叙事、视差与细节交互；内容按真实简历组织：企业管理系统、签到考勤、数据大屏、竞赛荣誉与项目手记。

除文字与作品数据外，页面里的视觉素材全部来自仓库：`public/art` 下是程序化生成的 SVG / PNG，黑胶播放器的曲目与封面放在 `public/art/music`。

## 技术栈

- **React 19.3** + **TypeScript 7**，路由使用 **react-router-dom 7.18**（History 路由 + 自定义转场）
- **Vite 8.3**（`@vitejs/plugin-react`，`@` 指向 `src`），`build` 先跑 `tsc --noEmit`
- **Tailwind CSS 4.3**（`@tailwindcss/vite`）与 **shadcn**（`components.json`），仅用于接入 registry 组件；项目自有 CSS 不分层，优先级更高
- **GSAP 3.15**（`@gsap/react`；ScrollTrigger / SplitText / quickTo / ticker）负责滚动叙事、进场揭示与播放器展开
- **Lenis 1.3** 平滑滚动，与 GSAP ticker 同步（`src/composables/useSmoothScroll.ts`）
- **StrokeText**（React Bits 描边绘制文字，`src/components/StrokeText.tsx`）：首屏两行标题先描边勾出轮廓，再由左向右擦除出实心字形
- **TextType**（React Bits 打字机文字，`src/components/TextType.tsx`）：首屏自述段落按字符逐字打出，光标跟随文字并持续闪烁
- **GlowCursor**（React Bits 流体光迹，`src/components/GlowCursor.tsx`）：纯 WebGL2 的鼠标拖尾（半浮点帧缓冲 + MacCormack 平流 + 20 步压力迭代 + 5 级 bloom），深色页以 `screen` 加光，奶油色页换成组件的 light 主题落墨
- **LetterGlitch**（React Bits 字符故障背景，`src/components/LetterGlitch.tsx`）：首屏整屏铺满的 WebGL2 字符场（字形图集 + 状态贴图、流动噪声、游走撕裂与指针火花），默认参数与官方一致，`prefers-reduced-motion` 下退化为静止字符
- **LogoLoop**（React Bits 技术栈长条，`src/components/LogoLoop.jsx` + 类型声明 `.d.ts`）：关于页底部的 25 个技术栈品牌图标（`public/art/logo`），按语言 → 前端 / 后端框架 → 运行时 → 数据库 → 构建与工具 → 部署与系统 → 编辑器分层排列，连续滚动、可拖拽甩动、悬停停下并恢复品牌色，`prefers-reduced-motion` 下保持静止排列
- **DitherVeil**（React Bits 抖动之幕，`src/components/DitherVeil.jsx`）+ **ogl 1.0**（WebGL2）：把镀铬头像压成 1-bit 点阵
- **Web Audio**（`src/lib/vinylAudio.ts`）：左下角黑胶播放器的曲目读真实音频——`public/art/music` 下的 mp3 经 `HTMLAudioElement` 解码，再走 `MediaElementSource → 母带增益 → AnalyserNode → 输出`，频谱柱读真实波形；换曲把母带压下去再拉起，保留黑胶针脚底噪。目前三首：`☔️` / `Cry For Me` / `溯`，内圈封面依次是 `covers/#1.jpg` / `#2.jpg` / `#3.jpg`，其余曲位留空（补一个 `{ file, cover, duration }` 即可加歌），支持进度拖动、播完自动切下一首，预加载结束后自动播放（被自动播放策略拦下时，首次点击 / 按键解锁音频）
- 组件样式集中在 `src/styles/components/*.css`（37 个组件样式文件），由各组件按需引入
- 原生 SVG 程序化视觉素材（`public/art`）为主；音频与唱片封面素材放在 `public/art/music`（mp3 + `covers/`）

运行时要求 **Node.js ≥ 22.12**（`package.json` 的 `engines`；当前已验证 Node 26 / npm 11）。

## 快速开始

```bash
npm install
npm run dev       # http://localhost:5173（--host，局域网也可访问）
npm run build     # tsc --noEmit + vite build，输出 dist/
npm run preview   # 预览生产构建
```

如果 PowerShell 报错「因为在此系统上禁止运行脚本」（`npm.ps1` 被拦截），可以不改系统设置，直接使用：

```powershell
npm.cmd run dev
```

或放行当前用户的脚本（无需管理员权限，可随时改回）：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

`vite.config.ts` 忽略了 `.tmp-*` 临时目录，截图脚本与 headless Chrome profile 不会触发 Windows 下的 EBUSY 监听报错。

## 路由与锚点

| 路径 | 页面 |
| --- | --- |
| `/` | 首页：Hero → Marquee → Manifesto → About → Work → Experience → Credentials → Journal → Contact |
| `/work` | 项目索引（分类筛选 + 光标跟随预览 + 整行色彩揭幕） |
| `/work/:slug` | 作品详情（项目信息、笔记、画廊、下一项目） |
| `/journal` | 手记索引（分类筛选 + 悬浮预览） |
| `/journal/:slug` | 文章详情（阅读进度、正文排版、上一篇 / 下一篇） |
| `*` | 404 |

站内锚点：`/#index`、`/#manifesto`、`/#about`、`/#work`、`/#experience`、`/#credentials`、`/#journal`、`/#contact`。直接访问时会等待预加载与滚动解锁后再定位。不带 hash 进入首页（含刷新）始终从顶部开始，不会恢复上一次的滚动位置。

路由表在 `src/router.tsx`；页面切换由 `src/App.tsx` 统一调度：橙色幕布盖住屏幕后再换页，新页面挂载、图片解码与 `ScrollTrigger.refresh` 都发生在被遮住的那段时间。

## 内容与替换

- `src/data/site.ts`：姓名、职位、真实邮箱（`liukiiriing@gmail.com`）、GitHub（`@Kiiriing`）、技术栈与全屏菜单文案。
- `src/data/profile.ts`：简历内容的单一数据源——能力矩阵、数字概览（20+ 大屏 / 10+ 业务模块 / 8 项荣誉 / 4 张证书）、三段实践经历、8 项荣誉、4 张证书与志愿服务。
- `src/data/works.ts`：四个已交付项目（QianVerse / Attendance / Data Walls / Campus Lab）。每个项目包含 `stack`、`status`、`links`（GitHub / 邮件预约）与工程向的 `intro`、`notes`、`gallery`，`next` 串成「下一项目」链路。
- `src/data/posts.ts`：四篇真实项目手记（`idempotent-orders` / `attendance-anti-cheat` / `data-wall-rules` / `react-migration`）与分类（全部 / 工程 / 设计 / 随笔）。
- `src/data/chapters.ts`：首页章节索引（编号、锚点、标题与页脚标签）。
- `src/data/stack.ts`：关于页 LogoLoop 的技术栈图标清单（`techStack` 25 项，每项含 `name` / `icon` / `group`），按栈层次分组排列；新增技术只需把图标放进 `public/art/logo`（文件名小写、去空格），再在这里追加一行。

> 站内 GitHub 与邮箱均为真实地址；分类筛选由 `works.ts` 的 `filters` 与 `WorkIndexView.tsx` 的 `filters` 共同决定，新增项目时两处需要同步。
> 播放器加歌：把 mp3 放进 `public/art/music`（文件名可含中文 / emoji / `#`，`musicAsset()` 会做 `encodeURIComponent`），封面放进 `public/art/music/covers`，再到 `vinylAudio.ts` 的 `vinylTracks` 追加一项。

## 交互与可访问性

- 自定义光标（仅在光标实际可见时隐藏系统光标，离开窗口 / 失焦自动恢复）、预加载揭幕、全屏菜单、颗粒质感、页面过渡；指针进入左下角黑胶播放器时，反色圆环与白点整体隐藏、控件交回系统指针，移出后恢复
- 首页 Hero：背景由 LetterGlitch 铺满整屏（字符在流动噪声里缓亮、随机成片故障，指针经过处点亮火花、点击沿行撕裂），并在文字一侧压一层暗场保证小字号可读；左侧标题逐字入场、`hero__lead` 与底部信息随滚动产生视差；右侧 DitherVeil 用 `floyd` 抖动把镀铬头像压成 1-bit 点阵，透明底会被 alpha 裁掉，点阵直接浮在页面网格上；鼠标划过的拖尾会烧穿成全彩、松开后逐格编织回点阵，点击产生冲击波
- 进入首页（无 hash）时始终落在顶部：接管 `history.scrollRestoration` 并在预加载结束后回滚到 0，修复刷新后「自动跳到关于我」的问题
- 左下角黑胶播放器（`VinylPlayer`，全局常驻、跨页继续播放）：收起时只有一张唱片，点击后唱片左移、控制条向右展开（进度条 / 上一首 / 播放暂停 / 下一首 / 小喇叭音量槽 / 10 格实时频谱）；右上角是「当前时间 / 歌曲长度」，拖动进度条即时定位、播完自动接下一首；音量收成一枚喇叭，悬停或点按才滑出 82px 细音量槽（移动端向上展开），指针可以顺势移到左侧滑槽上继续拖动，停在滑槽里一直保持展开、离开音量区域 0.5s 后才收回；预加载结束后自动播放，浏览器拦截时唱片照转并在唱片上方提示 `Tap for sound`，首次点击 / 按键解锁音频；展开由 GSAP 时间轴负责（宽度 `expo.out` 0.62s、内容按 0.06s 依次进场、唱片同步左移），收起时内容先退、面板后收，点击页面其它地方自动合上；按住唱片可拖到整页任意位置（夹紧以唱片本体为准，展开态不再被控制条宽度限制），松手后自动回拉保证整块不出屏；配色用 `elementsFromPoint` 读取控件下方的页面，落到 `.theme-paper` 章节自动切成奶油纸面的墨色文字，换页与拖动后都会重新采样；播放器整块（`CustomCursor` 的 `PLAIN_REGION`）不叠加反色圆环，唱片 / 按钮 / 滑块都用系统指针（`cursor: auto`，按钮与 range 为 `pointer`）
- 唱片内圈：有封面时按 60% 直径渲染成圆形照片（内阴影收边、随盘面一起转），没有封面就退回原来的编号标签；真实音频的时长由 `loadedmetadata` / `durationchange` 报回，元数据未到时用曲目表兜底
- 路由切换时以橙色幕布进行擦除式转场（含目标页面标签与路径），全程由 CSS 关键帧跑在合成线程上
- 项目索引：分类筛选、计数过渡、整行 paper 色块从中心揭幕、项目数字变实色、光标跟随案例预览卡，键盘 focus 同样触发揭幕
- 滚动后顶部渐隐遮罩，保证固定导航与大标题重叠时的可读性
- 首页横向作品画廊：GSAP scrub 驱动，支持鼠标拖拽映射纵向滚动；桌面与移动端均提供 All projects 入口
- 首页 Marquee：GSAP ticker 驱动，滚动越快横向速度与 `skewX` 倾斜越大，指针悬停减速；关键词与真实技术栈一致
- 关于区底部 LogoLoop：技术栈品牌图标连续滚动，可拖拽甩动，悬停停下、恢复原色并显示「名称 · 分层」提示，离屏自动停帧
- Experience 章节：粘性大号索引与竖向进度线（scrub），ScrollTrigger 在视口中段点亮当前经历
- Credentials 章节：8 项荣誉行 + 4 张证书卡 + 20 小时志愿记录，指针光晕（quickTo）、逐条揭示与 `Magnetic` 磁性 CTA
- 手记悬浮预览（仅精确指针设备）、作品卡 3D tilt、页脚光晕
- 尊重 `prefers-reduced-motion`：关闭连续动画，保留最终画面与横向滚动的静态 scrub
- 菜单打开时 `#main` 设为 `inert` 并锁定滚动；提供跳过导航链接与 `focus-visible` 样式

## 部署

构建产物为纯静态文件（`dist/`）。由于使用 History 路由，托管平台需要把未知路径回退到 `index.html`：

- Netlify：`/* /index.html 200`
- Vercel / Nginx：`try_files $uri $uri/ /index.html;`
- GitHub Pages：需要在 404 回退或使用 hash 路由方案

## 目录

```text
src/
  App.tsx       应用外壳：预加载、菜单、页面过渡、滚动重置、全局挂件
  main.tsx      React 入口（createRoot + BrowserRouter）
  router.tsx    路由表与路由名映射
  components/   页面区块与通用组件（.tsx；另有 React Bits / shadcn 生成的 .jsx）
  composables/  平滑滚动（GSAP + Lenis）
  hooks/        时钟、进场 reveal
  data/         站点、章节、简历、作品、文章与技术栈内容
  lib/          GSAP 注册、黑胶音频引擎（真实音频曲目）
  store/        UI 状态（菜单 / 启动 / 触屏）
  styles/       主题变量、全局排版；components/ 下为各组件样式
  views/        首页、手记、文章、作品索引 / 详情、404
public/art/     本地视觉素材（SVG / PNG；art/logo 为 25 个技术栈品牌图标，art/music 为音频与封面）
```

## 更新日志

### 2026-11-01 — 重写 README：按当前项目状态整理技术栈、路由与内容源

- `README.md`：整份重写，补齐「概览 / 技术栈 / 快速开始 / 路由与锚点 / 内容与替换 / 交互与可访问性 / 部署 / 目录」结构。
- 核对后的现状：React 19.3 / TypeScript 7 / react-router-dom 7.18 / Vite 8.3 / Tailwind 4.3 / GSAP 3.15 / Lenis 1.3 / ogl 1.0；Node ≥ 22.12；`src` 下 6 个视图、37 个组件样式文件、25 个技术栈图标与 `techStack` 25 项；四个作品、四篇手记与三档分类。
- 播放器描述改为三首真实音频 `☔️` / `Cry For Me` / `溯`，封面统一为 `public/art/music/covers/#1.jpg` / `#2.jpg` / `#3.jpg`（与 `vinylAudio.ts` 的 `cover` 路径一致）；补充「加歌」与封面替换步骤。
- 锚点表补上 `/#index`，部署说明明确构建产物的 History 回退规则，目录树同步 `data/chapters.ts`、`lib`、`store` 等实际文件。
- 验证：`npm run build` 通过；本次仅文档改动，未触及运行时代码。

### 2026-11-01 — 播放器封面统一改名为 `#1.jpg` / `#2.jpg` / `#3.jpg`

- `public/art/music/covers/`：删除手绘的 `cry-for-me.svg` / `su.svg`，三张封面统一为 `#1.jpg`（由原 `radiax-umbrella.jpg` 改名）、`#2.jpg`、`#3.jpg`。
- `src/lib/vinylAudio.ts`：三首曲目的 `cover` 路径同步改为 `/art/music/covers/#1.jpg`、`#2.jpg`、`#3.jpg`。

### 2026-11-01 — 曲序调整：☔️ 打头，新增第三首「溯」

- `src/lib/vinylAudio.ts`：曲序改为 `SIDE A · 01 ☔️ / Radiax` → `SIDE A · 02 Cry For Me / feat. 愛海 · Michita` → `SIDE A · 03 溯 / Sù`；新增第三首 `溯.mp3`（mp3 里没有 ID3 标签，标题取文件名，实测 3:12，兜底时长 192.03s）。
- `public/art/music/covers/su.svg`：给「溯」画了同款圆形封面（深色 chrome 渐变 + 宋体字 + 橙色分隔线 + 颗粒），沿用 `cry-for-me.svg` 的版式；`cry-for-me.svg` 底部编号由 `SIDE A 01` 改为 `SIDE A 02`。
- 验证：`npm run build` 通过（`index-*.js 610.71 kB`）；`npm run preview` + headless Chrome 1440×900 依次点「下一首」：01 ☔️ 1:57 → 02 Cry For Me 5:03 → 03 溯 3:12 → 回到 01，「上一首」从 01 回到 03，三首封面 `radiax-umbrella.jpg` / `cry-for-me.svg` / `su.svg` 全部加载成功，控制台无 error。

### 2026-11-01 — 播放器接入真实歌曲，唱片内圈改成当前歌曲的封面

- `public/art/music/`：放入 `CryForMe.Feat.愛海.-Michita#2CbowT.mp3`（303.05s）与 `Radiax - ☔️.mp3`（117.13s）；`covers/radiax-umbrella.jpg` 是从 mp3 的 `APIC` 帧提取的原生封面，`covers/cry-for-me.svg` 为无内嵌封面的 `Cry For Me` 画的品牌化圆形封面（深色 chrome 渐变 + 奶油衬线斜体 + 橙色分隔线 + 颗粒）。
- `src/lib/vinylAudio.ts` 重写为真实音频引擎：`HTMLAudioElement` 解码 → `MediaElementSource` → 母带 `GainNode`（音量）→ `AnalyserNode` → 输出；保留黑胶针脚底噪、手势解锁与频谱接口。`vinylTracks` 只留两首真实曲目（`file` / `cover` / `duration`），其余曲位留空，加歌只需补一个对象；`musicAsset()` 用 `encodeURIComponent` 处理文件名里的 `#`、中文与 emoji。换曲时母带 180ms 压下再拉起；换源后把播放头钉回 0，避免新曲沿用旧曲的 `currentTime` 被 clamp 成「已播完」。
- `src/components/VinylPlayer.tsx`：`trackDuration` 状态承接 `engine.onDuration` 报回的真实长度，元数据未到时用曲目表兜底；进度条、时间显示、`aria-valuetext` 全部改用这个总长。内圈按 `track.cover` 渲染 `<img>`，没有封面时退回原来的编号标签。自动接歌判定同时加 `total > 0`，换曲淡出期间 `position()` 返回 0，防止连跳两首。
- `src/styles/components/VinylPlayer.css`：新增 `.vinyl-player__label--art`（60% 直径、圆形裁切、内阴影收边）与 `img` 铺满 `object-fit: cover`，封面随盘面一起转。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 1440×900 实测——自动播放后 `0:00 / 5:03`、频谱柱真实跳动、`hint` 为 `Now playing`；点「下一首」封面换成 `radiax-umbrella.jpg`、时长 `1:57`；暂停后唱片停转、频谱归零，继续播放从暂停点接上；把进度拖到 `4:42` 再拖到结尾，200ms 内自动接到 `SIDE A · 02` 并继续走秒；mp3 请求 200 / 206、封面 200，控制台无 error；截图确认盘心为圆形照片、居中且带中心孔。

### 2026-11-01 — 播放器曲目扩充到十首：按站点气质排成一张 A/B 面唱片

- `src/lib/vinylAudio.ts`：`vinylTracks` 从 4 首扩到 10 首，新增 `Grain Emulsion / 颗粒乳剂`、`Cream Interval / 奶油间奏`、`Contact Sheet / 接触印样`、`Margin Note / 页边批注`、`Orange Noise / 橙色噪声`、`Sign-off / 收声`；每首按「夜行 / 纸面与印刷 / 暗房 / 批注 / 收尾」配了根音、半音序列、步长、低通截止与音量，A 面留夜行与印刷、B 面留暗房与收尾，loop 回 01 时像把唱片放回封套。
- `side` 统一成总曲序 `SIDE A · 01–05` / `SIDE B · 06–10`，与唱片中心编号、面板左上角编号一致；`next / prev` 自动按 10 首循环，播完自动接下一首。
- 文件头注释补充了这张「唱片」的编排思路，以及换成真实 `HTMLAudioElement` 时需要保留的五个对外接口。
- 验证：`npm run build` 通过（`index-*.js 611.10 kB`）；`npm run preview` + headless Chrome 连点「下一首」11 次，面板依次显示 01–10 后回到 01，标题 / 中文 / 时长（1:36、1:18、1:52、1:12、1:28、1:24、1:44、1:32、1:16、1:58）与进度条 `max` 全部对应；把第 1 首进度条拖到最右端后 0.9s 内自动接到 `SIDE A · 02`，`data-playing` 保持 `true`，控制台无 error。

### 2026-11-01 — 音量槽悬停：指针移到滑槽持续展开，离开音量区域 0.5s 才收回

- `src/components/VinylPlayer.tsx`：新增 `volHover` 状态与 `volTimer`。`.vinyl-player__vol` 的 `pointerenter` 立即展开，`pointerleave` 留 **500ms** 再收起（同时清掉点按锁定的展开）；在 0.5s 内回到音量区域会取消计时继续展开；触摸设备不启动计时，保留点按开关。
- `src/styles/components/VinylPlayer.css`：给 `.vinyl-player__vol-flyout` 补一条不可见的 `::after` 搭桥，盖住喇叭与滑槽之间 2px 的视觉缝（≤760px 向上展开时改到下方，接住 8px 间距），指针横跨缝隙不会「离开」音量区域。
- 鼠标点喇叭 / 拖完音量后自动 `blur()`，避免 `:focus-within` 把滑槽钉住导致离开后不收回；键盘聚焦仍可保持展开。
- 验证：`npm run build` 通过（`index-*.css 147.86 kB`、`index-*.js 610.18 kB`）；`npm run preview` + headless Chrome 1440×900：悬停喇叭 → `is-vol-open`、`aria-expanded: true`、滑槽 `opacity 1 / pointer-events auto`；以 40ms 步进左移穿过缝隙到滑槽并停留 1.5s 始终展开；点滑槽 30% 处音量 `0.7 → 0.55` 且焦点回到 `body`；移出后 300ms 仍展开、720ms 时 `is-vol-open` 已消失并开始淡出、1.2s 后 `opacity 0 / pointer-events none`；离开 200ms 内回来会重新展开；390px 下向上展开同样保持且完整落在面板内；控制台无 error。

### 2026-11-01 — 黑胶播放器内去掉反色圆环：交互改回系统光标

- `src/components/CustomCursor.tsx` 新增 `PLAIN_REGION = '.vinyl-player'` 与 `isPlainTarget()`：`pointermove / pointerover / pointerdown` 时判断指针是否落在播放器内，命中就加 `is-plain` 并清空 `is-active / is-labelled`（`Drag / Prev / Play / Pause / Next / Volume` 这些标签不再弹），移出后自动恢复。
- `src/styles/components/CustomCursor.css`：新增 `.cursor.is-plain, .cursor-dot.is-plain { opacity: 0 }`，放在 `.is-visible` 之后，同特异性下后者生效——反色圆环与白点一起 0.2s 淡出，指针离开播放器再淡入。
- `src/styles/main.css`：在 `@media (hover: hover) and (pointer: fine)` 里给 `html.has-custom-cursor .vinyl-player` 及其所有后代恢复 `cursor: auto`，按钮与 `input[type='range']` 用 `pointer`；这两条特异性 `(0,2,1)` 高于 `html.has-custom-cursor * { cursor: none }` 的 `(0,1,1)`，所以播放器里真的是系统指针。
- `src/components/VinylPlayer.tsx`：删掉 5 处已失效的 `data-cursor`（唱片、上一首、播放暂停、下一首、音量），不再维护不会显示的标签。
- 验证：`npm run build` 通过（`index-*.css 147.09 kB`、`index-*.js 609.55 kB`）；`npm run preview` + headless Chrome 1440×900 实测——指针在唱片 / 进度条 / 喇叭上时 `.cursor` 为 `cursor is-visible is-plain`、`opacity 0`，圆点为 `cursor-dot is-visible is-plain`、`opacity 0`，原生光标分别为 `pointer / pointer / pointer`，播放器根为 `auto`；移出播放器后类名回到 `cursor is-visible`、`opacity 1`，页面其它位置仍是 `cursor: none` + 自定义圆环；截图确认唱片与展开的控制条上没有任何白色反色环；控制台无 error。

### 2026-11-01 — 黑胶播放器升级：进度条 / 喇叭音量 / 自动播放 / 丝滑展开 / 点击外部收起

- 控制条中间那条滑块不再调音量，改成**歌曲进度**：`VinylPlayer.tsx` 用 `range` 绑定 `position`，拖动时即时 `seek()`，右上角显示「当前时间 / 歌曲长度」（`0:03 / 1:36` 这种格式），播到结尾自动接下一首。`src/lib/vinylAudio.ts` 为每首曲子加了虚拟 `duration`（96s / 78s / 112s / 72s）与 `position()` / `seek()`：进度按秒记录，拖动时把目标秒数换算回琶音的第几步重新起步，暂停后继续从暂停点播，不销毁上下文。
- 音量收成一枚小喇叭：悬停 / 聚焦 / 点按才向左滑出 82px 的细音量槽（窄屏改为在按钮上方展开），音量归零时图标换成静音符号。原来的大滑块让位给进度条，控制条宽度 268 → 286px。
- 进入页面加载完成（预加载结束 0.9s）自动播放；浏览器自动播放策略拦住时唱片照样转，唱片上方提示 `Tap for sound`，`VinylEngine` 在窗口挂一次性的 `pointerdown / keydown / touchstart`，第一次手势就 `resume()` 上下文；此时点播放键只负责唤醒声音，不会被误判成暂停。
- 展开 / 收起改用 GSAP 时间轴：面板宽度 `expo.out` 0.62s、唱片同步左移 14px、meta / 标题 / 进度条 / 控制行按 0.06s 依次进场（收起时内容先退、面板后收），比原来只给 `width` 加 CSS 过渡更顺；点击播放键额外扩出一圈强调色（ClickSpark 式），换曲时标题做一次小位移（AnimatedContent 式）。
- 点击页面其它地方（`document` 捕获阶段 `pointerdown`）自动把控制条合上。
- 拖拽不再被控制条盒子限制：夹紧基准从「整块（唱片 + 控制条）」换成**唱片本体**，展开态也能拖到整页任意位置；松手后再检查整块有没有出屏，需要时用 0.5s 过渡回拉（实测拖到最右后 `right 1432`，等于 `vw - 8`，不再溢出）。跨断点旋转 / 缩放时同步 GSAP 写的面板宽度。
- 验证：`npm run build` 通过（`index-*.css 146.84 kB`、`index-*.js 609.30 kB`）；`npm run preview` + headless Chrome 1440×900 实测：自动播放后 `data-playing: true`、唱片 `animation-play-state: running`；展开后 root 宽 390（92 + 12 + 286）、面板 286px、唱片 `-14px`，时间行 `0:03 / 1:36`；点进度条 50% 处 → `0:48 / 1:36`（value 49 / max 96，填充 51%）；鼠标移到喇叭时音量槽 `opacity 1 / 宽 82`，拖到 30% 处为 `0.29 / 29%`；点击页面空白处 `is-open` 变 false、面板宽度回到 0 且仍在播放；暂停后唱片 `paused`、频谱柱全部 `scaleY(0.08)`、时间 1.6s 内冻结在 `0:04`；缩到 390px 后面板自动换成 248px、整块 326px 宽、右缘 340px，音量槽向上展开仍完整落在面板内；控制台无 error。

### 2026-11-01 — 首屏左下角新增黑胶播放器：唱片左移展开控制条、可拖拽、配色随页面自适应

- 新增 `src/components/VinylPlayer.tsx` + `src/styles/components/VinylPlayer.css`：首屏左下角原来的「Scroll to explore」提示位换成常驻唱片。收起时只有一张黑胶（纹路、强调色标签、播放时才落针的唱臂、悬停浮出的 `Tap to open`）；点击唱片后唱片左移 14px、控制条向右展开 268px（上一首 / 播放暂停 / 下一首 / 音量 / 10 格实时频谱 / 曲目与计时），面板左侧留一道强调色竖线。按下唱片超过 5px 即判定为拖拽，整块可拖到任意位置并限制在视口内；在右边缘展开时会在 0.62s 后把整块向左回拉，不会溢出。
- 唱片转动交给 CSS：`animation: vinyl-spin 9.5s linear infinite` + `animation-play-state` 随播放状态切换，暂停时停在当前角度；播放时外圈多一道强调色辉光。所有按钮与滑块可键盘操作，唱片本身聚焦后回车 / 空格即可展开收起，菜单打开时整块设为 `inert`。
- 配色不写死：组件在每帧用 `elementsFromPoint` 读取唱片正下方的页面栈，命中 `.theme-paper` 就切换到奶油纸面的墨色文字 + 浅色玻璃，离开时换回暗场；滚动、拖动、换页都会重新采样，所以幕间 / 自述 / 手记这类纸面章节上不会出现一块突兀的黑色控件。自定义光标另有 `Drag / Play / Pause / Prev / Next` 文案。
- 新增 `src/lib/vinylAudio.ts`：仓库没有音频素材，四首曲目用 Web Audio 程序化合成（循环琶音 + 低八度长音 + 低通滤波 + 黑胶针脚底噪），换曲交叉淡入淡出，暂停只淡出总线、不销毁上下文，播完的音符节点即时断开；频谱柱直接读 `AnalyserNode` 的频域数据。想换成真实歌曲时按文件顶部注释替换曲目数据即可。
- `src/App.tsx` 全局挂载（`z-index: 780`，位于菜单 / 转场幕布 / 颗粒层之下），跨页继续播放；`src/components/HeroSection.tsx` 删除底部提示块，`HeroSection.css` 清理对应样式，底部信息与圆形徽章改为显式 `grid-column` 保持居中 / 右对齐，窄屏只留右侧徽章。
- 验证：`npm run build` 通过（`index-*.css 144.16 kB`、`index-*.js 604.04 kB`）；`npm run preview` + headless Chrome 1440×900 与 390×844 实测：点击唱片后 root 宽 104 → 372、唱片 `translateX(-14px)`、面板 268px；播放后唱片 `animation-play-state: running`、频谱柱由 AnalyserNode 实时抬升、计时递增，暂停后全部归位；音量点到 30% 处为 `0.28 / 28%`，上一首 / 下一首切到 `Paper Static / SIDE A · 02`；拖拽从 `(34,775)` 移到 `(64,555)`，拖到右边缘后展开自动回拉（right `1432 → 1426`）；滚到 `.manifesto` 时 `data-tone` 变 `paper`、面板底色 `rgba(232,226,213,.84)`，回到顶部恢复暗场；从菜单切到 `/journal` 时仍 `playing: true`、`data-tone` 自动变 `paper`、面板底色 `rgba(239,232,219,.84)`，切回首页恢复暗场；菜单打开时播放器 `inert` 且 `z-index 780` 被菜单的 `800` 压住，Escape 关闭后恢复；Enter 可展开 / 收起；控制台无 error。

### 2026-11-01 — 修复转场大字初始位置外露（能看到约 1/10 字形）

- `src/styles/components/RouteWipe.css`：大字与路径的初始下移量 `118%` → `132%`（进出场的关键帧同步改）。原因是大字所在的遮罩行 `.route-wipe__line--label` 带了 `0.2em` 的下内边距（配合负 margin 抵消布局位移），遮罩比字形盒高约 25%，只下移 118% 时字号盒仍有约 8px 留在遮罩内，幕布盖住的瞬间会露出约 6–10% 的字形。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 把转场动画冻结在 460ms / 520ms / 600ms / 760ms 逐帧测量：大字与遮罩的重叠由 `+8px` 变为 `-10px`（完全藏在下方，留 10px 余量），路径行 `-5px`；600ms 时大字按预期从遮罩下沿上滑，760ms 完全就位。

### 2026-11-01 — 修复路由转场「主体文字」卡顿：幕布改由合成线程推进

- 问题定位：旧 `RouteWipe` 用 GSAP 时间轴逐帧写 `clip-path: inset(...)`（全屏裁剪路径每帧触发整屏重绘），而换页（整棵页面卸载 + 挂载、图片解码、`ScrollTrigger.refresh`）发生在 320ms，正好卡在幕布上升（0–450ms）与大字上滑（250–700ms）的中间。主线程一停，GSAP 的 rAF 停更，大字就表现为「停住 → 突然跳一下」。
- `src/components/RouteWipe.tsx` 重写：不再逐帧写样式，改为按 `run.id` 重挂载整层、由 CSS 关键帧驱动；`play()` 只负责更新文案（`Now entering` / 大字 / 路径），1.72s 后自动卸载整层，不再常驻全屏 fixed 图层。
- `src/styles/components/RouteWipe.css`：整块幕布 `.route-wipe__panel` 只做 `translate3d(0, 100%) → 0 → -100%`（0–30% 盖上来 ≈486ms、30–66% 停留、66–100% 抽走，总长 1.62s），大字与路径在各自遮罩行内做 `translate3d` 上滑，配合 `will-change`/`backface-visibility`，全程跑在合成线程上，主线程停顿不再影响动画。纹理去掉 `mix-blend-mode: multiply`（变换层内的混合分组会削弱合成优化），条纹改为普通半透明叠加，观感一致。
- `src/App.tsx`：换页时机由 320ms 推迟到 470ms（幕布完全盖住屏幕时），让新页面挂载、`resetScroll` 与 `ScrollTrigger.refresh` 都发生在被遮住那段；reduced-motion 下 140ms 直接换页。
- `src/styles/components/App.css`：`.page-wrap.is-leaving` 的淡出加 0.22s 延迟，旧页面撑到幕布盖住再淡出，中间不露底色。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 从首页点击 `/work`，在页面 rAF 内连续采样 608 帧 / 2.4s：主线程最大帧间隔 33ms（无长帧），幕布 `y 878 → 0`（≈508ms）→ `-900`（≈1700ms）单调推进，大字 `153 → 0 → -153`，新页面 `page-in` 在幕布抽走前完成，控制台无错误；截图确认盖屏与抽走时层级、纹理、巨字均无回归。

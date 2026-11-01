# LU YU — Full-stack Web Developer

陆屿 — 个人博客 / 作品集。静态前端，React 19 单页应用，强调滚动叙事、视差与细节交互；内容按真实简历组织：企业管理系统、签到考勤、数据大屏、竞赛荣誉与项目手记。

## 技术栈

- **React 19** + **TypeScript**，路由使用 **react-router-dom 7**
- **Vite 8**（`@vitejs/plugin-react`）
- **GSAP 3.15**（ScrollTrigger / SplitText / quickTo / ticker）
- **StrokeText**（React Bits 描边绘制文字，`src/components/StrokeText.tsx`）：首屏两行标题先描边勾出轮廓，再由左向右擦除出实心字形
- **TextType**（React Bits 打字机文字，`src/components/TextType.tsx`）：首屏自述段落按字符逐字打出，光标跟随文字并持续闪烁
- **GlowCursor**（React Bits 流体光迹，`src/components/GlowCursor.tsx`）：纯 WebGL2 的鼠标拖尾（半浮点帧缓冲 + MacCormack 平流 + 20 步压力迭代 + 5 级 bloom），深色页以 `screen` 加光、奶油色页换成组件的 light 主题落墨
- **LetterGlitch**（React Bits 字符故障背景，`src/components/LetterGlitch.tsx`）：首屏整屏铺满的 WebGL2 字符场（字形图集 + 状态贴图、流动噪声、游走撕裂与指针火花），默认参数与官方一致，`prefers-reduced-motion` 下退化为静止字符
- **LogoLoop**（React Bits 技术栈长条，`src/components/LogoLoop.jsx` + 类型声明 `.d.ts`）：关于页底部的 25 个技术栈品牌图标（`public/art/logo`），按语言 → 前端框架 → 运行时 → 数据库 → 构建与工具 → 部署与系统 → 编辑器分层排列，连续滚动、可拖拽甩动、悬停停下并恢复品牌色，`prefers-reduced-motion` 下保持静止排列
- **ogl 1.0**：承载 React Bits `DitherVeil` 抖动之幕（WebGL2）
- **Tailwind CSS v4**（`@tailwindcss/vite`）与 **shadcn**（`components.json`），仅用于接入 registry 组件；项目自有 CSS 不分层，优先级更高
- **Lenis** 平滑滚动，与 GSAP ticker 同步
- 组件样式集中在 `src/styles/components/*.css`，由入口按需引入
- 首屏为「左侧排版 + 右侧 DitherVeil 抖动之幕」双列布局（≤900px 面板下移居中），背景由 LetterGlitch 字符故障场铺满整屏，动效集中在标题描边 + 自述打字、滚动视差与底部提示
- 原生 SVG 程序化视觉素材（`public/art`），无外部图片依赖

运行时要求 **Node.js ≥ 22.12**（当前已验证 Node 26 / npm 11）。

## 开发

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc --noEmit + 输出 dist/
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

## 路由

| 路径 | 页面 |
| --- | --- |
| `/` | 首页：Hero → Marquee → Manifesto → About → Work → Experience → Credentials → Journal → Contact |
| `/work` | 项目索引（分类筛选 + 光标跟随预览 + 整行色彩揭幕） |
| `/work/:slug` | 作品详情（项目信息、笔记、画廊、下一项目） |
| `/journal` | 手记索引（分类筛选 + 悬浮预览） |
| `/journal/:slug` | 文章详情（阅读进度、正文排版、上一篇 / 下一篇） |
| `*` | 404 |

站内锚点：`/#about`、`/#manifesto`、`/#work`、`/#experience`、`/#credentials`、`/#journal`、`/#contact`。直接访问时会等待预加载与滚动解锁后再定位。不带 hash 进入首页（含刷新）始终从顶部开始，不会恢复上一次的滚动位置。

## 内容与替换

- `src/data/site.ts`：姓名、职位、真实邮箱（`liukiiriing@gmail.com`）、GitHub（`@Kiiriing`）、技术栈与菜单文案。
- `src/data/profile.ts`：简历内容的单一数据源——能力矩阵、数字概览、三段实践经历、8 项荣誉、4 张证书与志愿服务。
- `src/data/works.ts`：四个已交付项目（QianVerse / Attendance / Data Walls / Campus Lab）。每个项目包含 `stack`、`status`、`links`（GitHub / 邮件预约）与工程向的 `intro`、`notes`、`gallery`。
- `src/data/posts.ts`：四篇真实项目手记与分类。
- `src/data/stack.ts`：关于页 LogoLoop 的技术栈图标清单（`techStack` 25 项，每项含 `name` / `icon` / `group`），按栈层次分组排列；新增技术只需把图标放进 `public/art/logo`（文件名小写、去空格），再在这里追加一行。

> 站内 GitHub 与邮箱均为真实地址；分类筛选由 `works.ts` 的 `filters` 与 `WorkIndexView.tsx` 的 `filters` 共同决定，新增项目时两处需要同步。

## 交互与可访问性

- 自定义光标（仅在光标实际可见时隐藏系统光标，离开窗口 / 失焦自动恢复）、预加载揭幕、全屏菜单、颗粒质感、页面过渡
- 首页 Hero：背景由 LetterGlitch 铺满整屏（字符在流动噪声里缓亮、随机成片故障，指针经过处点亮火花、点击沿行撕裂），并在文字一侧压一层暗场保证小字号可读；左侧标题逐字入场、`hero__lead` 与底部提示随滚动产生视差；右侧 DitherVeil 用 `floyd` 抖动把镀铬头像压成 1-bit 点阵，透明底会被 alpha 裁掉，点阵直接浮在页面网格上；鼠标划过的拖尾会烧穿成全彩、松开后逐格编织回点阵，点击产生冲击波
- 进入首页（无 hash）时始终落在顶部：接管 `history.scrollRestoration` 并在预加载结束后回滚到 0，修复刷新后「自动跳到关于我」的问题
- 路由切换时以橙色幕布进行擦除式转场（含目标页面标签与路径）
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

构建产物为纯静态文件。由于使用 History 路由，托管平台需要把未知路径回退到 `index.html`：

- Netlify：`/* /index.html 200`
- Vercel / Nginx：`try_files $uri $uri/ /index.html;`
- GitHub Pages：需要在 404 回退或使用 hash 路由方案

## 目录

```text
src/
  App.tsx       应用外壳：预加载、菜单、页面过渡、滚动重置
  main.tsx      React 入口（createRoot + BrowserRouter）
  router.tsx    路由表与路由名映射
  components/   页面区块与通用组件（.tsx，另有 shadcn / React Bits 生成的 .jsx）
  composables/  平滑滚动（GSAP + Lenis）
  hooks/        时钟、进场 reveal
  data/         站点、作品、文章内容
  lib/          GSAP 注册
  store/        UI 状态（菜单 / 启动 / 触屏）
  styles/       主题变量、全局排版；components/ 下为各组件样式
  views/        首页、手记、文章、作品、404
public/art/     本地视觉素材（SVG / PNG；art/logo 为技术栈品牌图标）
```

## 更新日志

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

### 2026-11-01 — 全站叙事骨架：三幕章节、幕间页、章节脊柱与「下一章」翻页

- 新增 `src/data/chapters.ts`：全站唯一叙事数据源。8 章（`01 index` → `08 contact`）各带编号、幕次（Act I Origin / Act II Craft / Act III Notes）、中英文标签、一句判断与 `path`；另有 2 条幕间文案（`craft` / `notes`）。章节脊柱、幕间页、子页面章节标签与「下一章」全部读这份数据，编号与文案不再重复。
- 新增 `src/components/SceneInterlude.tsx` + `src/styles/components/SceneInterlude.css`：主题交界处的整页幕间（奶油纸面），巨型描边词（`clamp(7rem, 23vw, 19rem)`）、罗马数字、大中文标题与斜体英文、`04 → 06 / SELECTED WORK, ROLES & PROOF` 元信息、信号线与 `CONTINUE ↓`；三段 `scrub`（大字横向 -7% → 7%、罗马数字 12% → -18%、信号线 0.08 → 1）。`src/views/HomeView.tsx` 在 Works → Experience、Credentials → Journal 之间各插一页，把「界面 → 系统」「证据 → 判断」翻过去。
- `src/components/ScrollProgress.tsx` 重写为可点击的**章节脊柱**：8 个刻度（悬停浮出预览卡：幕次 / 斜体章节名 / 中英一句判断），点击由 Lenis 跳到对应 `[data-section]`；进度条直接写 DOM（`scaleY`），只有章节变化才 `setState`，滚动时不再整条重渲染；大号斜体编号 + `/ 08`、幕次、竖排中文判断。`src/styles/components/ScrollProgress.css` 改为 `mix-blend-mode: difference` 反相配色，≤1100px 收掉中文、≤900px 整条隐藏。
- `src/components/HeroSection.tsx` / `HeroSection.css`：离场时背景先沉（`.hero__glitch` `-14%` + 透明度 0.18、`.hero__ambient` `-8`、`.hero__veil` `-6`），形成一次镜头拉开；新增指针深度（`gsap.quickTo`）——逐行标题反向位移（`-(10 + index * 5)` / `-6`）、展示图 `±18 / ±12`，仅 `(hover:hover) and (pointer:fine)` 且非 reduced-motion 挂载；展示图内部拆出 `.hero__veil-inner`，让入场/离场的 `transform` 与视差不互相覆盖。
- `src/components/WorksSection.tsx` / `WorksSection.css`：新增两团漂移氛围光（`filter: blur(70/80px)`，26s / 34s alternate，裁剪写在 `.works__ambient` 自身以免破坏内层 sticky）；卡片悬停时一圈细线从边缘向内收进（合焦框，`rgba(216,255,67,.5)`）。
- 新增 `src/components/ChapterTag.tsx` + `ChapterTag.css`：子页面顶部的章节标签（大号斜体编号 + `/ 08` + 幕次 + 一节判断），发丝线在进入视口后横向铺开，悬停换成强调色渐变。接入 `WorkIndexView`（04）、`WorkView`（04）、`JournalView`（07）；颜色全部走主题变量，暗场与奶油纸面自动切换。
- 新增 `src/components/ChapterNext.tsx` + `ChapterNext.css`：页面结尾的「下一章」整块翻页（05 Experience / 08 Contact），巨字描边、章节编号、中英判断与圆形箭头；悬停/聚焦时整块反相（暗场 → 米色、纸面 → 墨色），描边字变强调色、箭头位移。接入 `WorkIndexView`(04→05)、`WorkView`(04→05)、`JournalView`(07→08)、`PostView`(07→08)。
- `src/App.tsx`：新增章节深链——`/#experience`、`/#contact` 这类地址在路由落位、页面就绪后由 Lenis 立即定位（顺带修好菜单从子页跳回首页章节的落点，以及 `Link to="/#…"` 一律停在顶部的问题）。
- 验证：`npm run build` 通过（`index-*.js 592.94 kB`、`index-*.css 136.83 kB`）；`npm run preview` + headless Chrome 1440×900 实测：首页 `scrollHeight 13379`、8 个 `[data-section]`、脊柱 8 刻度、悬停第 4 刻度浮出 `About / 界面后面的那个人。`、点击刻度落到 `works.offsetTop 4467`（`scrollY 4467`、标签变 `Work`）、幕间高 560px；`ChapterNext` 悬停反相 `bg rgb(242,237,228)` / `color rgb(8,8,10)`、描边变 `rgb(255,90,47)`、箭头 `translate(5px,-5px)`，点击后 `/#experience` 落点 `scrollY 6538` 与 `experienceTop 6538` 一致、脊柱显示 `Experience`；`/`、`/work`、`/work/qianverse`、`/journal`、`/journal/idempotent-orders`、404 六条路由控制台无 error/warning、均无横向溢出；390×844 下无横向溢出、脊柱隐藏、章节标签单行收拢。

### 2026-11-01 — 消除首屏强制布局与逐帧布局读取

- 来源：浏览器控制台持续报 `[Violation] Forced reflow while executing JavaScript took 144ms`、`'requestAnimationFrame' handler took 107ms`、`'touchstart' input event was delayed for 540ms`。用 CDP 注入探针（`PerformanceObserver` longtask、包装 `SVGTextElement.prototype.getBBox`、`Element.prototype.scrollWidth` getter、`HTMLCanvasElement.prototype.getContext` + CPU Profile）定位到三处主线程开销。
- `src/components/StrokeText.tsx`：`getBBox` 原先在 `useLayoutEffect` 里同步执行，首屏第一次测量会强制整页布局（实测 414–569ms）。改为 rAF 调度，并把「挂载 / `document.fonts.ready` / `ResizeObserver` / `window resize`」四种触发合并成同一帧内只测一次；卸载时取消未执行的帧并断开观察。实测 8 次 `getBBox` 全部 0ms，`viewBox` 与描边擦除动画不受影响。
- `src/components/MarqueeBand.tsx`：GSAP ticker 原先每帧读 `el.scrollWidth` 判断循环回绕点（6 秒约 500 次，每次都可能强制布局）。改为在挂载、`ResizeObserver` 与 `window resize` 时缓存半宽，ticker 只读缓存。实测 6 秒内 `scrollWidth` 读取 500 → 6 次，`translate3d` 位移与回绕正常。
- `src/components/LetterGlitch.tsx`：WebGL2 上下文、着色器编译与字形图集生成原先在 React 首次提交时同步启动，挤占首帧。改为双 rAF（首帧绘制后）再建上下文，既不拖慢首次提交与首屏布局，又能在预加载揭幕前准备完成，揭幕时不会先空一拍。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 1440×900 实测首屏标题 `viewBox` 正常、`visibility: visible`，字符场 1.2s 仍为初始尺寸、1.8s 已到 2880×1800（DPR 2），早于预加载揭幕；marquee 持续位移（1.8 / 3.2 / 4.8s 分别为 -73.26 / -178.93 / -297.78px）且无横向溢出，截图无视觉回归；dev 探针复核 `firstBBoxAt 1258ms`、`glitchCtxAt 2038ms`、`bbox` 8 次全部 0ms。

### 2026-11-01 — 技术栈图标放大到 1.7 倍

- `src/components/AboutSection.tsx`：LogoLoop 的图标尺寸 `logoHeight 42 → 71`、间距 `gap 54 → 92`，按 1.7 倍同步放大，图标与留白保持原比例。
- `src/styles/components/AboutSection.css`：≤760px 的 `--logoloop-logoHeight` 由 34px 提到 58px、条目间距 30px → 51px，窄屏同样是 1.7 倍。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 1440×900 实测图标 71×71、条目间距 92px、长条高 252px、长条宽 1440 且无横向溢出；390×844 下图标 58×58、间距 51px、长条高 195px、宽 390 且无横向溢出；滚动、悬停提示与拖拽逻辑不受影响。

### 2026-11-01 — 首页背景改为 React Bits LetterGlitch 字符故障场

- 新增 `src/components/LetterGlitch.tsx`：按 reactbits.dev/backgrounds/letter-glitch 的实现 1:1 移植为 TSX。着色器（字形图集 + 状态贴图、流动噪声、边缘 / 中心渐隐）、默认字符集与等宽字体、`fontSize 14` / `spacing 0.6` / `density 0.9` / `baseOpacity 0.16` / `glitchAmount 0.5` / `speed 1` / `flow 0.5` / `cursorRadius 140` / `clickEffect 'tear'` 等默认值与官方一致；intro 逐格显影、环境重绘与故障速率、最多 48 条游走撕裂（含分叉）、指针点亮与点击喷发、画布 DPR ≤ 2、IntersectionObserver 离屏停帧、`visibilitychange`、字体加载完成后重建图集、`prefers-reduced-motion` 下静止、卸载时回收 WebGL 上下文，全部保留。相比原实现仅补 TypeScript 类型。
- 新增 `src/styles/components/LetterGlitch.css`：与组件一一对应的原样式。
- `src/components/HeroSection.tsx`：在 `.hero__ambient` 之上新增 `.hero__glitch` 背景层并挂载 `LetterGlitch`（不传任何 props，保持默认参数）；原有右侧 DitherVeil 抖动之幕、标题描边与自述打字保持不变。
- `src/styles/components/HeroSection.css`：新增 `.hero__glitch`（`position: absolute; inset: 0; z-index: 0; pointer-events: none`，组件在 `window` 上监听指针，因此不拦截鼠标交互）；并用 `::after` 压一层暗场——左侧 0.78 → 0 的横向渐变收敛小字号段落的背景噪声，上下各 0.55 / 0.6 的纵向渐变压住四角标注，右侧展示图区域保持原亮度。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 1440×900 实测背景容器 1440×900、画布 2880×1800（DPR 2）、页面无横向溢出，LetterGlitch / DitherVeil / GlowCursor 三个 WebGL2 上下文同时可用，headless 未节流下 rAF 采样 258fps，滚动到 2400px 后 hero 离屏、回滚后恢复，控制台无异常；390×844 下画布 780×1688、无横向溢出；`prefers-reduced-motion: reduce` 下字符场静止且标题、自述、展示图均正常。

### 2026-11-01 — 技术栈长条改用品牌图标并按栈层次排序

- 新增 `public/art/logo/`：25 个技术栈品牌图标（素材来自 `art\logo`，统一为 512×512 PNG）。文件名规范化——小写、去空格与后缀差异（`Anaconda.png → anaconda.png`、`Apache Maven.png → maven.png`、`Next.js.png → nextjs.png`、`PostgresSQL.png → postgresql.png`、`Vite.js.png → vite.png`、`Vue.js.png → vue.png` 等），重复的 `JavaScript (1).png` 未收录。
- `src/data/stack.ts` 重写为图标数据源：`techStack` 25 项各含 `name` / `icon` / `group`，按「语言（HTML5、CSS3、JavaScript、TypeScript、Java、Python、Markdown）→ 前端框架（Vue、Next.js、Bootstrap、Sass）→ 运行时（Node.js）→ 数据库（PostgreSQL、MySQL）→ 构建与工具（Vite、Git、GitHub、Maven、Anaconda、Postman）→ 部署与系统（Docker、Ubuntu）→ 编辑器（Visual Studio、IntelliJ IDEA、PyCharm）」排列；新增 `TechGroup` / `TechItem` 类型，移除旧的文字 wordmark 清单与 `techGroups`。
- `src/components/AboutSection.tsx`：长条条目从「编号 + wordmark」改为 `<img>` 图标（带 `alt`、512×512 宽高比、`title` 为「名称 · 分层」），参数调整为 `speed 64`、`logoHeight 42`、`gap 54`、`muted 0.5`、`labels="hover"`（悬停停下、恢复品牌色并显示提示）；栏目标签显示 `25 icons · 拖动可回看`。
- `src/styles/components/AboutSection.css`：删除旧的 wordmark 条目样式，新增图标长条样式；`github / markdown / nextjs` 的原图是深色实心 + 透明镂空，在近黑底上几乎不可见，用 `filter: invert(1)` 反相成浅色标记，其余图标保持品牌色；≤760px 以 `--logoloop-logoHeight: 34px !important` 收到 34px（组件把高度写成行内变量）并收窄条目间距。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 1440×900 实测 `itemsPerList 25`、`lists 4`、图标 42×42、轨道 400ms 内持续位移、悬停 `Java` 出现「Java · 语言」且恢复彩色、长条宽 1440 且无横向溢出；390×844 下图标 34×34、长条宽 390、悬停 `Markdown`；`prefers-reduced-motion` 下轨道静止。

### 2026-11-01 — 关于区收紧内边距并接入 React Bits LogoLoop 技术栈长条

- `src/styles/components/AboutSection.css`：`#about` 的 `padding-block` 由 `clamp(100px, 13vw, 190px)` 减半为 `clamp(50px, 6.5vw, 95px)`，`.about__head` 的 `padding-bottom` 由 `clamp(44px, 6vw, 84px)` 减半为 `clamp(22px, 3vw, 42px)`；1440px 下实测上下内边距 187.2px → 93.6px、眉标下间距 84px → 42px。
- 新增 `src/components/LogoLoop.jsx`：原样（1:1）接入 reactbits.dev/animations/logo-loop 的实现——误差函数透镜、弧 / 波浪 / 轨道三种布局、无限循环 + 拖拽甩动（动量衰减与吸附）、intro 逐项渐入、`--logoloop-pad` 自适应留白、IntersectionObserver 离屏停帧；仅把样式改为从 `src/styles/components/LogoLoop.css` 引入。
- 新增 `src/styles/components/LogoLoop.css`：与组件一一对应的原样式。
- 新增 `src/components/LogoLoop.d.ts`：为这个 JSX 组件补上 `logos / speed / layout / labels / muted / ...` 的 props 类型，TS 侧可直接补全参数。
- 新增 `src/data/stack.ts`：技术栈的单一数据源，51 项按 Backend / Frontend / Interaction / Cross-platform / Infra / Data / AI 分组，覆盖能力矩阵、三段经历与本站技术选型（NestJS 11、TypeScript、React 19、Vue 3、uni-app、Prisma 7、PostgreSQL 14、MySQL 8、Redis、Flask、Docker、Nginx、GSAP、Lenis、WebGL 2、Hadoop / Hive / Kafka / Spark 等）。
- `src/components/AboutSection.tsx`：在关于区底部新增 `Stack / 技术栈` 长条，条目渲染为「编号 + wordmark」文本节点（不等宽编号 + 衬线斜体名称），`speed 72`、`gap 44`、`fadeOut 0.09`、`scaleOnHover`、`labels="hover"`（悬停时停下并显示「名称 · 中文分组」）、`muted 0.6`（默认压暗、悬停恢复并点亮 `--accent`）。
- `src/styles/components/AboutSection.css`：新增 `.about__stack*` 样式——顶部细分隔线、与 `.shell` 对齐的栏目标签、条目字号 `clamp(17px, 1.7vw, 26px)` 随视口流体缩放，≤760px 收到 15px / 30px 间距。
- 验证：`npm run build` 通过；`npm run preview` + headless Chrome 1440×900 实测 `#about` 内边距 93.6px、长条宽 1440、每份列表 51 项、轨道 400ms 内持续位移、悬停 `Express` 出现「Express · 服务端」提示并转为 `--accent`、拖拽进入 `data-dragging` 且可甩动、页面无横向溢出；390×844 下条目 15px、长条宽 390、无横向溢出；`prefers-reduced-motion: reduce` 下轨道静止且条目完整可见。

### 2026-11-01 — 全站接入 React Bits GlowCursor 鼠标光迹

- 新增 `src/components/GlowCursor.tsx`：按 reactbits.dev/animations/glow-cursor 的实现 1:1 移植为 TSX。着色器（`SPLAT / ADVECT / MACCORMACK / DIVERGENCE / SCALE / PRESSURE / GRADIENT / SHADE / PREFILTER / DOWN / UP / DISPLAY`）、品质档位（sim 96/128/160、dye 384/576/768）、20 步压力迭代、5 级 bloom、点击 burst、静止自动清空全部与原版一致；参数默认值（`color #5f8bff`、`intensity 1.3`、`trailWidth 3`、`linger 1.4`、`glow 1.2`、`hotspot 0.8`、`followSpeed 0.6`、`quality high`、`maxDevicePixelRatio 2`）保持不变。相比原版仅补两处：缺少 `EXT_color_buffer_float` 时直接不启动；卸载时调用 `WEBGL_lose_context` 回收上下文。
- 新增 `src/styles/components/GlowCursor.css`：组件原样式 + 站内用法 `.glow-cursor--fixed`（`position: fixed; inset: 0; z-index: 785; pointer-events: none`）。`mix-blend-mode` 必须挂在 fixed 容器上——容器会自成层叠上下文，画布自己的 `screen` 只与空背景混合；挂到容器后才与整页背景混合。触屏（`hover: none` / `pointer: coarse`）隐藏。
- `src/App.tsx`：作为整屏固定叠加层接在 `CustomCursor` 之前，压在正文之上、页头（900）/菜单（800）/路由转场（940）之下，不拦截交互。粗指针设备整层不挂载（省掉一个 WebGL2 上下文与几张浮点贴图）；`key` 随深浅主题变化，路由切换时重挂载，旧主题的残留光迹不会跟到下一页。
- 深浅主题：深色页用默认 dark 主题 + `screen` 加光；`/journal`、`/journal/:slug` 这类 `.theme-paper` 奶油色页改用 light 主题（落墨式渲染、`normal` 混合，墨色 `#1b1a17`），避免加光把纸底洗白、压掉正文。
- 验证：`npm run build` 通过；`npm run preview` 下 headless Chrome 1440×900 实测 `webgl2 / EXT_color_buffer_float` 可用，叠加层 `z-index 785`、`position fixed`、rect `1440×900`，画布 `1440×900` + `screen`；光迹压过「Welcome」标题时奶油色字形不被染色，点击 burst 生成涡旋光团，静止约 2.6s 后自动清空画布（再移动可重新唤醒）；390×844 触屏模拟下叠加层不存在、首屏 844px、无横向溢出；`/journal` 与 `/journal/idempotent-orders` 为墨色光迹，首页点「手记」切页后无上一页残留。

### 2026-11-01 — 首屏标题改用 React Bits StrokeText 描边动效，打字机移到自述

- 新增 `src/components/StrokeText.tsx`：按 reactbits.dev/c/text-animations/stroke-text 的实现 1:1 移植为 TS（逐字 `strokeDasharray / strokeDashoffset` 描边、按字 `stagger`、`wipe / fade / none` 三种填充、四种擦除方向、`solid / dotted / dashed` 描边与 marching、`hover` 重绘、可选投影、`mount / scroll / hover / loop` 触发、`prefers-reduced-motion` 直接显示完成态）。相比原实现仅新增 `start` 开关（等预加载结束再绘制）与 `--stroke-text-em-width`（把包围盒宽度按 em 暴露给外层，样式即可做响应式缩放，无需重新测量或重播动画）。
- 新增 `src/styles/components/StrokeText.css`：与组件一一对应的原样式。
- `src/components/HeroSection.tsx`：首屏两行标题改为 StrokeText —— `Welcome` / `Personal Blog` 先由橙色描边勾出轮廓，再由左向右擦除出 `--paper` 实心字形；移除标题上的 TextType。自述段落改为 TextType 打印新文案（「我相信好的网页不是把所有东西都加上去……」），26ms/字、不循环、保留光标，并在下方用不可见 ghost 文本占位。
- `src/styles/components/HeroSection.css`：描边 SVG 以 `--line-size` 为字号基准（`max-width: calc(var(--stroke-text-em-width, 4.7) * 1em)`）并左对齐，斜体顺 `font-style` 继承到 SVG 文本；SVG 包围盒按字体上下沿计算、比原先 `line-height: 0.78` 的行盒高，用 `-0.39em / -0.62em` 负外边距把两行墨迹拉回原来的紧行距。自述的 ghost 占位 + 绝对定位打字层保证逐字出现时段落高度不变。≤760px 自述改为满行宽 / 11px、展示图 `max-height` 收到 28svh，390×844 首屏重新一屏放下。
- 验证：headless Chrome 采样 1440×900 / 1366×768 / 1024×768 / 390×844 / 320×568；描边后的擦除矩形宽度由 0 动画到整行（582 / 897 用户单位），首屏高度在 1440 / 1366 / 1024 / 390 下分别等于 900 / 768 / 768 / 844；自述 4 行，ghost 与打字层行数一致，`stackTop` 在打字前后不变；`npm run build` 通过，并在 `npm run preview` 下复测同一组尺寸。

### 2026-10-31 — 首屏标题接入 React Bits TextType 打字机动效

- 新增 `src/components/TextType.tsx`：按 reactbits.dev/text-animations/text-type 的实现 1:1 移植（`NEIGHBORS` 错字映射、`fade / blur / rise` 三种逐字效果、`backspace / select` 删除模式、光标 `character / bar / block / underscore` 四种形态、光标滑动与闪烁、`Intl.Segmenter` 字素切分、`prefers-reduced-motion` 直接显示全文）。相比原实现仅新增 `start` 开关（等待预加载结束再开始打字）与 TypeScript 类型。
- 新增 `src/styles/components/TextType.css`：与组件一一对应的原样式。
- `src/components/HeroSection.tsx`：首屏两行标题改为 TextType —— 第一行 `Welcome` 先打（无光标），第二行 `Personal Blog` 延迟 420ms 后打并保留闪烁光标；移除原先标题的 SplitText 逐字上浮动画，其余 kicker / 副文案 / 底部栏入场节奏不变。
- `src/styles/components/HeroSection.css`：为 `.hero__line-inner.text-type` 补 `display: block` 与 `min-height: 0.78em`，空文本时行高不塌陷，打字过程中下方副标题不会跳动。
- 验证：headless Chrome 在 1440×900 与 390×844 采样打字全过程，两行遮罩高度稳定（1440 为 124/97px，390 为 52/38px），副标题 `top` 不变，光标始终在第二行遮罩内（`bottom 480 < 498`）；`npm run build` 通过。

### 2026-10-31 — 全站文字裁切排查：首屏标题、作品卡片、路由转场、About 说明与矮屏菜单

- 排查方式：headless Chrome 在 320 / 390 / 768 / 1024 / 1280 / 1366 / 1440 / 1920 下逐页测量文字墨迹边界与最近的裁切祖先（`overflow: hidden` 的可见区按含 padding 的 padding box 计算），并先强制 `.reveal` 可见再测，排除入场位移造成的误判。
- `src/styles/components/HeroSection.css`：`line-height: 0.78` 比字形盒更紧，首屏第二行标题的下伸字母（`in production.` 的 `p`）被 `.hero__line` 的 `overflow: hidden` 裁掉；把字号移到遮罩行自身，再用按行字号计算的 `padding-bottom: 0.18em` 留白（1440 下 23.3px、390 下 9.8px）。复核当前标题 `Welcome / Personal Blog` 的墨迹宽度：1440 距遮罩右缘 137px、1280 距 91px，任何宽度都不再横向溢出。
- `src/components/HeroSection.tsx`：首屏标题第一行拼写由 `Welcom` 补全为 `Welcome`（如想保留原样可直接回退该行）。
- `src/styles/components/WorksSection.css` 与 `src/components/WorksSection.tsx`：04 Selected Work 卡片元信息改为两行（标题 + 中文名 / 分类 + 技术栈），中文名 `flex-shrink: 0` + `nowrap`，`QianVerse 千域` 不再伸进第二张卡，`校企实验室` 不再被挤成逐字竖排；分类只取英文段、技术栈取前 2 项并带省略号；画框改为可纵向压缩（`flex: 0 1 auto` + 绝对定位填充），1366×768 / 1024×768 短屏下卡片标题与元信息不会被视口裁掉。≤760px 收紧页眉字距，`04 / Selected Work` 与 `All projects` 不再折行（用 `.works__all.mono` 复合选择器压过 `main.css` 中 `.mono` 的 11px）。
- `src/styles/components/RouteWipe.css` 与 `src/components/RouteWipe.tsx`：路由转场斜体标签的 `J` 下伸被裁约 4px；字号移到遮罩行，`margin: 0 -0.12em -0.2em` 与 `padding: 0 0.12em 0.2em` 抵消布局位移，6 个标签的墨迹测量下边界全部为负值（不裁切）。
- `src/styles/components/AboutSection.css`：`Fig. 01 — At the desk, 2026` 原先被右下角不透明圆形徽章盖住，说明文字改到左下角；`main.css` 的 `.mono` 与单类选择器优先级相同且加载更晚，字号改用 `.about__caption.mono` 才生效（8px，≤760px 7px），320 下距徽章仍有 35px 间隙。
- `src/styles/components/MenuOverlay.css`：桌面矮屏（1440×900 / 1366×768 / 1280×800 / 1024×768）下菜单内容高 1111px，Contact 与页脚落在视口外；新增 `(min-width: 761px) and (max-height: 1100px)` 收紧内边距与 `.menu__en` 字号（`min(9vw, 6.6vh)`），各尺寸 `scrollHeight` 均等于视口高；`(max-width: 760px) and (max-height: 640px)` 再收一档，360×640 一屏放下，320×568 仍保留滚动。
- 验证：上述尺寸复核 `scrollWidth === clientWidth`，无横向溢出；截图确认首屏 `p` / `g` 下伸、四张作品卡元信息、About 说明与菜单七项完整可见；`npm run build` 通过。

### 2026-10-31 — 修复窄屏响应式：作品筛选、移动端菜单与文章标题裁切

- 排查结论：媒体查询在 320 / 390 / 768 / 1024 / 1280 / 1366 以及实时拖动窗口时都正常；「不支持响应式」来自新增内容撑破容器——作品索引筛选标签变长后只能横向滚动，7 项菜单在手机上把底部信息挤出视口，文章标题的 `white-space: nowrap` 让长中文标题超出屏宽。
- `src/styles/components/WorkIndexView.css`：≤860px 筛选行由横向滚动改为自动换行（`flex-wrap` + `width: 100%`，去掉 `overflow-x: auto`）；≤600px 只保留中文标签、缩小内边距，390px 下 5 个筛选项两行内完整可见。
- `src/styles/components/MenuOverlay.css`：≤760px 收紧菜单内边距、条目间距与字号，390×844 下 7 项 + 邮箱 + 社交 + 时钟一屏完整显示。
- `src/styles/components/PostView.css`：≤640px 放大标题字号改为 `clamp(2.2rem, 9.2vw, 4rem)`，并让 `.post-head__title-part` 允许换行（`white-space: normal` + `overflow-wrap: anywhere`）。
- 验证：headless Chrome 在 390×844 与 320×568 下遍历首页、`/work`、`/journal` 及 4 篇文章、4 个作品详情，`scrollWidth === clientWidth`，无横向溢出与裁切；`npm run build` 通过。

### 2026-10-31 — 忽略临时截图产物，消除 Vite 监听 EBUSY

- 原因：本地 headless Chrome 截图脚本会创建 `.tmp-chrome-profile/`，Chrome 占用 `Cookies`、`Session` 等文件时，Vite 的文件监听在 Windows 上抛出 `EBUSY: resource busy or locked`。
- `vite.config.ts`：`server.watch.ignored` 增加 `**/.tmp-*/**` 与 `**/.tmp-*`，与 Vite 默认忽略项合并，不影响 `src/` 监听。
- `.gitignore`：新增 `.tmp-*`，临时截图 / Chrome profile 不再进入版本库。
- 已确认临时目录与脚本删除、无残留 headless Chrome 进程；当前 dev server 无需重启即可消除该报错。

### 2026-10-31 — 按真实简历重写内容，新增经历与荣誉章节

- 内容数据：重写 `src/data/site.ts`（真实邮箱 / GitHub / 技术栈 / 菜单）、`src/data/works.ts`（QianVerse、签到考勤、数据大屏、校企协作四个项目）、`src/data/posts.ts`（四篇真实项目手记）；新增 `src/data/profile.ts`（能力、数字、经历、荣誉、证书与志愿）。
- 首页新增 `ExperienceSection`（05）与 `CredentialsSection`（06）：经历用粘性索引、ScrollTrigger 点亮与竖向进度线；荣誉用 8 项获奖行 + 4 张证书卡 + 20h 志愿区块，配指针光晕与逐条揭示。
- 新组件 `Magnetic` + `Magnetic.css`：外层保留命中区，内层用 `gsap.quickTo` 跟随指针，用于两处 CTA。
- `AboutSection` 换成真实经历、4 列数字与可展开的能力项。
- 章节编号统一为 Hero 01 / Manifesto 02 / About 03 / Work 04 / Experience 05 / Credentials 06 / Journal 07 / Contact 08；菜单新增 Experience、Credentials，`ScrollProgress` 自动显示 8 章。
- `MarqueeBand` 改为 GSAP ticker 驱动：滚动越快越倾斜，悬停减速；关键词替换为真实技术栈。
- 作品索引分类改为 Enterprise / Full-stack / Data / Collab；作品年份、手记总数与 `PostView` 的 `/ 05` 改为按数据计算。
- 验证：`npm run build` 通过；preview 1440×900 与 390×844 截图确认首屏、Experience、Credentials 排版与条目点亮正常，页面无横向溢出。

### 2026-10-31 — 修复窄屏 / 手机端抖动面板消失

- `src/components/HeroSection.tsx`：删掉 `matchMedia('(min-width: 901px)')` 条件渲染与 `showVeil` 状态，`DitherVeil` 在所有断点都渲染（依旧是 `React.lazy` 异步加载，桌面首屏不阻塞）。
- `src/styles/components/HeroSection.css`：≤900px 不再 `display: none`，面板改为文字下方居中展示：`width: min(100%, 400px)`、`aspect-ratio: 1000 / 1033`、`max-height: clamp(170px, 36svh, 380px)`，并把该断点的 `gap` 收窄到 `clamp(18px, 3vh, 34px)`。
- `src/components/DitherVeil.jsx`：创建 `Renderer` 时加 `try/catch` 并检查 `isWebgl2`；WebGL2 不可用（部分手机浏览器 / 省电模式）时改为挂载静态图片，避免整块面板空白。
- `src/styles/components/DitherVeil.css`：新增 `.dither-veil__fallback`，按 `contain / cover` 填充容器。
- 验证：`npm run build` 通过；preview 下 headless 截图确认 390×844 / 360×640 / 320×568 / 768×1024 面板完整可见、1440×900 桌面布局无回归；`--disable-webgl` 时降级静态图正常显示。

### 2026-10-31 — 抖动头像去背景、放大并左移

- `src/components/DitherVeil.jsx`：新增透明底支持——`measureEdge` 额外统计图片边缘 alpha，`uCutout` uniform 在 fragment 里用纹理 alpha 裁掉背景，渲染器改为 `alpha: true`；画布背景不再铺 ink 色，网格与环境光可以透出，只剩主体点阵。非透明图片（`cutout = 0`）行为保持原样。
- `src/styles/components/HeroSection.css`：列宽 `clamp(300px, 36vw, 480px)` → `clamp(340px, 40vw, 540px)`；`.hero__veil` 增加 `margin-right: clamp(10px, 1.8vw, 28px)`，让面板左移、避开右侧 `INDEX` 与计数标注。
- 验证：`npm run build` 通过；preview 截图确认 1440×900 / 1280×800 下背景完全透明、头像放大且左移，390×844 仍不渲染。

### 2026-10-31 — 抖动面板按 React Bits 官方示例还原

- 换成官方示例使用的镀铬仿生人头像：新增 `public/art/chrome-head.png`（1234×1275 透明底原图缩放到 1000×1033）。
- 参数改用官方默认值：`fit="contain"`、`pattern="floyd"`、`palette="duotone"`、`pixelSize={2}`、`levels={2}`、`revealRadius={200}`、`softness={0.6}`、`linger={1}`、`rim={0}`、`wander={false}`、`clickBurst` 默认开启；只把 `inkColor` 设为页面底色 `#08080a`，画布背景与页面无缝，仅留浅色点阵。
- `HeroSection.tsx`：去掉 `Veil / Portrait`、`Move to reveal` 标签与 `data-cursor`，面板只保留一块无边框画布。
- `HeroSection.css`：列宽改为 `clamp(300px, 36vw, 480px)`，删除 `hero__veil-head`、`hero__veil-stage` 及其短屏规则。
- 验证：`npm run build` 通过；preview 截图确认 1440×900 / 1280×800 下点阵头像与指针全彩揭示正常，390×844 仍不渲染。

### 2026-10-31 — 首页右侧接入 React Bits DitherVeil 抖动之幕

- 新增 `src/components/DitherVeil.jsx`（React Bits 官方 JS/CSS 版）：WebGL2 抖动渲染，支持 `bayer / noise / lines / floyd / atkinson` 图案、鼠标拖尾揭示彩色原图、点击冲击波、`wander` 空闲巡游与入场展开；样式抽到 `src/styles/components/DitherVeil.css`，组件文件里 `style` 补默认值以便 TypeScript 调用。
- 新增运行时依赖 `ogl ^1.0.11`，并补齐上次被 npm 剪掉的 `@gsap/react ^2.1.2`（`SplitText.jsx` 需要）。
- `src/components/HeroSection.tsx`：`.hero__body` 改为双列，右侧新增 `hero__veil` 面板（`/art/portrait.svg`、`floyd`、`duotone`、橙色 `rim`），顶部标注 `Veil / Portrait` 与 `Move to reveal`；组件用 `React.lazy` 懒加载 + `matchMedia('(min-width: 901px)')` 条件渲染，移动端既不渲染也不下载 `ogl`。
- `src/styles/components/HeroSection.css`：新增 `.hero__veil` / `.hero__veil-head` / `.hero__veil-stage`，桌面列宽 `clamp(280px, 34vw, 440px)`，≤900px 隐藏，短屏降低面板最小高度。
- 验证：`npm run build` 通过；`npm run preview` 下 headless Chrome 截图确认 1440×900 面板渲染、指针揭示与排版正常，390×844 面板隐藏、首屏无裁切。

### 2026-10-31 — 忽略 skills 的通用目录 `.agents/`

- `.gitignore` 新增 `.agents/`，并用 `git rm --cached` 取消其跟踪（本地文件保留）；skills 源码仍由 `.trae/skills/` 与 `skills-lock.json` 提供。

### 2026-10-31 — 忽略本地工具产物目录

- `.gitignore` 新增 `.trae-html-share-packages/`（Trae 本地 HTML 分享产物的缓存目录），避免误提交。

### 2026-10-31 — 接入 Tailwind / shadcn，安装 React Bits SplitText 与 GSAP skills

- 前置配置：安装 `tailwindcss` + `@tailwindcss/vite`（v4），新增 `src/styles/tailwind.css`（`@import 'tailwindcss';`）并在 `src/main.tsx` 里先于 `main.css` 引入；`vite.config.ts` 加入 `tailwindcss()` 插件与 `@` → `src` 别名；`tsconfig.json` 增加 `paths` 与 `allowJs`（TypeScript 7 已移除 `baseUrl`，因此只用相对 `paths`）。
- 新增 `components.json`（new-york / neutral / CSS 变量），`tailwind.css` 指向 `src/styles/tailwind.css`，并用 `registries` 注册 React Bits registry。
- 执行 `npx shadcn@latest add @react-bits/SplitText-JS-CSS`，生成 `src/components/SplitText.jsx`（拆字入场、`rise / fade / blur / flip / pop / skew / wave` 效果、`view / load / hover / click` 触发、`mask` 与 `loop`）；新增依赖 `@gsap/react ^2.1.2`，`gsap` 复用项目已有版本。组件目前未被页面引用。
- 项目自有 CSS 保持不分层（unlayered），优先级高于 Tailwind 的 theme / preflight，已在 `src/styles/tailwind.css` 注释说明。
- 执行 `npx skills add https://github.com/greensock/gsap-skills`，安装 GSAP 官方 8 个 skills（`gsap-core` / `gsap-timeline` / `gsap-scrolltrigger` / `gsap-plugins` / `gsap-react` / `gsap-frameworks` / `gsap-performance` / `gsap-utils`）到 `.agents/skills` 与 `.trae/skills`（用 `--copy` 避免 Windows 下符号链接失效），并生成 `skills-lock.json`。
- 验证：`npm run build` 通过；`npm run preview` 下用 headless Chrome 截图复核首页与手记文章页，字体、标题间距与排版未受 Tailwind preflight 影响。

### 2026-10-31 — 从 Vue 3 迁移到 React 19 + Vite + TypeScript

- 技术栈切换：移除 `vue` / `vue-router` / `@vitejs/plugin-vue`，改用 `react` 19 + `react-dom` 19 + `react-router-dom` 7 + `@vitejs/plugin-react` + TypeScript。
- 入口与构建：`index.html` 改为 `/src/main.tsx`；新增 `src/main.tsx`、`src/App.tsx`、`src/router.tsx`、`tsconfig.json`，`vite.config.ts` 只保留 React 插件；`npm run build` 现在先执行 `tsc --noEmit`。
- 组件迁移：全部 `.vue` 单文件组件改写为 `.tsx`（Preloader、CustomCursor、MenuOverlay、SiteHeader、SiteFooter、RouteWipe、ScrollProgress、HeroSection、MarqueeBand、ManifestoSection、AboutSection、WorksSection、JournalSection、JournalList、ArtworkFrame、CircleButton、GrainOverlay）。
- 页面迁移：`HomeView`、`WorkIndexView`、`WorkView`、`JournalView`、`PostView`、`NotFoundView` 全部改写，路由与懒加载行为等价。
- 状态与 hooks：用 `useSyncExternalStore` 的 `src/store/ui.ts` 替代 Vue 响应式 store；新增 `useReveal`（替代 `v-reveal` 指令）、`useClock`；数据与 GSAP 模块改为 `.ts`。
- 样式：各组件 `<style scoped>` 提取为 `src/styles/components/*.css`；Vue `<Transition>` 改为 React 下的 keyframe 动画（页面、菜单预览、手记列表与作品行）。
- 内容：首屏技术栈文案更新为 `React 19 / TypeScript / Node.js / PostgreSQL / GSAP / Three.js`；移除不再使用的 `SplitText.vue` 及其样式。

### 2026-10-31 — 新增 SplitText 的 Vue 版（替代 React Bits 安装）

- `npx shadcn add @react-bits/SplitText-JS-CSS` 失败原因：React Bits 组件是 React + `.jsx`，shadcn 还要求 Tailwind 配置与 tsconfig 路径别名；本项目是 Vue 3 + Vite，补齐配置也无法让 React 组件在 Vue 里渲染。
- 新增 `src/components/SplitText.vue`：用项目已有 GSAP `SplitText` 复刻原组件的 props 与效果（`rise / fade / blur / flip / pop / skew / wave`、`view / load / hover / click`、`mask`、`loop`、`hoverEffect` 的 `lift / wave`、`accentColor`），零新增依赖。
- 开发环境用 404 页临时接入验证：`404` 正常拆成 3 个字符、动画结束后 `opacity: 1`，验证后已恢复该页原样。

### 2026-10-31 — 移除首屏右侧空画框

- `src/components/HeroSection.vue`：删除 `hero__panel` 空画框及其全部样式（边框、环境光渐变、`::after`），`.hero__body` 改为单列，首屏标题区占满宽度。
- 移除随滚动对 `.hero__panel` 的视差动画，只保留 `.hero__lead` 的位移。
- 清理媒体查询里 `.hero__panel` 的高度 / 隐藏规则（1100 / 900 / 760 断点）。
- README 技术栈与交互说明同步更新。

### 2026-10-31 — 清空首屏右侧面板

- `src/components/HeroSection.vue`：删除面板内的 DitherVeil、Veil / Index 切换、项目索引、HUD 与 Pattern 按钮，只保留一个空画框；顶部标识由 `Selected work` 改为 `Full-stack`。
- 移除 `src/components/DitherVeil.vue`、`public/art/hero-veil.svg`，并卸载运行时依赖 `ogl`（`package.json` / `package-lock.json`）。
- 清理面板相关的脚本状态与样式（`hero__veil` / `hero__hud` / `hero__patterns` / `hero__index` / `hero__row` / `hero__panel-foot` 等），移动端不再有面板小字与按钮。
- README 技术栈与交互说明同步更新。

### 2026-10-31 — 首屏右侧面板改为 DitherVeil 抖动之幕

- 新增 `src/components/DitherVeil.vue`：React Bits `<DitherVeil />` 的 Vue 3 移植（WebGL2 + `ogl`），包含 mask 拖尾揭示、`bayer / noise / floyd / lines` 抖动图案、鼠标全彩揭示圆窗、点击彩色冲击波与 `wander` 自动巡游。
- 新增 `public/art/hero-veil.svg`：为抖动重绘的自画像海报（暖橙光晕、同心环、头发与五官结构），低分辨率点阵下仍能辨认；后续又调整了构图与眉眼鼻嘴比例，让人像在揭示窗口里更自然。
- `src/components/HeroSection.vue`：右侧面板改为 `Veil / Index` 双模式——Veil 为抖动之幕 + HUD + Pattern 切换，Index 保留原来的 5 行精选项目索引（点阵背景压暗），原来的项目列表内容没有丢；顶部 / 底部改为渐隐遮罩轨道，小字在点阵上也能读清；移动端面板 300px 高、保持 `touch-action: pan-y` 不阻塞纵向滚动。
- 新增运行时依赖 `ogl`（`package.json`）。

### 2026-10-31 — Hero 换成可交互的「场」，并修复刷新自动跳转

- 首屏右侧原「Selected work」项目索引面板替换为 Canvas 交互场：位移点阵 + 网格 mesh + 指针引力井、点击 / 拖拽留下的波纹、橙色信号曲线、准星与扫描光；`Send a pulse` 按钮主动激发波纹（`src/components/HeroSection.vue`）。
- 新增实时 HUD 读数（X / Y / 能量 / 波纹数 / STEREO / ZOOM）、随能量变化的状态文案（`Nothing here is static` → `Disturbance detected` → `Field saturated`），以及空闲时自动巡游的幽灵指针。
- 交互提示文案在首次触碰后淡出；面板整体保持 `touch-action: pan-y`，移动端不阻塞纵向滚动。
- 修复进入网页自动跳到「关于我」：接管 `history.scrollRestoration = 'manual'`，并在预加载结束后对无 hash 的首屏强制回到顶部（`src/App.vue`）。
- README 技术栈与交互说明同步更新。

### 2026-10-31 — 仓库忽略编辑器本地历史

- `.history/`（编辑器本地历史快照）加入 `.gitignore` 并从版本库移除跟踪，避免误提交。

### 2026-10-31 — 站点名与个人称谓分离

- `陆屿` 统一作为站点 / 品牌名使用（页头、页面标题、页脚、预加载、路由转场等保持不变）。
- 涉及个人姓名的文案改为第一人称「我」：自画像 alt 文案、联系按钮 `aria-label`、自述落款、手记署名（Words / Images）、项目团队信息（`src/components/AboutSection.vue`、`src/components/ManifestoSection.vue`、`public/art/portrait.svg`、`src/views/PostView.vue`、`src/data/works.js`）。
- README 简介改为「陆屿 — 个人博客 / 作品集」。

### 2026-10-31 — 提交信息规范

- 约定提交信息格式 `<type>(<scope>): <描述>`，使用 `feat` / `fix` / `style` / `refactor` / `perf` / `docs` / `chore` 前缀（`.trae/rules/project_rules.md`）。

### 2026-10-31 — v1.0 首个正式版本

- 完整站点实现：Vue 3 + Vite + GSAP + Lenis，包含首页滚动叙事、作品索引与详情、手记与文章、404、路由转场与预加载动画。
- 新增 `.gitignore`，排除 `node_modules/`、`dist/` 等构建产物。


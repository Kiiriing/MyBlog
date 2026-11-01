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

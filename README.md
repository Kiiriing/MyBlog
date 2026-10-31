# LU YU — Full-stack Web Developer

陆屿 — 个人博客 / 作品集。静态前端，React 19 单页应用，强调滚动叙事、视差与细节交互；内容定位为全栈网页开发者，展示从界面、动效到 API 与数据库的完整项目。

## 技术栈

- **React 19** + **TypeScript**，路由使用 **react-router-dom 7**
- **Vite 8**（`@vitejs/plugin-react`）
- **GSAP 3.15**（ScrollTrigger / SplitText / quickTo）
- **ogl 1.0**：承载 React Bits `DitherVeil` 抖动之幕（WebGL2）
- **Tailwind CSS v4**（`@tailwindcss/vite`）与 **shadcn**（`components.json`），仅用于接入 registry 组件；项目自有 CSS 不分层，优先级更高
- **Lenis** 平滑滚动，与 GSAP ticker 同步
- 组件样式集中在 `src/styles/components/*.css`，由入口按需引入
- 首屏为「左侧排版 + 右侧 DitherVeil 抖动之幕」双列布局（≤900px 隐藏面板），动效集中在标题拆字、滚动视差与底部提示
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
| `/` | 首页：Hero → Marquee → Manifesto → About → Work → Journal → Contact |
| `/work` | 项目索引（分类筛选 + 光标跟随预览 + 整行色彩揭幕） |
| `/work/:slug` | 作品详情（项目信息、笔记、画廊、下一项目） |
| `/journal` | 手记索引（分类筛选 + 悬浮预览） |
| `/journal/:slug` | 文章详情（阅读进度、正文排版、上一篇 / 下一篇） |
| `*` | 404 |

站内锚点：`/#manifesto`、`/#work`、`/#journal`、`/#contact`。直接访问时会等待预加载与滚动解锁后再定位。不带 hash 进入首页（含刷新）始终从顶部开始，不会恢复上一次的滚动位置。

## 内容与替换

- `src/data/site.ts`：姓名、职位、邮箱、社交链接、技术栈与菜单文案。
- `src/data/works.ts`：五个全栈项目。每个项目包含 `stack`（技术栈）、`status`（上线状态）、`links`（Live / 源码 / 预约演示）与工程向的 `intro`、`notes`、`gallery`。
- `src/data/posts.ts`：手记文章与分类。

> 项目里的 `https://example.com/...` 与 `https://github.com` 是演示占位地址，上线前请替换为真实站点或仓库；`mailto:hello@luyu.dev` 也需要改成你的实际邮箱（同时修改 `site.ts`）。

## 交互与可访问性

- 自定义光标（仅在光标实际可见时隐藏系统光标，离开窗口 / 失焦自动恢复）、预加载揭幕、全屏菜单、颗粒质感、页面过渡
- 首页 Hero：左侧标题逐字入场、`hero__lead` 与底部提示随滚动产生视差；右侧 DitherVeil 以 `floyd` 抖动渲染自画像，鼠标拖尾揭示原色、点击触发冲击波、空闲时自动巡游
- 进入首页（无 hash）时始终落在顶部：接管 `history.scrollRestoration` 并在预加载结束后回滚到 0，修复刷新后「自动跳到关于我」的问题
- 路由切换时以橙色幕布进行擦除式转场（含目标页面标签与路径）
- 项目索引：分类筛选、计数过渡、整行 paper 色块从中心揭幕、项目数字变实色、光标跟随案例预览卡，键盘 focus 同样触发揭幕
- 滚动后顶部渐隐遮罩，保证固定导航与大标题重叠时的可读性
- 首页横向作品画廊：GSAP scrub 驱动，支持鼠标拖拽映射纵向滚动；桌面与移动端均提供 All projects 入口
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
public/art/     本地 SVG 视觉素材
```

## 更新日志

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


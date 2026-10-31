# LU YU — Full-stack Web Developer

陆屿 — 个人博客 / 作品集。静态前端，Vue 3 单页应用，强调滚动叙事、视差与细节交互；内容定位为全栈网页开发者，展示从界面、动效到 API 与数据库的完整项目。

## 技术栈

- **Vue 3.5**（`<script setup>`）+ **Vue Router 5**
- **Vite 8**
- **GSAP 3.15**（ScrollTrigger / SplitText / quickTo）
- **Lenis** 平滑滚动，与 GSAP ticker 同步
- 逐字动画组件 `src/components/SplitText.vue`：React Bits `SplitText` 的 Vue 移植（GSAP 实现，无需 React / Tailwind）
- 首屏为单列排版，标题区占满宽度，右侧不再有面板；动效集中在标题拆字、滚动视差与底部提示
- 原生 SVG 程序化视觉素材（`public/art`），无外部图片依赖

运行时要求 **Node.js ≥ 22.12**（当前已验证 Node 26 / npm 11）。

## 开发

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 输出 dist/
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
| `/:pathMatch(.*)*` | 404 |

站内锚点：`/#manifesto`、`/#work`、`/#journal`、`/#contact`。直接访问时会等待预加载与滚动解锁后再定位。不带 hash 进入首页（含刷新）始终从顶部开始，不会恢复上一次的滚动位置。

## 内容与替换

- `src/components/SplitText.vue`：把文字拆成字符 / 单词 / 行并逐字入场，支持 `effect`（`rise` / `fade` / `blur` / `flip` / `pop` / `skew` / `wave`）、`trigger`（`view` / `load` / `hover` / `click`）、`mask`、`loop`、`hoverEffect`（`lift` / `wave`）。用法示例：
  ```vue
  <SplitText text="Full-stack" split-type="chars" effect="wave" trigger="view" />
  ```
  React Bits 的原始组件是 React + Tailwind + shadcn registry，无法直接装进本项目的 Vue + Vite 环境，这里用项目已有的 GSAP `SplitText` 复刻了同样的 props 与效果。

- `src/data/site.js`：姓名、职位、邮箱、社交链接、技术栈与菜单文案。
- `src/data/works.js`：五个全栈项目。每个项目包含 `stack`（技术栈）、`status`（上线状态）、`links`（Live / 源码 / 预约演示）与工程向的 `intro`、`notes`、`gallery`。
- `src/data/posts.js`：手记文章与分类。

> 项目里的 `https://example.com/...` 与 `https://github.com` 是演示占位地址，上线前请替换为真实站点或仓库；`mailto:hello@luyu.dev` 也需要改成你的实际邮箱（同时修改 `site.js`）。

## 交互与可访问性

- 自定义光标（仅在光标实际可见时隐藏系统光标，离开窗口 / 失焦自动恢复）、预加载揭幕、全屏菜单、颗粒质感、页面过渡
- 首页 Hero：已移除右侧面板，标题区单列占满宽度，负空间交给背景网格与环境光；标题逐字入场、`hero__lead` 与底部提示随滚动产生视差
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
  components/   页面区块与通用组件
  composables/  平滑滚动、时钟
  data/         站点、作品、文章内容
  directives/   reveal 进场指令
  lib/          GSAP 注册
  router/       路由与滚动行为
  stores/       UI 状态（菜单 / 启动 / 触屏）
  styles/       主题变量、全局排版、过渡
  views/        首页、手记、文章、作品、404
public/art/     本地 SVG 视觉素材
```

## 更新日志

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


# LU YU — Full-stack Web Developer

陆屿的个人博客 / 作品集。静态前端，Vue 3 单页应用，强调滚动叙事、视差与细节交互；内容定位为全栈网页开发者，展示从界面、动效到 API 与数据库的完整项目。

## 技术栈

- **Vue 3.5**（`<script setup>`）+ **Vue Router 5**
- **Vite 8**
- **GSAP 3.15**（ScrollTrigger / SplitText / quickTo）
- **Lenis** 平滑滚动，与 GSAP ticker 同步
- **项目驱动 Hero**：精选项目索引 + 悬停切换的项目视觉，纯 DOM / CSS / GSAP，不再加载 WebGL 场景
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

站内锚点：`/#manifesto`、`/#work`、`/#journal`、`/#contact`。直接访问时会等待预加载与滚动解锁后再定位。

## 内容与替换

- `src/data/site.js`：姓名、职位、邮箱、社交链接、技术栈与菜单文案。
- `src/data/works.js`：五个全栈项目。每个项目包含 `stack`（技术栈）、`status`（上线状态）、`links`（Live / 源码 / 预约演示）与工程向的 `intro`、`notes`、`gallery`。
- `src/data/posts.js`：手记文章与分类。

> 项目里的 `https://example.com/...` 与 `https://github.com` 是演示占位地址，上线前请替换为真实站点或仓库；`mailto:hello@luyu.dev` 也需要改成你的实际邮箱（同时修改 `site.js`）。

## 交互与可访问性

- 自定义光标（仅在光标实际可见时隐藏系统光标，离开窗口 / 失焦自动恢复）、预加载揭幕、全屏菜单、颗粒质感、页面过渡
- 首页 Hero：精选项目索引，悬停 / 键盘聚焦切换项目视觉与状态，点击进入案例；桌面与移动端都不依赖固定视口高度
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

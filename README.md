# LU YU — Full-stack Web Developer

陆屿的个人博客 / 作品集。现在是**前后端一体**的项目：前端是 React 19 单页应用，强调滚动叙事、视差与细节交互；后端是 Spring Boot 4 + PostgreSQL，提供账号、评论、点赞收藏、站内信、反馈与更新日志接口。内容按真实简历组织：企业管理系统、签到考勤、数据大屏、竞赛荣誉与项目手记。

页面里的视觉素材全部来自仓库：`public/art` 下是程序化生成的 SVG / PNG，黑胶播放器的曲目与封面放在 `public/art/music`。

## 技术栈

### 前端

- **React 19.3** + **TypeScript 7**，路由使用 **react-router-dom 7.18**（History 路由 + 自定义转场）
- **Vite 8.3**（`@vitejs/plugin-react`，`@` 指向 `src`），`build` 先跑 `tsc --noEmit`
- **Tailwind CSS 4.3**（`@tailwindcss/vite`）与 **shadcn**（`components.json`），仅用于接入 registry 组件；项目自有 CSS 不分层，优先级更高
- **GSAP 3.15**（`@gsap/react`；ScrollTrigger / SplitText / quickTo / ticker）负责滚动叙事、进场揭示与播放器展开
- **Lenis 1.3** 平滑滚动，与 GSAP ticker 同步（`src/composables/useSmoothScroll.ts`）
- **motion 14** 用于局部手势 / 布局动画；**ogl 1.0** 与 **three 0.180** 支撑 WebGL 视觉
- **StrokeText**（React Bits 描边绘制文字，`src/components/StrokeText.tsx`）：首屏两行标题先描边勾出轮廓，再由左向右擦除出实心字形
- **TextType**（React Bits 打字机文字，`src/components/TextType.tsx`）：首屏自述段落按字符逐字打出，光标跟随文字并持续闪烁
- **GlowCursor**（React Bits 流体光迹，`src/components/GlowCursor.tsx`）：纯 WebGL2 的鼠标拖尾（半浮点帧缓冲 + MacCormack 平流 + 20 步压力迭代 + 5 级 bloom），深色页以 `screen` 加光，奶油色页换成组件的 light 主题落墨
- **LetterGlitch**（React Bits 字符故障背景，`src/components/LetterGlitch.tsx`）：首屏整屏铺满的 WebGL2 字符场（字形图集 + 状态贴图、流动噪声、游走撕裂与指针火花），默认参数与官方一致，`prefers-reduced-motion` 下退化为静止字符
- **LogoLoop**（React Bits 技术栈长条，`src/components/LogoLoop.jsx` + 类型声明 `.d.ts`）：关于页底部的 25 个技术栈品牌图标（`public/art/logo`），按语言 → 前端 / 后端框架 → 运行时 → 数据库 → 构建与工具 → 部署与系统 → 编辑器分层排列，连续滚动、可拖拽甩动、悬停停下并恢复品牌色
- **DitherVeil**（React Bits 抖动之幕，`src/components/DitherVeil.jsx`）：把镀铬头像压成 1-bit 点阵
- **Web Audio**（`src/lib/vinylAudio.ts`）：左下角黑胶播放器读真实音频——`public/art/music` 下的 mp3 经 `HTMLAudioElement` 解码，再走 `MediaElementSource → 母带增益 → AnalyserNode → 输出`，频谱柱读真实波形。目前十首：`☔️` / `Cry For Me` / `溯` / `SPECIALZ` / `You Got Me (Mashup)` / `Turning Around(余烬重燃)` / `远航星的告别` / `小小奇迹` / `反乌托邦 × 拼接遗憾` / `人间白首`，内圈封面依次是 `covers/cover-1.jpg` ~ `cover-10.jpg`（第 8 首为 `cover-8.png`）
- 组件样式集中在 `src/styles/components/*.css`（51 个组件样式文件，`src/styles` 合计 53 个），由各组件按需引入
- 界面文案支持中 / 英切换（`src/store/i18n.ts`，选择写入 `localStorage`）；手记正文与项目长文属于内容，不随界面语言切换

### 后端

- **Spring Boot 4.1.2** + **Java 25**，Maven Wrapper 构建
- **Spring WebMVC / Spring Data JPA / Spring Security / Validation / Mail**
- **Hibernate 7** + **PostgreSQL 18**，`ddl-auto=update` 自动补表
- **JJWT 0.13** 签发无状态 Token，默认有效期 72 小时
- **ProGuard 7.10** 在 `package` 阶段做名称混淆（只混淆、不裁剪，规则见 `server/proguard.conf`）
- 阅读量走**内存累加 + 定时批量落库**（`ViewCountBuffer`），避免热点行频繁更新
- 评论首屏对匿名访客做 **5 秒缓存**，写入 / 删除 / 点赞时立即失效

## 快速开始

### 环境要求

- **Node.js ≥ 22.12**（`package.json` 的 `engines`；已验证 Node 26 / npm 11）
- **JDK 25**
- **PostgreSQL 18**（本地或远程均可）

### 前端

```bash
npm install
npm run dev       # http://localhost:5173（--host，局域网也可访问）
npm run build     # tsc --noEmit + vite build，输出 dist/
npm run preview   # 预览生产构建
```

开发时 Vite 会把 `/api` 代理到 `http://localhost:8080`（见 `vite.config.ts`），前端代码里统一以 `/api` 为前缀请求后端。

如果 PowerShell 报错「因为在此系统上禁止运行脚本」（`npm.ps1` 被拦截），可以不改系统设置，直接使用：

```powershell
npm.cmd run dev
```

或放行当前用户的脚本（无需管理员权限，可随时改回）：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

`vite.config.ts` 忽略了 `.tmp-*` 临时目录，截图脚本与 headless Chrome profile 不会触发 Windows 下的 EBUSY 监听报错。

### 后端

`server/application-local.yml` 已被 `.gitignore` 排除，用来放本机数据库与邮箱账号。按需创建：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myblog
    username: postgres
    password: 你的数据库密码
  mail:
    username: 你的163邮箱
    password: SMTP授权码

app:
  jwt:
    secret: 至少32字节的随机字符串
  site-url: http://localhost:5173
  seed:
    admin-email: 你的管理员邮箱
    admin-password: 初始管理员密码
```

启动：

```powershell
cd server
.\mvnw.cmd spring-boot:run
```

```bash
# macOS / Linux
./mvnw spring-boot:run
```

首次启动会自动完成三件事：

1. `DatabaseBootstrapInitializer` 检查业务库是否存在，不存在则用维护库 `postgres` / `template1` 创建；
2. Hibernate 按实体补齐表结构；
3. `DataSeedInitializer` / `ChangelogSeedInitializer` 在对应的表为空时导入 `server/src/main/resources/db/seed-data.sql` 与 `db/changelog-seed.sql`。

打包可执行 jar（会先跑 ProGuard 混淆）：

```powershell
.\mvnw.cmd -DskipTests package
# 产物：server/target/blog-server-0.1.0.jar
```

### 环境变量

`server/src/main/resources/application.yml` 中的配置都可通过环境变量覆盖，常用项如下：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/myblog` | 业务库连接串 |
| `DB_USERNAME` | `myblog` | 数据库用户名 |
| `DB_PASSWORD` | 空 | 数据库密码 |
| `SERVER_PORT` | `8080` | 后端端口 |
| `MAIL_HOST` / `MAIL_PORT` | `smtp.163.com` / `465` | SMTP 服务 |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | 空 | 发件账号与 SMTP 授权码 |
| `JWT_SECRET` | 开发用占位值 | **生产必须替换**，至少 32 字节 |
| `JWT_TTL_HOURS` | `72` | 登录有效期（小时） |
| `SITE_URL` | 空 | 验证码邮件里的站点入口 |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | 空 | 首次启动时创建管理员账号 |
| `LOG_BASE` | `logs/luyu-blog` | 日志文件前缀（不含扩展名） |
| `VITE_SITE_URL` | `https://luyu.me` | 前端 canonical / OG / JSON-LD 使用的线上地址 |

验证码与限流参数也集中在 `app.auth.*`：验证码 10 分钟有效、同邮箱 60 秒内不可重发、每小时最多 5 次、同 IP 每小时 20 次、单个验证码最多试错 5 次、图片验证码 120 秒有效。

## 路由与锚点

| 路径 | 页面 |
| --- | --- |
| `/` | 首页：Hero → Marquee → Manifesto → About → Work → Experience → Credentials → Journal → Contact |
| `/work` | 项目索引（分类筛选 + 光标跟随预览 + 整行色彩揭幕） |
| `/work/:slug` | 作品详情（项目信息、笔记、画廊、下一项目） |
| `/journal` | 手记索引（项目 / 年份筛选、最新 / 热门排序、悬浮预览） |
| `/journal/tag/:tag` | 标签页（同一标签下的全部手记） |
| `/journal/:slug` | 文章详情（阅读进度、正文排版、点赞收藏、评论区、上一篇 / 下一篇） |
| `/updates` | 更新日志（数据来自 `GET /api/changelog`） |
| `/login` | 登录 / 注册 / 找回密码 |
| `*` | 404 |

站内锚点：`/#index`、`/#manifesto`、`/#about`、`/#work`、`/#experience`、`/#credentials`、`/#journal`、`/#contact`。直接访问时会等待预加载与滚动解锁后再定位。不带 hash 进入首页（含刷新）始终从顶部开始，不会恢复上一次的滚动位置。

路由表在 `src/router.tsx`；页面切换由 `src/App.tsx` 统一调度：橙色幕布盖住屏幕后再换页，新页面挂载、图片解码与 `ScrollTrigger.refresh` 都发生在被遮住的那段时间。

## 内容与替换

- `src/data/site.ts`：姓名、职位、真实邮箱（`liukiiriing@gmail.com`）、GitHub（`@Kiiriing`）、技术栈与全屏菜单文案。
- `src/data/profile.ts`：简历内容的单一数据源——能力矩阵、数字概览（20+ 大屏 / 10+ 业务模块 / 8 项荣誉 / 4 张证书）、三段实践经历、8 项荣誉、4 张证书与志愿服务。
- `src/data/works.ts`：四个已交付项目（QianVerse / Attendance / Data Walls / Campus Lab）。每个项目包含 `stack`、`status`、`links` 与工程向的 `intro`、`notes`、`gallery`，`next` 串成「下一项目」链路。
- `src/data/posts.ts`：四篇项目手记（`idempotent-orders` / `attendance-anti-cheat` / `data-wall-rules` / `react-migration`）、分类、标签与四个手记项目（含 MyBlog）。
- `src/data/chapters.ts`：首页章节索引（编号、锚点、标题、幕次与页脚标签）。
- `src/data/stack.ts`：关于页 LogoLoop 的技术栈图标清单（`techStack` 25 项，每项含 `name` / `icon` / `group`）；新增技术只需把图标放进 `public/art/logo`（文件名小写、去空格），再在这里追加一行。
- `src/data/search.ts`：站内搜索索引（作品、手记与更新记录）。
- `src/data/moderation.ts`：前端违禁词表，必须与后端 `ModerationService` 保持一致。

> 分类筛选由 `works.ts` 的 `filters` 与 `WorkIndexView.tsx` 的 `filters` 共同决定，新增项目时两处需要同步。
> 播放器加歌：把 mp3 放进 `public/art/music`（中文 / emoji / 空格可用，`musicAsset()` 会做 `encodeURIComponent`；文件名不要出现 `#`），封面放进 `public/art/music/covers`，再到 `vinylAudio.ts` 的 `vinylTracks` 追加一项。

## 账号与社区

- **登录 / 注册 / 找回密码**（`/login`）：先过自建图片验证码，再收邮箱验证码；注册与重置都会二次校验验证码。登录成功后拿到 JWT，前端存在本地并在请求头带 `Authorization: Bearer ...`，默认 3 天有效。
- **站内信**（`NotificationBell` + `NotificationPanel`）：系统通知 / 反馈回执 / 评论回复 / 私信四类，支持全部 / 未读 / 已读筛选、置顶、单条已读、全部已读与左滑删除；抽屉动画期间锁定开关，避免连点打断。
- **评论区**（`CommentSection`）：SQL 分页（默认 20 条 / 页）、虚拟滚动、最新 / 最热排序、一级评论 + 楼中楼分页、评论点赞、删除确认、30 秒轮询与发布后局部刷新；支持 `#comment-<id>` 深链定位，会先算锚点所在页再连续校正滚动位置。发表评论需要登录，前端与后端共用一份违禁词表做拦截。
- **互动统计**（`EngagementBar`）：阅读量、点赞、收藏。阅读量由后端内存累加后定时落库；点赞与收藏为登录后可切换。
- **反馈**（页脚表单）：登录用户每天最多 3 条，命中违禁词会被拒绝；处理结果通过站内信回复。
- **更新页**（`/updates`）：版本记录统一由后端下发，页面不再维护写死的数据。

## 后端结构

```text
server/src/main/java/com/luyu/blog/
  BlogServerApplication.java   启动类（@EnableScheduling）
  config/                      建库、种子数据、安全配置、请求日志过滤
  domain/                      User / PostComment / CommentLike / PostStat /
                               Notification / Feedback / CaptchaChallenge / ...
  repo/                        Spring Data JPA 仓库
  security/                    JwtService、JwtAuthFilter、UserPrincipal
  service/                     Auth、Comment、PostStats、Notification、Feedback、
                               Moderation、Mail、Changelog、ViewCountBuffer
  web/                         REST 控制器与异常处理
  web/dto/                     请求 / 响应 record
```

几个值得注意的实现：

- `CommentService` 只负责评论与评论点赞；`PostStatsService` 负责阅读量、文章点赞与收藏。原来的 `PostSocialService` 已按职责拆开，控制器改为双服务注入，路由与 DTO 不变。
- `CommentService` 对匿名访客的首屏评论做 5 秒缓存（key 为 `slug|sort|pageSize`，仅 `page=0` 且无锚点时命中），发表、删除、点赞后立即失效。
- `ViewCountBuffer` 用 `AtomicLong` 累加阅读量，按 `app.stats.flush-ms`（默认 5000ms）批量执行 `insert ... on conflict do update`。
- `PostStat.views` 标记 `updatable = false`，点赞 / 收藏保存实体时不会用旧值覆盖阅读量。
- `RequestLoggingFilter` 只记录耗时 ≥150ms 或状态码 ≥400 的 `/api/` 请求，避免正常请求刷满日志。
- `DatabaseBootstrapInitializer` 在 DataSource 初始化前建库；种子数据只在目标表为空时导入，不会覆盖现有数据。
- 安全规则：`/api/auth/*` 与 `GET /api/posts/**`、`GET /api/changelog`、`POST /api/posts/*/view` 公开；`/api/admin/**` 需要 `ADMIN`；其余 `/api/**` 需要登录。

## API 一览

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/api/auth/captcha` | 获取图片验证码 | 公开 |
| `POST` | `/api/auth/code` | 发送邮箱验证码 | 公开 |
| `POST` | `/api/auth/code/verify` | 校验验证码（不消费） | 公开 |
| `POST` | `/api/auth/register` | 注册 | 公开 |
| `POST` | `/api/auth/login` | 用户名 / 邮箱 + 密码登录 | 公开 |
| `POST` | `/api/auth/password/reset` | 验证码重置密码 | 公开 |
| `GET` | `/api/auth/me` | 当前用户 | 登录 |
| `GET` | `/api/posts/{slug}/comments` | 评论分页（`sort` / `page` / `size` / `anchor`） | 公开 |
| `GET` | `/api/posts/comments/{id}/replies` | 楼中楼分页 | 公开 |
| `POST` | `/api/posts/{slug}/comments` | 发表评论 / 回复（`parentId`） | 登录 |
| `DELETE` | `/api/posts/comments/{id}` | 删除自己的评论 | 登录 |
| `POST` | `/api/posts/comments/{id}/like` | 评论点赞切换 | 登录 |
| `GET` | `/api/posts/{slug}/stats` | 单篇阅读 / 点赞 / 收藏 | 公开 |
| `GET` | `/api/posts/stats?slugs=a,b` | 批量统计 | 公开 |
| `POST` | `/api/posts/{slug}/view` | 阅读量 +1 | 公开 |
| `POST` | `/api/posts/{slug}/like` | 文章点赞切换 | 登录 |
| `POST` | `/api/posts/{slug}/favorite` | 收藏切换 | 登录 |
| `GET` | `/api/notifications?filter=all\|unread\|read` | 站内信列表 | 登录 |
| `GET` | `/api/notifications/unread-count` | 未读数 | 登录 |
| `POST` | `/api/notifications/read-all` | 全部已读 | 登录 |
| `POST` | `/api/notifications/{id}/read` | 单条已读 | 登录 |
| `POST` | `/api/notifications/{id}/pin` | 置顶切换 | 登录 |
| `DELETE` | `/api/notifications/{id}` | 隐藏站内信 | 登录 |
| `POST` | `/api/feedback` | 提交反馈（每天 3 条） | 登录 |
| `GET` | `/api/changelog` | 更新日志 | 公开 |
| `POST` | `/api/admin/notifications` | 发布站内信 | 管理员 |
| `GET` | `/api/admin/feedback` | 查看用户反馈 | 管理员 |

## 交互与可访问性

- 自定义光标（仅在光标实际可见时隐藏系统光标，离开窗口 / 失焦自动恢复）、预加载揭幕、全屏菜单、颗粒质感、页面过渡；指针进入左下角黑胶播放器时，反色圆环与白点整体隐藏、控件交回系统指针，移出后恢复
- 首页 Hero：背景由 LetterGlitch 铺满整屏（字符在流动噪声里缓亮、随机成片故障，指针经过处点亮火花、点击沿行撕裂），并在文字一侧压一层暗场保证小字号可读；左侧标题逐字入场、`hero__lead` 与底部信息随滚动产生视差；右侧 DitherVeil 用 `floyd` 抖动把镀铬头像压成 1-bit 点阵，鼠标划过的拖尾会烧穿成全彩、松开后逐格编织回点阵，点击产生冲击波
- 进入首页（无 hash）时始终落在顶部：接管 `history.scrollRestoration` 并在预加载结束后回滚到 0
- 左下角黑胶播放器（`VinylPlayer`，全局常驻、跨页继续播放）：收起时只有一张唱片，点击后唱片左移、控制条向右展开（进度条 / 上一首 / 播放暂停 / 下一首 / 音量槽 / 10 格实时频谱）；支持进度拖动、播完自动切下一首、按住唱片拖到整页任意位置、配色随下方章节在暗场与奶油纸面之间切换；浏览器拦截自动播放时提示 `Tap for sound`
- 路由切换以橙色幕布做擦除式转场（含目标页面标签与路径），全程由 CSS 关键帧跑在合成线程上
- 项目索引：分类筛选、计数过渡、整行 paper 色块从中心揭幕、项目数字变实色、光标跟随案例预览卡，键盘 focus 同样触发揭幕
- 首页横向作品画廊由 GSAP scrub 驱动，支持鼠标拖拽映射纵向滚动；Marquee 随滚动速度改变横向速度与 `skewX`
- Experience 章节用粘性大号索引与进度线（scrub）点亮当前经历；Credentials 提供荣誉行、证书卡、指针光晕与磁性 CTA
- 站内搜索：`⌘K` / `Ctrl K` 唤起，覆盖作品、手记与更新记录
- 尊重 `prefers-reduced-motion`：关闭连续动画，保留最终画面与横向滚动的静态 scrub
- 菜单打开时 `#main` 设为 `inert` 并锁定滚动；提供跳过导航链接与 `focus-visible` 样式

## 部署

前端构建产物是纯静态文件（`dist/`），后端是独立 jar，两者同域部署时建议由 Nginx 把 `/api` 反代到 Spring Boot：

```nginx
server {
    listen 80;
    server_name kiirverse.xyz;
    root /var/www/luyu/dist;
    index index.html;

    # 带哈希的构建产物可以放心长缓存；404 不会带这个头（没加 always），
    # 避免部署不完整时浏览器把 404 记一年
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # 图片、品牌素材与自托管字体（public/fonts）
    location ~* ^/(art|brand|fonts)/ {
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri =404;
    }

    # 入口 HTML 每次回源校验，保证发版后立刻生效
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # History 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- 字体已自托管在 `public/fonts/`，页面不再请求 `fonts.googleapis.com`（大陆不可达，且是渲染阻塞资源）。
- 上传顺序建议：先传 `assets/` 与 `fonts/`，最后传 `index.html`。反过来会出现「HTML 引用了服务器上还不存在的 chunk」，访客拿到 404 与空白页。
- Cloudflare 侧已在 Cache Rules 里配置：`/assets/*` 与字体一年、`/art/*` 与 `/brand/*` 三十天、`/api/*` 与 SPA 路由不缓存，4xx/5xx 不缓存。Nginx 的响应头与之保持一致，回源与边缘不会互相打架。
- 纯静态托管（Netlify / Vercel）同样需要把未知路径回退到 `index.html`；同时要把 `/api` 指向后端地址。
- 后端启动前务必设置 `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`、`MAIL_*` 与新的 `JWT_SECRET`（至少 32 字节）；生产环境建议用 systemd / Docker 托管 jar，并通过环境变量注入配置。
- 日志默认写到 `server/logs/luyu-blog.log`，按天归档、单文件 20MB、保留 30 天、总量上限 1GB；可用 `LOG_BASE` 改路径。
- 站点域名不是 `https://luyu.me` 时，构建前设置 `VITE_SITE_URL`，否则 canonical / OG / JSON-LD 会指向错误地址。
- 表结构目前由 `spring.jpa.hibernate.ddl-auto=update` 维护，没有版本化迁移；正式环境做破坏性字段调整前请先备份数据库。

## 目录

```text
src/
  App.tsx          应用外壳：预加载、菜单、页面过渡、滚动重置、全局挂件
  main.tsx         React 入口（createRoot + BrowserRouter）
  router.tsx       9 条路由与路由名映射
  components/      页面区块与通用组件（46 个文件；另有 React Bits / shadcn 生成的 .jsx）
    comments/      评论区拆分：CommentItem / useCommentFeed / useVirtualComments
  composables/     平滑滚动（GSAP + Lenis）
  hooks/           时钟、进场 reveal、空闲就绪、近视口检测
  data/            站点、章节、简历、作品、文章、标签、搜索与违禁词
  lib/             API 客户端、GSAP 注册、黑胶音频引擎
  store/           auth / i18n / notifications / ui
  styles/          主题变量、全局排版；components/ 下为 51 个组件样式
  views/           首页、手记、标签、文章、作品索引 / 详情、更新、登录、404（9 个）
public/art/        本地视觉素材（SVG / PNG；art/logo 为 25 个技术栈品牌图标，art/music 为音频与封面）
server/
  pom.xml          Spring Boot 4.1.2 / Java 25 / ProGuard 7.10
  proguard.conf    打包混淆规则
  src/main/java/com/luyu/blog/   config / domain / repo / security / service / web
  src/main/resources/
    application.yml         主配置（全部支持环境变量覆盖）
    db/seed-data.sql        空库种子数据
    db/changelog-seed.sql   更新页版本记录
```

## 验证

```bash
npm run build                      # 前端类型检查 + 生产构建
cd server && ./mvnw -DskipTests compile
```

项目目前没有自动化测试；改动评论、鉴权或统计逻辑后，建议在 `npm run preview` 下实际走一遍登录、发评论、点赞收藏、站内信与深链定位。

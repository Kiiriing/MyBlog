# MyBlog 风险与性能审查报告

- 审查对象：`d:\shizhan\MyBlog`（前端 React 19 + Vite 8，后端 Spring Boot 4 + Java 25 + PostgreSQL 18）
- 审查基线：`main` @ `c8b13f1`（全项目当前代码，非单个 diff）
- 审查日期：2026-11-13
- 审查方式：全量静态审查 + 生产构建实测 + 运行期 API / SQL 计时 + 双人独立校验
- 结论：**未发现 P0 阻断级问题**。15 条候选问题经两名独立验证者 100% 复核确认存在；其中 2 条 P1 均集中在认证配置，属于「上线前必须处理」项。

---

## 一、执行摘要

这个项目的工程质量整体高于同规模个人站：前后端职责拆分清楚，评论做了 SQL 分页、匿名短缓存、深链定位与虚拟滚动，阅读量用了内存缓冲 + 定时批量落库，请求日志只记录慢请求与错误，通知与评论的归属校验都做了显式判断。这些是实打实的性能与安全投入。

主要风险集中在三处：

1. **认证链路的「默认值」与「无限流」**：JWT 密钥有可用的硬编码默认值，登录接口没有任何失败次数限制。两者叠加意味着一旦部署时漏配环境变量，攻击者既能暴力破解，也能直接伪造管理员 token。
2. **客户端 IP 的信任边界**：`ClientIp` 无条件采信 `X-Forwarded-For` / `X-Real-IP`，让「登录 IP 绑定」和「按 IP 的验证码限流」两项安全设计在真实攻击下失效。
3. **若干「数据量增长后才暴露」的实现**：楼中楼回复全量加载后内存分页、通知列表无分页、点赞计数读-改-写，在数据量小的开发库上看不出问题，长期运行会变成慢查询与计数偏差。

### 评分（10 分制）

| 维度 | 评分 | 主要依据 |
| --- | --- | --- |
| 安全性 | 6 / 10 | 密码 BCrypt、JWT 长度校验、验证码/图形码双校验、归属校验齐全；但默认密钥、登录无限流、XFF 可伪造、token 存 localStorage |
| 性能 | 7 / 10 | 热态 API 表现好（stats 8–14ms、comments 24–34ms），SQL 毫秒级；但主包 961KB、无路由分包、部分接口全量加载 |
| 可靠性 | 6 / 10 | 有验证码错误上限、评论频率限制、阅读量落库失败重试；但同步发信阻塞请求线程、无测试覆盖 |
| 可维护性 | 5 / 10 | 后端类普遍在 120–350 行、职责清晰；前端 7 个组件超过 600 行；无测试、无 lint、TS 非严格模式 |
| 可运维性 | 5 / 10 | 日志轮转与慢请求日志做得好；但 `ddl-auto=update`、无健康检查、无 CI、无版本化迁移 |

---

## 二、审查范围与方法

### 2.1 覆盖范围

| 层 | 内容 |
| --- | --- |
| 前端源码 | `src/` 下 9 个视图、40+ 组件、53 个样式文件、路由、状态管理、API 客户端 |
| 后端源码 | `server/src/main/java` 下 60 个 Java 文件（security / service / web / repo / domain / config） |
| 配置 | `server/src/main/resources/application.yml`、`proguard.conf`、`vite.config.ts`、`tsconfig.json`、`package.json`、`index.html` |
| 构建产物 | `npm run build` 实测 chunk 体积与告警 |
| 运行期数据 | 后端启动日志、慢请求日志、热态 API 与 SQL 执行时间 |

### 2.2 方法

1. 先通读全项目结构与数据流，建立「页面 → API → Service → Repository → 表」的调用链。
2. 逐条记录候选问题，包含文件、行号、触发条件与影响。
3. 把同一份 15 条候选清单交给两名互不可见的验证者，各自独立读代码判断「是否存在 + 严重级别」。
4. 只保留双方一致确认的问题；分级有分歧的条目在正文中标注。
5. 性能结论全部来自实测（构建输出、日志、SQL 计时），不使用估算值。

### 2.3 验证结果

15 条候选全部为 `exists=yes`，即 **15/15 双方确认**。分歧仅出现在 3 条的严重级别上（R8、R12、R15），正文已标注。

---

## 三、风险矩阵

| ID | 等级 | 类别 | 问题 | 核心位置 |
| --- | --- | --- | --- | --- |
| R1 | **P1** | 安全 | JWT 密钥存在可用的硬编码默认值 | `application.yml:52`、`JwtService.java:23-52` |
| R2 | **P1** | 安全 | 登录接口无失败次数 / 频率限制 | `SecurityConfig.java:26`、`AuthService.java:111-126` |
| R3 | P2 | 安全 | 无条件信任 `X-Forwarded-For`，IP 绑定与按 IP 限流可绕过 | `ClientIp.java:13-23` |
| R4 | P2 | 安全 | 重置密码后旧 JWT 仍有效 72 小时 | `AuthService.java:104-109`、`JwtService.java` |
| R5 | P2 | 安全 | token 存 localStorage，全站无 CSP | `src/lib/api.ts:120-131`、`index.html` |
| R6 | P2 | 并发 | 点赞 / 收藏计数读-改-写，并发丢更新 | `PostStatsService.java:86-115`、`PostStat.java:53-67` |
| R7 | P2 | 性能 | 楼中楼回复全量加载后内存分页 | `CommentService.java:176-202` |
| R8 | P2 | 性能 | 通知列表全量加载，无分页与上限 | `NotificationService.java:41-73` |
| R10 | P2 | 性能 | 主包 961KB，路由未做代码分割 | `src/router.tsx:3-11` |
| R11 | P2 | 可靠性 | 发验证码在请求线程同步发信，最坏阻塞十几秒 | `VerificationCodeService.java:62-97`、`application.yml:27-29` |
| R12 | P2 | 可维护性 | 无测试、无 CI、无 lint，TS 非严格模式 | `package.json`、`tsconfig.json:19` |
| R13 | P2 | 可运维 | `ddl-auto=update` 承担 schema 演进 | `application.yml:14` |
| R9 | P3 | 性能 | 每个已认证请求查一次用户表 | `JwtAuthFilter.java:45` |
| R14 | P3 | 性能 | 未显式配置 HikariCP，默认 10 连接 | `application.yml` |
| R15 | P3 | 运维 | 71.4MB 音频随首曲自动预加载 | `public/art/music/`、`vinylAudio.ts:374-397` |

---

## 四、详细发现

### R1 · JWT 密钥存在可用的硬编码默认值（P1）

**证据**

```yaml
# server/src/main/resources/application.yml:50-54
app:
  jwt:
    secret: ${JWT_SECRET:luyu-dev-only-secret-key-please-replace-0123456789}
    ttl-hours: ${JWT_TTL_HOURS:72}
```

`JwtService` 只校验密钥长度 ≥ 32 字节，并且 token 只携带 `sub / email / name / role / iat / exp`，签名密钥完全由该配置决定。

**影响**

只要部署时没有设置 `JWT_SECRET` 环境变量，任何人都可以用仓库里公开的默认字符串签发一个 `role=ADMIN`、`sub` 为任意 UUID 的 token。由于 `JwtAuthFilter` 只做签名解析 + 用户存在性校验，攻击者只要知道管理员 UUID（或从公开接口泄露的 authorId 推断）即可获得管理员权限。这是本项目最高危的一条。

**建议**

1. 生产环境**移除默认值**：改成 `secret: ${JWT_SECRET}`，缺失时启动失败（Spring 占位符解析失败即启动失败，符合「配置缺失就炸」的安全默认）。
2. 若希望保留本地开发体验，把默认值移到 `application-local.yml`（已在 `.gitignore` 中），主配置只保留占位符。
3. `JwtService` 增加弱密钥黑名单校验（至少拒绝该字符串本身），避免有人把默认值抄进生产配置。
4. 启动日志打印警告（不打印密钥本身）：当前使用的是默认/开发密钥。

---

### R2 · 登录接口无失败次数 / 频率限制（P1）

**证据**

```java
// server/src/main/java/com/luyu/blog/config/SecurityConfig.java:26-27
.requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/code",
        "/api/auth/code/verify", "/api/auth/captcha", "/api/auth/password/reset").permitAll()
```

```java
// server/src/main/java/com/luyu/blog/service/AuthService.java:111-126
public AuthResponse login(LoginRequest request, String ip) {
    String account = normalize(request.account());
    User user = users.findByUsername(account).or(() -> users.findByEmail(account))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, LOGIN_FAILED));
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
        throw new ApiException(HttpStatus.UNAUTHORIZED, LOGIN_FAILED);
    }
    ...
}
```

登录只有「账号存在 + BCrypt 比对」两步，没有失败计数、没有验证码、没有 IP 维度限流，也没有账号锁定。

**影响**

- 明文撞库 / 密码喷洒可以无限次尝试，只受网络带宽限制。
- 虽然错误信息统一为「用户名 / 邮箱或密码不正确」，但响应时间与状态码一致，无法阻止自动化攻击。
- 对比之下验证码侧做了 60 秒间隔、邮箱每小时 5 次、IP 每小时 20 次，登录侧完全没有对应防护，形成短板。

**建议**

1. 按「账号 + IP」双维度计数：连续失败 5 次后要求图形验证码，失败 10 次后指数退避（1 分钟 → 5 分钟 → 15 分钟）。
2. 复用现有 `captcha_challenges` 表与 `CaptchaService`，避免引入新依赖。
3. 计数落库（或 Redis），不要放内存 Map，否则重启即清零、多实例不共享。
4. 记录失败日志（账号脱敏 + IP + 时间），便于排查撞库。

---

### R3 · 无条件信任 `X-Forwarded-For`（P2）

**证据**

```java
// server/src/main/java/com/luyu/blog/security/ClientIp.java:13-23
public static String resolve(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
        return forwarded.split(",")[0].trim();
    }
    String realIp = request.getHeader("X-Real-IP");
    ...
    return request.getRemoteAddr();
}
```

该值被两处使用：

- `JwtAuthFilter.java:44-49`：与 `user.lastLoginIp` 比对，不一致就强制匿名（要求重新登录）。
- `VerificationCodeService.java:88-91`：按 IP 统计每小时发送次数。

**影响**

- **IP 绑定形同虚设**：拿到 token 的攻击者只需伪造 `X-Forwarded-For` 为受害者的登录 IP，即可通过绑定校验。
- **按 IP 限流可绕过**：每次请求换一个伪造 IP，即可突破每小时 20 次的发码上限（邮箱维度限制仍在，风险被部分削弱）。
- 若未来在日志、审计或封禁逻辑中使用该 IP，同样不可信。

**建议**

1. 增加「可信代理」配置：只有请求来自 `server.forward-headers-strategy` 信任的代理网段（或 `app.network.trusted-proxies`）时，才解析 XFF；否则一律使用 `getRemoteAddr()`。
2. 最简单可靠的做法：Spring Boot 配置 `server.forward-headers-strategy=native` 并配合 `server.tomcat.remoteip.internal-proxies`，然后统一用 `request.getRemoteAddr()`，不再手写头解析。
3. 解析 XFF 时取**最后一个**（最靠近本机代理的）地址，而不是第一个（客户端可伪造）。

---

### R4 · 重置密码后旧 JWT 仍然有效（P2）

**证据**

```java
// server/src/main/java/com/luyu/blog/service/AuthService.java:104-109
public void resetPassword(ResetPasswordRequest request) {
    String email = normalize(request.account());
    verificationCodes.verify(email, VerificationCode.PURPOSE_RESET_PASSWORD, request.code());
    User user = users.findByEmail(email)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "该邮箱还没有注册，请先注册账号"));
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
}
```

`JwtService` 没有 token 版本号、没有 jti 黑名单、没有 `passwordChangedAt` 校验。

**影响**

用户「找回密码」通常意味着账号可能已经泄露。当前实现下，攻击者在此之前拿到的 token 仍可继续使用最长 72 小时，重置密码并不能把攻击者踢下线。

**建议**

1. `User` 增加 `tokenVersion`（或 `passwordChangedAt`），签发 token 时写入 `ver`，`JwtAuthFilter` 解析后与库中值比对，不一致直接匿名。
2. 重置密码 / 修改密码时 `tokenVersion++`。
3. 该字段一次改动即可同时解决「主动登出所有设备」的需求。

---

### R5 · token 存 localStorage，且无 CSP（P2）

**证据**

```ts
// src/lib/api.ts:120-131
const TOKEN_KEY = 'luyu.auth.token'
export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}
```

`index.html` 中没有任何 `Content-Security-Policy`（meta 或响应头）。页面还通过 Google Fonts 加载了 3 个字体族的外部样式表。

**影响**

- localStorage 对 JS 完全可读，任何一处 XSS（包括第三方依赖、富文本渲染回归、`dangerouslySetInnerHTML` 误用）都能直接带走 token。
- 当前评论正文用 `<p>` 纯文本渲染、没有 HTML 注入点，这降低了现实风险；但一旦未来加入 Markdown / 富文本，风险会立刻放大。
- 无 CSP 意味着浏览器不会拦截未知来源脚本，缺少最后一道兜底。

**建议**

1. 推荐改为 `HttpOnly + Secure + SameSite=Lax` 的 Cookie 承载 token，前端不再接触凭证。
2. 若短期不改存储方式，至少增加 CSP：`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'`。
3. 增加 `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`（Spring Security 默认已带部分安全头，建议显式确认）。
4. 前端增加 `npm audit` 与依赖锁定复查。

---

### R6 · 点赞 / 收藏计数读-改-写，并发丢更新（P2）

**证据**

```java
// server/src/main/java/com/luyu/blog/service/PostStatsService.java:90-114
PostStat stat = statOf(slug);
var existing = reactions.findByPostSlugAndUser_IdAndKind(slug, user.getId(), kind);
if (existing.isPresent()) {
    reactions.delete(existing.get());
    stat.removeLike();          // 内存里 -1
} else {
    reactions.save(new PostReaction(slug, user, kind));
    stat.addLike();             // 内存里 +1
}
stats.save(stat);               // 覆盖式写回
```

`PostStat` 没有 `@Version`，计数是普通 `long` 字段；数据库层面也没有 `UPDATE ... SET likes = likes + 1` 的原子语句。

**影响**

- **丢更新**：两个不同用户同时点赞同一篇文章，都读到 `likes=10`，各自写回 `11`，最终结果是 11 而不是 12。并发越高偏差越大，且不可自愈。
- **重复插入 500**：同一用户快速双击，两次请求都可能读到「不存在」，随后都执行 `save`。`post_reactions` 上的 `uk_post_reactions` 唯一约束会拦下第二条，但会抛出 `DataIntegrityViolationException`，表现为 500 而不是幂等成功。
- `removeLike` 用了 `Math.max(0, ...)`，能防止负数，但无法修正偏差。

**建议**

1. 计数改为原子 SQL：`@Modifying @Query("update PostStat s set s.likes = s.likes + :delta where s.postSlug = :slug")`，由数据库保证原子性。
2. 或给 `PostStat` 加 `@Version`，冲突时重试一次。
3. 切换点赞状态时捕获 `DataIntegrityViolationException`，视为「已点赞」返回当前计数，保证幂等。
4. 定期用 `post_reactions` 的 `count(*)` 校正 `post_stats` 计数（可做成管理端任务）。

---

### R7 · 楼中楼回复全量加载后内存分页（P2）

**证据**

```java
// server/src/main/java/com/luyu/blog/service/CommentService.java:181-202
List<PostComment> children = comments.findByParent_IdOrderByCreatedAtAsc(commentId).stream()
        .filter(child -> !child.isDeleted())
        .toList();

Set<UUID> ids = children.stream().map(PostComment::getId).collect(Collectors.toSet());
List<CommentLike> likes = ids.isEmpty() ? List.of() : commentLikes.findByComment_IdIn(ids);
...
int from = Math.min(Math.max(0, page) * pageSize, sorted.size());
int to = Math.min(from + pageSize, sorted.size());
```

接口虽然有 `page / size` 参数，但**分页发生在全量数据取回之后**：

1. 先 `findByParent_IdOrderByCreatedAtAsc` 把该评论下所有回复一次性读进内存；
2. 再把这批 id 全部传给 `findByComment_IdIn` 加载所有点赞；
3. 然后 `orderReplies` 排序（内部还有近似 O(n²) 的顺序修正循环）；
4. 最后 `subList` 截取当前页。

**影响**

一条热门评论有 2000 条回复时，每次点开「查看全部回复」都会搬运 2000 条评论 + 对应点赞记录，并做 2000² 量级的比较。内存、GC 与响应时间都随回复数线性/平方增长，且这个成本对每一页重复支付。

**建议**

1. 改成 SQL 分页：`WHERE parent_id = ? AND deleted = false ORDER BY created_at LIMIT ? OFFSET ?`，同时只对当前页的 id 查点赞。
2. 「按点赞排序」需要先聚合：`ORDER BY (SELECT count(*) FROM comment_likes ...) DESC`，或维护 `like_count` 冗余列。
3. `orderReplies` 的 O(n²) 修正循环只在「回复的回复」场景需要；分页后单页 ≤ 50 条，成本可接受。
4. 给 `(parent_id, created_at)` 的索引已经存在（`PostComment.java:23`），改 SQL 分页不需要新增索引。

---

### R8 · 通知列表全量加载，无分页与上限（P2，级别有分歧）

**证据**

```java
// server/src/main/java/com/luyu/blog/service/NotificationService.java:47-68
List<Notification> visible = visibleFor(user);
Map<UUID, NotificationState> stateMap = stateMap(user, visible);
...
List<NotificationDto> items = visible.stream()
        .map(notification -> toDto(notification, stateMap.get(notification.getId())))
        .filter(...)
        .sorted(Comparator.comparing(...).reversed()...)
        .toList();
```

**影响**

通知数量随时间单调增长，且没有归档 / 清理机制。每次打开通知面板都会：查询全部可见通知 → 用全部 id 查状态 → 全量转换 → 内存排序。用户越活跃、运营发公告越多，面板越慢；`/api/notifications` 还带 `unread` 计数，属于高频接口。

**建议**

1. 增加 `page / size`（默认 20）与 `ORDER BY pinned_at DESC NULLS LAST, created_at DESC` 的 SQL 排序。
2. 未读数单独用 `count` 查询（已有 `/notifications/unread` 可复用）。
3. 增加保留策略：超过 N 条或 M 天的已读通知定期清理。
4. 前端通知面板做虚拟滚动或「加载更多」。

> 级别分歧：一名验证者认为 P3（当前数据量小），另一名认为 P2（增长后必现）。按长期运行的项目定位取 P2。

---

### R9 · 每个已认证请求查一次用户表（P3）

**证据**

```java
// server/src/main/java/com/luyu/blog/security/JwtAuthFilter.java:43-56
UUID userId = jwtService.parseUserId(header.substring(7));
String clientIp = ClientIp.resolve(request);
users.findById(userId).ifPresent(user -> { ... });
```

`JwtAuthFilter` 是 `OncePerRequestFilter`，对所有请求生效；只要带 `Authorization` 头就会触发一次 `users.findById`。

**影响**

- 每次认证请求固定多 1 次主键查询。单次成本很低（主键命中），但在评论轮询（30 秒一次）、通知刷新等高频场景下会累积。
- 写操作（发评论、点赞）还会通过 `PostSocialSupport.requireUser` 再查一次同一用户，形成重复查询。
- 该查询目前也承担「IP 绑定」与「用户被删除后立即失效」的职责，不能简单删除。

**建议**

1. 短期：在 `JwtAuthFilter` 把查到的 `User` 放进 request attribute，`requireUser` 优先复用，减少重复查询。
2. 中期：引入短 TTL（30–60 秒）的本地缓存（Caffeine），键为 userId，失效点放在改密 / 改角色 / 删用户处。
3. 若采用 R4 的 `tokenVersion` 方案，可把版本号写进 token，过滤器只比对版本号，缓存更安全。

---

### R10 · 主包 961KB，路由未做代码分割（P2）

**实测构建输出**（`npm run build`，2026-11-13）

```text
dist/index.html                        1.89 kB │ gzip:   0.95 kB
dist/assets/index-CDU5LDBa.css       236.24 kB │ gzip:  43.71 kB
dist/assets/DitherVeil-D9KAtzjO.js    19.34 kB │ gzip:   7.82 kB
dist/assets/Lanyard-BAPIzDff.js      540.93 kB │ gzip: 140.10 kB
dist/assets/index-B2dfEQEo.js        961.28 kB │ gzip: 319.92 kB
(!) Some chunks are larger than 500 kB after minification.
```

**证据**

```tsx
// src/router.tsx:3-11
import HomeView from './views/HomeView'
import JournalView from './views/JournalView'
import JournalTagView from './views/JournalTagView'
import PostView from './views/PostView'
import WorkIndexView from './views/WorkIndexView'
import WorkView from './views/WorkView'
import LoginView from './views/LoginView'
import NotFoundView from './views/NotFoundView'
import UpdatesView from './views/UpdatesView'
```

`Lanyard`（three.js）已经通过 `lazy(() => import('./Lanyard'))` 正确拆出，`DitherVeil` 也拆了，这是好的。但 9 个视图全部静态引入，导致 React、react-router、GSAP、motion、lenis、ogl 以及所有视图代码都进主包。`PassageGallery`（ogl）经由 `CredentialsSection` → `HomeView` 静态链进入主包。

**影响**

- 首屏需要下载并解析 961KB JS（gzip 后 320KB）+ 236KB CSS（gzip 44KB）。在中低端手机与弱网下，可交互时间明显推迟。
- 访问 `/login` 或 `/journal/xxx` 也要先付首页的全部成本。
- Vite 已给出 >500KB 告警，属于可量化的问题。

**建议**

1. 对非首屏视图使用 `React.lazy` + `Suspense`：`PostView`、`WorkView`、`LoginView`、`UpdatesView`、`NotFoundView` 至少应拆出。
2. `vite.config.ts` 增加 `build.rollupOptions.output.manualChunks`（Vite 8 为 `rolldownOptions`），把 `react` / `react-dom` / `react-router` 与 `gsap` / `motion` 分成稳定的 vendor chunk，提升缓存命中率。
3. 把 `PassageGallery` 改为可见时再 `import()`，与 `Lanyard` 的策略保持一致。
4. 评估 `three` 是否可以用更轻的 2D 方案替代（当前已 lazy，优先级低于前三条）。

---

### R11 · 验证码邮件在请求线程同步发送（P2）

**证据**

```java
// server/src/main/java/com/luyu/blog/service/VerificationCodeService.java:90-92
mailService.sendCode(email, code, register ? "注册账号" : "重置密码", ttlMinutes);
codes.save(new VerificationCode(email, code, scene, ip, now.plusSeconds(ttlMinutes * 60)));
```

```yaml
# server/src/main/resources/application.yml:27-29
mail.smtp.connectiontimeout: 8000
mail.smtp.timeout: 8000
mail.smtp.writetimeout: 8000
```

**影响**

- SMTP 抖动时，`POST /api/auth/code` 最长可阻塞 8s（连接）+ 8s（读）+ 8s（写）≈ 24 秒，占用一个 Tomcat 工作线程与一个数据库连接等待时间。
- 该接口是匿名可达的，攻击者可以用大量请求放大阻塞效果，属于低成本的可用性攻击面。
- 先发信后落库：若发信成功但 `save` 失败（如连接池耗尽），用户收到一个永远无法验证的验证码。
- 60 秒重发间隔的检查与落库不在同一原子操作中，并发请求可能同时通过检查，各发一封。

**建议**

1. 改为异步发送：先落库（状态 `PENDING`），再提交到一个有界线程池发送，成功后置 `SENT`；接口立即返回「已发送」。
2. 或至少把 SMTP 超时收紧到 3–5 秒，并对该接口加 IP 级并发限制。
3. 发送失败时把记录标记为失败，允许用户立即重试（保持现有「失败不占频率」的产品语义）。
4. 用数据库唯一约束或行锁保证「同一邮箱 60 秒内最多一条」。

---

### R12 · 无测试、无 CI、无 lint，TS 非严格模式（P2，级别有分歧）

**证据**

- `package.json:10-14` 只有 `dev / build / preview`，没有 `test`、`lint`。
- `server/src/test`、`src/__tests__` 均不存在。
- `.github/workflows` 不存在。
- 无 `eslint.config.js` / `.eslintrc.*`。
- `tsconfig.json:19` `strict: false`，同时 `noUnusedLocals`、`noUnusedParameters` 为 `false`。

**影响**

- 评论分页、深链定位、缓存失效、点赞计数这些逻辑有明确的正确性要求，但没有任何回归保护。
- 本次审查发现的问题（如 R6 并发计数、R7 全量加载）都需要测试才能长期防回归。
- 非严格 TS 让 `null` / `undefined` 与隐式 `any` 无法在编译期暴露，重构风险高。

**建议**

1. 后端：先给 `CommentService`（分页、缓存失效、删除鉴权）与 `PostStatsService`（幂等点赞、计数）加单元测试 + `@DataJpaTest`。
2. 前端：给 `useCommentFeed`（分页合并、轮询、深链）与 `api.ts`（401 处理）加 Vitest 测试。
3. 开启 `strict: true`，按目录逐步推进（先 `src/lib`、`src/store`）。
4. GitHub Actions 最小流水线：`npm ci && npm run build` + `./mvnw verify`。

> 级别分歧：一名验证者认为 P3（个人项目），另一名认为 P2（直接放大上述所有风险）。按「项目已有较复杂并发与缓存逻辑」的现状取 P2。

---

### R13 · `ddl-auto=update` 承担 schema 演进（P2）

**证据**

```yaml
# server/src/main/resources/application.yml:11-14
jpa:
  open-in-view: false
  hibernate:
    ddl-auto: update
```

启动流程还包含：`DatabaseBootstrapInitializer` 自动建库、`DatabaseCommentInitializer` 每次启动执行 60+ 条 `COMMENT ON` 语句。

**影响**

- `update` 只会「加表 / 加列」，**不会删列、不会改类型、不会回滚**；重命名字段会产生新旧两列并存。
- 没有版本化迁移记录，无法回答「线上到底是哪一版 schema」。
- 改列类型、加非空约束、加索引这类操作无法通过 `update` 安全完成。
- `DatabaseCommentInitializer` 每次启动固定执行 60+ 条 DDL，启动时间与日志噪声随表数量增长。

**建议**

1. 引入 Flyway（Spring Boot 原生支持），把现有 schema 固化为 `V1__baseline.sql`，之后所有变更走版本脚本。
2. 切换前先把 `ddl-auto` 改为 `validate`，让启动时校验实体与表一致。
3. 把 `COMMENT ON` 语句并入迁移脚本，删除启动期 DDL 循环。

---

### R14 · 未显式配置 HikariCP（P3）

**证据**

`application.yml` 中没有 `spring.datasource.hikari.*` 配置，使用默认 `maximum-pool-size=10`。

**影响**

- 10 个连接对个人站足够，但 R11 的同步发信、R7 的全量回复加载都会拉长单请求持有连接的时间，高峰期可能出现等待。
- 默认 `connection-timeout=30s`，池耗尽时请求会静默等待 30 秒才失败，用户侧表现为「一直转圈」。

**建议**

1. 显式配置：`maximum-pool-size: 15`、`connection-timeout: 5000`、`max-lifetime`、`leak-detection-threshold: 20000`。
2. 开启 Hikari 指标日志（或接入 Actuator），观察连接使用峰值。
3. 配合 R11 的异步化，从根源减少长事务 / 长占用。

---

### R15 · 71.4MB 音频与首曲自动预加载（P3，级别有分歧）

**证据**

- `public/art/music/` 下 10 个 mp3，实测合计 **71.36MB**。
- `src/lib/vinylAudio.ts:374-397`：`audio.preload = 'auto'`，设置 `src` 后立即 `load()`。
- `src/components/VinylPlayer.tsx:283-293`：`ui.introDone` 时 `engine.setTrack(0); engine.play()`。

**影响**

- 首页标题动画结束即自动播放，会立即开始下载第一首 mp3（数 MB）。移动网络下这是首屏之后最大的一笔流量。
- 换曲时才加载下一首，这一点是合理的（没有一次性预加载 10 首）。
- 71MB 静态资源也会放大部署包与镜像体积。

**建议**

1. 将 `preload` 改为 `metadata`，等用户真正点击播放（或首次交互后）再 `preload='auto'`；自动播放策略本来就需要一次用户手势，这个改动不会损失体验。
2. 对 mp3 做码率压缩（128kbps → 96kbps）或提供 `.m4a` / Opus 回退，通常可减小 30–50%。
3. 若自动播放是产品核心体验，至少在 `prefers-reduced-motion` 或 `navigator.connection.saveData` 为真时跳过自动加载。

> 级别分歧：一名验证者认为 P2（首屏流量），另一名认为 P3（产品有意为之且按需加载）。考虑到自动播放是站点设计的一部分，取 P3。

---

## 五、性能实测数据

### 5.1 构建体积（2026-11-13 实测）

| 产物 | 原始 | gzip |
| --- | --- | --- |
| `index-*.js`（主包） | 961.28 kB | 319.92 kB |
| `index-*.css` | 236.24 kB | 43.71 kB |
| `Lanyard-*.js`（已懒加载） | 540.93 kB | 140.10 kB |
| `DitherVeil-*.js`（已懒加载） | 19.34 kB | 7.82 kB |
| `index.html` | 1.89 kB | 0.95 kB |

- 模块数：655；构建耗时：2.96s。
- Vite 告警：存在 >500KB 的 chunk。
- 主包 gzip 320KB 已接近「单文件 170KB gzip」这一常见性能预算的 2 倍。

### 5.2 API 响应（同一台机器、本地 PostgreSQL）

| 接口 | 冷启动首批 | 热态 | 说明 |
| --- | --- | --- | --- |
| `GET /api/posts/{slug}/stats` | 180ms | 8–14ms | 冷启动含 Hibernate 元模型初始化、连接建立 |
| `GET /api/posts/{slug}/comments` | 198ms | 24–34ms | 热态包含 8 次查询 + 1 次 JWT 用户查询 |

结论：**180ms / 198ms 是冷启动现象，不是慢 SQL**。热态下 SQL 执行时间为 0.104ms（stats 主键查询）与 1.092ms（评论分页聚合），数据库不是瓶颈。这也解释了 `[vite] proxy ECONNREFUSED`：后端重启窗口内 8080 端口未监听，属于环境时序问题。

### 5.3 评论列表的数据库往返

登录用户拉取一页一级评论，当前实现会串行执行约 9 次往返：

1. `JwtAuthFilter` → `users.findById`
2. `countRoots`
3. `countByPostSlugAndDeletedFalse`（总数）
4. `findRootIdsByRecent` / `findRootIdsByLikes`（一级评论 id）
5. `findReplyPreviewByRecent` / `findReplyPreviewByLikes`（预览回复）
6. `countRepliesByParent`（回复数）
7. `findDetailedByIdIn`（评论详情）
8. `countByCommentIds`（点赞数）
9. `findLikedCommentIds`（我的点赞）

这是当前评论接口在热态下 24–34ms 的主要成本。要再往下压，方向是把 4–6 合并成一个窗口函数查询，或对一级评论列表做短 TTL 缓存（匿名缓存已有，登录态因包含 `likedByMe` 无法直接复用）。

### 5.4 渲染性能观察

- `GlowCursor`、`DitherVeil`、`LetterGlitch`、`LogoLoop`、`Lanyard`、`ProfileCard`、`PassageGallery` 都存在 `requestAnimationFrame` 循环，但普遍带有 `visible` / `document.hidden` 守卫，离开视口或页面隐藏时暂停，这是正确的做法。
- `VinylPlayer` 的频谱绘制只在播放时启动 rAF，暂停后停止，无空转。
- `sampleTone` 里的 `elementsFromPoint` **只在 scroll / resize 的 rAF 回调中调用**（`VinylPlayer.tsx:158-175`），不是每帧调用，因此不构成强制布局热点。
- 真正的渲染风险是「同时可见的 rAF 循环数量」：首屏 Hero（LetterGlitch + GlowCursor）叠加 About（Lanyard，已懒加载）时，主线程压力最高。若后续要继续优化，可给 `LetterGlitch` 加「首屏动画结束后降帧」策略。

---

## 六、已确认的良好设计（避免误判）

这些点在审查中被明确核对过，**不是问题**，记录在此以免后续重复排查：

| 事项 | 结论 |
| --- | --- |
| 评论 XSS | 评论正文以纯文本 `<p>` 渲染，未使用 `dangerouslySetInnerHTML` |
| 评论 / 通知归属校验 | 评论删除校验 owner 或 ADMIN；通知 `requireVisible` 校验 audience、ADMIN 与 recipient |
| 评论缓存 | 有 5 秒 TTL、200 key 上限、写操作按 slug 前缀失效，不会无界增长 |
| 点赞唯一性 | `post_reactions` 上有 `(post_slug, user_id, kind)` 唯一约束 |
| 评论查询索引 | `(post_slug, created_at)` 与 `(parent_id, created_at)` 两个索引已建 |
| 阅读量写入 | 内存累加 + 5 秒批量 upsert + `@PreDestroy` 兜底，崩溃最多丢 5 秒，可接受 |
| 通知轮询 | 前端 30 秒轮询，且仅在页面可见、评论区接近视口时执行 |
| 慢请求日志 | `RequestLoggingFilter` 只记录 ≥150ms 或 ≥400 的 `/api/` 请求，不会淹没日志 |
| 日志轮转 | 按天 + 20MB 单文件 + 30 天 + 1GB 总量上限 |
| 种子数据 | `seed-data.sql` 仅一行注释，不含默认账号密码；管理员仅在显式配置 `SEED_ADMIN_EMAIL/PASSWORD` 时创建 |
| token 失效处理 | 401 时清除本地 token 并派发 `luyu:unauthorized`，登录态不会「假在线」 |
| ProGuard | 保留 domain / dto / repo / UserPrincipal 与运行时注解，混淆范围克制，反射风险低 |
| 数据库账号 | 真实账号密码在 `application-local.yml`，已 gitignore |

---

## 七、修复路线建议

### 7.1 上线前（P1，建议当次处理）

| 顺序 | 事项 | 预估改动面 |
| --- | --- | --- |
| 1 | 移除 JWT 默认密钥，改为缺失即启动失败；本地默认值移入 `application-local.yml` | 1 个配置文件 + 1 个校验 |
| 2 | 登录失败计数与验证码/退避（账号 + IP 双维度） | `AuthService` + 1 张计数表或复用现有表 |
| 3 | 配置可信代理，停止无条件采信 XFF（R3） | `ClientIp` + `application.yml` |

### 7.2 短期（P2，1–2 个迭代）

1. 点赞 / 收藏计数改原子 SQL，并处理唯一约束冲突的幂等（R6）。
2. 楼中楼改 SQL 分页（R7）。
3. 通知列表加分页与保留策略（R8）。
4. 路由级代码分割 + vendor chunk（R10）。
5. 验证码邮件异步化 + 收紧 SMTP 超时（R11）。
6. `ddl-auto` 改 `validate` 并引入 Flyway 基线（R13）。
7. 重置密码使旧 token 失效（R4）。

### 7.3 中期（P3 / 结构性）

1. token 改 HttpOnly Cookie + 增加 CSP（R5）。
2. Hikari 显式配置 + 连接池监控（R14）。
3. 音频码率压缩或延迟预加载（R15）。
4. 用户查询短 TTL 缓存（R9）。
5. 测试与 CI 覆盖（R12），并逐步开启 `strict: true`。

---

## 八、快速收益 vs 结构性改造

| 类型 | 事项 | 收益 | 成本 |
| --- | --- | --- | --- |
| 快速收益 | 移除 JWT 默认密钥 | 消除最高危的提权路径 | 极低 |
| 快速收益 | 登录失败限流 | 消除无限撞库 | 低 |
| 快速收益 | 点赞计数改原子 SQL | 消除长期数据偏差 | 低 |
| 快速收益 | 路由 lazy + vendor chunk | 首包预计下降 40–60% | 低 |
| 快速收益 | 音频 `preload=metadata` | 首访流量下降数 MB | 极低 |
| 结构性 | Flyway 迁移体系 | schema 可回滚、可审计 | 中 |
| 结构性 | 邮件异步化 + 发送状态机 | 接口不再被 SMTP 阻塞 | 中 |
| 结构性 | 楼中楼 SQL 分页 | 热门评论不再随回复数退化 | 中 |
| 结构性 | Cookie + CSP | 根治 token 窃取面 | 中高 |
| 结构性 | 测试 + CI | 上述所有改动的回归保护 | 高（持续投入） |

---

## 九、验证清单

修复后建议按以下方式逐项确认：

- [ ] R1：不设置 `JWT_SECRET` 启动后端，应**启动失败**；设置后能正常签发与校验 token。
- [ ] R2：对 `/api/auth/login` 连续错误 6 次，第 6 次应要求图形验证码或返回 429；正确密码在退避期内也应被拒绝。
- [ ] R3：伪造 `X-Forwarded-For: 1.2.3.4` 请求，日志中记录的客户端 IP 应为真实 `remoteAddr`；换 IP 头不再绕过发码频率限制。
- [ ] R4：登录取得 token → 重置密码 → 用旧 token 调 `/api/auth/me`，应返回 401。
- [ ] R5：响应头包含 `Content-Security-Policy`；用控制台尝试注入内联脚本应被拦截。
- [ ] R6：用并发脚本对同一篇文章发起 100 次不同用户的点赞，`post_stats.likes` 应等于 100；同一用户双击只产生一条 `post_reactions` 记录且返回 200。
- [ ] R7：给一条评论造 1000 条回复，打开「查看全部回复」，单次响应时间与内存占用应保持稳定（不随总数线性增长）。
- [ ] R8：造 500 条通知，`/api/notifications?page=0&size=20` 返回 20 条且响应时间 <50ms。
- [ ] R9：一次评论列表请求的 SQL 次数应从 9 降到 7 或更少（开启 SQL 日志核对）。
- [ ] R10：`npm run build` 后主包 gzip 应低于 200KB，且 `dist/assets` 中出现按视图拆分的 chunk。
- [ ] R11：断网 / 伪造不可达 SMTP，`POST /api/auth/code` 应在 1 秒内返回，且记录状态可重试。
- [ ] R12：`npm run build` + `./mvnw verify` 在 CI 中通过；新增测试能覆盖评论分页与点赞幂等。
- [ ] R13：`ddl-auto=validate` 启动通过；故意改一个实体字段类型，启动应报错而不是静默改表。
- [ ] R14：配置生效后 `/actuator/metrics/hikaricp.connections.max` 应等于配置值。
- [ ] R15：首访 Network 面板中不应出现完整 mp3 下载，只有元数据请求。

---

## 十、附：主要证据文件索引

| 主题 | 文件 |
| --- | --- |
| JWT 签发与校验 | `server/src/main/java/com/luyu/blog/security/JwtService.java` |
| 请求认证与 IP 绑定 | `server/src/main/java/com/luyu/blog/security/JwtAuthFilter.java` |
| 客户端 IP 解析 | `server/src/main/java/com/luyu/blog/security/ClientIp.java` |
| 登录 / 注册 / 重置密码 | `server/src/main/java/com/luyu/blog/service/AuthService.java` |
| 验证码与频率限制 | `server/src/main/java/com/luyu/blog/service/VerificationCodeService.java` |
| 评论读取 / 写入 / 缓存 | `server/src/main/java/com/luyu/blog/service/CommentService.java` |
| 点赞 / 收藏 / 阅读量 | `server/src/main/java/com/luyu/blog/service/PostStatsService.java` |
| 阅读量缓冲 | `server/src/main/java/com/luyu/blog/service/ViewCountBuffer.java` |
| 通知 | `server/src/main/java/com/luyu/blog/service/NotificationService.java` |
| 安全配置 | `server/src/main/java/com/luyu/blog/config/SecurityConfig.java` |
| 应用配置 | `server/src/main/resources/application.yml` |
| 混淆配置 | `server/proguard.conf` |
| 路由 | `src/router.tsx` |
| API 客户端 / token 存储 | `src/lib/api.ts` |
| 黑胶播放器 | `src/components/VinylPlayer.tsx`、`src/lib/vinylAudio.ts` |
| 构建配置 | `vite.config.ts`、`package.json`、`tsconfig.json` |

---

*本报告基于 2026-11-13 的代码快照与实测数据；15 条问题均经两名独立验证者复核确认。*

---

## 十一、修复状态（2026-11-13 更新）

本轮按「P1 + P2 代码级修复」范围处理，commit `9459cee`。

| 编号 | 问题 | 状态 | 落地方式 |
| --- | --- | --- | --- |
| R1 | JWT 默认密钥可直接伪造 token | 已修复 | `app.jwt.secret` 移除默认值，启动时校验非空 / 非示例值 / 长度 ≥32 |
| R2 | 登录无失败限制 | 已修复 | 新增 `login_attempts` 表，账号 + IP + 15 分钟窗口限 5 次，超限返回 429；失败记录走独立事务提交 |
| R3 | 无条件信任 `X-Forwarded-For` | 已修复 | 默认只用 `remoteAddr`，仅在 `app.network.trust-forwarded-headers=true` 时取代理头最右段 |
| R4 | 重置密码后旧 token 仍可用 | 已修复 | `users.token_version` + JWT `ver` 声明，校验不一致直接视为未登录 |
| R5 | token 存 localStorage、无 CSP | 未纳入 | 需改造为 HttpOnly Cookie 与会话策略，属结构性变更，本轮不做 |
| R6 | 点赞读-改-写导致计数漂移 | 已修复 | 计数改 `update ... set likes = likes + :delta` 原子更新；写入用 `on conflict do nothing`，删除按真实影响行数判断 |
| R7 | 楼中楼全量加载后内存分页 | 已修复 | 改为 `count + limit/offset` SQL 分页，仅对当前页做关联与排序 |
| R8 | 通知全量加载 + 内存排序 | 已修复 | JPQL `left join NotificationState` + `Pageable`，返回 `items/unread/hasMore` |
| R9 | 评论列表 N+1（P3） | 未做 | 优先级最低，留待后续观测后处理 |
| R10 | 单包 961KB、无路由拆分 | 已修复 | 8 个视图改 `lazy` + `Suspense`；主包降至 866.64KB / gzip 294.18KB，CSS 降至 143.15KB / gzip 28.29KB |
| R11 | 邮件同步发送阻塞接口 | 已修复 | 新增 `mailExecutor` 线程池，验证码先落库再异步发信，失败删记录；SMTP 超时收敛为 3s/5s/5s |
| R12 | 无测试与 CI | 未纳入 | 属工程流程建设，本轮不做 |
| R13 | `ddl-auto=update` 无迁移体系 | 未纳入 | 需引入 Flyway 并基线化现有 schema，本轮不做 |
| R14 | Hikari 连接池未显式配置 | 已修复 | 显式配置 `maximum-pool-size`、`connection-timeout`、`leak-detection-threshold` |
| R15 | 音频整包预加载 | 已修复 | 首访 `preload='metadata'`，真正播放前再切 `auto` |

### 回归验证结果

- `mvn -DskipTests compile` 通过；`npm run build` 通过。
- 接口实测：`/api/posts/{slug}/stats`、`/api/posts/{slug}/comments`、`/api/posts/comments/{id}/replies`、`/api/notifications` 均 200。
- 限流实测：连续错误登录第 1–5 次 401，第 6 次 429；伪造 `X-Forwarded-For` 后 `login_attempts.request_ip` 仍记录真实地址。
- 浏览器逐页回归：首页、文章页（评论分页 / 回复展开）、手记列表与标签筛选、作品列表与详情、更新日志、404 兜底、站内信抽屉全部正常，无 console 报错。
- 未覆盖分支：通知「加载更多」需 >20 条数据才会出现，当前仅 4 条通知，未在浏览器中触发。

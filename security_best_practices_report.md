# MyBlog 网络安全审查报告

- 审查日期：2026-11-12
- 范围：前端 `src/`（React 19 + Vite）、后端 `server/`（Spring Boot 4 / Java 25）、部署相关配置
- 方式：静态代码审查 + 本地运行时探测（`localhost:8080` API、`localhost:4173` 静态预览）+ `npm audit`
- 说明：本报告只描述可验证的问题，不含泛泛而谈的“最佳实践清单”；未做破坏性测试

## 总体结论

项目的基础安全设计是合格的：BCrypt 存密码、JWT 无状态鉴权、`/api/admin/**` 统一 `hasRole("ADMIN")`、评论删除校验归属、通知按可见性过滤、JPA 无 SQL 拼接、React 无 `dangerouslySetInnerHTML`、`npm audit` 0 漏洞。

最需要处理的是 **两条可串联的攻击链**：

1. 若生产未设置 `JWT_SECRET`，公开在仓库里的默认密钥可被用来伪造任意用户（含管理员）令牌（S-01）；
2. 服务端无条件信任 `X-Forwarded-For`，可伪造 IP，绕过验证码 IP 限流，并让 JWT 的“绑定登录 IP”防护形同虚设（S-02）。

此外，登录接口没有任何失败限流，可被在线爆破（S-03）。

---

## 严重 / 高危

### S-01 JWT 使用公开的默认密钥，可伪造管理员令牌

**位置**：[application.yml](server/src/main/resources/application.yml#L52)、[JwtService.java](server/src/main/java/com/luyu/blog/security/JwtService.java#L23-L31)、[JwtAuthFilter.java](server/src/main/java/com/luyu/blog/security/JwtAuthFilter.java#L43-L53)

```yaml
secret: ${JWT_SECRET:luyu-dev-only-secret-key-please-replace-0123456789}
```

**影响**：如果生产部署忘记设置 `JWT_SECRET`，应用会静默使用仓库中公开的密钥启动。攻击者可用它签出任意 `sub`（用户 UUID）的合法 token；鉴权时后端只按 token 里的 UUID 查库并取库中角色（`JwtAuthFilter` L45-L53），不校验签发来源，因此可冒充管理员接管后台。

**利用前提**：需要知道目标用户 UUID。而评论列表接口对未登录访客公开，返回了 `authorId`（[PostSocialDtos.java](server/src/main/java/com/luyu/blog/web/dto/PostSocialDtos.java#L24-L33)、[PostSocialService.java](server/src/main/java/com/luyu/blog/service/PostSocialService.java#L253-L266)），管理员的 UUID 只要发过评论就会暴露。

**修复建议**：
- 生产环境必须注入 `JWT_SECRET`（≥32 字节随机值），并在启动时校验：若密钥等于默认值且 profile 不是 dev，直接启动失败；
- 评论 DTO 不向未登录用户返回 `authorId`，或改用不可关联的公开作者 ID；
- 长期可考虑 token 中加入并校验 `tokenVersion`，使密钥/密码变更后旧 token 全部失效。

---

### S-02 无条件信任 `X-Forwarded-For` / `X-Real-IP`，可伪造客户端 IP

**位置**：[ClientIp.java](server/src/main/java/com/luyu/blog/security/ClientIp.java#L13-L31)、[JwtAuthFilter.java](server/src/main/java/com/luyu/blog/security/JwtAuthFilter.java#L44-L49)、[VerificationCodeService.java](server/src/main/java/com/luyu/blog/service/VerificationCodeService.java#L85-L87)

```java
String forwarded = request.getHeader("X-Forwarded-For");
if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
```

**影响**：
- 验证码“同一 IP 每小时最多 20 次”的限制（`app.auth.code-max-per-ip-hour`）可用伪造头绕过，配合大量邮箱可放大发信量与数据库写入；
- JWT 登录时记录 `lastLoginIp`，后续请求要求 IP 一致。该防护依赖同一个可伪造的头，攻击者只要知道受害者出口 IP，就能在任意网络重放盗来的 token；
- `lastLoginIp`、日志中的 IP 均可被污染，影响审计。

运行时已确认服务端直连也能读到并采用该头（本地无反向代理）。

**修复建议**：
- 默认使用 `request.getRemoteAddr()`；仅当请求确实来自可信反向代理时才解析 `X-Forwarded-For`，且应从右往左取代理追加的地址，而不是取最左（客户端可写）的值；
- 用 Spring 的 `server.forward-headers-strategy=native/framework` 配合代理层信任，而不是手写解析；
- 不建议把“登录 IP 不变”当作会话安全边界（移动网络/IPv6 会误伤），真正的控制应是短 TTL + 可撤销会话。

---

### S-03 登录接口没有失败限流 / 锁定，可在线爆破

**位置**：[AuthService.java](server/src/main/java/com/luyu/blog/service/AuthService.java#L112-L126)、[SecurityConfig.java](server/src/main/java/com/luyu/blog/config/SecurityConfig.java#L26-L27)

**影响**：`/api/auth/login` 对所有人开放，没有失败次数、验证码或退避策略。密码策略只有“8-72 位”长度要求（[AuthDtos.java](server/src/main/java/com/luyu/blog/web/dto/AuthDtos.java#L29)），攻击者可对已知账号持续撞库/猜密码；成功后 token 有效期 72 小时。

**修复建议**：
- 按“账号 + IP”统计失败次数，达到阈值后指数退避或临时锁定，并记录告警日志；
- 连续失败若干次后要求图片验证码（现有 `CaptchaService` 可复用）；
- 修复 S-02 后限流才有意义。

---

## 中危

### S-04 静态站点缺少 CSP / 安全响应头，token 存在 localStorage

**位置**：[index.html](index.html#L1-L35)（无 CSP）、[api.ts](src/lib/api.ts#L89-L108)（token 存 `localStorage`）

运行时对 `localhost:4173` 的响应头检查：没有 `Content-Security-Policy`、`X-Frame-Options`、`Referrer-Policy`（后端 API 有 Spring Security 默认的 `nosniff` 与 `X-Frame-Options: DENY`，静态站没有）。

**影响**：当前前端未发现 XSS 注入点（无 `dangerouslySetInnerHTML`/`innerHTML`/`eval`），风险是条件性的；但一旦引入富文本/Markdown 渲染、被植入第三方脚本或依赖被投毒，攻击者可直接读走 72 小时有效的 Bearer token，且后端无法撤销。

**修复建议**：
- 在静态托管层（Nginx/Vercel/Netlify 等）加 CSP：`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'`，并加 `Referrer-Policy: strict-origin-when-cross-origin`；
- 给 Google Fonts 等外部资源评估是否自托管；
- 中期可改为 HttpOnly + SameSite Cookie 承载会话（需配合 CSRF token），或至少缩短 token TTL。

### S-05 账号枚举

**位置**：[AuthService.java](server/src/main/java/com/luyu/blog/service/AuthService.java#L87-L92)（注册返回“邮箱已注册/用户名被占用”）、[AuthService.java](server/src/main/java/com/luyu/blog/service/AuthService.java#L136-L147)（重置密码解析账号返回 404）、[VerificationCodeService.java](server/src/main/java/com/luyu/blog/service/VerificationCodeService.java#L65-L70)

**影响**：可批量判断某邮箱/用户名是否注册，为撞库和定向钓鱼提供目标列表；`/auth/code/verify` 也会对不存在的账号返回差异化结果。

**修复建议**：注册冲突统一提示为“该账号不可用”；找回密码流程无论账号是否存在都返回“如果账号存在已发送邮件”；失败响应加固定延迟。

### S-06 会话不可撤销

**位置**：[api.ts](src/lib/api.ts#L98-L99)（登出只删本地 token）、[JwtService.java](server/src/main/java/com/luyu/blog/security/JwtService.java#L33-L44)

**影响**：token 签发后 72 小时内始终有效。用户登出、修改/重置密码、疑似泄漏后，旧 token 仍可继续调用 API。

**修复建议**：用户表增加 `tokenVersion`（或 `passwordChangedAt`），签发时写入、校验时比对；修改密码/重置密码/登出时自增，使旧 token 立即失效；同时把 TTL 降到更合理的时长。

### S-07 未鉴权的阅读计数接口可刷量、可向 `post_stat` 插入任意行

**位置**：[PostSocialController.java](server/src/main/java/com/luyu/blog/web/PostSocialController.java#L69-L72)、[PostSocialService.java](server/src/main/java/com/luyu/blog/service/PostSocialService.java#L192-L197)、[PostSocialService.java](server/src/main/java/com/luyu/blog/service/PostSocialService.java#L231-L233)

```java
private PostStat statOf(String slug) {
    return stats.findById(slug).orElseGet(() -> stats.save(new PostStat(slug)));
}
```

**影响**：`POST /api/posts/{slug}/view` 无需登录，且对任意合法 slug（`[A-Za-z0-9_-]{1,190}`）都会创建统计行。攻击者可无限刷阅读量，或用随机 slug 批量插入记录造成数据污染与表膨胀（本地实测该接口返回 200 并直接累加 views）。

**修复建议**：校验 slug 是否属于已发布文章；按 IP/会话做去重与限流；或改为异步、采样计数。

### S-08 验证码图片接口无频率限制

**位置**：[CaptchaService.java](server/src/main/java/com/luyu/blog/service/CaptchaService.java#L59-L68)

**影响**：`GET /api/auth/captcha` 每次请求都会生成图片（Java2D 绘制较耗 CPU）并删除过期记录、写入新记录。可被脚本高频调用造成 CPU/数据库压力。

**修复建议**：按 IP 限流；限制未使用验证码的并发数量；必要时加缓存或降级策略。

### S-09 `ddl-auto: update` 用于生产

**位置**：[application.yml](server/src/main/resources/application.yml#L11-L14)

**影响**：应用启动时自动改表结构，没有版本记录和回滚路径，误改/并发部署可能导致 schema 漂移或数据丢失。

**修复建议**：生产使用 `ddl-auto: validate` + Flyway/Liquibase 管理迁移。

### S-10 本地敏感配置明文集中存放

**位置**：`server/application-local.yml`（内容为数据库密码、163 邮箱授权码、管理员密码、JWT 密钥）

**现状**：已正确加入 [.gitignore](.gitignore#L31-L33)，并核实从未进入 git 历史，这一点做得对。风险在于文件本身是明文的，容易随备份、截图、共享目录泄漏；[DataSeeder.java](server/src/main/java/com/luyu/blog/config/DataSeeder.java#L41-L42) 会用其中的密码自动创建管理员。

**修复建议**：改用环境变量或系统密钥管理；限制文件权限；管理员初始密码使用一次性强随机值，首次登录后强制修改。

---

## 低危 / 加固项

### S-11 验证码明文入库
[VerificationCodeService.java](server/src/main/java/com/luyu/blog/service/VerificationCodeService.java#L89-L91) 将 6 位验证码原样存入数据库。数据库只读泄漏的窗口期内（10 分钟），可用于重置任意账号密码。建议存 HMAC 摘要后比对。
（验证码本身的防护是到位的：`SecureRandom`、一次性消费、10 分钟过期、最多错 5 次、发送频率限制。）

### S-12 前端错误/日志
[RequestLoggingFilter.java](server/src/main/java/com/luyu/blog/config/RequestLoggingFilter.java#L43-L49) 只记录用户 UUID，未记录 token/密码；`ApiExceptionHandler` 只回业务错误，Spring 默认不回堆栈。**未见敏感信息泄漏**，保持现状即可。

---

## 已确认做得好的部分（无需修改）

- 密码使用 BCrypt，长度上限 72 位（规避 BCrypt 截断）
- `/api/admin/**` 统一 `hasRole("ADMIN")`，未登录访问 `/api/admin/feedback` 实测返回 401
- 评论删除校验作者或管理员；通知读取/置顶/删除校验可见性
- 评论 800 字上限、每人每小时 20 条、服务端脏词过滤
- 全部为 JPA 派生查询，未发现拼接 SQL / `nativeQuery`
- 未发现 `dangerouslySetInnerHTML`、`innerHTML`、`eval`，评论内容按文本渲染
- 无文件上传/下载接口，不存在路径穿越面
- 未引入 Actuator / Swagger；无 CORS 通配配置
- 外部链接均带 `rel="noreferrer"`；`npm audit` 报告 0 个漏洞
- CSRF 关闭可以接受：认证走 `Authorization` 头而非 Cookie，不存在跨站自动携带凭据的前提

---

## 建议修复顺序

1. **S-01**：启动时拒绝默认 JWT 密钥 + 评论不返回 `authorId`
2. **S-02**：只信任可信代理的转发头（同时决定是否保留 IP 绑定）
3. **S-03**：登录失败限流/退避
4. **S-06**：token 版本号，支持改密/登出后立即失效
5. **S-04**：部署层 CSP 与安全响应头
6. **S-05 / S-07 / S-08 / S-09**：枚举、刷量、验证码限流、迁移工具
7. **S-11 / S-10**：验证码摘要存储、密钥管理

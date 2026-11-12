-- 更新页历史版本：由 src/data/changelog.ts 导出，外加本次 git 更新补记的两条

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v3.2.0', '2026.11.12 22:10 – 22:35', '2026-11-12T22:10:00+08:00', '评论分页与千条评论压测');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.2.0'), 0, '一级评论改为分页返回（每页 20 条），楼中楼只带 3 条预览并新增独立的回复分页接口，不再一次性把整篇文章的评论塞给浏览器。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.2.0'), 1, '带 `#comment-xxx` 进入时由后端直接返回目标所在页，跳转不再需要逐页翻找。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.2.0'), 2, '用 1000 条评论 + 1500 条回复压测：首屏 44ms / 30KB，第 50 页 26ms / 7.9KB，展开 30 条楼中楼 12–15ms。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.2.0'), 3, '空库首次启动会自动导入干净的种子数据，换机器部署不用再手动灌数据。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v3.1.2', '2026.11.12 18:00 – 22:00', '2026-11-12T18:00:00+08:00', '评论区互动完善');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.2'), 0, '评论支持点赞，新增「最近 / 最多点赞」排序；最多点赞时楼中楼同样按点赞排序，并保持「先被回复者、再回复内容」的顺序。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.2'), 1, '从站内信跳到某条回复时统一走 Lenis 定位到视口 40% 处，用气泡底色呼吸提示目标，跳转结束自动清掉地址栏锚点。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.2'), 2, '删除评论改为二次确认模态；自己的评论用暖橙气泡区分，气泡去掉描边并统一内边距。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.2'), 3, '修复点击回复时页面往上跑、跳转先回顶再回位等滚动问题，站内信已读状态同步修复。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v3.1.1', '2026.11.12 17:51 – 18:00', '2026-11-12T17:51:00+08:00', '手记筛选修复与细节打磨');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.1'), 0, '移除手记索引页与标签页的「下一章」区块，页面收尾更干净。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.1'), 1, '修复手记页项目 / 年份筛选点击后 URL 已更新、列表与选中态却不变的问题：同页 query 变化现在会同步给路由。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.1'), 2, '「最新 / 热度」与年份筛选字号放大到 12px，筛选栏不再需要凑近看。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.1'), 3, '语言切换按钮去掉 1px 边框，只保留悬停底色与轻微位移。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v3.1.0', '2026.11.12 17:25 – 17:42', '2026-11-12T17:25:00+08:00', '手记分类、评论与中英切换');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.0'), 0, '手记按项目分类（千域 / 签到考勤 / 数据大屏 / 本站），新增项目筛选、年份归档与 `/journal/tag/:tag` 标签页。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.0'), 1, '手记阅读增强：相关文章、上一篇 / 下一篇、目录、代码块复制与图片灯箱；补齐 canonical、JSON-LD、`robots.txt` 与 `sitemap.xml`。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.0'), 2, '新增登录评论与楼中楼回复、通知中心、点赞 / 收藏 / 阅读量，手记列表支持按热度排序。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.1.0'), 3, '全站中英切换上线：默认中文并记住选择，导航新增语言切换图标。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v3.0.1', '2026.11.12 13:03', '2026-11-12T13:03:00+08:00', '移动端与性能修补');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.1'), 0, '手机端搜索入口去掉胶囊边框，收成与消息铃铛一致的纯图标；搜索面板移除顶部橙色刻度线，改用投影收边。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.1'), 1, '修复能力条在手机上点开后只露出一行的问题：展开高度上限由 40px 提到 200px，触屏改为点击切换，展开时「+」转成叉号。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.1'), 2, '工牌加入低配机档位：关闭抗锯齿、像素比降到 1、去掉 grain / weave 法线贴图、贴图宽度减半、各向异性过滤降到 1，显存占用与每帧填充率明显下降。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.1'), 3, '登录页窄屏下返回按钮改为参与排版，不再压住「Sign in.」标题。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.1'), 4, '`debug` 目录移入 `public`，随构建发布，公网 `/debug/index.html` 不再 404。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v3.0.0', '2026.11.12 10:25', '2026-11-12T10:25:00+08:00', '全站搜索上线');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.0'), 0, '头部新增搜索入口（消息铃铛左侧），点击或 `⌘K` / `Ctrl+K` 随时唤起全站搜索面板。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.0'), 1, '新增 `data/search.ts`，把页面、作品、手记、更新与经历/荣誉/证书摊平成一张索引，标题命中权重更高。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.0'), 2, '面板支持实时匹配与关键词高亮、`↑↓` 选择、`↵` 跳转、`ESC` 关闭；带 `#` 的结果在当前页平滑滚到对应区块。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v3.0.0'), 3, '打开、收起与跳转都走淡入淡出过渡，结果行逐条浮现；`prefers-reduced-motion` 下自动关闭动画。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.10.0', '2026.11.12 09:55', '2026-11-12T09:55:00+08:00', '更新页：时间轴与版本目录');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.10.0'), 0, '新增 `/updates` 更新页，把 `Updated.md` 里的版本记录按时间倒序排成一条竖线时间轴。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.10.0'), 1, '布局改为「左侧吸顶目录 + 中间竖线 + 右侧正文」，正文整体落在竖线右侧。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.10.0'), 2, '左侧目录随页面滚动自动高亮当前版本并跟随滚动，隐藏滚动条、两端渐隐，也可直接用滚轮翻阅。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.10.0'), 3, '圆点回正到竖线位置；时间轴与目录联动，当前条目保持原色，其余淡出。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.10.0'), 4, '接入菜单与路由转场，更新页使用浅色纸主题。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.9.0', '2026.11.12 00:48', '2026-11-12T00:48:00+08:00', '返回首页卡顿修复');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.9.0'), 0, '定位根因：`/journal` → 首页整页重挂，同时初始化 4 个 WebGL / three 场景并重播首屏描边与打字动画，主线程被占满。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.9.0'), 1, '新增 `useNearViewport`，吊牌与照片隧道改为接近视口才挂载，首屏不再创建多余上下文、环境贴图与贴图图集。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.9.0'), 2, '`GlowCursor` 不再随主题重挂，只清空旧染料并唤醒一帧，省掉着色器重编译与 FBO 重建。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.9.0'), 3, '首屏开场整页只播一次，站内返回首页直接落到完成态。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.8.0', '2026.11.12 00:37', '2026-11-12T00:37:00+08:00', '删除改为原地占位');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.8.0'), 0, 'SwipeRow 新增 `collapseOnCommit`，删除时不再先折叠行高，其他消息不会被向上顶一下再弹回。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.8.0'), 1, '保险丝条先按被删行的实测高度原地占位，约 0.28 秒后再平滑收掉多余高度。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.8.0'), 2, '保险丝烧完后先收合淡出再调用删除接口，撤销时直接换回原行，位置基本不动。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.7.1', '2026.11.12 00:26', '2026-11-12T00:26:00+08:00', '保险丝条留白');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.7.1'), 0, '保险丝条四周补上 12px 内边距，与下方消息、列表边缘拉开距离。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.7.1'), 1, '与上下消息的外间距改为 8px / 20px，撤销按钮与文案间距加大到 12px。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.7.0', '2026.11.12 00:17', '2026-11-12T00:17:00+08:00', '删除撤销：保险丝机制');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.7.0'), 0, '新增 `FuseButton`，按 React Bits `micro/fuse-button` 的算法移植，用 Web Animations API 推进 SVG 描边。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.7.0'), 1, '左滑删除不再立即落库：行先变成保险丝条，4 秒窗口内可撤销，烧完才调用删除接口。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.7.0'), 2, '悬停暂停、切到后台暂停、Esc 可直接撤销；配色沿用站点令牌。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.6.2', '2026.11.12 00:00', '2026-11-12T00:00:00+08:00', '左滑交界修正');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.2'), 0, '滑动卡片右侧改为直角，与置顶 / 删除操作区竖直对接，消除圆弧缺口。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.2'), 1, '置顶区底色由 24% 米白降到 14%，压暗后不再抢删除块的橙色。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.6.1', '2026.11.11 23:55', '2026-11-11T23:55:00+08:00', '站内信配色与悬停修正');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.1'), 0, 'SwipeRow 颜色改由站点令牌推导，暗色下暖炭底配米白字、橙色删除块，纸色主题自动反相。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.1'), 1, '悬停高亮改为铺满整条卡片，含 16px 圆角与左右内边距。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.6.0', '2026.11.11 23:44', '2026-11-11T23:44:00+08:00', '站内信滑动操作');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.0'), 0, '站内信列表改用 React Bits SwipeRow，圆角行、抽屉操作块、橡皮阻尼、惯性投影与弹簧回弹按官方实现还原。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.0'), 1, '左滑露出「置顶 / 删除」，全滑超过 60% 触发删除块折叠收起。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.0'), 2, '正文超过两行折叠，点击整行展开、再次点击收回。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.6.0'), 3, '修复点击消息后仍显示未读，行内点击不再被改派到整行容器。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.5.1', '2026.11.11 23:14', '2026-11-11T23:14:00+08:00', '站内信连点修复');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.5.1'), 0, '抽屉滑入 / 滑出动画期间加锁，连续点击铃铛不再让关闭打断展开。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.5.0', '2026.11.11 00:10 – 00:41', '2026-11-11T00:10:00+08:00', '交互完善与数据层改造');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.5.0'), 0, '退出登录增加悬浮提示与二次确认弹窗，并将弹窗层级降到自定义光标之下。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.5.0'), 1, '放大站内信字号、加宽面板，新增左滑删除与列表逐条入场动画。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.5.0'), 2, '限制每位用户每天最多提交 3 条反馈，页脚同步提示。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.5.0'), 3, '全站实体主键与接口 ID 由自增数字改为 UUID，数据库在保留数据的前提下完成迁移。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.4.0', '2026.11.10 23:19 – 11.11 00:00', '2026-11-10T23:19:00+08:00', '登录体验打磨');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.4.0'), 0, '修正获取验证码按钮位置，让验证码格铺满整行，改为块状按钮并新增人机验证通过态。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.4.0'), 1, '验证码输满自动校验，修复倒计时宽度抖动。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.3.0', '2026.11.10 22:24 – 23:11', '2026-11-10T22:24:00+08:00', '完整账号体系');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.3.0'), 0, '接入 163 邮件验证码与图片人机验证，新增登录 / 注册 / 找回密码页。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.3.0'), 1, '重做登录页切换动画与密码强度校验，支持用户名或邮箱登录。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.3.0'), 2, '增强图片验证码的抗识别能力，邮件徽标改用站点 logo 内嵌展示。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.2.0', '2026.11.10 21:26 – 22:10', '2026-11-10T21:26:00+08:00', '菜单、导航与账号基础');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.2.0'), 0, '限制个人卡片高度并收紧矮屏行距，修复全屏菜单溢出滚动。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.2.0'), 1, '导航栏新增登录入口并调整到消息入口右侧，后端日志按日期归档。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.2.0'), 2, '邮箱验证码注册与登录 IP 绑定；打开菜单时正确高亮当前页并防止重复点击。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.1.0', '2026.11.10 20:50 – 21:20', '2026-11-10T20:50:00+08:00', '后端与站内信上线');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.1.0'), 0, '新增站内通知、反馈与账号后端接口（Spring Boot）。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.1.0'), 1, '支持管理员发布全站公告与私信，增加文件日志与接口访问日志。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.1.0'), 2, '导航栏新增站内信入口，页脚改为用户反馈入口。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v2.0.0', '2026.11.10 19:13 – 20:06', '2026-11-10T19:13:00+08:00', '仓库清理与 3D 隧道修正');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.0.0'), 0, '删除未使用的自定义 SplitText 组件，`.trae` 目录移出版本控制。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v2.0.0'), 1, '移除长按拖动控制隧道快速前进的交互，远处过小的照片不再可点。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.8.0', '2026.11.02 00:10 – 00:36', '2026-11-02T00:10:00+08:00', '曲库与自动播放');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.8.0'), 0, '新增三首曲目并接入封面。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.8.0'), 1, '自动播放被拦截时用静音 / 本地时钟推进，点击即出声。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.7.0', '2026.11.01 17:19 – 23:58', '2026-11-01T17:19:00+08:00', '黑胶播放器');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.7.0'), 0, '首屏左下角新增可拖拽黑胶播放器，替换「Scroll to explore」提示。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.7.0'), 1, '增加进度条、喇叭音量控制与自动播放，修复展开态拖拽与展开动效。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.7.0'), 2, '曲目扩充到十首并按 A / B 面编排，接入真实音频，唱片内圈显示当前歌曲封面。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.6.0', '2026.11.01 16:07 – 16:51', '2026-11-01T16:07:00+08:00', '章节叙事与路由转场');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.6.0'), 0, '全站接入三幕章节叙事、可交互章节脊柱与「下一章」翻页。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.6.0'), 1, '修复路由转场大字卡顿，幕布改由合成线程推进；修复转场大字初始位置外露。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.5.0', '2026.11.01 00:21 – 03:35', '2026-11-01T00:21:00+08:00', '动效集中上线');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.5.0'), 0, '首屏标题先后接入 TextType 打字机与 StrokeText 描边动效，全站接入 GlowCursor 鼠标光迹。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.5.0'), 1, '关于区接入 LogoLoop 技术栈长条，首页背景改用 LetterGlitch 字符故障场。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.5.0'), 2, '性能优化：消除首屏强制布局与逐帧布局读取。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.4.0', '2026.10.31 22:17 – 22:59', '2026-10-31T22:17:00+08:00', '内容重写与响应式修复');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.4.0'), 0, '按真实简历重写站点内容，新增「经历」与「荣誉」章节。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.4.0'), 1, '修复作品筛选、移动端菜单、文章标题在窄屏下的裁切。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.3.0', '2026.10.31 20:40 – 21:44', '2026-10-31T20:40:00+08:00', '样式体系与抖动头像');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.3.0'), 0, '接入 Tailwind v4 与 shadcn，安装 SplitText 与 GSAP skills。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.3.0'), 1, '首页右侧接入 React Bits DitherVeil 抖动之幕，去除背景、放大左移并修复窄屏消失。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.2.0', '2026.10.31 19:42 – 20:11', '2026-10-31T19:42:00+08:00', '技术栈迁移');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.2.0'), 0, '项目由 Vue 重构为 React 19 + Vite + TypeScript，完成全部页面迁移与构建链路切换。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.1.0', '2026.10.31 17:35 – 19:10', '2026-10-31T17:35:00+08:00', '首屏右侧面板试验');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.1.0'), 0, '用 Canvas 交互场替代精选项目面板，并修复刷新自动跳转。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.1.0'), 1, '首屏面板改为 DitherVeil 抖动之幕，随后细化肖像构图与五官；最终清空面板，标题区改为单列布局。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.0.1', '2026.10.31 15:56 – 16:27', '2026-10-31T15:56:00+08:00', '文案与规范修正');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.0.1'), 0, '修复首屏「LU YU」文字裁切与 preloader 中「U」字母右侧被裁切。');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.0.1'), 1, '站点名保留「陆屿」，个人称谓统一改为「我」，补充提交信息需带类型前缀的约定。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v1.0.0', '2026.10.31 15:39', '2026-10-31T15:39:00+08:00', '首个完整版本');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v1.0.0'), 0, '完成「我的个人博客 v1.0」的首版页面与基础样式。');

insert into changelog_entries (id, version, date_label, occurred_at, title) values (gen_random_uuid(), 'v0.1.0', '2026.10.31 15:25', '2026-10-31T15:25:00+08:00', '项目初始化');
insert into changelog_items (entry_id, position, item) values ((select id from changelog_entries where version = 'v0.1.0'), 0, '创建仓库并完成 `Initial commit`，搭建博客基础工程。');

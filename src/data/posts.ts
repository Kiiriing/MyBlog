export const posts = [
  {
    slug: 'idempotent-orders',
    index: '01',
    title: '幂等与库存：订单链路里最容易漏掉的两件事',
    en: 'Idempotent Orders',
    category: '工程',
    project: 'qianverse',
    date: '2026.09.12',
    reading: '9 min',
    excerpt: '重复提交、支付回调重放、并发下单——线上真正会出问题的，往往不是主流程。',
    art: '/art/post-gravity.svg',
    tags: ['NestJS', 'PostgreSQL', '幂等'],
    blocks: [
      {
        type: 'p',
        text: 'QianVerse 的订单模块写完第一版时，我觉得它已经「能用了」：创建订单、扣库存、调支付、回调改状态。真正让我重新设计的，是一次压测——同一笔订单被创建了两次，库存少了一件，支付却只收到一次钱。'
      },
      { type: 'h2', text: '01 / 幂等不是加一个唯一索引就完事' },
      {
        type: 'p',
        text: '唯一索引能挡住重复写入，但挡不住「第二次请求应该返回什么」。如果第二次请求直接报 409，前端会以为下单失败，用户很可能再点一次。'
      },
      {
        type: 'p',
        text: '我的做法是给订单创建和支付回调共用一张幂等记录表：请求方带一个业务键（例如 md5(用户 + 商品 + 客户端下单 id)），写入时先查后插，冲突就返回已存在的订单。这样重放是安全的，返回结果也是同一个。'
      },
      {
        type: 'code',
        language: 'ts',
        text: "await prisma.$transaction(async (tx) => {\n  const record = await tx.idempotency.findUnique({ where: { key } })\n  if (record) return record.orderId\n\n  const order = await tx.order.create({ data })\n  await tx.idempotency.create({ data: { key, orderId: order.id } })\n})\n// 唯一键冲突时捕获 P2002，再读一次幂等表返回原订单"
      },
      {
        type: 'quote',
        text: '幂等的目标不是「拒绝第二次」，而是「第二次也得到同一个答案」。',
        cite: '设计订单链路时写在注释里的一句话'
      },
      { type: 'h2', text: '02 / 库存的锁定、扣减与释放' },
      {
        type: 'p',
        text: '库存不能在下单时就永久扣掉：用户可能十分钟不付款。我把它拆成三个动作——下单锁库存、支付成功扣减、超时或取消释放，三个动作都在事务里，并用库存行的版本号避免并发覆盖。'
      },
      {
        type: 'list',
        items: [
          '锁定与扣减都写在同一张库存流水表里，任何一次数量变化都能回溯到订单。',
          '释放任务由定时任务兜底，但接口也会主动释放，避免用户等十五分钟才看到库存回来。',
          '所有写操作都带 WHERE 条件（可用库存 >= 数量），让数据库替你做最后一道并发判断。'
        ]
      },
      { type: 'h2', text: '03 / 什么时候不需要分布式锁' },
      {
        type: 'p',
        text: '一开始我想上 Redis 分布式锁，后来发现没必要：库存扣减本来就要落在一条 SQL 上，行锁 + 条件更新已经足够；分布式锁反而引入过期时间、续期和锁失效的复杂度。'
      },
      {
        type: 'p',
        text: '现在的判断标准是：如果一致性可以由数据库的一条语句保证，就不要在应用层再包一层锁。锁是用来协调「跨资源」的操作的，不是用来给自己增加安全感的。'
      }
    ]
  },
  {
    slug: 'attendance-anti-cheat',
    index: '02',
    title: '三层反作弊：让签到回到教室',
    en: 'Anti-Cheat in Three Layers',
    category: '工程',
    project: 'attendance',
    date: '2026.07.30',
    reading: '10 min',
    excerpt: '签到系统真正的对手不是用户，而是那些试图替用户完成签到的脚本。',
    art: '/art/post-gaps.svg',
    tags: ['Flask', 'MySQL', '反作弊'],
    blocks: [
      {
        type: 'p',
        text: '做签到系统之前，我以为最难的是「限时」和「统计」。真正上线之后才发现，最花时间的是反作弊：有人把链接发到群里让同学代签，也有人写脚本批量签。'
      },
      { type: 'h2', text: '01 / 第一层：设备维度' },
      {
        type: 'p',
        text: '这一层最朴素，也最有效：一台设备每天只能登录一个学生账号，同一个签到任务只能为一个学生完成。用唯一约束写在数据库里，不依赖前端是否诚实。'
      },
      {
        type: 'p',
        text: '前端禁用在防作弊里几乎没有意义，因为请求可以绕过页面直接发。能写进数据库的规则，才算真的规则。'
      },
      { type: 'h2', text: '02 / 第二层：浏览器指纹' },
      {
        type: 'p',
        text: '前端会采集一批自动化特征：webdriver、headless-gl 是否可用、cdc-keys 之类的注入痕迹、语言与时区是否自相矛盾。它们不能证明「一定是脚本」，但足以把可疑请求标出来。'
      },
      {
        type: 'quote',
        text: '反作弊不是抓人，而是让「代签」这件事变得比自己去教室更麻烦。',
        cite: ''
      },
      { type: 'h2', text: '03 / 第三层：请求行为' },
      {
        type: 'p',
        text: '后端看的是行为：同样的 UA 在几十秒内签到十几个学生、请求头缺失常见字段、来源 IP 与账号历史不符、签到时间精确到毫秒且分布异常。命中任意组合就写入 is_script 标记，而不是直接拒绝。'
      },
      {
        type: 'list',
        items: [
          '标记而不是拦截：老师仍然能看到记录，但可疑记录会红色告警，由人来判断。',
          '日志先脱敏再落库，密码与 token 永远不写进请求日志。',
          '所有 SQL 参数化，时间以服务端为准，改系统时间绕不过迟到判定。'
        ]
      },
      {
        type: 'p',
        text: '三层加起来也不是万无一失。它的价值在于提高成本，并且把「可疑」变成可复核的信息，而不是一个拍脑袋的拦截。'
      }
    ]
  },
  {
    slug: 'data-wall-rules',
    index: '03',
    title: '做完二十块数据大屏，我留下的五条规则',
    en: 'Rules from Twenty Data Walls',
    category: '设计',
    project: 'data-walls',
    date: '2026.05.16',
    reading: '7 min',
    excerpt: '会议室里的屏幕不会滚动，它只有一次机会把最重要的数字说清楚。',
    art: '/art/post-type.svg',
    tags: ['数据可视化', 'ECharts', '交付'],
    blocks: [
      {
        type: 'p',
        text: '工作室的两年里，我前后交付了二十多块数据大屏：教学管理、学生成果、校企合作。它们不像网页，用户不会慢慢探索，领导走进会议室的那十秒，就是全部注意力预算。'
      },
      { type: 'h2', text: '01 / 先定口径，再画图' },
      {
        type: 'p',
        text: '最返工的一次，是同一块屏上「本学期课时」和「累计课时」用了两套统计范围。数字都真实，但它们互相矛盾。后来我坚持先写口径说明：统计范围、时间边界、去重规则，确认之后再写 SQL。'
      },
      {
        type: 'list',
        items: [
          '一块屏只讲一个主题，次要指标收进侧栏或下钻页。',
          '数字类指标放大，趋势类指标留给折线，比例类才用饼图或环形图。',
          '颜色只承担一种含义：橙色表示需要关注，灰蓝色表示背景信息。',
          '所有图表都要能被一句话解释，解释不了就删掉。',
          '每张屏附更新方式与字段说明，否则半年后它就是一块没人敢动的遗产。'
        ]
      },
      { type: 'h2', text: '02 / 大屏会连续亮一整天' },
      {
        type: 'p',
        text: '这和普通页面的假设完全不同。接口要能承受长时间轮询，断网时要保留最后一次快照，字体和图片不能依赖外网。低频指标走分钟级缓存，实时指标单独接口，整页重算是最容易拖垮会议室电脑的做法。'
      },
      { type: 'h2', text: '03 / 交付比完成更重要' },
      {
        type: 'p',
        text: '我后来给每张大屏都留了一页说明：指标口径、数据来源、刷新频率、出了问题找谁。做完一个页面很容易，让别人能继续维护它，才是交付。'
      }
    ]
  },
  {
    slug: 'react-migration',
    index: '04',
    title: '从 Vue 3 到 React 19：一次博客重写的迁移笔记',
    en: 'Migrating a Blog to React',
    category: '随笔',
    project: 'myblog',
    date: '2026.03.08',
    reading: '8 min',
    excerpt: '迁移不是把 v-if 换成三元表达式，而是重新想一遍状态该放在哪里。',
    art: '/art/post-useless.svg',
    tags: ['React', '迁移', '工程'],
    blocks: [
      {
        type: 'p',
        text: '这个博客最早是 Vue 3 写的：<script setup>、Pinia、vue-router，写起来很顺。后来想统一技术栈，决定用 React 19 + TypeScript + Vite 重写一遍。'
      },
      { type: 'h2', text: '01 / 先迁移边界，再迁移组件' },
      {
        type: 'p',
        text: '我没有从页面开始改，而是先把数据与路由边界定清楚：站点信息、作品、手记三份数据是纯数据，直接平移；路由用 react-router 重写；预加载、菜单和滚动状态收进一个很小的外部 store。'
      },
      {
        type: 'p',
        text: '组件层反而最省事。Vue 的 ref 与 React 的 useRef 概念接近，模板里的 v-for 换成 map，v-if 换成条件渲染，真正的差异集中在副作用：watch 要拆成 useEffect，卸载时的清理必须自己写。'
      },
      {
        type: 'code',
        language: 'tsx',
        text: "useEffect(() => {\n  const el = hero.current\n  if (!el) return\n\n  const tween = gsap.to(el, { opacity: 1 })\n  return () => {\n    tween.kill()\n    ScrollTrigger.refresh()\n  }\n}, [])"
      },
      { type: 'h2', text: '02 / 动效比组件更容易出问题' },
      {
        type: 'p',
        text: 'GSAP 的 ScrollTrigger 在组件卸载后如果没 kill，会在下一次路由切换时继续引用已经不存在的 DOM。第一次迁移完，我切到作品页时页面会莫名其妙地停在半空。后来每个动画都用 effect 的清理函数回收，问题才消失。'
      },
      {
        type: 'quote',
        text: '迁移的验收标准不是「看起来一样」，而是「切换十次之后还一样」。',
        cite: ''
      },
      { type: 'h2', text: '03 / 保留那些真正有用的东西' },
      {
        type: 'p',
        text: '重写不是重做设计。原来的网格、纸张色章节、横向作品画廊、抖动头像都被保留下来，只是搬进了 React 的组件结构。技术栈换了，判断没有换：动效为叙事服务，复杂留在系统里。'
      },
      {
        type: 'p',
        text: '现在回看，这次迁移最大的收获不是 React 本身，而是重新读了一遍自己的代码，把那些「当时能跑」的写法换成了「以后也敢改」的写法。'
      }
    ]
  }
]

export const categories = ['全部', '工程', '设计', '随笔']

export type Post = (typeof posts)[number]

export type JournalProject = {
  slug: string
  title: string
  cn: string
  work?: string
  accent: string
  note: string
}

/** 手记按项目归类；work 指向作品页，本站没有独立作品页 */
export const journalProjects: JournalProject[] = [
  {
    slug: 'qianverse',
    title: 'QianVerse',
    cn: '千域',
    work: 'qianverse',
    accent: '#ff5a2f',
    note: '餐饮零售一体化管理系统 · 订单、库存与权限'
  },
  {
    slug: 'attendance',
    title: 'Attendance',
    cn: '签到考勤',
    work: 'attendance',
    accent: '#7a67ff',
    note: '三角色签到系统 · 限时签到与三层反作弊'
  },
  {
    slug: 'data-walls',
    title: 'Data Walls',
    cn: '数据大屏',
    work: 'data-walls',
    accent: '#b9d400',
    note: '20+ 张会议室大屏 · 指标口径与数据接口'
  },
  {
    slug: 'myblog',
    title: 'MyBlog',
    cn: '本站',
    accent: '#1b1a17',
    note: '这个博客本身 · React 19 与 GSAP 的迁移记录'
  }
]

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug)
}

export function getProject(slug: string) {
  return journalProjects.find((project) => project.slug === slug)
}

export function projectOf(post: Post) {
  return getProject(post.project)
}

export function postsByProject(slug: string) {
  return posts.filter((post) => post.project === slug)
}

export function postYear(post: Post) {
  return post.date.slice(0, 4)
}

export function getYears() {
  return [...new Set(posts.map(postYear))].sort((a, b) => b.localeCompare(a))
}

export function postsByYear(year: string) {
  return posts.filter((post) => postYear(post) === year)
}

export function getAllTags() {
  const map = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) map.set(tag, (map.get(tag) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function getPostsByTag(tag: string) {
  return posts.filter((post) => post.tags.includes(tag))
}

/** 相关文章：同项目权重最高，其次是共同标签数 */
export function getRelatedPosts(slug: string, limit = 3) {
  const current = getPost(slug)
  if (!current) return []

  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const shared = post.tags.filter((tag) => current.tags.includes(tag)).length
      const score = shared * 2 + (post.project === current.project ? 3 : 0)
      return { post, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((item) => item.post)
}

export function getAdjacentPost(slug: string) {
  const i = posts.findIndex((post) => post.slug === slug)
  if (i === -1) return { prev: null, next: null }
  return {
    prev: i > 0 ? posts[i - 1] : null,
    next: i < posts.length - 1 ? posts[i + 1] : null
  }
}

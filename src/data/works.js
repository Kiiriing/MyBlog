export const works = [
  {
    slug: 'melt',
    index: '01',
    title: 'Melt',
    cn: '熔',
    category: '3D Commerce / 电商',
    filters: ['commerce'],
    year: '2025',
    client: 'Solstice Studio',
    role: 'Full-stack · WebGL · Payments',
    art: '/art/work-melt.svg',
    accent: '#ff5a2f',
    status: 'Live in production',
    tagline: '把一件香氛，做成可以在浏览器里转动、试色、下单的东西。',
    summary:
      '为独立香氛品牌 Solstice 从零搭建的 3D 电商站：商品模型实时渲染，内容在后台可视化编辑，结账、库存与订单全部打通。',
    intro: [
      'Solstice 原来的店铺建立在模板平台上，商品图、库存和订单分散在三个系统里。我们决定把它重做成一个以 3D 为中心的商店：用户第一次进入，就能直接转动瓶子，看清玻璃厚度和液体颜色。',
      '前端是 Vue 3 + Three.js，模型经过 Draco 压缩后从 8.4 MB 降到 900 KB，并且只在用户第一次拖动时加载细节层。后端是 Node.js + PostgreSQL，商品、变体、库存和订单共用一套 schema；Stripe 负责支付、退款与对账。',
      '上线后移动端首屏 LCP 从 4.6s 降到 1.8s，加入购物车率提升 34%，因「看不清实物」产生的客服咨询减少了近一半。'
    ],
    details: [
      { label: '年份', value: '2025' },
      { label: '客户', value: 'Solstice Studio' },
      { label: '角色', value: 'Full-stack, WebGL, Payments' },
      { label: '团队', value: 'LU YU, M. Chen' }
    ],
    notes: [
      {
        label: '01 / 渲染',
        value: '模型按部件拆分 LOD，首屏只加载 900KB 的压缩网格，高精度细节在交互后补载。'
      },
      {
        label: '02 / 数据',
        value: '商品、SKU、库存与订单共用一套 PostgreSQL schema，库存扣减放在事务里，避免并发超卖。'
      },
      {
        label: '03 / 支付',
        value: 'Stripe Checkout + Webhook 幂等处理，回调重放不会重复创建订单或重复扣款。'
      }
    ],
    gallery: [
      {
        src: '/art/work-melt.svg',
        caption: 'Product configurator — 模型、材质与实时价格同步',
        position: '50% 35%'
      },
      {
        src: '/art/work-melt.svg',
        caption: 'Checkout flow — 库存校验、支付与订单确认',
        position: '60% 65%'
      }
    ],
    stack: ['Vue 3', 'Three.js', 'Node.js', 'PostgreSQL', 'Stripe'],
    links: [
      { label: 'Live site', href: 'https://example.com/melt', hint: 'Demo placeholder' },
      {
        label: 'Request a walkthrough',
        href: 'mailto:hello@luyu.dev?subject=Melt%20walkthrough',
        hint: 'Case study on request'
      }
    ],
    next: 'tidal-memory'
  },
  {
    slug: 'tidal-memory',
    index: '02',
    title: 'Tidal Memory',
    cn: '潮汐记忆',
    category: 'Real-time Data / 实时',
    filters: ['data'],
    year: '2024',
    client: 'Hangzhou Bay Observatory',
    role: 'Front-end · Data Viz · Streaming',
    art: '/art/work-tide.svg',
    accent: '#7a67ff',
    status: 'Shipped — internal platform',
    tagline: '把三十年的潮汐记录，变成一条不会停的实时曲线。',
    summary:
      '为杭州湾观测站搭建的实时数据平台：37 个浮标每 5 秒上报一次，前端以 60fps 绘制十万级数据点，并支持任意时间窗口回放。',
    intro: [
      '观测站原本靠每天早上导出的 Excel 看数据，一次异常潮位往往要几个小时之后才会被发现。Tidal Memory 把这件事变成实时的：37 个浮标通过 MQTT 上报，5 秒内出现在值班大屏和手机上。',
      '真正的难点在渲染。十年历史大约 1.1 亿条记录，直接画会让浏览器卡死。我们用 TimescaleDB 做连续聚合，按缩放级别返回不同精度的序列；前端用 React + D3 计算比例尺，Canvas 双缓冲绘制，把帧率稳定在 55–60fps。',
      '现在值班人员可以在任意时间窗口回放一次风暴潮，也可以把某一段导出成 CSV 交给研究团队，而不必再写一次性的脚本。'
    ],
    details: [
      { label: '年份', value: '2024' },
      { label: '客户', value: 'Hangzhou Bay Observatory' },
      { label: '角色', value: 'Front-end, Data Viz, Streaming' },
      { label: '团队', value: 'LU YU, Z. Wang' }
    ],
    notes: [
      {
        label: '01 / 聚合',
        value: 'TimescaleDB 连续聚合按小时、天、月预计算，缩放时只请求当前精度所需的数据。'
      },
      {
        label: '02 / 流',
        value: 'WebSocket 只推送变化点，历史区间走普通 HTTP 缓存，避免长连接里塞满大对象。'
      },
      {
        label: '03 / 降级',
        value: '页面不可见时暂停订阅；弱网下自动切到 30 秒轮询，并明确标注数据延迟。'
      }
    ],
    gallery: [
      {
        src: '/art/work-tide.svg',
        caption: 'Live dashboard — 37 个浮标的实时潮位与异常标记',
        position: '50% 45%'
      },
      {
        src: '/art/work-tide.svg',
        caption: 'Timeline replay — 一次风暴潮的完整回放',
        position: '35% 70%'
      }
    ],
    stack: ['React', 'TypeScript', 'D3.js', 'WebSocket', 'TimescaleDB'],
    links: [
      {
        label: 'Request a demo',
        href: 'mailto:hello@luyu.dev?subject=Tidal%20Memory%20demo',
        hint: 'Internal product'
      },
      { label: 'Read the build notes', href: '/journal/on-gravity', hint: 'Journal' }
    ],
    next: 'signal-garden'
  },
  {
    slug: 'signal-garden',
    index: '03',
    title: 'Signal Garden',
    cn: '信号花园',
    category: 'Creative Experiment / 实验',
    filters: ['experiment'],
    year: '2026',
    client: 'Open source',
    role: 'Full-stack · WebGL · Audio',
    art: '/art/work-garden.svg',
    accent: '#d8ff43',
    status: 'Open source — maintained',
    tagline: '一个由所有访客共同养大的开源花园。',
    summary:
      '开源的生成式网页实验：访客的停留、移动与点击被匿名聚合后写入 Redis，再由后台定时生长成一株新的植物，所有人都能看见它今天的样子。',
    intro: [
      'Signal Garden 最初只是一个周末的 WebGL 练习，后来长成了一个完整的开源项目：前端 Vue 3 + WebGL 负责生长与渲染，后端 NestJS 负责把匿名的交互信号变成养分。',
      '每 15 分钟，一个 worker 会读取过去一段时间的聚合信号，用 L-system 推进一步生长，把新枝干写入 PostgreSQL。Redis 缓存当天的完整形态，页面打开时只拉取增量，所以它永远在变，又几乎不占带宽。',
      '声音由 Web Audio 实时合成，不使用任何采样文件，整站压缩后不到 400KB。代码、生成规则和数据 schema 全部开源。'
    ],
    details: [
      { label: '年份', value: '2026' },
      { label: '类型', value: 'Self-initiated / Open source' },
      { label: '角色', value: 'Design, Full-stack, Audio' },
      { label: '许可证', value: 'MIT' }
    ],
    notes: [
      {
        label: '01 / 生长',
        value: 'L-system 的规则参数由聚合信号驱动，同一株植物不会在两次访问里完全重复。'
      },
      {
        label: '02 / 隐私',
        value: '只保存按分钟聚合的计数与轨迹分桶，不写入 IP、UA 或任何可回溯到个人的标识。'
      },
      {
        label: '03 / 成本',
        value: '静态形态缓存在 Redis，生长任务跑在单台 1C1G 实例上，每月成本控制在几美元。'
      }
    ],
    gallery: [
      {
        src: '/art/work-garden.svg',
        caption: 'Live garden — 访问第 1,284 天',
        position: '50% 50%'
      },
      {
        src: '/art/work-garden.svg',
        caption: 'Growth pipeline — 信号、聚合与枝干生成',
        position: '40% 40%'
      }
    ],
    stack: ['Vue 3', 'WebGL', 'Web Audio API', 'NestJS', 'Redis', 'PostgreSQL'],
    links: [
      { label: 'Live garden', href: 'https://example.com/signal-garden', hint: 'Demo placeholder' },
      { label: 'Source on GitHub', href: 'https://github.com', hint: 'Open source' }
    ],
    next: 'monochrome-index'
  },
  {
    slug: 'monochrome-index',
    index: '04',
    title: 'Monochrome Index',
    cn: '单体索引',
    category: 'Publishing Platform / 出版',
    filters: ['platform'],
    year: '2023',
    client: 'Riso Press',
    role: 'Full-stack · Search · CMS',
    art: '/art/work-index.svg',
    accent: '#e0431d',
    status: 'Shipped — running since 2023',
    tagline: '一个没有图片的出版平台，只靠网格和文字工作。',
    summary:
      '为独立出版社 Riso Press 重做的内容平台：编辑在后台用结构化字段写作，前台自动生成跨设备的书目、作者页与全文搜索，构建时间从 14 分钟降到 40 秒。',
    intro: [
      'Riso Press 每年出版 12 本小书，原来的网站是手工维护的静态页面，改一次目录要半小时。我们把内容拆成结构化字段：书目、作者、篇章、引文，编辑只需要填表，不再碰 HTML。',
      '前台用 Vue 3 + Vite 构建，搜索交给 Meilisearch，支持按作者、年份和正文片段检索。所有页面在发布时预渲染，首屏不依赖 JS 也能读完一整页书目。',
      '数据库使用 PostgreSQL，全文检索字段与展示字段分离，编辑可以随时修订，而已经发布的书目版本仍可追溯。'
    ],
    details: [
      { label: '年份', value: '2023' },
      { label: '客户', value: 'Riso Press' },
      { label: '角色', value: 'Full-stack, Search, CMS' },
      { label: '团队', value: 'LU YU, A. Fischer' }
    ],
    notes: [
      {
        label: '01 / 结构',
        value: '内容按「书目—篇章—引文」三层建模，编辑端的表单由同一份 schema 生成。'
      },
      {
        label: '02 / 搜索',
        value: 'Meilisearch 索引正文与作者，支持中文分词和错字容错，结果高亮在前端完成。'
      },
      {
        label: '03 / 构建',
        value: '增量构建只重新渲染受影响的页面，把一次完整发布从 14 分钟压缩到 40 秒。'
      }
    ],
    gallery: [
      {
        src: '/art/work-index.svg',
        caption: 'Catalogue view — 由结构化字段生成的年度书目',
        position: '50% 40%'
      },
      {
        src: '/art/work-index.svg',
        caption: 'Search — 按作者、年份与正文片段检索',
        position: '65% 70%'
      }
    ],
    stack: ['Vue 3', 'Node.js', 'PostgreSQL', 'Meilisearch', 'Vite'],
    links: [
      { label: 'Live site', href: 'https://example.com/monochrome-index', hint: 'Demo placeholder' },
      {
        label: 'Read the build notes',
        href: '/journal/after-the-scroll',
        hint: 'Journal'
      }
    ],
    next: 'blue-hour'
  },
  {
    slug: 'blue-hour',
    index: '05',
    title: 'Blue Hour',
    cn: '蓝调时刻',
    category: 'Booking Product / 预约',
    filters: ['platform'],
    year: '2025',
    client: 'Blue Hour Cinema',
    role: 'Full-stack · Product · Payments',
    art: '/art/work-bluehour.svg',
    accent: '#ff9a6a',
    status: 'Live in production',
    tagline: '一家独立影院，把排片、选座和退款放在同一个页面里。',
    summary:
      '为杭州一家独立影院做的预约系统：排片、选座、票种、会员价与退款全部在一个流程内完成，前台 Next.js，后台 Prisma + PostgreSQL，支付走 Stripe。',
    intro: [
      '独立影院的排片经常临时调整，原来的售票系统要打电话才能改。Blue Hour 把排片、座位和票价做成可视化编辑，影院经理在手机上就能完成，改完立刻同步到前台。',
      '选座页用 SVG 渲染整个影厅，座位状态通过 SSE 推送。两个人同时点同一个座位时只有一个能成功，并发控制写在 PostgreSQL 的行锁里，而不是靠前端禁用来假装安全。',
      '上线后的第一个月，线上购票占比从 18% 提升到 64%，退款处理时间从两天缩短到十分钟，影院也不再需要为每场活动单独做一张报名表。'
    ],
    details: [
      { label: '年份', value: '2025' },
      { label: '客户', value: 'Blue Hour Cinema' },
      { label: '角色', value: 'Full-stack, Product, Payments' },
      { label: '团队', value: 'LU YU, S. Lin' }
    ],
    notes: [
      {
        label: '01 / 并发',
        value: '选座写入使用 PostgreSQL 行锁与唯一约束，重复请求返回同一订单而不是新建订单。'
      },
      {
        label: '02 / 实时',
        value: 'SSE 只推座位状态变化，断线自动重连，并以最近一次快照恢复现场。'
      },
      {
        label: '03 / 退款',
        value: '退款规则写成可配置策略，Stripe 退款与站内订单状态在同一事务边界内对账。'
      }
    ],
    gallery: [
      {
        src: '/art/work-bluehour.svg',
        caption: 'Seat map — SVG 影厅与实时座位状态',
        position: '50% 50%'
      },
      {
        src: '/art/work-bluehour.svg',
        caption: 'Scheduling — 经理端的排片与票价编辑',
        position: '50% 75%'
      }
    ],
    stack: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Stripe', 'SSE'],
    links: [
      { label: 'Live site', href: 'https://example.com/blue-hour', hint: 'Demo placeholder' },
      {
        label: 'Request a walkthrough',
        href: 'mailto:hello@luyu.dev?subject=Blue%20Hour%20walkthrough',
        hint: 'Case study on request'
      }
    ],
    next: 'melt'
  }
]

export function getWork(slug) {
  return works.find((work) => work.slug === slug)
}

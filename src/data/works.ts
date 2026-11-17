export const works = [
  {
    slug: 'qianverse',
    index: '01',
    title: 'QianVerse',
    cn: '千域',
    category: 'Enterprise System / 企业系统',
    filters: ['enterprise'],
    year: '2025 — 2026',
    client: '合作企业',
    role: '技术负责人 (CTO) · 后端核心开发',
    art: '/art/work-melt.svg',
    accent: '#ff5a2f',
    projectUrl: null,
    status: '已上线 · 持续迭代',
    tagline: '把库存、订单、会员和报表，收进一套可以对外合作的管理系统。',
    summary:
      '企业级餐饮零售一体化管理系统：NestJS 11 + TypeScript + PostgreSQL 14 + Prisma 7 + Redis，覆盖认证、组织权限、商品库存、订单支付、营销会员、数据报表与 AI 助手十余个模块。',
    intro: [
      'QianVerse 是合作企业的餐饮零售一体化管理系统：认证与用户、组织与权限、商品与库存、订单与支付、营销与会员、报表与 AI 助手，十余个业务模块跑在同一套 NestJS 服务里。',
      '我负责技术选型与架构：NestJS 11 + TypeScript + PostgreSQL 14 + Prisma 7 + Redis，JWT + Passport 鉴权、RBAC 守卫、多组织数据隔离。订单链路用数据库幂等表配合事务内的库存「锁定 — 扣减 / 释放」，解决重复提交与超卖导致的库存不一致。',
      '工程化上，Swagger 输出 OpenAPI，Docker + docker-compose 统一开发与部署，Artillery 压测脚本进入仓库；这套约定让后来的同学可以在一天内跑通本地环境。'
    ],
    details: [
      { label: '时间', value: '2025.10 — 至今' },
      { label: '身份', value: '技术负责人（CTO）' },
      { label: '规模', value: '十余个业务模块 · 多组织' },
      { label: '协作', value: '合作企业项目组' }
    ],
    notes: [
      {
        label: '01 / 幂等',
        value: '订单创建与支付回调共用一张幂等记录表，唯一键冲突时直接返回原订单，重放不会重复扣款。'
      },
      {
        label: '02 / 权限',
        value: 'RBAC 守卫按组织与角色求交集，接口级最小权限；组织之间的数据在 service 层强制带 tenant 条件。'
      },
      {
        label: '03 / 性能',
        value: '权限树与热点字典放 Redis（cache-manager），列表接口只取需要的字段，用复合索引覆盖高频查询。'
      }
    ],
    gallery: [
      {
        src: '/art/work-melt.svg',
        caption: 'Order & payment — 幂等、库存锁定与支付回调',
        position: '50% 35%'
      },
      {
        src: '/art/work-melt.svg',
        caption: 'Organization & RBAC — 多组织、多身份与接口级权限',
        position: '60% 65%'
      }
    ],
    stack: ['NestJS 11', 'TypeScript', 'PostgreSQL 14', 'Prisma 7', 'Redis', 'Docker'],
    links: [
      { label: 'More on GitHub', href: 'https://github.com/Kiiriing/', hint: '代码与其它项目' },
      {
        label: 'Ask for a walkthrough',
        href: 'mailto:liukiiriing@gmail.com?subject=QianVerse%20walkthrough',
        hint: '案例细节可邮件沟通'
      }
    ],
    next: 'attendance'
  },
  {
    slug: 'attendance',
    index: '02',
    title: 'Attendance',
    cn: '签到考勤',
    category: 'Full-stack / 全栈',
    filters: ['fullstack'],
    year: '2026',
    client: '独立开发',
    role: 'Full-stack · Flask · MySQL',
    art: '/art/mywork/attendance-cover.webp',
    accent: '#7a67ff',
    projectUrl: 'https://github.com/Kiiriing/Student-Sign-in-System',
    status: '已交付 · 校内使用',
    tagline: '把「老师点名」变成一条可追溯、可统计的签到链路。',
    summary:
      'Vue 3 + Flask 的前后端分离考勤系统：管理员 / 教师 / 学生三角色工作台，限时签到、名册核对与补录、ECharts 统计报表，以及三层反作弊。',
    intro: [
      '签到系统从一句需求开始：老师发起签到，学生在限定时间内完成，迟到与旷课自动判定，期末能直接导出统计。前端 Vue 3 + TypeScript + Vite，后端 Flask + MySQL 8，三角色各有一套工作台。',
      '后端用 Flask 蓝图按角色拆分接口，flask-jwt-extended 签发 7 天 JWT 并按角色校验；PyMySQL 自建连接池（空闲连接上限 10、物理连接上限 50、获取超时 10s），避免班级集中签到把数据库连接打满。',
      '反作弊做了三层：设备维度唯一约束、浏览器指纹（webdriver、headless-gl、cdc-keys 等自动化特征），以及后端对 UA、请求头完整性与短时高频请求的检测；命中后写入 is_script 标记并在前端红色告警。'
    ],
    details: [
      { label: '时间', value: '2026.09' },
      { label: '类型', value: '全栈独立开发' },
      { label: '规模', value: '三角色 · 8 张业务表' },
      { label: '安全', value: 'JWT · scrypt · 参数化查询' }
    ],
    notes: [
      {
        label: '01 / 数据',
        value: '统一 UUID 主键，task_id + student_id、task_id + device_id、class_id + course_date 三组复合索引覆盖高频查询。'
      },
      {
        label: '02 / 规则',
        value: '迟到 10 分钟宽限与旷课自动判定写在服务层，时间一律以服务端为准，改系统时间绕不过去。'
      },
      {
        label: '03 / 可观测',
        value: '全局日志中间件记录 IP、耗时、身份与请求体并自动脱敏密码字段，出问题能直接定位到某一次请求。'
      }
    ],
    gallery: [
      {
        src: '/art/mywork/attendance-login.webp',
        caption: 'Login — 统一入口与三角色身份',
        fit: 'contain'
      },
      {
        src: '/art/mywork/attendance-accounts.webp',
        caption: 'Accounts — 教师、学生与行政班账户管理',
        fit: 'contain'
      },
      {
        src: '/art/mywork/attendance-course.webp',
        caption: 'Courses — 按日期分组的课程与限时签到弹窗',
        fit: 'contain'
      },
      {
        src: '/art/mywork/attendance-tasks.webp',
        caption: 'Tasks — 签到进度、状态与一键结束',
        fit: 'contain'
      },
      {
        src: '/art/mywork/attendance-roster.webp',
        caption: 'Roster — 正常 / 迟到 / 旷课统计与手动改签',
        fit: 'contain'
      },
      {
        src: '/art/mywork/attendance-rollcall.webp',
        caption: 'Roll call — 语音识别姓名并批量标记',
        fit: 'contain'
      },
      {
        src: '/art/mywork/attendance-student.webp',
        caption: 'Student — 今日课程与个人签到记录',
        fit: 'contain'
      },
      {
        src: '/art/mywork/attendance-changelog.webp',
        caption: 'Changelog — 更新日志与版本追溯',
        fit: 'contain'
      }
    ],
    stack: ['Vue 3', 'TypeScript', 'Vite', 'Flask', 'MySQL 8', 'JWT'],
    links: [
      {
        label: 'Ask about anti-cheat',
        href: 'mailto:liukiiriing@gmail.com?subject=Attendance%20anti-cheat',
        hint: '三层防护的实现细节'
      }
    ],
    next: 'lingxi-smt'
  },
  {
    slug: 'lingxi-smt',
    index: '03',
    title: 'LingXi SMT',
    cn: '生产应用系统',
    category: 'Enterprise System / 企业系统',
    filters: ['enterprise'],
    year: '2025',
    client: '灵犀工控 · 校企实训',
    role: '前端 · 3D 与图表集成',
    art: '/art/mywork/smt-cover.webp',
    accent: '#4d9dff',
    projectUrl: null,
    status: '五个功能模块',
    tagline: '把整条 SMT 产线装进浏览器，设备、节拍与质量一屏掌握。',
    summary:
      '面向 SMT 车间的生产应用系统：Three.js 还原贴片产线，ECharts 呈现设备状态、生产节拍与质量异常，Vue 驱动整块看板的数据刷新与视图切换。',
    intro: [
      '系统原型来自校企实训：为 SMT 车间做一块能看、能点、能追溯的生产看板，把设备状态、生产节拍和批次信息从 Excel 与口头汇报里收进同一个页面。',
      '首屏用 Three.js 按工位顺序还原 SPI、印刷机、贴片机、回流炉与 AOI，点击设备即可进入详情；ECharts 负责环境温湿度、节拍曲线与日产量趋势，Vue 管理视图切换和定时轮询。',
      '最花时间的是对齐口径：设备状态、节拍、直通率这些指标先和车间确认定义，再决定各自的刷新频率。接口不可用时页面保留静态骨架与示例批次，演示不会整屏空白。'
    ],
    details: [
      { label: '时间', value: '2025.03 — 2025.06' },
      { label: '类型', value: '校企实训 · 小组项目' },
      { label: '模块', value: '总览 / 设备 / 报表 / 质量' },
      { label: '角色', value: '前端 · 3D 与图表集成' }
    ],
    notes: [
      {
        label: '01 / 产线',
        value: '3D 场景按真实工位顺序摆放设备，模型与看板共用同一套设备编码，点哪台设备就过滤哪台的数据。'
      },
      {
        label: '02 / 指标',
        value: '设备状态时长、生产节拍、直通率与日产量各自独立接口，低频指标降频轮询，避免整页反复重绘。'
      },
      {
        label: '03 / 降级',
        value: '接口异常时保留最后一次快照并给出占位，会议室演示不会因为断网变成一片空白。'
      }
    ],
    gallery: [
      {
        src: '/art/mywork/smt-overview.webp',
        caption: 'Overview — 产线总览与实时设备状态',
        fit: 'contain'
      },
      {
        src: '/art/mywork/smt-machine.webp',
        caption: 'Machine — 贴片机详情、节拍与日产量趋势',
        fit: 'contain'
      }
    ],
    stack: ['Vue', 'ECharts', 'Three.js', 'Bootstrap', 'Python', 'MySQL'],
    links: [
      {
        label: 'Ask about the dashboard',
        href: 'mailto:liukiiriing@gmail.com?subject=LingXi%20SMT',
        hint: '3D 产线与指标口径'
      }
    ],
    next: 'data-walls'
  },
  {
    slug: 'data-walls',
    index: '04',
    title: 'Data Walls',
    cn: '数据大屏',
    category: 'Data Visualization / 数据',
    filters: ['data'],
    year: '2024 — 2025',
    client: '校内工作室 · 联想集团',
    role: '后端 · 数据接口与清洗',
    art: '/art/mywork/data-walls-cover.webp',
    accent: '#d8ff43',
    projectUrl: null,
    status: '20+ 张已交付',
    tagline: '二十多块大屏，把教学、成果与校企合作的数据摆到墙上。',
    summary:
      '在校内工作室承接各院系与联想集团的数据可视化需求，负责数据清洗、指标口径与后端接口，累计交付 20 余张数据大屏。',
    intro: [
      '在学校的校内工作室，我承接各院系与联想集团的数据可视化需求：教学管理、学生成果、校企合作，一共交付了 20 余张大屏。',
      '我的位置在后端：把散落在 Excel、教务系统和业务库里的数据清洗成统一指标，按大屏的刷新频率提供接口；前端同学只需要按约定字段接入，联调时间从几天缩短到半天。',
      '大屏和普通网页不一样，它要在会议室里连续亮一整天。所以接口做了缓存与降级：低频指标走分钟级缓存，断网时保留最后一次快照，数字不会突然变空。'
    ],
    details: [
      { label: '时间', value: '2024.09 — 2025.06' },
      { label: '身份', value: '工作室后端技术人员' },
      { label: '交付', value: '20 余张数据大屏' },
      { label: '协作', value: '院系 · 联想集团' }
    ],
    notes: [
      {
        label: '01 / 口径',
        value: '先统一指标口径再写 SQL，避免同一块屏上两个数字互相矛盾，也方便后续换口径时只改一处。'
      },
      {
        label: '02 / 缓存',
        value: '刷新频率低的指标走 5–15 分钟缓存，实时指标单独接口，避免整页重算拖慢会议室里的机器。'
      },
      {
        label: '03 / 交付',
        value: '每张屏都附字段说明和更新方式，交接给下一届同学也能自己维护，而不是只留下一个能跑的页面。'
      }
    ],
    gallery: [
      {
        src: '/art/mywork/data-walls-dashboard.webp',
        caption: 'Smart Retail Cockpit — 门店客群与实时客流大屏',
        fit: 'contain',
        wide: true
      }
    ],
    stack: ['Python', 'Flask', 'MySQL', 'Redis', 'ECharts'],
    links: [
      { label: 'More on GitHub', href: 'https://github.com/Kiiriing/', hint: '代码与其它项目' },
      {
        label: 'Request a walkthrough',
        href: 'mailto:liukiiriing@gmail.com?subject=Data%20walls',
        hint: '大屏与接口设计'
      }
    ],
    next: 'campus-lab'
  },
  {
    slug: 'campus-lab',
    index: '05',
    title: 'Campus Lab',
    cn: '校企实验室',
    category: 'Collaboration / 协作',
    filters: ['collab'],
    year: '2024 — 2025',
    client: '校企合作项目',
    role: '接口设计 · 前后端联调',
    art: '/art/mywork/campus-cover.webp',
    accent: '#ff9a6a',
    projectUrl: null,
    status: '多个项目已交付',
    tagline: '响应式官网、AI 互动教学平台——小组作战的两次练习。',
    summary:
      '参与校企合作项目：响应式学校官网、昌平区 AI 互动教学平台，负责需求拆解、任务分工、接口设计与前后端联调。',
    intro: [
      '校企合作的几个项目都是小组作战：响应式学校官网、昌平区 AI 互动教学平台。我负责需求拆解、接口设计与前后端联调。',
      '我习惯先把字段和状态图定清楚再写代码：谁能改、什么状态可以流转、失败回滚到哪里。这样前端同学不用猜，联调阶段也更容易判断问题归属。',
      '这些项目让我第一次体会到「交付」的重量：接口文档、数据库设计说明、演示环境，一个都不能少。'
    ],
    details: [
      { label: '时间', value: '2024.05 — 2025.06' },
      { label: '类型', value: '校企合作 · 小组项目' },
      { label: '项目', value: '官网 / AI 教学平台' },
      { label: '角色', value: '接口设计与联调' }
    ],
    notes: [
      {
        label: '01 / 拆解',
        value: '需求先拆成可交付的小块，每块都带验收标准，避免项目尾声才发现方向偏了。'
      },
      {
        label: '02 / 对齐',
        value: '字段定义、状态图与错误码写在同一份文档里，前端不用猜后端返回什么，联调时也能快速定位问题归属。'
      },
      {
        label: '03 / 交付',
        value: '每个项目都补齐接口文档、数据库设计说明与演示环境，让下一届同学可以直接接手。'
      }
    ],
    gallery: [
      {
        src: '/art/mywork/campus-home.webp',
        caption: 'Home — 校历、新闻与 AI 助手入口',
        fit: 'contain'
      },
      {
        src: '/art/mywork/campus-news.webp',
        caption: 'News — 校园新闻流与通知公告',
        fit: 'contain'
      },
      {
        src: '/art/mywork/campus-list.webp',
        caption: 'Category — 新闻、公告、校企合作与联合办学',
        fit: 'contain'
      }
    ],
    stack: ['Vue 3', 'uni-app', 'Flask', 'MySQL', 'Axios'],
    links: [
      { label: 'More on GitHub', href: 'https://github.com/Kiiriing/', hint: '代码与其它项目' },
      {
        label: 'Say hello',
        href: 'mailto:liukiiriing@gmail.com?subject=Hello%20from%20the%20blog',
        hint: '聊聊项目与协作'
      }
    ],
    next: 'qianverse'
  }
]

export function getWork(slug) {
  return works.find((work) => work.slug === slug)
}

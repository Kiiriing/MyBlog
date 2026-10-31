/* 简历内容的单一数据源：关于、经历、荣誉与能力都从这里取 */

export const capabilities = [
  {
    no: '01',
    en: 'Back-end Engineering',
    cn: '后端开发',
    items: ['NestJS 11 / Express', 'JWT + Passport · RBAC', 'Prisma 7 · PostgreSQL 14', 'Flask · Werkzeug']
  },
  {
    no: '02',
    en: 'Front-end Architecture',
    cn: '前端开发',
    items: ['React 19 / Vue 3', 'TypeScript · Vite', 'Pinia · 路由懒加载', 'ECharts · Sass']
  },
  {
    no: '03',
    en: 'Cross-platform Builds',
    cn: '跨端开发',
    items: ['uni-app 多端构建', '微信 / 支付宝 / 抖音', 'uni-ui · vue-i18n', 'pinia 持久化']
  },
  {
    no: '04',
    en: 'Data & Middleware',
    cn: '数据与中间件',
    items: ['PostgreSQL 14 / MySQL 8', '复合索引 · 慢查询优化', 'Redis cache-manager', '版本化 SQL 迁移']
  },
  {
    no: '05',
    en: 'Delivery & Ops',
    cn: '工程化与运维',
    items: ['Docker / docker-compose', 'Git 分支协作', 'Nginx · Linux / SSH', 'Jest · Artillery']
  },
  {
    no: '06',
    en: 'AI & Big Data',
    cn: 'AI 与大数据',
    items: ['Agent 开发 · 大模型接入', '对话 / 报告生成模块', 'Hadoop · Hive · Kafka', 'Spark · Flume · Zookeeper']
  }
]

export const stats = [
  { value: 20, suffix: '+', label: '数据可视化大屏' },
  { value: 10, suffix: '+', label: '业务模块' },
  { value: 8, suffix: '', label: '竞赛与荣誉' },
  { value: 4, suffix: '', label: '技能证书' }
]

export const experience = [
  {
    index: '01',
    period: '2025.10 — 至今',
    year: '2025',
    org: '合作企业项目组',
    role: '技术负责人 / CTO',
    cn: '企业级餐饮零售一体化管理系统',
    summary:
      '主导 QianVerse 的技术选型与架构设计，完成认证、组织权限、商品库存、订单支付等核心模块的边界划分与开发排期，推动项目从课程原型走向可对外合作的产品。',
    bullets: [
      '确定 NestJS + TypeScript + PostgreSQL + Prisma + Redis 的技术方案，统一 JWT + RBAC 鉴权、Swagger 文档与响应结构。',
      '建立代码风格约定与 Git 分支流程，用 Docker + docker-compose 抹平多人开发与部署环境的差异。',
      '参与软件著作权申报：负责系统架构说明、功能清单与接口文档的整理。'
    ],
    stack: ['NestJS 11', 'TypeScript', 'PostgreSQL', 'Prisma 7', 'Redis', 'Docker'],
    highlight: true
  },
  {
    index: '02',
    period: '2024.09 — 2025.06',
    year: '2024',
    org: '校内工作室',
    role: '后端技术人员',
    cn: '数据可视化 · 学生签到考勤系统',
    summary:
      '承接学校各院系与联想集团的数据可视化需求，负责数据接口、数据清洗与后端维护，累计交付 20 余张大屏；同时独立完成学生签到考勤系统的后端设计。',
    bullets: [
      '把教务系统与业务库里的数据清洗成统一指标，按大屏刷新频率提供接口，联调时间从几天压缩到半天。',
      '签到系统完成数据库建模、JWT 鉴权链路、连接池调优与反作弊模块，保障班级集中签到场景下的稳定可用。',
      '每张大屏都附字段说明与更新方式，交接给下一届同学也能自己维护。'
    ],
    stack: ['Python / Flask', 'MySQL 8', 'Redis', 'ECharts', 'JWT']
  },
  {
    index: '03',
    period: '2024.05 — 2025.06',
    year: '2024',
    org: '校企合作项目 · 小组协作',
    role: '接口设计 / 前后端联调',
    cn: '响应式官网 · AI 互动教学平台 · SMT 生产应用',
    summary:
      '多次以小组形式完成校企合作项目，负责需求拆解、任务分工、接口设计与前后端联调，并输出接口文档与数据库设计说明。',
    bullets: [
      '先把字段定义与状态流转对齐，再进入编码，减少联调阶段「问题归属」的争论。',
      '为每个项目补齐接口文档、数据库设计说明与演示环境，保证交付物可以被别人接手。',
      '多次代表小组参加市级技能竞赛并获奖。'
    ],
    stack: ['Vue 3', 'uni-app', 'Flask', 'MySQL', 'Axios']
  }
]

export const awards = [
  {
    date: '2025.04',
    title: '国际大学生创新大赛（北京赛区）学校选拔赛',
    level: '一等奖'
  },
  {
    date: '2025.06',
    title: '第三届全国技能大赛 · 北京市移动应用开发赛项',
    level: '二等奖'
  },
  {
    date: '2024.07',
    title: '北京市职业院校学生技能比赛(大数据技术服务赛项)',
    level: '二等奖'
  },
  {
    date: '2024.07',
    title: '北京市职业院校学生技能比赛 · 大数据技术服务赛项',
    level: '二等奖'
  },
  {
    date: '2024.05',
    title: '全国中小学信息技术创新与实践大赛 · AI 创新编程',
    level: '完赛证书'
  },
  {
    date: '2024.04',
    title: '第四届全国青科赛北京市区域赛 · ICode 未来编程',
    level: '二等奖'
  },
  {
    date: '2024.12',
    title: '「被评选为学习标兵」',
    level: '荣誉称号'
  },
]

export const certificates = [
  {
    date: '2025.01',
    title: '管理系统 v1.0 · 计算机软件著作权',
    issuer: '中华人民共和国国家版权局'
  },
  {
    date: '2025.02',
    title: '电子商务分析师（四级）',
    issuer: '技能等级证书'
  },
  {
    date: '2024.01',
    title: '数据采集 1+X 技能等级证书（初级）',
    issuer: '1+X 职业技能等级'
  },
  {
    date: '2024.01',
    title: 'CEAC 大数据分析师',
    issuer: 'CEAC 信息化培训认证'
  }
]

export const service = {
  hours: 20,
  note: '学习雷锋活动月、礼仪站岗等志愿活动，累计志愿服务时长超过 20 小时。'
}

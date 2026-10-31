/* 技术栈的单一数据源：关于页的 LogoLoop 长条从这里取，
   覆盖能力矩阵、实践经历与本站的技术选型，新增一项只需在这里追加。 */

export type TechItem = {
  name: string
  group: 'Backend' | 'Frontend' | 'Interaction' | 'Cross-platform' | 'Infra' | 'Data' | 'AI'
}

export const techStack: TechItem[] = [
  { name: 'NestJS 11', group: 'Backend' },
  { name: 'TypeScript', group: 'Backend' },
  { name: 'Express', group: 'Backend' },
  { name: 'Node.js', group: 'Backend' },
  { name: 'Prisma 7', group: 'Backend' },
  { name: 'PostgreSQL 14', group: 'Backend' },
  { name: 'MySQL 8', group: 'Backend' },
  { name: 'Redis', group: 'Backend' },
  { name: 'Flask', group: 'Backend' },
  { name: 'Python', group: 'Backend' },
  { name: 'JWT / Passport', group: 'Backend' },
  { name: 'RBAC', group: 'Backend' },
  { name: 'Swagger', group: 'Backend' },
  { name: 'Werkzeug', group: 'Backend' },

  { name: 'React 19', group: 'Frontend' },
  { name: 'Vue 3', group: 'Frontend' },
  { name: 'Vite 8', group: 'Frontend' },
  { name: 'React Router 7', group: 'Frontend' },
  { name: 'Pinia', group: 'Frontend' },
  { name: 'Tailwind CSS 4', group: 'Frontend' },
  { name: 'Sass', group: 'Frontend' },
  { name: 'ECharts', group: 'Frontend' },
  { name: 'Axios', group: 'Frontend' },
  { name: 'vue-i18n', group: 'Frontend' },

  { name: 'GSAP 3', group: 'Interaction' },
  { name: 'ScrollTrigger', group: 'Interaction' },
  { name: 'Lenis', group: 'Interaction' },
  { name: 'WebGL 2', group: 'Interaction' },
  { name: 'ogl', group: 'Interaction' },
  { name: 'React Bits', group: 'Interaction' },

  { name: 'uni-app', group: 'Cross-platform' },
  { name: 'uni-ui', group: 'Cross-platform' },
  { name: 'WeChat Mini Program', group: 'Cross-platform' },
  { name: 'Alipay Mini Program', group: 'Cross-platform' },
  { name: 'Douyin Mini Program', group: 'Cross-platform' },

  { name: 'Docker', group: 'Infra' },
  { name: 'docker-compose', group: 'Infra' },
  { name: 'Nginx', group: 'Infra' },
  { name: 'Linux', group: 'Infra' },
  { name: 'SSH', group: 'Infra' },
  { name: 'Git', group: 'Infra' },
  { name: 'Jest', group: 'Infra' },
  { name: 'Artillery', group: 'Infra' },

  { name: 'Hadoop', group: 'Data' },
  { name: 'Hive', group: 'Data' },
  { name: 'Kafka', group: 'Data' },
  { name: 'Spark', group: 'Data' },
  { name: 'Flume', group: 'Data' },
  { name: 'Zookeeper', group: 'Data' },

  { name: 'Agent 开发', group: 'AI' },
  { name: '大模型接入', group: 'AI' }
]

export const techGroups: Record<TechItem['group'], string> = {
  Backend: '服务端',
  Frontend: '前端',
  Interaction: '交互动效',
  'Cross-platform': '跨端',
  Infra: '工程化',
  Data: '大数据',
  AI: 'AI'
}

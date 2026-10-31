export const site = {
  name: 'LU YU',
  cn: '陆屿',
  role: 'Full-stack Web Developer',
  email: 'hello@luyu.dev',
  location: 'Hangzhou, China',
  coords: '30.2741° N / 120.1551° E',
  availability: 'Available for full-stack work — 2026',
  intro: '把复杂系统，做成有手感的网页。',
  stack: ['Vue 3', 'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Three.js'],
  socials: [
    { label: 'GitHub', handle: '@luyu-dev', href: 'https://github.com' },
    { label: 'LinkedIn', handle: '/in/luyu-dev', href: 'https://www.linkedin.com' },
    { label: '掘金', handle: '@陆屿', href: 'https://juejin.cn' },
    { label: 'X', handle: '@luyu_dev', href: 'https://x.com' }
  ]
}

export const menuItems = [
  {
    index: '00',
    en: 'Index',
    cn: '首页',
    type: 'route',
    to: '/',
    note: 'Back to the beginning',
    art: '/art/post-gaps.svg'
  },
  {
    index: '01',
    en: 'Work',
    cn: '作品',
    type: 'route',
    to: '/work',
    note: 'Full-stack products, 2023—2026',
    art: '/art/work-melt.svg'
  },
  {
    index: '02',
    en: 'Journal',
    cn: '手记',
    type: 'route',
    to: '/journal',
    note: 'Notes on engineering & craft',
    art: '/art/post-gravity.svg'
  },
  {
    index: '03',
    en: 'About',
    cn: '关于',
    type: 'section',
    target: 'about',
    note: 'Full-stack, from interface to infrastructure',
    art: '/art/portrait.svg'
  },
  {
    index: '04',
    en: 'Contact',
    cn: '联系',
    type: 'section',
    target: 'contact',
    note: 'Start a project, or say hello',
    art: '/art/work-bluehour.svg'
  }
]

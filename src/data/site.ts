export const site = {
  name: 'LU YU',
  cn: '陆屿',
  role: 'Full-stack Web Developer',
  email: 'liukiiriing@gmail.com',
  location: 'Beijing, China',
  coords: '39.9042° N / 116.4074° E',
  availability: 'Open for internships & full-stack roles — 2026',
  intro: '把复杂系统，做成有手感的网页。',
  stack: ['NestJS 11', 'TypeScript', 'Vue 3 / React 19', 'PostgreSQL', 'Redis', 'Docker'],
  socials: [
    { label: 'GitHub', handle: '@Kiiriing', href: 'https://github.com/Kiiriing/' },
    { label: 'Email', handle: 'liukiiriing@gmail.com', href: 'mailto:liukiiriing@gmail.com' }
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
    note: 'Enterprise systems, attendance & data walls',
    art: '/art/work-melt.svg'
  },
  {
    index: '02',
    en: 'Journal',
    cn: '手记',
    type: 'route',
    to: '/journal',
    note: 'Build notes from real projects',
    art: '/art/post-gravity.svg'
  },
  {
    index: '03',
    en: 'About',
    cn: '关于',
    type: 'section',
    target: 'about',
    note: 'NestJS, Vue, Flask & PostgreSQL',
    art: '/art/portrait.svg'
  },
  {
    index: '04',
    en: 'Experience',
    cn: '经历',
    type: 'section',
    target: 'experience',
    note: 'Campus studio, enterprise systems & delivery',
    art: '/art/work-tide.svg'
  },
  {
    index: '05',
    en: 'Credentials',
    cn: '荣誉',
    type: 'section',
    target: 'credentials',
    note: 'Awards, certificates & 20+ volunteer hours',
    art: '/art/work-garden.svg'
  },
  {
    index: '06',
    en: 'Contact',
    cn: '联系',
    type: 'section',
    target: 'contact',
    note: 'Open for internships & full-stack roles',
    art: '/art/work-bluehour.svg'
  }
]

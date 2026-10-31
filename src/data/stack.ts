/* 技术栈的单一数据源：关于页 LogoLoop 从这里取图标。
   icon 指向 public/art/logo 下的素材；新增一项只需把图标放进该目录，再在这里追加一行。
   排序按「语言 → 前端框架 → 运行时 → 数据库 → 构建与工具 → 部署与系统 → 编辑器」的栈层次。 */

export type TechGroup =
  | '语言'
  | '前端框架'
  | '运行时'
  | '数据库'
  | '构建与工具'
  | '部署与系统'
  | '编辑器'

export type TechItem = {
  name: string
  icon: string
  group: TechGroup
}

export const techStack: TechItem[] = [
  /* 语言 ---------------------------------------------------------------- */
  { name: 'HTML5', icon: '/art/logo/html5.png', group: '语言' },
  { name: 'CSS3', icon: '/art/logo/css3.png', group: '语言' },
  { name: 'JavaScript', icon: '/art/logo/javascript.png', group: '语言' },
  { name: 'TypeScript', icon: '/art/logo/typescript.png', group: '语言' },
  { name: 'Java', icon: '/art/logo/java.png', group: '语言' },
  { name: 'Python', icon: '/art/logo/python.png', group: '语言' },
  { name: 'Markdown', icon: '/art/logo/markdown.png', group: '语言' },

  /* 前端框架 -------------------------------------------------------------- */
  { name: 'Vue.js', icon: '/art/logo/vue.png', group: '前端框架' },
  { name: 'Next.js', icon: '/art/logo/nextjs.png', group: '前端框架' },
  { name: 'Bootstrap', icon: '/art/logo/bootstrap.png', group: '前端框架' },
  { name: 'Sass', icon: '/art/logo/sass.png', group: '前端框架' },

  /* 运行时 ---------------------------------------------------------------- */
  { name: 'Node.js', icon: '/art/logo/nodejs.png', group: '运行时' },

  /* 数据库 ---------------------------------------------------------------- */
  { name: 'PostgreSQL', icon: '/art/logo/postgresql.png', group: '数据库' },
  { name: 'MySQL', icon: '/art/logo/mysql.png', group: '数据库' },

  /* 构建与工具 ------------------------------------------------------------ */
  { name: 'Vite', icon: '/art/logo/vite.png', group: '构建与工具' },
  { name: 'Git', icon: '/art/logo/git.png', group: '构建与工具' },
  { name: 'GitHub', icon: '/art/logo/github.png', group: '构建与工具' },
  { name: 'Apache Maven', icon: '/art/logo/maven.png', group: '构建与工具' },
  { name: 'Anaconda', icon: '/art/logo/anaconda.png', group: '构建与工具' },
  { name: 'Postman', icon: '/art/logo/postman.png', group: '构建与工具' },

  /* 部署与系统 ------------------------------------------------------------ */
  { name: 'Docker', icon: '/art/logo/docker.png', group: '部署与系统' },
  { name: 'Ubuntu', icon: '/art/logo/ubuntu.png', group: '部署与系统' },

  /* 编辑器 ---------------------------------------------------------------- */
  { name: 'Visual Studio', icon: '/art/logo/visual-studio.png', group: '编辑器' },
  { name: 'IntelliJ IDEA', icon: '/art/logo/intellij-idea.png', group: '编辑器' },
  { name: 'PyCharm', icon: '/art/logo/pycharm.png', group: '编辑器' }
]

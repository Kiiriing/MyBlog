/* 全站叙事骨架：每一页/每一段都是同一条信号线上的一章。
   右侧章节脊柱（ScrollProgress）与子页面章节标签（ChapterTag）共用这份数据，
   保证编号、幕次与文案只有一个来源。 */

export type Chapter = {
  /** 章节编号，与 section 上的 data-section 一致 */
  index: string
  /** 跳转用的 section id */
  id: string
  /** 这一章所在的页面；子页面的「下一章」直接指向它 */
  path: string
  label: string
  cn: string
  /** 幕次：三幕把首页拆成「起点 / 手艺 / 交流」 */
  act: string
  actName: string
  actCn: string
  caption: string
  captionCn: string
}

export const chapters: Chapter[] = [
  {
    index: '01',
    id: 'index',
    path: '/',
    label: 'Index',
    cn: '索引',
    act: 'Act I',
    actName: 'Origin',
    actCn: '起点',
    caption: 'Every system begins with one honest load.',
    captionCn: '一切从一次加载开始。'
  },
  {
    index: '02',
    id: 'manifesto',
    path: '/#manifesto',
    label: 'Manifesto',
    cn: '自述',
    act: 'Act I',
    actName: 'Origin',
    actCn: '起点',
    caption: 'A judgement before the first line of code.',
    captionCn: '先有判断，再写代码。'
  },
  {
    index: '03',
    id: 'about',
    path: '/#about',
    label: 'About',
    cn: '关于',
    act: 'Act I',
    actName: 'Origin',
    actCn: '起点',
    caption: 'The person behind the interface.',
    captionCn: '界面后面的那个人。'
  },
  {
    index: '04',
    id: 'work',
    path: '/work',
    label: 'Work',
    cn: '作品',
    act: 'Act II',
    actName: 'Craft',
    actCn: '手艺',
    caption: 'Four systems, one continuous thread.',
    captionCn: '四个系统，一条链路。'
  },
  {
    index: '05',
    id: 'experience',
    path: '/#experience',
    label: 'Experience',
    cn: '经历',
    act: 'Act II',
    actName: 'Craft',
    actCn: '手艺',
    caption: 'The rooms where the work was shipped.',
    captionCn: '把功能做成能跑的东西。'
  },
  {
    index: '06',
    id: 'credentials',
    path: '/#credentials',
    label: 'Credentials',
    cn: '荣誉',
    act: 'Act II',
    actName: 'Craft',
    actCn: '手艺',
    caption: 'Evidence, not decoration.',
    captionCn: '证据，而不是装饰。'
  },
  {
    index: '07',
    id: 'journal',
    path: '/journal',
    label: 'Journal',
    cn: '手记',
    act: 'Act III',
    actName: 'Notes',
    actCn: '交流',
    caption: 'What survives the deadline becomes a note.',
    captionCn: '交期之后留下来的判断。'
  },
  {
    index: '08',
    id: 'contact',
    path: '/#contact',
    label: 'Contact',
    cn: '联系',
    act: 'Act III',
    actName: 'Notes',
    actCn: '交流',
    caption: 'The door opens again — say hello.',
    captionCn: '门又一次打开。'
  }
]

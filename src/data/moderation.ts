/** 与后端 ModerationService 保持一致的违禁词表 */
export const BANNED_WORDS = [
  '傻逼',
  '煞笔',
  '操你妈',
  '草泥马',
  '贱人',
  '婊子',
  '滚你妈',
  '他妈的',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  '代开发票',
  '博彩',
  '赌博网站',
  '裸聊',
  '办证',
  '刷单',
  '兼职日结'
]

export function findBannedWord(text: string) {
  const lower = text.toLowerCase()
  return BANNED_WORDS.find((word) => lower.includes(word)) ?? null
}

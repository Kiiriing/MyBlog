/** 与后端 ModerationService 保持一致的违禁词表 */
export const BANNED_WORDS = [
  // 中文辱骂
  '傻逼',
  '煞笔',
  '傻b',
  '沙比',
  '操你妈',
  '草泥马',
  '草你妈',
  '叫你妈',
  '去你妈',
  '日你妈',
  '你妈逼',
  '你妈b',
  '你麻痹',
  '你妈的',
  '妈了个逼',
  '妈了个b',
  '妈逼',
  '妈比',
  '贱人',
  '贱货',
  '贱逼',
  '贱b',
  '婊子',
  '骚货',
  '骚逼',
  '骚b',
  '滚你妈',
  '他妈的',
  '特么',
  '尼玛',
  '泥马',
  '卧槽',
  '我操',
  '操蛋',
  '二逼',
  '二b',
  '傻缺',
  '傻叉',
  '脑瘫',
  '杂种',
  '狗杂种',
  '死全家',
  '狗日的',
  '狗东西',
  '狗娘养',
  '废物',
  '垃圾',
  '人渣',
  '败类',
  '混蛋',
  '王八蛋',
  '龟儿子',
  '智障',
  '脑残',
  '弱智',
  '白痴',
  '蠢货',
  '蠢猪',
  '傻狗',
  '疯狗',
  '去死',
  '该死',
  '滚蛋',
  '装逼',
  '逼样',
  // 拼音缩写辱骂
  'cnm',
  'nmsl',
  'tmd',
  'nmb',
  'wcnm',
  // 英文
  'fuck',
  'fucking',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'bastard',
  'idiot',
  'moron',
  'dumbass',
  'retard',
  'whore',
  'slut',
  'cunt',
  'fck',
  'fucker',
  'dickhead',
  'jackass',
  'prick',
  'douche',
  'pussy',
  'stfu',
  // 垃圾信息
  '代开发票',
  '博彩',
  '赌博网站',
  '裸聊',
  '办证',
  '刷单',
  '兼职日结',
  '加微信',
  '加vx',
  '加qq',
  '薇信',
  '约炮',
  '色情网站',
  '成人网站',
  '时时彩',
  '百家乐'
]

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's'
}

/**
 * 归一化：全角转半角、统一小写、常见数字/符号替换，
 * 再去掉空格、标点与零宽字符，避免「废 物」「垃.圾」这类写法绕过。
 */
function normalize(text: string) {
  return [...text.normalize('NFKC').toLowerCase()]
    .map((char) => LEET[char] ?? char)
    .join('')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

export function findBannedWord(text: string) {
  const normalized = normalize(text)
  if (!normalized) return null
  return BANNED_WORDS.find((word) => normalized.includes(normalize(word))) ?? null
}

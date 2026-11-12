package com.luyu.blog.service;

import com.luyu.blog.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
public class ModerationService {

	/** 与前端 src/data/moderation.ts 保持一致 */
	private static final List<String> BANNED_WORDS = List.of(
			// 中文辱骂
			"傻逼", "煞笔", "傻b", "沙比", "操你妈", "草泥马", "草你妈", "叫你妈", "去你妈", "日你妈",
			"你妈逼", "你妈b", "你麻痹", "你妈的", "妈了个逼", "妈了个b", "妈逼", "妈比",
			"贱人", "贱货", "贱逼", "贱b", "婊子", "骚货", "骚逼", "骚b", "滚你妈",
			"他妈的", "特么", "尼玛", "泥马", "卧槽", "我操", "操蛋", "二逼", "二b",
			"傻缺", "傻叉", "脑瘫", "杂种", "狗杂种", "死全家",
			"狗日的", "狗东西", "狗娘养", "废物", "垃圾", "人渣", "败类", "混蛋", "王八蛋",
			"龟儿子", "智障", "脑残", "弱智", "白痴", "蠢货", "蠢猪", "傻狗", "疯狗",
			"去死", "该死", "滚蛋", "装逼", "逼样",
			// 拼音缩写辱骂
			"cnm", "nmsl", "tmd", "nmb", "wcnm",
			// 英文
			"fuck", "fucking", "motherfucker", "shit", "bullshit", "bitch", "asshole",
			"bastard", "idiot", "moron", "dumbass", "retard", "whore", "slut", "cunt", "fck",
			"fucker", "dickhead", "jackass", "prick", "douche", "pussy", "stfu",
			// 垃圾信息
			"代开发票", "博彩", "赌博网站", "裸聊", "办证", "刷单", "兼职日结",
			"加微信", "加vx", "加qq", "薇信", "约炮", "色情网站", "成人网站", "时时彩", "百家乐");

	/** 命中任意违禁词即拒绝；匹配前先做归一化，避免空格、标点、全角或谐音变体绕过 */
	public void validate(String text) {
		String normalized = normalize(text);
		if (normalized.isEmpty()) {
			return;
		}
		for (String word : BANNED_WORDS) {
			if (normalized.contains(normalize(word))) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "内容中包含不合适的词汇，请修改后再提交。");
			}
		}
	}

	/**
	 * 归一化：全角转半角、统一小写、常见数字/符号替换（f*ck、sh1t、ＦＵＣＫ），
	 * 再去掉空格、标点与零宽字符，避免用「废 物」「垃.圾」这种写法绕过。
	 */
	static String normalize(String text) {
		if (text == null || text.isBlank()) {
			return "";
		}
		String lower = Normalizer.normalize(text, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
		StringBuilder sb = new StringBuilder(lower.length());
		for (int i = 0; i < lower.length(); i++) {
			char mapped = deLeet(lower.charAt(i));
			if (Character.isLetterOrDigit(mapped)) {
				sb.append(mapped);
			}
		}
		return sb.toString();
	}

	private static char deLeet(char c) {
		return switch (c) {
			case '0' -> 'o';
			case '1' -> 'i';
			case '3' -> 'e';
			case '4' -> 'a';
			case '5' -> 's';
			case '7' -> 't';
			case '@' -> 'a';
			case '$' -> 's';
			default -> c;
		};
	}
}

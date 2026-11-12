package com.luyu.blog.service;

import com.luyu.blog.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class ModerationService {

	/** 与前端 src/data/moderation.ts 保持一致 */
	private static final List<String> BANNED_WORDS = List.of(
			"傻逼", "煞笔", "操你妈", "草泥马", "贱人", "婊子", "滚你妈", "他妈的",
			"fuck", "shit", "bitch", "asshole",
			"代开发票", "博彩", "赌博网站", "裸聊", "办证", "刷单", "兼职日结");

	public void validate(String text) {
		String lower = text.toLowerCase(Locale.ROOT);
		for (String word : BANNED_WORDS) {
			if (lower.contains(word)) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "内容中包含不合适的词汇，请修改后再提交。");
			}
		}
	}
}

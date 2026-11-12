package com.luyu.blog.web.dto;

import java.util.List;

public final class ChangelogDtos {

	private ChangelogDtos() {
	}

	/**
	 * 更新页的一条版本记录。
	 *
	 * @param version  版本号，前端用作锚点
	 * @param date     展示用时间
	 * @param dateTime 机器可读时间（北京时间）
	 * @param title    标题
	 * @param items    改动条目
	 */
	public record ChangelogEntryDto(
			String version,
			String date,
			String dateTime,
			String title,
			List<String> items) {
	}
}

package com.luyu.blog.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class NotificationDtos {

	private NotificationDtos() {
	}

	public record CreateNotificationRequest(
			@NotBlank(message = "请填写标题")
			@Size(max = 160, message = "标题不能超过 160 个字符")
			String title,

			@NotBlank(message = "请填写正文")
			@Size(max = 4000, message = "正文不能超过 4000 个字符")
			String body,

			@Size(max = 190, message = "链接过长")
			String link,

			/** 留空表示全站公告；填写邮箱则发送私信给该用户 */
			String recipientEmail) {
	}

	public record NotificationDto(
			Long id,
			String category,
			String title,
			String body,
			String link,
			Instant createdAt,
			boolean read,
			boolean pinned,
			String senderName) {
	}

	public record NotificationListDto(List<NotificationDto> items, long unread) {
	}

	public record UnreadDto(long unread) {
	}
}

package com.luyu.blog.web.dto;

import java.time.Instant;
import java.util.List;

public final class NotificationDtos {

	private NotificationDtos() {
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

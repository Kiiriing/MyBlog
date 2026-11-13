package com.luyu.blog.web.dto;

import com.luyu.blog.domain.Feedback;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class FeedbackDtos {

	private FeedbackDtos() {
	}

	public record FeedbackRequest(
			@NotBlank(message = "请先写下你的反馈内容")
			@Size(min = 2, max = 1000, message = "反馈内容需要在 2 到 1000 个字符之间")
			String content) {
	}

	public record FeedbackDto(
			UUID id,
			String content,
			Instant createdAt,
			boolean handled,
			String authorName,
			String authorEmail) {

		public static FeedbackDto from(Feedback feedback) {
			return new FeedbackDto(
					feedback.getId(),
					feedback.getContent(),
					feedback.getCreatedAt(),
					feedback.isHandled(),
					feedback.getUser().getDisplayName(),
					feedback.getUser().getEmail());
		}
	}

	/** 提交结果：remaining 为当天剩余条数，前端据此在额度用完后直接锁定表单 */
	public record FeedbackResult(int remaining, int limit) {
	}
}

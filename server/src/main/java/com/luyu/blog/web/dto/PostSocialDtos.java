package com.luyu.blog.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PostSocialDtos {

	private PostSocialDtos() {
	}

	public record CommentRequest(
			@NotBlank(message = "评论不能为空")
			@Size(min = 1, max = 800, message = "评论需要在 1 到 800 个字符之间")
			String content,

			/** 回复某条评论时传入；回复的回复会统一挂到顶层评论下 */
			UUID parentId) {
	}

	public record CommentDto(
			UUID id,
			String content,
			Instant createdAt,
			String authorName,
			UUID authorId,
			boolean mine,
			boolean deleted,
			List<CommentDto> replies) {
	}

	public record CommentListDto(List<CommentDto> items, long total) {
	}

	public record PostStatsDto(
			String slug,
			long views,
			long likes,
			long favorites,
			boolean liked,
			boolean favorited) {
	}

	public record ReactionDto(boolean active, long count) {
	}
}

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
			long likeCount,
			boolean likedByMe,
			/** 楼中楼引用回复时，被回复人的昵称与评论摘要 */
			String replyToName,
			String replyToExcerpt,
			/** 楼中楼回复总数；replies 只带前几条预览 */
			int replyCount,
			List<CommentDto> replies) {
	}

	public record CommentListDto(List<CommentDto> items, long total, boolean hasMore) {
	}

	/** 楼中楼按需分页加载 */
	public record ReplyListDto(List<CommentDto> items, long total, boolean hasMore) {
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

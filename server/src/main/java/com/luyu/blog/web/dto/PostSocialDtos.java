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

	/**
	 * 一级评论分页结果。
	 *
	 * @param items     当前页的一级评论（各带几条楼中楼预览）
	 * @param total     该文章下所有未删除评论数（含楼中楼），用于顶部计数
	 * @param hasMore   是否还有下一页
	 * @param page      实际返回的页码（带 anchor 时是目标所在页）
	 * @param rootTotal 一级评论总数，前端按它做虚拟滚动
	 */
	public record CommentListDto(List<CommentDto> items, long total, boolean hasMore, int page, long rootTotal) {
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

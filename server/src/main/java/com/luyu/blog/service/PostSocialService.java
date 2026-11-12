package com.luyu.blog.service;

import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.NotificationCategory;
import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.PostComment;
import com.luyu.blog.domain.PostReaction;
import com.luyu.blog.domain.PostStat;
import com.luyu.blog.domain.ReactionKind;
import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.NotificationRepository;
import com.luyu.blog.repo.PostCommentRepository;
import com.luyu.blog.repo.PostReactionRepository;
import com.luyu.blog.repo.PostStatRepository;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.PostSocialDtos.CommentDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentListDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentRequest;
import com.luyu.blog.web.dto.PostSocialDtos.PostStatsDto;
import com.luyu.blog.web.dto.PostSocialDtos.ReactionDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PostSocialService {

	/** 同一用户每小时最多发表的评论数 */
	private static final int MAX_COMMENTS_PER_HOUR = 20;

	private final PostCommentRepository comments;
	private final PostStatRepository stats;
	private final PostReactionRepository reactions;
	private final UserRepository users;
	private final NotificationRepository notifications;
	private final ModerationService moderation;

	public PostSocialService(PostCommentRepository comments, PostStatRepository stats,
			PostReactionRepository reactions, UserRepository users, NotificationRepository notifications,
			ModerationService moderation) {
		this.comments = comments;
		this.stats = stats;
		this.reactions = reactions;
		this.users = users;
		this.notifications = notifications;
		this.moderation = moderation;
	}

	/* 评论 ------------------------------------------------------------------ */

	@Transactional(readOnly = true)
	public CommentListDto listComments(String rawSlug, UserPrincipal principal) {
		String slug = normalizeSlug(rawSlug);
		List<PostComment> all = comments.findByPostSlugOrderByCreatedAtAsc(slug);
		UUID currentId = principal == null ? null : principal.id();

		Map<UUID, List<PostComment>> replies = all.stream()
				.filter(comment -> comment.getParent() != null)
				.collect(Collectors.groupingBy(comment -> comment.getParent().getId()));

		List<CommentDto> items = new ArrayList<>();
		all.stream()
				.filter(comment -> comment.getParent() == null)
				.sorted(Comparator.comparing(PostComment::getCreatedAt).reversed())
				.forEach(comment -> {
					List<PostComment> children = replies.getOrDefault(comment.getId(), List.of()).stream()
							.sorted(Comparator.comparing(PostComment::getCreatedAt))
							.toList();
					items.add(toDto(comment, children, currentId));
				});

		return new CommentListDto(items, all.size());
	}

	public CommentDto addComment(UserPrincipal principal, String rawSlug, CommentRequest request) {
		String slug = normalizeSlug(rawSlug);
		User author = requireUser(principal);

		long recent = comments.countByUser_IdAndCreatedAtGreaterThanEqual(author.getId(),
				Instant.now().minus(1, ChronoUnit.HOURS));
		if (recent >= MAX_COMMENTS_PER_HOUR) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "评论太频繁了，休息一会儿再来吧");
		}

		String content = request.content().trim();
		moderation.validate(content);

		PostComment parent = null;
		if (request.parentId() != null) {
			PostComment target = comments.findById(request.parentId())
					.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "要回复的评论不存在"));
			if (!target.getPostSlug().equals(slug)) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "评论不属于这篇文章");
			}
			parent = target.getParent() == null ? target : target.getParent();
		}

		PostComment saved = comments.save(new PostComment(slug, author, parent, content));
		notifyComment(slug, author, saved, parent);

		return toDto(saved, List.of(), author.getId());
	}

	public void deleteComment(UserPrincipal principal, UUID id) {
		User user = requireUser(principal);
		PostComment comment = comments.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "评论不存在"));
		boolean owner = comment.getUser().getId().equals(user.getId());
		if (!owner && user.getRole() != Role.ADMIN) {
			throw new ApiException(HttpStatus.FORBIDDEN, "只能删除自己的评论");
		}
		comment.markDeleted();
		comments.save(comment);
	}

	private void notifyComment(String slug, User author, PostComment comment, PostComment parent) {
		String link = "/journal/" + slug + "#comments";
		String body = excerpt(comment.getContent());

		if (parent != null) {
			User target = parent.getUser();
			if (!target.getId().equals(author.getId())) {
				notifications.save(new Notification(NotificationCategory.COMMENT, Audience.USER, target, author,
						"有人回复了你的评论", body, link));
			}
			return;
		}

		for (User admin : users.findByRole(Role.ADMIN)) {
			if (admin.getId().equals(author.getId())) {
				continue;
			}
			notifications.save(new Notification(NotificationCategory.COMMENT, Audience.USER, admin, author,
					"来自 " + author.getDisplayName() + " 的评论", body, link));
		}
	}

	/* 阅读量、点赞与收藏 ----------------------------------------------------- */

	@Transactional(readOnly = true)
	public PostStatsDto stats(String rawSlug, UserPrincipal principal) {
		String slug = normalizeSlug(rawSlug);
		PostStat stat = stats.findById(slug).orElse(null);
		Set<ReactionKind> mine = principal == null ? Set.of() : mineFor(slug, principal.id());
		return toDto(slug, stat, mine);
	}

	@Transactional(readOnly = true)
	public List<PostStatsDto> statsFor(List<String> rawSlugs, UserPrincipal principal) {
		List<String> slugs = rawSlugs.stream()
				.filter(slug -> slug != null && !slug.isBlank())
				.map(String::trim)
				.distinct()
				.limit(50)
				.toList();
		if (slugs.isEmpty()) {
			return List.of();
		}

		Map<String, PostStat> statMap = stats.findByPostSlugIn(slugs).stream()
				.collect(Collectors.toMap(PostStat::getPostSlug, stat -> stat));

		Map<String, Set<ReactionKind>> mine = new HashMap<>();
		if (principal != null) {
			reactions.findByUser_IdAndPostSlugIn(principal.id(), slugs).forEach(reaction ->
					mine.computeIfAbsent(reaction.getPostSlug(), key -> EnumSet.noneOf(ReactionKind.class))
							.add(reaction.getKind()));
		}

		return slugs.stream()
				.map(slug -> toDto(slug, statMap.get(slug), mine.getOrDefault(slug, Set.of())))
				.toList();
	}

	public PostStatsDto recordView(String rawSlug) {
		String slug = normalizeSlug(rawSlug);
		PostStat stat = statOf(slug);
		stat.addView();
		return toDto(slug, stats.save(stat), Set.of());
	}

	public ReactionDto toggleReaction(UserPrincipal principal, String rawSlug, ReactionKind kind) {
		String slug = normalizeSlug(rawSlug);
		User user = requireUser(principal);
		PostStat stat = statOf(slug);

		var existing = reactions.findByPostSlugAndUser_IdAndKind(slug, user.getId(), kind);
		boolean active;
		if (existing.isPresent()) {
			reactions.delete(existing.get());
			if (kind == ReactionKind.LIKE) {
				stat.removeLike();
			} else {
				stat.removeFavorite();
			}
			active = false;
		} else {
			reactions.save(new PostReaction(slug, user, kind));
			if (kind == ReactionKind.LIKE) {
				stat.addLike();
			} else {
				stat.addFavorite();
			}
			active = true;
		}

		stats.save(stat);
		long count = kind == ReactionKind.LIKE ? stat.getLikes() : stat.getFavorites();
		return new ReactionDto(active, count);
	}

	/* 内部工具 -------------------------------------------------------------- */

	private PostStat statOf(String slug) {
		return stats.findById(slug).orElseGet(() -> stats.save(new PostStat(slug)));
	}

	private Set<ReactionKind> mineFor(String slug, UUID userId) {
		Set<ReactionKind> kinds = new HashSet<>();
		for (PostReaction reaction : reactions.findByPostSlugAndUser_Id(slug, userId)) {
			kinds.add(reaction.getKind());
		}
		return kinds;
	}

	private PostStatsDto toDto(String slug, PostStat stat, Set<ReactionKind> mine) {
		return new PostStatsDto(
				slug,
				stat == null ? 0 : stat.getViews(),
				stat == null ? 0 : stat.getLikes(),
				stat == null ? 0 : stat.getFavorites(),
				mine.contains(ReactionKind.LIKE),
				mine.contains(ReactionKind.FAVORITE));
	}

	private CommentDto toDto(PostComment comment, List<PostComment> replies, UUID currentId) {
		UUID authorId = comment.getUser().getId();
		List<CommentDto> children = replies.stream()
				.map(reply -> toDto(reply, List.of(), currentId))
				.toList();
		return new CommentDto(
				comment.getId(),
				comment.getContent(),
				comment.getCreatedAt(),
				comment.getUser().getDisplayName(),
				authorId,
				currentId != null && currentId.equals(authorId),
				comment.isDeleted(),
				children);
	}

	private String normalizeSlug(String slug) {
		if (slug == null) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "文章不存在");
		}
		String cleaned = slug.trim();
		if (cleaned.isEmpty() || cleaned.length() > 190 || !cleaned.matches("[A-Za-z0-9_-]+")) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "文章不存在");
		}
		return cleaned;
	}

	private User requireUser(UserPrincipal principal) {
		if (principal == null) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
		}
		return users.findById(principal.id())
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录状态已失效"));
	}

	private String excerpt(String text) {
		return text.length() <= 90 ? text : text.substring(0, 88) + "…";
	}
}

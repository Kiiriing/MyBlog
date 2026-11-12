package com.luyu.blog.service;

import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.CommentLike;
import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.NotificationCategory;
import com.luyu.blog.domain.PostComment;
import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.CommentLikeRepository;
import com.luyu.blog.repo.NotificationRepository;
import com.luyu.blog.repo.PostCommentRepository;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.PostSocialDtos.CommentDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentListDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentRequest;
import com.luyu.blog.web.dto.PostSocialDtos.ReactionDto;
import com.luyu.blog.web.dto.PostSocialDtos.ReplyListDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/** 评论的读取、发表、删除与楼中楼点赞 */
@Service
public class CommentService {

	/** 同一用户每小时最多发表的评论数 */
	private static final int MAX_COMMENTS_PER_HOUR = 20;

	private final PostCommentRepository comments;
	private final CommentLikeRepository commentLikes;
	private final UserRepository users;
	private final NotificationRepository notifications;
	private final ModerationService moderation;

	public CommentService(PostCommentRepository comments, CommentLikeRepository commentLikes, UserRepository users,
			NotificationRepository notifications, ModerationService moderation) {
		this.comments = comments;
		this.commentLikes = commentLikes;
		this.users = users;
		this.notifications = notifications;
		this.moderation = moderation;
	}

	/** 一级评论每页条数；楼中楼只带预览，点开后再按需分页加载 */
	public static final int PAGE_SIZE = 20;

	private static final int MAX_PAGE_SIZE = 50;

	private static final int REPLY_PREVIEW = 3;

	/** 匿名访客的首页评论缓存时长：只为削掉热门文章的重复查询，写操作会立即失效 */
	private static final long COMMENT_CACHE_TTL_MS = 5_000;

	private static final int COMMENT_CACHE_MAX_KEYS = 200;

	private final Map<String, CachedComments> commentCache = new ConcurrentHashMap<>();

	private record CachedComments(CommentListDto value, long expiresAt) {
	}

	@Transactional(readOnly = true)
	public CommentListDto listComments(String rawSlug, UserPrincipal principal, String sort, int page, int size,
			UUID anchor) {
		String slug = PostSocialSupport.normalizeSlug(rawSlug);
		UUID currentId = principal == null ? null : principal.id();
		int pageSize = clampSize(size);
		boolean byLikes = "likes".equalsIgnoreCase(sort);

		/* 匿名访客的第一页缓存几秒，热门文章不用每次都把同样的查询走一遍 */
		String cacheKey = anchor == null && principal == null && page <= 0
				? slug + '|' + (byLikes ? "likes" : "recent") + '|' + pageSize
				: null;
		if (cacheKey != null) {
			CachedComments cached = commentCache.get(cacheKey);
			if (cached != null) {
				if (cached.expiresAt() > System.currentTimeMillis()) return cached.value();
				commentCache.remove(cacheKey);
			}
		}

		/* 深链：用 SQL 算出锚点一级评论的下标，直接翻到所在页 */
		PostComment anchorComment = anchor == null ? null
				: comments.findById(anchor).filter(comment -> !comment.isDeleted()).orElse(null);
		PostComment anchorReply = anchorComment == null || anchorComment.getParent() == null ? null : anchorComment;
		UUID anchorRootId = anchorComment == null ? null : rootIdOf(anchorComment);
		int pageIndex = Math.max(0, page);
		if (anchorRootId != null) {
			Integer index = byLikes
					? comments.findRootIndexByLikes(slug, anchorRootId)
					: comments.findRootIndexByRecent(slug, anchorRootId);
			if (index != null) {
				pageIndex = index / pageSize;
			}
		}

		long rootTotal = comments.countRoots(slug);
		long total = comments.countByPostSlugAndDeletedFalse(slug);
		List<UUID> rootIds = byLikes
				? comments.findRootIdsByLikes(slug, pageSize, pageIndex * pageSize)
				: comments.findRootIdsByRecent(slug, pageSize, pageIndex * pageSize);
		if (rootIds.isEmpty()) {
			return new CommentListDto(List.of(), total, false, pageIndex, rootTotal);
		}

		/* 只查当前页一级评论的预览回复，楼中楼其余内容等点开后再分页加载 */
		List<PostComment> previews = byLikes
				? comments.findReplyPreviewByLikes(rootIds, REPLY_PREVIEW)
				: comments.findReplyPreviewByRecent(rootIds, REPLY_PREVIEW);
		Map<UUID, Integer> replyCounts = comments.countRepliesByParent(rootIds).stream()
				.collect(Collectors.toMap(PostCommentRepository.ReplyCount::getParentId,
						count -> (int) count.getTotal()));

		Set<UUID> ids = new LinkedHashSet<>(rootIds);
		previews.forEach(preview -> ids.add(preview.getId()));
		/* 深链指向楼中楼时，把目标回复补进预览，保证页面上能定位到它 */
		if (anchorReply != null && rootIds.contains(anchorReply.getParent().getId())
				&& !ids.contains(anchorReply.getId())) {
			ids.add(anchorReply.getId());
		}

		Map<UUID, PostComment> detailed = new HashMap<>();
		comments.findDetailedByIdIn(ids).forEach(comment -> detailed.put(comment.getId(), comment));
		Map<UUID, Long> likeCounts = commentLikes.countByCommentIds(ids).stream()
				.collect(Collectors.toMap(CommentLikeRepository.LikeCount::getCommentId,
						CommentLikeRepository.LikeCount::getTotal));
		Set<UUID> likedByMe = currentId == null ? Set.of()
				: new HashSet<>(commentLikes.findLikedCommentIds(ids, currentId));

		Map<UUID, List<PostComment>> replyMap = new HashMap<>();
		for (PostComment preview : previews) {
			replyMap.computeIfAbsent(preview.getParent().getId(), key -> new ArrayList<>()).add(preview);
		}
		if (anchorReply != null && detailed.containsKey(anchorReply.getId())
				&& !previews.stream().anyMatch(preview -> preview.getId().equals(anchorReply.getId()))) {
			replyMap.computeIfAbsent(anchorReply.getParent().getId(), key -> new ArrayList<>())
					.add(detailed.get(anchorReply.getId()));
		}

		Comparator<PostComment> replyOrder = replyOrder(byLikes, likeCounts);
		List<CommentDto> items = new ArrayList<>();
		for (UUID rootId : rootIds) {
			PostComment root = detailed.get(rootId);
			if (root == null) continue;
			List<PostComment> children = orderReplies(replyMap.getOrDefault(rootId, List.of()), replyOrder);
			items.add(toDto(root, children, replyCounts.getOrDefault(rootId, 0), currentId, likeCounts, likedByMe));
		}

		boolean hasMore = (long) pageIndex * pageSize + rootIds.size() < rootTotal;
		CommentListDto result = new CommentListDto(items, total, hasMore, pageIndex, rootTotal);
		if (cacheKey != null) {
			cacheComments(cacheKey, result);
		}
		return result;
	}

	/** 楼中楼分页加载：点开「查看全部回复」时才请求 */
	@Transactional(readOnly = true)
	public ReplyListDto listReplies(UUID commentId, UserPrincipal principal, String sort, int page, int size) {
		comments.findById(commentId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "评论不存在"));
		UUID currentId = principal == null ? null : principal.id();

		List<PostComment> children = comments.findByParent_IdOrderByCreatedAtAsc(commentId).stream()
				.filter(child -> !child.isDeleted())
				.toList();

		Set<UUID> ids = children.stream().map(PostComment::getId).collect(Collectors.toSet());
		List<CommentLike> likes = ids.isEmpty() ? List.of() : commentLikes.findByComment_IdIn(ids);
		Map<UUID, Long> likeCounts = likes.stream()
				.collect(Collectors.groupingBy(like -> like.getComment().getId(), Collectors.counting()));
		Set<UUID> likedByMe = currentId == null ? Set.of()
				: likes.stream()
						.filter(like -> like.getUser().getId().equals(currentId))
						.map(like -> like.getComment().getId())
						.collect(Collectors.toSet());

		List<PostComment> sorted = orderReplies(children, replyOrder("likes".equalsIgnoreCase(sort), likeCounts));
		int pageSize = clampSize(size);
		int from = Math.min(Math.max(0, page) * pageSize, sorted.size());
		int to = Math.min(from + pageSize, sorted.size());
		List<CommentDto> items = sorted.subList(from, to).stream()
				.map(reply -> toDto(reply, List.of(), 0, currentId, likeCounts, likedByMe))
				.toList();
		return new ReplyListDto(items, sorted.size(), to < sorted.size());
	}

	private Comparator<PostComment> replyOrder(boolean byLikes, Map<UUID, Long> likeCounts) {
		if (byLikes) {
			return Comparator
					.comparingLong((PostComment comment) -> likeCounts.getOrDefault(comment.getId(), 0L))
					.reversed()
					.thenComparing(Comparator.comparing(PostComment::getCreatedAt));
		}
		return Comparator.comparing(PostComment::getCreatedAt);
	}

	/** 评论所属的一级评论 id（父评论已被删除时，它自己就是一级评论） */
	private UUID rootIdOf(PostComment comment) {
		PostComment parent = comment.getParent();
		return parent == null || parent.isDeleted() ? comment.getId() : parent.getId();
	}

	private void cacheComments(String key, CommentListDto value) {
		long now = System.currentTimeMillis();
		if (commentCache.size() >= COMMENT_CACHE_MAX_KEYS) {
			commentCache.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
			if (commentCache.size() >= COMMENT_CACHE_MAX_KEYS) return;
		}
		commentCache.put(key, new CachedComments(value, now + COMMENT_CACHE_TTL_MS));
	}

	/** 文章有新评论、删除或点赞时让它那篇文章的缓存立即失效 */
	private void evictCommentCache(String slug) {
		String prefix = slug + '|';
		commentCache.keySet().removeIf(key -> key.startsWith(prefix));
	}

	private int clampSize(int size) {
		if (size <= 0) return PAGE_SIZE;
		return Math.min(size, MAX_PAGE_SIZE);
	}

	/** 子评论排序；若某条回复是回复楼中楼里的另一条，被回复的那条必须排在前面 */
	private List<PostComment> orderReplies(List<PostComment> children, Comparator<PostComment> order) {
		List<PostComment> sorted = children.stream()
				.sorted(order)
				.collect(Collectors.toCollection(ArrayList::new));
		int guard = sorted.size() * sorted.size() + sorted.size();
		while (guard-- > 0) {
			boolean moved = false;
			for (int i = 0; i < sorted.size(); i++) {
				PostComment comment = sorted.get(i);
				UUID targetId = comment.getReplyTo() == null ? null : comment.getReplyTo().getId();
				if (targetId == null) continue;
				int targetIndex = indexOfComment(sorted, targetId);
				if (targetIndex < 0 || targetIndex <= i) continue;
				sorted.remove(i);
				sorted.add(indexOfComment(sorted, targetId) + 1, comment);
				moved = true;
				break;
			}
			if (!moved) break;
		}
		return sorted;
	}

	private int indexOfComment(List<PostComment> comments, UUID id) {
		for (int i = 0; i < comments.size(); i++) {
			if (comments.get(i).getId().equals(id)) return i;
		}
		return -1;
	}

	@Transactional
	public CommentDto addComment(UserPrincipal principal, String rawSlug, CommentRequest request) {
		String slug = PostSocialSupport.normalizeSlug(rawSlug);
		User author = PostSocialSupport.requireUser(principal, users);

		long recent = comments.countByUser_IdAndCreatedAtGreaterThanEqual(author.getId(),
				Instant.now().minus(1, ChronoUnit.HOURS));
		if (recent >= MAX_COMMENTS_PER_HOUR) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "评论太频繁了，休息一会儿再来吧");
		}

		String content = request.content().trim();
		moderation.validate(content);

		PostComment parent = null;
		PostComment replyTarget = null;
		if (request.parentId() != null) {
			replyTarget = comments.findById(request.parentId())
					.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "要回复的评论不存在"));
			if (!replyTarget.getPostSlug().equals(slug)) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "评论不属于这篇文章");
			}
			if (replyTarget.isDeleted()) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "这条评论已经删除了");
			}
			parent = replyTarget.getParent() == null ? replyTarget : replyTarget.getParent();
		}

		PostComment quoted = replyTarget != null && replyTarget.getParent() != null ? replyTarget : null;
		PostComment saved = comments.save(new PostComment(slug, author, parent, quoted, content));
		notifyComment(slug, author, saved, replyTarget, parent);
		evictCommentCache(slug);

		return toDto(saved, List.of(), 0, author.getId(), Map.of(), Set.of());
	}

	@Transactional
	public void deleteComment(UserPrincipal principal, UUID id) {
		User user = PostSocialSupport.requireUser(principal, users);
		PostComment comment = comments.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "评论不存在"));
		boolean owner = comment.getUser().getId().equals(user.getId());
		if (!owner && user.getRole() != Role.ADMIN) {
			throw new ApiException(HttpStatus.FORBIDDEN, "只能删除自己的评论");
		}
		comment.markDeleted();
		comments.save(comment);
		evictCommentCache(comment.getPostSlug());
	}

	@Transactional
	public ReactionDto toggleCommentLike(UserPrincipal principal, UUID id) {
		User user = PostSocialSupport.requireUser(principal, users);
		PostComment comment = comments.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "评论不存在"));
		if (comment.isDeleted()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "评论已删除");
		}

		Optional<CommentLike> existing = commentLikes.findByComment_IdAndUser_Id(id, user.getId());
		if (existing.isPresent()) {
			commentLikes.delete(existing.get());
		} else {
			commentLikes.save(new CommentLike(comment, user));
		}
		evictCommentCache(comment.getPostSlug());
		return new ReactionDto(existing.isEmpty(), commentLikes.countByComment_Id(id));
	}

	private void notifyComment(String slug, User author, PostComment comment, PostComment replyTarget,
			PostComment parent) {
		// 通知直接跳到新评论的位置，打开后会自动定位并高亮
		String link = "/journal/" + slug + "#comment-" + comment.getId();
		String body = excerpt(comment.getContent());
		Set<UUID> notified = new HashSet<>();

		if (replyTarget != null) {
			notifyUser(replyTarget.getUser(), author, "有人回复了你的评论", body, link, notified);
			if (parent != null) {
				notifyUser(parent.getUser(), author, "你的评论有了新回复", body, link, notified);
			}
			return;
		}

		for (User admin : users.findByRole(Role.ADMIN)) {
			notifyUser(admin, author, "来自 " + author.getDisplayName() + " 的评论", body, link, notified);
		}
	}

	private void notifyUser(User target, User author, String title, String body, String link, Set<UUID> notified) {
		if (target.getId().equals(author.getId()) || !notified.add(target.getId())) {
			return;
		}
		notifications.save(new Notification(NotificationCategory.COMMENT, Audience.USER, target, author, title, body,
				link));
	}

	private CommentDto toDto(PostComment comment, List<PostComment> replies, int replyCount, UUID currentId,
			Map<UUID, Long> likeCounts, Set<UUID> likedByMe) {
		UUID authorId = comment.getUser().getId();
		List<CommentDto> children = replies.stream()
				.map(reply -> toDto(reply, List.of(), 0, currentId, likeCounts, likedByMe))
				.toList();
		PostComment quoted = comment.getReplyTo();
		String replyToName = quoted == null ? null : quoted.getUser().getDisplayName();
		String replyToExcerpt = quoted == null ? null : excerpt(quoted.getContent());
		return new CommentDto(
				comment.getId(),
				comment.getContent(),
				comment.getCreatedAt(),
				comment.getUser().getDisplayName(),
				authorId,
				currentId != null && currentId.equals(authorId),
				comment.isDeleted(),
				likeCounts.getOrDefault(comment.getId(), 0L),
				likedByMe.contains(comment.getId()),
				replyToName,
				replyToExcerpt,
				replyCount,
				children);
	}

	private String excerpt(String text) {
		return text.length() <= 90 ? text : text.substring(0, 88) + "…";
	}
}

package com.luyu.blog.service;

import com.luyu.blog.domain.PostReaction;
import com.luyu.blog.domain.PostStat;
import com.luyu.blog.domain.ReactionKind;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.PostReactionRepository;
import com.luyu.blog.repo.PostStatRepository;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.dto.PostSocialDtos.PostStatsDto;
import com.luyu.blog.web.dto.PostSocialDtos.ReactionDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** 文章阅读量、点赞与收藏统计 */
@Service
public class PostStatsService {

	private final PostStatRepository stats;
	private final PostReactionRepository reactions;
	private final UserRepository users;
	private final ViewCountBuffer viewCounts;

	public PostStatsService(PostStatRepository stats, PostReactionRepository reactions, UserRepository users,
			ViewCountBuffer viewCounts) {
		this.stats = stats;
		this.reactions = reactions;
		this.users = users;
		this.viewCounts = viewCounts;
	}

	@Transactional(readOnly = true)
	public PostStatsDto stats(String rawSlug, UserPrincipal principal) {
		String slug = PostSocialSupport.normalizeSlug(rawSlug);
		PostStat stat = stats.findById(slug).orElse(null);
		Set<ReactionKind> mine = principal == null ? Set.of() : mineFor(slug, principal.id());
		return toDto(slug, stat, viewCounts.pending(slug), mine);
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
				.map(slug -> toDto(slug, statMap.get(slug), viewCounts.pending(slug), mine.getOrDefault(slug, Set.of())))
				.toList();
	}

	/** 浏览只累加在内存里，定时批量落库；返回值带上还没落库的部分 */
	@Transactional
	public PostStatsDto recordView(String rawSlug) {
		String slug = PostSocialSupport.normalizeSlug(rawSlug);
		viewCounts.increment(slug);
		PostStat stat = stats.findById(slug).orElse(null);
		return toDto(slug, stat, viewCounts.pending(slug), Set.of());
	}

	@Transactional
	public ReactionDto toggleReaction(UserPrincipal principal, String rawSlug, ReactionKind kind) {
		String slug = PostSocialSupport.normalizeSlug(rawSlug);
		User user = PostSocialSupport.requireUser(principal, users);
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

	private PostStatsDto toDto(String slug, PostStat stat, long pendingViews, Set<ReactionKind> mine) {
		return new PostStatsDto(
				slug,
				(stat == null ? 0 : stat.getViews()) + pendingViews,
				stat == null ? 0 : stat.getLikes(),
				stat == null ? 0 : stat.getFavorites(),
				mine.contains(ReactionKind.LIKE),
				mine.contains(ReactionKind.FAVORITE));
	}
}

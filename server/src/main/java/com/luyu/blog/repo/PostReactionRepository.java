package com.luyu.blog.repo;

import com.luyu.blog.domain.PostReaction;
import com.luyu.blog.domain.ReactionKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {

	Optional<PostReaction> findByPostSlugAndUser_IdAndKind(String postSlug, UUID userId, ReactionKind kind);

	boolean existsByPostSlugAndUser_IdAndKind(String postSlug, UUID userId, ReactionKind kind);

	List<PostReaction> findByPostSlugAndUser_Id(String postSlug, UUID userId);

	List<PostReaction> findByUser_IdAndPostSlugIn(UUID userId, List<String> postSlugs);

	long countByPostSlugAndKind(String postSlug, ReactionKind kind);

	/** 幂等插入：并发重复点赞时返回 0，不抛唯一约束异常 */
	@Modifying
	@Query(value = """
			insert into post_reactions (id, post_slug, user_id, kind, created_at)
			values (:id, :slug, :userId, :kind, now())
			on conflict (post_slug, user_id, kind) do nothing
			""", nativeQuery = true)
	int insertIgnore(@Param("id") UUID id, @Param("slug") String postSlug, @Param("userId") UUID userId,
			@Param("kind") String kind);

	/** 返回真实删除行数，用于判断计数是否应该减少 */
	@Modifying
	@Query(value = "delete from post_reactions where post_slug = :slug and user_id = :userId and kind = :kind",
			nativeQuery = true)
	int deleteOne(@Param("slug") String postSlug, @Param("userId") UUID userId, @Param("kind") String kind);
}

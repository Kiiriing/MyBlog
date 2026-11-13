package com.luyu.blog.repo;

import com.luyu.blog.domain.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {

	/** 楼中楼按需分页用 */
	List<PostComment> findByParent_IdOrderByCreatedAtAsc(UUID parentId);

	long countByParent_IdAndDeletedFalse(UUID parentId);

	/** 楼中楼按时间 SQL 分页，避免把一条评论下的全部回复读进内存 */
	@Query(value = """
			select c.* from post_comments c
			where c.parent_id = :parentId and c.deleted = false
			order by c.created_at asc, c.id asc
			limit :limit offset :offset
			""", nativeQuery = true)
	List<PostComment> findRepliesByRecent(@Param("parentId") UUID parentId, @Param("limit") int limit,
			@Param("offset") int offset);

	/** 楼中楼按点赞数 SQL 分页 */
	@Query(value = """
			select c.* from post_comments c
			left join (
				select l.comment_id, count(*) as cnt from comment_likes l group by l.comment_id
			) lc on lc.comment_id = c.id
			where c.parent_id = :parentId and c.deleted = false
			order by coalesce(lc.cnt, 0) desc, c.created_at asc, c.id asc
			limit :limit offset :offset
			""", nativeQuery = true)
	List<PostComment> findRepliesByLikes(@Param("parentId") UUID parentId, @Param("limit") int limit,
			@Param("offset") int offset);

	long countByPostSlug(String postSlug);

	long countByPostSlugAndDeletedFalse(String postSlug);

	/** 限流：统计某个用户从某个时间点起发表的评论数 */
	long countByUser_IdAndCreatedAtGreaterThanEqual(UUID userId, Instant from);

	/* 一级评论按 SQL 分页：只取当前页的 id，不再把整篇文章的评论读进内存 */

	@Query(value = """
			select c.id
			from post_comments c
			left join post_comments p on p.id = c.parent_id
			where c.post_slug = :slug and c.deleted = false
			  and (c.parent_id is null or p.deleted = true)
			order by c.created_at desc, c.id desc
			limit :limit offset :offset
			""", nativeQuery = true)
	List<UUID> findRootIdsByRecent(@Param("slug") String slug, @Param("limit") int limit, @Param("offset") int offset);

	@Query(value = """
			select c.id
			from post_comments c
			left join post_comments p on p.id = c.parent_id
			left join (
				select l.comment_id, count(*) as cnt from comment_likes l group by l.comment_id
			) lc on lc.comment_id = c.id
			where c.post_slug = :slug and c.deleted = false
			  and (c.parent_id is null or p.deleted = true)
			order by coalesce(lc.cnt, 0) desc, c.created_at desc, c.id desc
			limit :limit offset :offset
			""", nativeQuery = true)
	List<UUID> findRootIdsByLikes(@Param("slug") String slug, @Param("limit") int limit, @Param("offset") int offset);

	/** 一级评论总数（含被删除父评论后提升上来的回复） */
	@Query(value = """
			select count(*)
			from post_comments c
			left join post_comments p on p.id = c.parent_id
			where c.post_slug = :slug and c.deleted = false
			  and (c.parent_id is null or p.deleted = true)
			""", nativeQuery = true)
	long countRoots(@Param("slug") String slug);

	/** 深链：锚点一级评论在当前排序里的下标，用于直接算出页码 */
	@Query(value = """
			select rn - 1 from (
				select c.id, row_number() over (order by c.created_at desc, c.id desc) as rn
				from post_comments c
				left join post_comments p on p.id = c.parent_id
				where c.post_slug = :slug and c.deleted = false
				  and (c.parent_id is null or p.deleted = true)
			) ranked where ranked.id = :id
			""", nativeQuery = true)
	Integer findRootIndexByRecent(@Param("slug") String slug, @Param("id") UUID id);

	@Query(value = """
			select rn - 1 from (
				select c.id, row_number() over (
						order by coalesce(lc.cnt, 0) desc, c.created_at desc, c.id desc) as rn
				from post_comments c
				left join post_comments p on p.id = c.parent_id
				left join (
					select l.comment_id, count(*) as cnt from comment_likes l group by l.comment_id
				) lc on lc.comment_id = c.id
				where c.post_slug = :slug and c.deleted = false
				  and (c.parent_id is null or p.deleted = true)
			) ranked where ranked.id = :id
			""", nativeQuery = true)
	Integer findRootIndexByLikes(@Param("slug") String slug, @Param("id") UUID id);

	/** 当前页一级评论各自的前几条楼中楼预览 */
	@Query(value = """
			select c.* from (
				select pc.id, row_number() over (partition by pc.parent_id order by pc.created_at asc, pc.id asc) as rn
				from post_comments pc
				where pc.parent_id in (:parentIds) and pc.deleted = false
			) ranked
			join post_comments c on c.id = ranked.id
			where ranked.rn <= :size
			order by c.parent_id, ranked.rn
			""", nativeQuery = true)
	List<PostComment> findReplyPreviewByRecent(@Param("parentIds") Collection<UUID> parentIds,
			@Param("size") int size);

	@Query(value = """
			select c.* from (
				select pc.id, row_number() over (
						partition by pc.parent_id
						order by coalesce(lc.cnt, 0) desc, pc.created_at asc, pc.id asc) as rn
				from post_comments pc
				left join (
					select l.comment_id, count(*) as cnt from comment_likes l group by l.comment_id
				) lc on lc.comment_id = pc.id
				where pc.parent_id in (:parentIds) and pc.deleted = false
			) ranked
			join post_comments c on c.id = ranked.id
			where ranked.rn <= :size
			order by c.parent_id, ranked.rn
			""", nativeQuery = true)
	List<PostComment> findReplyPreviewByLikes(@Param("parentIds") Collection<UUID> parentIds,
			@Param("size") int size);

	/** 当前页一级评论各自的楼中楼回复数 */
	@Query(value = """
			select pc.parent_id as parentId, count(*) as total
			from post_comments pc
			where pc.parent_id in (:parentIds) and pc.deleted = false
			group by pc.parent_id
			""", nativeQuery = true)
	List<ReplyCount> countRepliesByParent(@Param("parentIds") Collection<UUID> parentIds);

	/** 一次带出作者和被引用的回复，避免逐条懒加载 */
	@Query("""
			select c from PostComment c
			join fetch c.user
			left join fetch c.replyTo r
			left join fetch r.user
			where c.id in :ids
			""")
	List<PostComment> findDetailedByIdIn(@Param("ids") Collection<UUID> ids);

	interface ReplyCount {
		UUID getParentId();

		long getTotal();
	}
}

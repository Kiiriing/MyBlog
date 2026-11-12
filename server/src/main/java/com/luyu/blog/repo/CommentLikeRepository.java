package com.luyu.blog.repo;

import com.luyu.blog.domain.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentLikeRepository extends JpaRepository<CommentLike, UUID> {

	Optional<CommentLike> findByComment_IdAndUser_Id(UUID commentId, UUID userId);

	long countByComment_Id(UUID commentId);

	/** 楼中楼分页时只统计这一页评论的点赞 */
	List<CommentLike> findByComment_IdIn(Collection<UUID> commentIds);

	/** 一级评论分页：只聚合当前页评论的点赞数，不再把整篇文章的点赞读进内存 */
	@Query("""
			select l.comment.id as commentId, count(l) as total
			from CommentLike l
			where l.comment.id in :ids
			group by l.comment.id
			""")
	List<LikeCount> countByCommentIds(@Param("ids") Collection<UUID> ids);

	/** 当前用户在这一页评论里点过赞的评论 id */
	@Query("""
			select l.comment.id
			from CommentLike l
			where l.comment.id in :ids and l.user.id = :userId
			""")
	List<UUID> findLikedCommentIds(@Param("ids") Collection<UUID> ids, @Param("userId") UUID userId);

	interface LikeCount {
		UUID getCommentId();

		long getTotal();
	}
}

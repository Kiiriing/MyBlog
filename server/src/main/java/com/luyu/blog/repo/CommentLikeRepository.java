package com.luyu.blog.repo;

import com.luyu.blog.domain.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentLikeRepository extends JpaRepository<CommentLike, UUID> {

	Optional<CommentLike> findByComment_IdAndUser_Id(UUID commentId, UUID userId);

	long countByComment_Id(UUID commentId);

	/** 一次取出一篇文章全部评论的点赞记录，用于统计点赞数与当前用户状态 */
	List<CommentLike> findByComment_PostSlug(String postSlug);
}

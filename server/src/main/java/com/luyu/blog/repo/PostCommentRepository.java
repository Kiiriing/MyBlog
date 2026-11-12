package com.luyu.blog.repo;

import com.luyu.blog.domain.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {

	List<PostComment> findByPostSlugOrderByCreatedAtAsc(String postSlug);

	/** 楼中楼按需分页用 */
	List<PostComment> findByParent_IdOrderByCreatedAtAsc(UUID parentId);

	long countByPostSlug(String postSlug);

	/** 限流：统计某个用户从某个时间点起发表的评论数 */
	long countByUser_IdAndCreatedAtGreaterThanEqual(UUID userId, Instant from);
}

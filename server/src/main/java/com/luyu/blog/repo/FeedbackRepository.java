package com.luyu.blog.repo;

import com.luyu.blog.domain.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

	List<Feedback> findAllByOrderByCreatedAtDesc();

	/** 统计某用户从某个时间点起提交的反馈数量，用于每日发送上限 */
	long countByUser_IdAndCreatedAtGreaterThanEqual(UUID userId, Instant from);
}

package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/**
 * 评论点赞。同一用户对同一条评论只能点赞一次，靠唯一约束兜底。
 */
@Entity
@Table(name = "comment_likes", uniqueConstraints = {
		@UniqueConstraint(name = "uk_comment_likes_comment_user", columnNames = { "comment_id", "user_id" })
}, indexes = {
		@Index(name = "idx_comment_likes_comment", columnList = "comment_id")
})
public class CommentLike {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "comment_id", nullable = false)
	private PostComment comment;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected CommentLike() {
	}

	public CommentLike(PostComment comment, User user) {
		this.comment = comment;
		this.user = user;
		this.createdAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public PostComment getComment() {
		return comment;
	}

	public User getUser() {
		return user;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}

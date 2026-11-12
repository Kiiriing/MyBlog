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

import java.time.Instant;
import java.util.UUID;

/**
 * 文章评论。只有一层楼中楼：回复回复时统一挂到顶层评论下。
 */
@Entity
@Table(name = "post_comments", indexes = {
		@Index(name = "idx_post_comments_slug_created", columnList = "post_slug, created_at")
})
public class PostComment {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "post_slug", nullable = false, length = 190)
	private String postSlug;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	/** 顶层评论为空；回复指向顶层评论 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "parent_id")
	private PostComment parent;

	/** 被引用回复的那条评论；直接回复主评论时为空 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "reply_to_id")
	private PostComment replyTo;

	@Column(nullable = false, columnDefinition = "text")
	private String content;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	@Column(nullable = false)
	private boolean deleted = false;

	protected PostComment() {
	}

	public PostComment(String postSlug, User user, PostComment parent, PostComment replyTo, String content) {
		this.postSlug = postSlug;
		this.user = user;
		this.parent = parent;
		this.replyTo = replyTo;
		this.content = content;
		this.createdAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public String getPostSlug() {
		return postSlug;
	}

	public User getUser() {
		return user;
	}

	public PostComment getParent() {
		return parent;
	}

	public PostComment getReplyTo() {
		return replyTo;
	}

	public String getContent() {
		return content;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public boolean isDeleted() {
		return deleted;
	}

	public void markDeleted() {
		this.deleted = true;
		this.content = "该评论已删除";
	}
}

package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/** 用户对文章的点赞 / 收藏，一个用户对一篇文章的同一种操作只有一条记录 */
@Entity
@Table(name = "post_reactions", uniqueConstraints = {
		@UniqueConstraint(name = "uk_post_reactions", columnNames = { "post_slug", "user_id", "kind" })
})
public class PostReaction {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "post_slug", nullable = false, length = 190)
	private String postSlug;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private ReactionKind kind;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected PostReaction() {
	}

	public PostReaction(String postSlug, User user, ReactionKind kind) {
		this.postSlug = postSlug;
		this.user = user;
		this.kind = kind;
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

	public ReactionKind getKind() {
		return kind;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}

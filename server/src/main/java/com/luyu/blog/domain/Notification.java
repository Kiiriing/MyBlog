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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private NotificationCategory category;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private Audience audience = Audience.ALL;

	/** 仅 audience = USER 时使用 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "recipient_id")
	private User recipient;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "sender_id")
	private User sender;

	@Column(nullable = false, length = 160)
	private String title;

	@Column(nullable = false, columnDefinition = "text")
	private String body;

	@Column(length = 190)
	private String link;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected Notification() {
	}

	public Notification(NotificationCategory category, Audience audience, User recipient, User sender,
			String title, String body, String link) {
		this.category = category;
		this.audience = audience;
		this.recipient = recipient;
		this.sender = sender;
		this.title = title;
		this.body = body;
		this.link = link;
		this.createdAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public NotificationCategory getCategory() {
		return category;
	}

	public Audience getAudience() {
		return audience;
	}

	public User getRecipient() {
		return recipient;
	}

	public User getSender() {
		return sender;
	}

	public String getTitle() {
		return title;
	}

	public String getBody() {
		return body;
	}

	public String getLink() {
		return link;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}

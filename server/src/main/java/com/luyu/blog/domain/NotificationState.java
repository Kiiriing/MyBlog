package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/**
 * 单个用户对某条通知的阅读 / 置顶 / 删除（软隐藏）状态。
 */
@Entity
@Table(
		name = "notification_states",
		uniqueConstraints = @UniqueConstraint(name = "uk_notification_user", columnNames = { "notification_id", "user_id" })
)
public class NotificationState {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "notification_id", nullable = false)
	private Notification notification;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "read_at")
	private Instant readAt;

	@Column(name = "pinned_at")
	private Instant pinnedAt;

	@Column(name = "hidden_at")
	private Instant hiddenAt;

	protected NotificationState() {
	}

	public NotificationState(Notification notification, User user) {
		this.notification = notification;
		this.user = user;
	}

	public UUID getId() {
		return id;
	}

	public Notification getNotification() {
		return notification;
	}

	public User getUser() {
		return user;
	}

	public Instant getReadAt() {
		return readAt;
	}

	public void setReadAt(Instant readAt) {
		this.readAt = readAt;
	}

	public Instant getPinnedAt() {
		return pinnedAt;
	}

	public void setPinnedAt(Instant pinnedAt) {
		this.pinnedAt = pinnedAt;
	}

	public Instant getHiddenAt() {
		return hiddenAt;
	}

	public void setHiddenAt(Instant hiddenAt) {
		this.hiddenAt = hiddenAt;
	}
}

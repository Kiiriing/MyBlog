package com.luyu.blog.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 更新页的版本记录。页面不再依赖前端写死的数组，内容统一存在这里。
 */
@Entity
@Table(name = "changelog_entries", uniqueConstraints = {
		@UniqueConstraint(name = "uk_changelog_version", columnNames = "version")
}, indexes = {
		@Index(name = "idx_changelog_occurred", columnList = "occurred_at")
})
public class ChangelogEntry {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	/** 版本号，同时作为页面锚点与搜索标识 */
	@Column(nullable = false, length = 32)
	private String version;

	/** 展示用时间，可以是时间区间 */
	@Column(name = "date_label", nullable = false, length = 64)
	private String dateLabel;

	/** 机器可读时间，用于排序与 <time datetime> */
	@Column(name = "occurred_at", nullable = false)
	private Instant occurredAt;

	@Column(nullable = false, length = 160)
	private String title;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "changelog_items", joinColumns = @JoinColumn(name = "entry_id"))
	@OrderColumn(name = "position")
	@Column(name = "item", nullable = false, length = 1000)
	private List<String> items = new ArrayList<>();

	protected ChangelogEntry() {
	}

	public UUID getId() {
		return id;
	}

	public String getVersion() {
		return version;
	}

	public String getDateLabel() {
		return dateLabel;
	}

	public Instant getOccurredAt() {
		return occurredAt;
	}

	public String getTitle() {
		return title;
	}

	public List<String> getItems() {
		return items;
	}
}

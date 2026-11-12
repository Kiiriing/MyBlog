package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 每篇文章的轻量统计：阅读量、点赞数、收藏数。
 * 以 slug 作为主键，文章内容仍在仓库里维护。
 */
@Entity
@Table(name = "post_stats")
public class PostStat {

	@Id
	@Column(name = "post_slug", length = 190)
	private String postSlug;

	/** 阅读量由 ViewCountBuffer 定时用 SQL 自增，实体保存时不要覆盖它 */
	@Column(nullable = false, updatable = false)
	private long views = 0;

	@Column(nullable = false)
	private long likes = 0;

	@Column(nullable = false)
	private long favorites = 0;

	protected PostStat() {
	}

	public PostStat(String postSlug) {
		this.postSlug = postSlug;
	}

	public String getPostSlug() {
		return postSlug;
	}

	public long getViews() {
		return views;
	}

	public long getLikes() {
		return likes;
	}

	public long getFavorites() {
		return favorites;
	}

	public void addLike() {
		this.likes += 1;
	}

	public void removeLike() {
		this.likes = Math.max(0, this.likes - 1);
	}

	public void addFavorite() {
		this.favorites += 1;
	}

	public void removeFavorite() {
		this.favorites = Math.max(0, this.favorites - 1);
	}
}

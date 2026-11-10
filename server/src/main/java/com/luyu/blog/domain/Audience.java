package com.luyu.blog.domain;

/**
 * 通知的可见范围。ALL 对所有登录用户可见，ADMIN 只对管理员可见，
 * USER 表示只发给 recipient 指定的那一个人。
 */
public enum Audience {
	ALL,
	ADMIN,
	USER
}

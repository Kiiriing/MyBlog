package com.luyu.blog.service;

import com.luyu.blog.domain.User;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import org.springframework.http.HttpStatus;

/** 评论与文章统计共用的小工具，避免两个服务各写一份 */
final class PostSocialSupport {

	private PostSocialSupport() {
	}

	static String normalizeSlug(String slug) {
		if (slug == null) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "文章不存在");
		}
		String cleaned = slug.trim();
		if (cleaned.isEmpty() || cleaned.length() > 190 || !cleaned.matches("[A-Za-z0-9_-]+")) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "文章不存在");
		}
		return cleaned;
	}

	static User requireUser(UserPrincipal principal, UserRepository users) {
		if (principal == null) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
		}
		return users.findById(principal.id())
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录状态已失效"));
	}
}

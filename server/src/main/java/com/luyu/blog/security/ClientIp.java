package com.luyu.blog.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 解析客户端 IP：优先取反向代理头，其次取直连地址。
 */
public final class ClientIp {

	private ClientIp() {
	}

	public static String resolve(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].trim();
		}
		String realIp = request.getHeader("X-Real-IP");
		if (realIp != null && !realIp.isBlank()) {
			return realIp.trim();
		}
		return request.getRemoteAddr();
	}

	/** 历史会话没有记录 IP 时放行，避免升级后所有用户被强制下线。 */
	public static boolean same(String recordedIp, String currentIp) {
		if (recordedIp == null || recordedIp.isBlank()) {
			return true;
		}
		return recordedIp.equals(currentIp);
	}
}

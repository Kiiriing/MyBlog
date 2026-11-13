package com.luyu.blog.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 解析客户端 IP。
 *
 * <p>默认只信任 TCP 直连地址，避免客户端伪造 {@code X-Forwarded-For} 绕过登录 IP 绑定与限流。
 * 只有在请求确实经过可信反向代理（如 Nginx）时，才通过
 * {@code app.network.trust-forwarded-headers=true} 开启代理头解析。
 */
@Component
public class ClientIp {

	private final boolean trustForwardedHeaders;

	public ClientIp(@Value("${app.network.trust-forwarded-headers:false}") boolean trustForwardedHeaders) {
		this.trustForwardedHeaders = trustForwardedHeaders;
	}

	public String resolve(HttpServletRequest request) {
		if (trustForwardedHeaders) {
			String forwarded = request.getHeader("X-Forwarded-For");
			if (forwarded != null && !forwarded.isBlank()) {
				/* 取最右侧地址：它由离本站最近的代理写入，最不容易被客户端伪造 */
				String[] hops = forwarded.split(",");
				return hops[hops.length - 1].trim();
			}
			String realIp = request.getHeader("X-Real-IP");
			if (realIp != null && !realIp.isBlank()) {
				return realIp.trim();
			}
		}
		return request.getRemoteAddr();
	}

	/** 历史会话没有记录 IP 时放行，避免升级后所有用户被强制下线。 */
	public boolean same(String recordedIp, String currentIp) {
		if (recordedIp == null || recordedIp.isBlank()) {
			return true;
		}
		return recordedIp.equals(currentIp);
	}
}

package com.luyu.blog.config;

import com.luyu.blog.security.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 记录 API 请求的方法、路径、状态码、耗时与用户 id，写入 server/logs/luyu-blog.log。
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

	private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		long started = System.nanoTime();
		try {
			filterChain.doFilter(request, response);
		} finally {
			if (request.getRequestURI().startsWith("/api/")) {
				long elapsed = (System.nanoTime() - started) / 1_000_000;
				log.info("{} {} -> {} {}ms user={}", request.getMethod(), request.getRequestURI(),
						response.getStatus(), elapsed, currentUser());
			}
		}
	}

	private String currentUser() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
			return String.valueOf(principal.id());
		}
		return "anonymous";
	}
}

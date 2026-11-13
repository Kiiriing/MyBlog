package com.luyu.blog.security;

import com.luyu.blog.repo.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

	private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

	private final JwtService jwtService;
	private final UserRepository users;
	private final ClientIp clientIps;

	public JwtAuthFilter(JwtService jwtService, UserRepository users, ClientIp clientIps) {
		this.jwtService = jwtService;
		this.users = users;
		this.clientIps = clientIps;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		String header = request.getHeader("Authorization");

		if (header != null && header.startsWith("Bearer ")
				&& SecurityContextHolder.getContext().getAuthentication() == null) {
			try {
				JwtService.ParsedToken token = jwtService.parse(header.substring(7));
				UUID userId = token.userId();
				String clientIp = clientIps.resolve(request);
				users.findById(userId).ifPresent(user -> {
					if (user.getTokenVersion() != token.tokenVersion()) {
						log.info("会话版本已变化，要求用户 {} 重新登录", userId);
						return;
					}
					if (!clientIps.same(user.getLastLoginIp(), clientIp)) {
						log.info("登录 IP 已变化，要求用户 {} 重新登录（{} -> {}）", userId, user.getLastLoginIp(), clientIp);
						return;
					}
					UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail(), user.getRole());
					UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
							principal, null,
							List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
					authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
					SecurityContextHolder.getContext().setAuthentication(authentication);
				});
			} catch (JwtException | IllegalArgumentException ignored) {
				// token 无效时保持匿名，由后续鉴权返回 401
			}
		}

		filterChain.doFilter(request, response);
	}
}

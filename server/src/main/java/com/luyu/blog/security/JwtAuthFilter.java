package com.luyu.blog.security;

import com.luyu.blog.repo.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

	private final JwtService jwtService;
	private final UserRepository users;

	public JwtAuthFilter(JwtService jwtService, UserRepository users) {
		this.jwtService = jwtService;
		this.users = users;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		String header = request.getHeader("Authorization");

		if (header != null && header.startsWith("Bearer ")
				&& SecurityContextHolder.getContext().getAuthentication() == null) {
			try {
				Long userId = jwtService.parseUserId(header.substring(7));
				users.findById(userId).ifPresent(user -> {
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

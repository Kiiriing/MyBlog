package com.luyu.blog.security;

import com.luyu.blog.domain.Role;

public record UserPrincipal(Long id, String email, Role role) {
}

package com.luyu.blog.security;

import com.luyu.blog.domain.Role;

import java.util.UUID;

public record UserPrincipal(UUID id, String email, Role role) {
}

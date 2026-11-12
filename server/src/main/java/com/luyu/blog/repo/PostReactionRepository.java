package com.luyu.blog.repo;

import com.luyu.blog.domain.PostReaction;
import com.luyu.blog.domain.ReactionKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {

	Optional<PostReaction> findByPostSlugAndUser_IdAndKind(String postSlug, UUID userId, ReactionKind kind);

	List<PostReaction> findByPostSlugAndUser_Id(String postSlug, UUID userId);

	List<PostReaction> findByUser_IdAndPostSlugIn(UUID userId, List<String> postSlugs);

	long countByPostSlugAndKind(String postSlug, ReactionKind kind);
}

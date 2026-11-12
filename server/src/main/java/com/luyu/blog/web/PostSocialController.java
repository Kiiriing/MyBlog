package com.luyu.blog.web;

import com.luyu.blog.domain.ReactionKind;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.service.PostSocialService;
import com.luyu.blog.web.dto.PostSocialDtos.CommentDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentListDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentRequest;
import com.luyu.blog.web.dto.PostSocialDtos.PostStatsDto;
import com.luyu.blog.web.dto.PostSocialDtos.ReactionDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
public class PostSocialController {

	private final PostSocialService postSocialService;

	public PostSocialController(PostSocialService postSocialService) {
		this.postSocialService = postSocialService;
	}

	@GetMapping("/{slug}/comments")
	public CommentListDto comments(@PathVariable String slug,
			@RequestParam(name = "sort", required = false, defaultValue = "recent") String sort,
			@AuthenticationPrincipal UserPrincipal principal) {
		return postSocialService.listComments(slug, principal, sort);
	}

	@PostMapping("/{slug}/comments")
	@ResponseStatus(HttpStatus.CREATED)
	public CommentDto addComment(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable String slug, @Valid @RequestBody CommentRequest request) {
		return postSocialService.addComment(principal, slug, request);
	}

	@DeleteMapping("/comments/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteComment(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
		postSocialService.deleteComment(principal, id);
	}

	@PostMapping("/comments/{id}/like")
	public ReactionDto likeComment(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
		return postSocialService.toggleCommentLike(principal, id);
	}

	@GetMapping("/{slug}/stats")
	public PostStatsDto stats(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String slug) {
		return postSocialService.stats(slug, principal);
	}

	@GetMapping("/stats")
	public List<PostStatsDto> statsList(@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam(name = "slugs", required = false, defaultValue = "") String slugs) {
		List<String> parsed = Arrays.stream(slugs.split(",")).toList();
		return postSocialService.statsFor(parsed, principal);
	}

	@PostMapping("/{slug}/view")
	public PostStatsDto view(@PathVariable String slug) {
		return postSocialService.recordView(slug);
	}

	@PostMapping("/{slug}/like")
	public ReactionDto like(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String slug) {
		return postSocialService.toggleReaction(principal, slug, ReactionKind.LIKE);
	}

	@PostMapping("/{slug}/favorite")
	public ReactionDto favorite(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String slug) {
		return postSocialService.toggleReaction(principal, slug, ReactionKind.FAVORITE);
	}
}

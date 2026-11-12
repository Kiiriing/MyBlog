package com.luyu.blog.web;

import com.luyu.blog.domain.ReactionKind;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.service.CommentService;
import com.luyu.blog.service.PostStatsService;
import com.luyu.blog.web.dto.PostSocialDtos.CommentDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentListDto;
import com.luyu.blog.web.dto.PostSocialDtos.CommentRequest;
import com.luyu.blog.web.dto.PostSocialDtos.PostStatsDto;
import com.luyu.blog.web.dto.PostSocialDtos.ReactionDto;
import com.luyu.blog.web.dto.PostSocialDtos.ReplyListDto;
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

	private final CommentService commentService;
	private final PostStatsService postStatsService;

	public PostSocialController(CommentService commentService, PostStatsService postStatsService) {
		this.commentService = commentService;
		this.postStatsService = postStatsService;
	}

	@GetMapping("/{slug}/comments")
	public CommentListDto comments(@PathVariable String slug,
			@RequestParam(name = "sort", required = false, defaultValue = "recent") String sort,
			@RequestParam(name = "page", required = false, defaultValue = "0") int page,
			@RequestParam(name = "size", required = false, defaultValue = "20") int size,
			@RequestParam(name = "anchor", required = false) UUID anchor,
			@AuthenticationPrincipal UserPrincipal principal) {
		return commentService.listComments(slug, principal, sort, page, size, anchor);
	}

	@GetMapping("/comments/{id}/replies")
	public ReplyListDto replies(@PathVariable UUID id,
			@RequestParam(name = "sort", required = false, defaultValue = "recent") String sort,
			@RequestParam(name = "page", required = false, defaultValue = "0") int page,
			@RequestParam(name = "size", required = false, defaultValue = "20") int size,
			@AuthenticationPrincipal UserPrincipal principal) {
		return commentService.listReplies(id, principal, sort, page, size);
	}

	@PostMapping("/{slug}/comments")
	@ResponseStatus(HttpStatus.CREATED)
	public CommentDto addComment(@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable String slug, @Valid @RequestBody CommentRequest request) {
		return commentService.addComment(principal, slug, request);
	}

	@DeleteMapping("/comments/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteComment(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
		commentService.deleteComment(principal, id);
	}

	@PostMapping("/comments/{id}/like")
	public ReactionDto likeComment(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
		return commentService.toggleCommentLike(principal, id);
	}

	@GetMapping("/{slug}/stats")
	public PostStatsDto stats(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String slug) {
		return postStatsService.stats(slug, principal);
	}

	@GetMapping("/stats")
	public List<PostStatsDto> statsList(@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam(name = "slugs", required = false, defaultValue = "") String slugs) {
		List<String> parsed = Arrays.stream(slugs.split(",")).toList();
		return postStatsService.statsFor(parsed, principal);
	}

	@PostMapping("/{slug}/view")
	public PostStatsDto view(@PathVariable String slug) {
		return postStatsService.recordView(slug);
	}

	@PostMapping("/{slug}/like")
	public ReactionDto like(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String slug) {
		return postStatsService.toggleReaction(principal, slug, ReactionKind.LIKE);
	}

	@PostMapping("/{slug}/favorite")
	public ReactionDto favorite(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String slug) {
		return postStatsService.toggleReaction(principal, slug, ReactionKind.FAVORITE);
	}
}

package com.luyu.blog.web;

import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.service.FeedbackService;
import com.luyu.blog.web.dto.FeedbackDtos.FeedbackRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

	private final FeedbackService feedbackService;

	public FeedbackController(FeedbackService feedbackService) {
		this.feedbackService = feedbackService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public void submit(@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody FeedbackRequest request) {
		feedbackService.submit(principal, request.content());
	}
}

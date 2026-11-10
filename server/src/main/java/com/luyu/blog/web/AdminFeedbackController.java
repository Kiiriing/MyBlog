package com.luyu.blog.web;

import com.luyu.blog.service.FeedbackService;
import com.luyu.blog.web.dto.FeedbackDtos.FeedbackDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/feedback")
public class AdminFeedbackController {

	private final FeedbackService feedbackService;

	public AdminFeedbackController(FeedbackService feedbackService) {
		this.feedbackService = feedbackService;
	}

	@GetMapping
	public List<FeedbackDto> list() {
		return feedbackService.listAll();
	}
}

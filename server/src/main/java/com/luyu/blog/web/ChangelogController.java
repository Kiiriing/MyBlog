package com.luyu.blog.web;

import com.luyu.blog.service.ChangelogService;
import com.luyu.blog.web.dto.ChangelogDtos.ChangelogEntryDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/changelog")
public class ChangelogController {

	private final ChangelogService changelogService;

	public ChangelogController(ChangelogService changelogService) {
		this.changelogService = changelogService;
	}

	@GetMapping
	public List<ChangelogEntryDto> list() {
		return changelogService.list();
	}
}

package com.luyu.blog.service;

import com.luyu.blog.repo.ChangelogEntryRepository;
import com.luyu.blog.web.dto.ChangelogDtos.ChangelogEntryDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** 更新页数据：直接读库，按发生时间倒序 */
@Service
public class ChangelogService {

	private static final DateTimeFormatter LOCAL =
			DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm").withZone(ZoneId.of("Asia/Shanghai"));

	private final ChangelogEntryRepository changelogEntryRepository;

	public ChangelogService(ChangelogEntryRepository changelogEntryRepository) {
		this.changelogEntryRepository = changelogEntryRepository;
	}

	@Transactional(readOnly = true)
	public List<ChangelogEntryDto> list() {
		return changelogEntryRepository.findAllByOrderByOccurredAtDesc().stream()
				.map(entry -> new ChangelogEntryDto(
						entry.getVersion(),
						entry.getDateLabel(),
						LOCAL.format(entry.getOccurredAt()),
						entry.getTitle(),
						List.copyOf(entry.getItems())))
				.toList();
	}
}

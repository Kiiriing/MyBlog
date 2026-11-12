package com.luyu.blog.repo;

import com.luyu.blog.domain.ChangelogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChangelogEntryRepository extends JpaRepository<ChangelogEntry, UUID> {

	List<ChangelogEntry> findAllByOrderByOccurredAtDesc();
}

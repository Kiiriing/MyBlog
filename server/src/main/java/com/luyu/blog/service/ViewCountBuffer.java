package com.luyu.blog.service;

import com.luyu.blog.repo.PostStatRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 阅读量先在内存里累加，定时批量写回数据库。
 * 避免每次浏览都去更新同一行，热门文章也不会因为行锁排队。
 */
@Component
public class ViewCountBuffer {

	private static final Logger log = LoggerFactory.getLogger(ViewCountBuffer.class);

	private final PostStatRepository stats;
	private final TransactionTemplate transaction;

	/** 文章 slug -> 还没落库的浏览数 */
	private final Map<String, AtomicLong> pending = new ConcurrentHashMap<>();

	public ViewCountBuffer(PostStatRepository stats, TransactionTemplate transaction) {
		this.stats = stats;
		this.transaction = transaction;
	}

	public void increment(String slug) {
		pending.computeIfAbsent(slug, key -> new AtomicLong()).incrementAndGet();
	}

	/** 还没写进数据库的浏览数，读取统计时要加回去 */
	public long pending(String slug) {
		AtomicLong counter = pending.get(slug);
		return counter == null ? 0 : counter.get();
	}

	@Scheduled(fixedDelayString = "${app.stats.flush-ms:5000}", initialDelayString = "${app.stats.flush-ms:5000}")
	public void flush() {
		Map<String, Long> batch = new HashMap<>();
		pending.forEach((slug, counter) -> {
			long delta = counter.getAndSet(0);
			if (delta > 0) {
				batch.put(slug, delta);
			}
		});
		if (batch.isEmpty()) return;
		try {
			transaction.executeWithoutResult(status -> batch.forEach(stats::addViews));
			pending.entrySet().removeIf(entry -> entry.getValue().get() == 0);
		} catch (RuntimeException error) {
			/* 落库失败就把计数放回去，下一轮重试 */
			batch.forEach(this::add);
			log.warn("阅读量落库失败，已放回内存等待重试", error);
		}
	}

	@PreDestroy
	public void flushOnShutdown() {
		flush();
	}

	private void add(String slug, long delta) {
		pending.computeIfAbsent(slug, key -> new AtomicLong()).addAndGet(delta);
	}
}

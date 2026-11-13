package com.luyu.blog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * 更新页数据以 {@code db/changelog-seed.sql} 为唯一来源，每次启动都重建。
 *
 * <p>页面没有写入接口，表里只是脚本的镜像，所以直接清空重灌最省事：
 * 既能把新版本补进去，也不会重复插入。清空顺序遵守外键：先条目后版本。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class ChangelogSeedInitializer implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(ChangelogSeedInitializer.class);

	private final JdbcTemplate jdbc;

	private final DataSource dataSource;

	public ChangelogSeedInitializer(JdbcTemplate jdbc, DataSource dataSource) {
		this.jdbc = jdbc;
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) {
		ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
				new ClassPathResource("db/changelog-seed.sql"));
		populator.setSqlScriptEncoding("UTF-8");

		jdbc.update("delete from changelog_items");
		jdbc.update("delete from changelog_entries");
		populator.execute(dataSource);
		log.info("更新页数据已按脚本同步：changelog_entries={}", count());
	}

	private long count() {
		Long value = jdbc.queryForObject("select count(*) from changelog_entries", Long.class);
		return value == null ? 0 : value;
	}
}

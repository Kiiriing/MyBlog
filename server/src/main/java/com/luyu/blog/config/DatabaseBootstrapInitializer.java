package com.luyu.blog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

/**
 * 启动前确认目标数据库存在，不存在就自动创建。
 *
 * <p>表结构仍然交给 Hibernate：{@code spring.jpa.hibernate.ddl-auto=update} 每次启动都会
 * 比对实体和库里的表，缺表建表、缺列补列，所以这里只需要补上「库本身还没建」这一层——
 * 库不存在时 DataSource 根本连不上，Hibernate 也就没机会建表。
 *
 * <p>连接串指向的是业务库，不能用来建库，因此先连同一实例的维护库 postgres
 * （没有就退回 template1），查 pg_database 判断目标库是否存在，再执行 CREATE DATABASE。
 * 建库语句不指定 LC_COLLATE，直接继承目标集群 template0 的默认区域，跨平台可用。
 */
public class DatabaseBootstrapInitializer
		implements ApplicationContextInitializer<ConfigurableApplicationContext> {

	private static final Logger log = LoggerFactory.getLogger(DatabaseBootstrapInitializer.class);

	private static final String JDBC_PREFIX = "jdbc:postgresql:";

	private static final List<String> MAINTENANCE_DATABASES = List.of("postgres", "template1");

	@Override
	public void initialize(ConfigurableApplicationContext context) {
		Environment environment = context.getEnvironment();
		String url = environment.getProperty("spring.datasource.url");
		if (url == null || !url.startsWith(JDBC_PREFIX)) {
			return;
		}

		String rest = url.substring(JDBC_PREFIX.length());
		int query = rest.indexOf('?');
		if (query >= 0) {
			rest = rest.substring(0, query);
		}

		String authority;
		String database;
		if (rest.startsWith("//")) {
			int slash = rest.indexOf('/', 2);
			if (slash < 0) {
				return;
			}
			authority = rest.substring(2, slash);
			database = rest.substring(slash + 1);
		} else {
			authority = null;
			database = rest;
		}
		if (database.isEmpty()) {
			return;
		}

		String username = environment.getProperty("spring.datasource.username");
		String password = environment.getProperty("spring.datasource.password", "");

		SQLException failure = null;
		for (String maintenance : MAINTENANCE_DATABASES) {
			String maintenanceUrl = authority == null
					? JDBC_PREFIX + maintenance
					: JDBC_PREFIX + "//" + authority + "/" + maintenance;
			try {
				ensureDatabase(maintenanceUrl, database, username, password);
				return;
			} catch (SQLException exception) {
				failure = exception;
			}
		}
		log.warn("检查 / 创建数据库 {} 失败，若库还不存在请手动创建：{}", database,
				failure == null ? "未知错误" : failure.getMessage());
	}

	/**
	 * 连上维护库，确认目标库是否存在，不存在则创建。
	 *
	 * @throws SQLException 维护库连不上，或建库失败
	 */
	private void ensureDatabase(String maintenanceUrl, String database, String username, String password)
			throws SQLException {
		try (Connection connection = DriverManager.getConnection(maintenanceUrl, username, password)) {
			if (exists(connection, database)) {
				log.debug("数据库 {} 已存在", database);
				return;
			}
			try (Statement statement = connection.createStatement()) {
				statement.execute("CREATE DATABASE " + quote(database)
						+ " WITH TEMPLATE = template0 ENCODING = 'UTF8'");
			}
			log.info("数据库 {} 不存在，已自动创建（表结构由 Hibernate 随后补全）", database);
		}
	}

	private boolean exists(Connection connection, String database) throws SQLException {
		try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
			statement.setString(1, database);
			try (ResultSet result = statement.executeQuery()) {
				return result.next();
			}
		}
	}

	private String quote(String identifier) {
		return '"' + identifier.replace("\"", "\"\"") + '"';
	}
}

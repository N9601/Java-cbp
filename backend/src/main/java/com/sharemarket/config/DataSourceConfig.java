package com.sharemarket.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Builds the connection pool from db.url / db.user / db.password and adds
 * the Connector/J options the application relies on (UTC session time zone,
 * batched inserts, create-if-missing) unless the URL already sets them.
 */
@Configuration
public class DataSourceConfig {

    @Bean(destroyMethod = "close")
    public DataSource dataSource(@Value("${db.url}") String url,
                                 @Value("${db.user}") String user,
                                 @Value("${db.password:}") String password) {
        HikariConfig config = new HikariConfig();
        config.setPoolName("share-market");
        config.setJdbcUrl(withDefaults(url));
        config.setUsername(user);
        config.setPassword(password);
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        return new HikariDataSource(config);
    }

    public static String withDefaults(String url) {
        Map<String, String> defaults = new LinkedHashMap<>();
        defaults.put("createDatabaseIfNotExist", "true");
        defaults.put("connectionTimeZone", "UTC");
        defaults.put("forceConnectionTimeZoneToSession", "true");
        defaults.put("rewriteBatchedStatements", "true");
        defaults.put("allowPublicKeyRetrieval", "true");
        defaults.put("useSSL", "false");
        defaults.put("characterEncoding", "UTF-8");

        StringBuilder sb = new StringBuilder(url.trim());
        String lower = url.toLowerCase(Locale.ROOT);
        char separator = url.contains("?") ? '&' : '?';
        for (Map.Entry<String, String> e : defaults.entrySet()) {
            if (!lower.contains(e.getKey().toLowerCase(Locale.ROOT) + "=")) {
                sb.append(separator).append(e.getKey()).append('=').append(e.getValue());
                separator = '&';
            }
        }
        return sb.toString();
    }
}

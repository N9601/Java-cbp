package com.sharemarket.seed;

import com.sharemarket.util.DBConnection;
import com.sharemarket.util.SqlScriptRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

/**
 * Creates the tables, view and triggers on start-up. The scripts are
 * idempotent, so running them against an existing database is harmless.
 */
@Component
@Order(1)
public class DatabaseInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);
    static final List<String> SCRIPTS = List.of("db/01_schema.sql", "db/02_views_triggers.sql");

    private final DBConnection db;

    public DatabaseInitializer(DBConnection db) {
        this.db = db;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection c = db.getConnection()) {
            for (String script : SCRIPTS) {
                SqlScriptRunner.run(c, read(script));
            }
            log.info("Database schema ready on {}", c.getMetaData().getURL().split("\\?")[0]);
        } catch (SQLException e) {
            throw new IllegalStateException("Could not connect to MySQL or create the schema. "
                    + "Check db.url, db.user and db.password in db.properties. Cause: " + e.getMessage(), e);
        }
    }

    public static String read(String classpathLocation) throws java.io.IOException {
        return new ClassPathResource(classpathLocation).getContentAsString(StandardCharsets.UTF_8);
    }
}

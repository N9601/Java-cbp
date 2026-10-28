package com.sharemarket.dao;

import com.sharemarket.config.DataSourceConfig;
import com.sharemarket.model.Role;
import com.sharemarket.model.Stock;
import com.sharemarket.model.User;
import com.sharemarket.seed.DatabaseInitializer;
import com.sharemarket.util.DBConnection;
import com.sharemarket.util.PasswordUtil;
import com.sharemarket.util.SqlScriptRunner;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Base for integration tests. They run against a separate database
 * (share_market_test by default) and are skipped when MySQL is not reachable.
 * Override with -Dtest.db.url=..., -Dtest.db.user=..., -Dtest.db.password=...
 */
public abstract class MySqlTestSupport {
    protected static DBConnection db;

    @BeforeAll
    static void connect() throws Exception {
        String url = setting("test.db.url", "TEST_DB_URL", "jdbc:mysql://localhost:3307/share_market_test");
        String user = setting("test.db.user", "TEST_DB_USER", "root");
        String password = setting("test.db.password", "TEST_DB_PASSWORD", "");
        DriverManagerDataSource ds = new DriverManagerDataSource(DataSourceConfig.withDefaults(url), user, password);
        try (Connection c = ds.getConnection()) {
            for (String script : new String[]{"db/01_schema.sql", "db/02_views_triggers.sql"}) {
                SqlScriptRunner.run(c, DatabaseInitializer.read(script));
            }
        } catch (SQLException e) {
            Assumptions.abort("MySQL test database not reachable (" + e.getMessage() + ")");
        }
        db = new DBConnection(ds);
    }

    @BeforeEach
    void cleanTables() throws SQLException {
        try (Connection c = db.getConnection(); Statement st = c.createStatement()) {
            st.execute("SET FOREIGN_KEY_CHECKS = 0");
            for (String table : new String[]{"price_alerts", "transactions", "holdings", "price_history",
                    "stocks", "users"}) {
                st.execute("TRUNCATE TABLE " + table);
            }
            st.execute("SET FOREIGN_KEY_CHECKS = 1");
        }
    }

    protected static User newInvestor(String email, String balance) throws SQLException {
        return new UserDAO(db).save(new User("Test " + email, email, PasswordUtil.hash("Passw0rd!"),
                Role.INVESTOR, new BigDecimal(balance)));
    }

    protected static Stock newStock(String symbol, String price) throws SQLException {
        return new StockDAO(db).save(new Stock(symbol, symbol + " Ltd", "Testing", new BigDecimal(price)));
    }

    protected static long count(String sql) throws SQLException {
        try (Connection c = db.getConnection(); Statement st = c.createStatement();
             var rs = st.executeQuery(sql)) {
            rs.next();
            return rs.getLong(1);
        }
    }

    private static String setting(String property, String env, String fallback) {
        String v = System.getProperty(property);
        if (v == null) {
            v = System.getenv(env);
        }
        return v == null ? fallback : v;
    }
}

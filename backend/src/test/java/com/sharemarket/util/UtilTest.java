package com.sharemarket.util;

import com.sharemarket.config.DataSourceConfig;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UtilTest {

    @Test
    void passwordHashIsSaltedAndVerifiable() {
        String a = PasswordUtil.hash("Secret123");
        String b = PasswordUtil.hash("Secret123");
        assertTrue(a.startsWith("sha256$"));
        assertNotEquals(a, b, "the same password must not produce the same hash");
        assertTrue(PasswordUtil.verify("Secret123", a));
        assertFalse(PasswordUtil.verify("secret123", a));
        assertFalse(PasswordUtil.verify("Secret123", null));
    }

    @Test
    void verifiesPlainSha256HexToo() {
        // SHA-256("password")
        String plain = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
        assertTrue(PasswordUtil.verify("password", plain));
        assertFalse(PasswordUtil.verify("Password", plain));
    }

    @Test
    void sqlRunnerHonoursDelimiterBlocks() {
        String script = """
                -- comment line
                CREATE TABLE a (id INT);
                USE share_market;
                DROP TRIGGER IF EXISTS t;
                DELIMITER $$
                CREATE TRIGGER t AFTER UPDATE ON a FOR EACH ROW
                BEGIN
                    INSERT INTO b VALUES (1);
                    INSERT INTO b VALUES (2);
                END$$
                DELIMITER ;
                SELECT 1;
                """;
        List<String> statements = SqlScriptRunner.split(script);
        assertEquals(5, statements.size());
        assertTrue(statements.get(3).startsWith("CREATE TRIGGER t"));
        assertTrue(statements.get(3).contains("INSERT INTO b VALUES (2);"));
        assertTrue(statements.get(3).endsWith("END"));
        assertTrue(SqlScriptRunner.selectsDatabase(statements.get(1)));
        assertEquals("SELECT 1", statements.get(4));
    }

    @Test
    void formatsIndianGrouping() {
        assertEquals("1,23,45,678.90", Money.format(new BigDecimal("12345678.9")));
        assertEquals("999.00", Money.format(new BigDecimal("999")));
        assertEquals("1,000.00", Money.format(new BigDecimal("1000")));
        assertEquals("-12,345.50", Money.format(new BigDecimal("-12345.5")));
        assertEquals("+1,00,000.00", Money.signed(new BigDecimal("100000")));
    }

    @Test
    void csvEscapesSeparatorsAndFormulas() {
        assertEquals("\"Larsen, Toubro\"", CsvExporter.escape("Larsen, Toubro"));
        assertEquals("\"say \"\"hi\"\"\"", CsvExporter.escape("say \"hi\""));
        assertEquals("'=SUM(A1)", CsvExporter.escape("=SUM(A1)"));
        assertEquals("-12.50", CsvExporter.escape(new BigDecimal("-12.50")));
    }

    @Test
    void jdbcUrlGetsDefaultsOnlyWhenMissing() {
        String url = DataSourceConfig.withDefaults("jdbc:mysql://localhost:3306/share_market");
        assertTrue(url.startsWith("jdbc:mysql://localhost:3306/share_market?createDatabaseIfNotExist=true&"));
        assertTrue(url.contains("connectionTimeZone=UTC"));

        String custom = DataSourceConfig.withDefaults("jdbc:mysql://h/db?useSSL=true");
        assertTrue(custom.contains("useSSL=true"));
        assertFalse(custom.contains("useSSL=false"));
    }
}

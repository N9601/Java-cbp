package com.sharemarket.util;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Runs the same .sql files that are used in MySQL Workbench, including the
 * DELIMITER blocks around triggers. CREATE DATABASE and USE are skipped so
 * the scripts run against whichever database the connection points at.
 */
public final class SqlScriptRunner {

    private SqlScriptRunner() {
    }

    public static List<String> split(String script) {
        List<String> statements = new ArrayList<>();
        String delimiter = ";";
        StringBuilder current = new StringBuilder();
        for (String rawLine : script.split("\\R")) {
            String line = rawLine.strip();
            if (line.isEmpty() && current.isEmpty()) {
                continue;
            }
            if (line.startsWith("--") || line.startsWith("#")) {
                continue;
            }
            if (line.toUpperCase(Locale.ROOT).startsWith("DELIMITER ")) {
                delimiter = line.substring("DELIMITER ".length()).strip();
                continue;
            }
            current.append(rawLine).append('\n');
            String text = current.toString().stripTrailing();
            if (text.endsWith(delimiter)) {
                String statement = text.substring(0, text.length() - delimiter.length()).strip();
                if (!statement.isEmpty()) {
                    statements.add(statement);
                }
                current.setLength(0);
            }
        }
        String rest = current.toString().strip();
        if (!rest.isEmpty()) {
            statements.add(rest);
        }
        return statements;
    }

    public static void run(Connection connection, String script) throws SQLException {
        try (Statement st = connection.createStatement()) {
            for (String sql : split(script)) {
                if (selectsDatabase(sql)) {
                    continue;
                }
                st.execute(sql);
            }
        }
    }

    static boolean selectsDatabase(String sql) {
        String upper = sql.toUpperCase(Locale.ROOT);
        return upper.startsWith("USE ") || upper.startsWith("CREATE DATABASE") || upper.startsWith("CREATE SCHEMA");
    }
}

package com.sharemarket.util;

import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Single shared source of JDBC connections (a singleton bean). Connections
 * come from a HikariCP pool, so a trade and a simulator tick each get their
 * own Connection and never share an open transaction.
 */
@Component
public class DBConnection {
    private final DataSource dataSource;

    public DBConnection(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
}

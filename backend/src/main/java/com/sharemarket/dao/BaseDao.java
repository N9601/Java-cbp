package com.sharemarket.dao;

import com.sharemarket.util.DBConnection;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

abstract class BaseDao {
    protected final DBConnection db;

    protected BaseDao(DBConnection db) {
        this.db = db;
    }

    protected static Timestamp ts(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    protected static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp t = rs.getTimestamp(column);
        return t == null ? null : t.toInstant();
    }

    protected static void bind(PreparedStatement ps, List<Object> params) throws SQLException {
        for (int i = 0; i < params.size(); i++) {
            ps.setObject(i + 1, params.get(i));
        }
    }

    protected static int generatedKey(PreparedStatement ps) throws SQLException {
        try (ResultSet keys = ps.getGeneratedKeys()) {
            if (!keys.next()) {
                throw new SQLException("No generated key returned");
            }
            return keys.getInt(1);
        }
    }
}

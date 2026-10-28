package com.sharemarket.dao;

import com.sharemarket.dto.Page;
import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnFilter;
import com.sharemarket.model.TxnType;
import com.sharemarket.util.DBConnection;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class TransactionDAO extends BaseDao implements Dao<Transaction> {
    private static final String SELECT_JOINED = """
            SELECT t.txn_id, t.user_id, t.stock_id, t.txn_type, t.quantity, t.price, t.txn_time,
                   s.symbol, s.company_name, u.name AS user_name, u.email AS user_email
            FROM transactions t
            JOIN stocks s ON s.stock_id = t.stock_id
            JOIN users u ON u.user_id = t.user_id
            """;

    public TransactionDAO(DBConnection db) {
        super(db);
    }

    @Override
    public Optional<Transaction> find(long id) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement(SELECT_JOINED + " WHERE t.txn_id = ?")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    @Override
    public List<Transaction> findAll() throws SQLException {
        return query(SELECT_JOINED + " ORDER BY t.txn_time DESC, t.txn_id DESC", List.of());
    }

    /** All of a user's trades, oldest first, for replaying realised P/L. */
    public List<Transaction> findAllForUser(int userId) throws SQLException {
        return query(SELECT_JOINED + " WHERE t.user_id = ? ORDER BY t.txn_time, t.txn_id", List.of(userId));
    }

    public Page<Transaction> search(TxnFilter f) throws SQLException {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (f.userId() != null) {
            where.append(" AND t.user_id = ?");
            params.add(f.userId());
        }
        if (f.symbol() != null && !f.symbol().isBlank()) {
            where.append(" AND s.symbol = ?");
            params.add(f.symbol().trim().toUpperCase());
        }
        if (f.type() != null) {
            where.append(" AND t.txn_type = ?");
            params.add(f.type().name());
        }
        if (f.from() != null) {
            where.append(" AND t.txn_time >= ?");
            params.add(ts(f.from()));
        }
        if (f.to() != null) {
            where.append(" AND t.txn_time < ?");
            params.add(ts(f.to()));
        }
        if (f.query() != null && !f.query().isBlank()) {
            where.append(" AND (u.name LIKE ? OR u.email LIKE ? OR s.symbol LIKE ?)");
            String like = "%" + f.query().trim() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }

        long total;
        String countSql = "SELECT COUNT(*) FROM transactions t JOIN stocks s ON s.stock_id = t.stock_id "
                + "JOIN users u ON u.user_id = t.user_id" + where;
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(countSql)) {
            bind(ps, params);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                total = rs.getLong(1);
            }
        }

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(f.size());
        pageParams.add(f.page() * f.size());
        List<Transaction> items = query(SELECT_JOINED + where + " ORDER BY t.txn_time DESC, t.txn_id DESC LIMIT ? OFFSET ?",
                pageParams);
        return new Page<>(items, total, f.page(), f.size());
    }

    @Override
    public Transaction save(Transaction txn) throws SQLException {
        try (Connection c = db.getConnection()) {
            return insert(c, txn);
        }
    }

    public Transaction insert(Connection c, Transaction t) throws SQLException {
        String sql = "INSERT INTO transactions (user_id, stock_id, txn_type, quantity, price, txn_time) "
                + "VALUES (?, ?, ?, ?, ?, ?)";
        try (PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, t.getUserId());
            ps.setInt(2, t.getStockId());
            ps.setString(3, t.getType().name());
            ps.setInt(4, t.getQuantity());
            ps.setBigDecimal(5, t.getPrice());
            ps.setTimestamp(6, ts(t.getTxnTime()));
            ps.executeUpdate();
            t.setTxnId(generatedKey(ps));
        }
        return t;
    }

    /** Trades are an audit record and are never edited. */
    @Override
    public boolean update(Transaction entity) {
        throw new UnsupportedOperationException("Transactions are immutable");
    }

    @Override
    public boolean delete(long id) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("DELETE FROM transactions WHERE txn_id = ?")) {
            ps.setLong(1, id);
            return ps.executeUpdate() == 1;
        }
    }

    public long countSince(Instant since) throws SQLException {
        String sql = "SELECT COUNT(*) FROM transactions" + (since == null ? "" : " WHERE txn_time >= ?");
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            if (since != null) {
                ps.setTimestamp(1, ts(since));
            }
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }

    public BigDecimal volumeSince(Instant since) throws SQLException {
        String sql = "SELECT COALESCE(SUM(quantity * price), 0) FROM transactions WHERE txn_time >= ?";
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setTimestamp(1, ts(since));
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getBigDecimal(1);
            }
        }
    }

    /** Trade count and value per UTC day since the instant: {count, volume}. */
    public Map<LocalDate, Object[]> dailyActivity(Instant since) throws SQLException {
        String sql = """
                SELECT DATE(txn_time) AS day, COUNT(*) AS trades, SUM(quantity * price) AS volume
                FROM transactions
                WHERE txn_time >= ?
                GROUP BY day
                ORDER BY day
                """;
        Map<LocalDate, Object[]> days = new LinkedHashMap<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setTimestamp(1, ts(since));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    days.put(rs.getObject("day", LocalDate.class),
                            new Object[]{rs.getLong("trades"), rs.getBigDecimal("volume")});
                }
            }
        }
        return days;
    }

    /** Most traded symbols by value since the instant: symbol, trades, volume. */
    public List<Object[]> mostTraded(Instant since, int limit) throws SQLException {
        String sql = """
                SELECT s.symbol, s.company_name, COUNT(*) AS trades, SUM(t.quantity * t.price) AS volume
                FROM transactions t JOIN stocks s ON s.stock_id = t.stock_id
                WHERE t.txn_time >= ?
                GROUP BY s.stock_id, s.symbol, s.company_name
                ORDER BY volume DESC
                LIMIT ?
                """;
        List<Object[]> rows = new ArrayList<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setTimestamp(1, ts(since));
            ps.setInt(2, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    rows.add(new Object[]{rs.getString("symbol"), rs.getString("company_name"),
                            rs.getLong("trades"), rs.getBigDecimal("volume")});
                }
            }
        }
        return rows;
    }

    private List<Transaction> query(String sql, List<Object> params) throws SQLException {
        List<Transaction> rows = new ArrayList<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            bind(ps, params);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    rows.add(map(rs));
                }
            }
        }
        return rows;
    }

    private static Transaction map(ResultSet rs) throws SQLException {
        Transaction t = new Transaction();
        t.setTxnId(rs.getLong("txn_id"));
        t.setUserId(rs.getInt("user_id"));
        t.setStockId(rs.getInt("stock_id"));
        t.setType(TxnType.valueOf(rs.getString("txn_type")));
        t.setQuantity(rs.getInt("quantity"));
        t.setPrice(rs.getBigDecimal("price"));
        t.setTxnTime(instant(rs, "txn_time"));
        t.setSymbol(rs.getString("symbol"));
        t.setCompanyName(rs.getString("company_name"));
        t.setUserName(rs.getString("user_name"));
        t.setUserEmail(rs.getString("user_email"));
        return t;
    }
}

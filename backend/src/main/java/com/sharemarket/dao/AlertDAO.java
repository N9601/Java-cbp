package com.sharemarket.dao;

import com.sharemarket.model.AlertCondition;
import com.sharemarket.model.PriceAlert;
import com.sharemarket.util.DBConnection;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Repository
public class AlertDAO extends BaseDao implements Dao<PriceAlert> {
    private static final String SELECT_JOINED = """
            SELECT a.alert_id, a.user_id, a.stock_id, a.target_price, a.alert_condition, a.is_triggered,
                   a.created_at, a.triggered_at, s.symbol, s.company_name, s.current_price
            FROM price_alerts a
            JOIN stocks s ON s.stock_id = a.stock_id
            """;

    public AlertDAO(DBConnection db) {
        super(db);
    }

    @Override
    public Optional<PriceAlert> find(long id) throws SQLException {
        List<PriceAlert> rows = query(SELECT_JOINED + " WHERE a.alert_id = ?", id);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public List<PriceAlert> findAll() throws SQLException {
        return query(SELECT_JOINED + " ORDER BY a.created_at DESC");
    }

    public List<PriceAlert> findByUser(int userId) throws SQLException {
        return query(SELECT_JOINED + " WHERE a.user_id = ? ORDER BY a.is_triggered, a.created_at DESC", userId);
    }

    /** Active alerts whose condition is met at the current stock price. */
    public List<PriceAlert> findTriggerable() throws SQLException {
        return query(SELECT_JOINED + """
                 WHERE a.is_triggered = FALSE
                   AND ((a.alert_condition = 'ABOVE' AND s.current_price >= a.target_price)
                     OR (a.alert_condition = 'BELOW' AND s.current_price <= a.target_price))
                """);
    }

    /** Same check limited to one stock. */
    public List<PriceAlert> findTriggerable(int stockId) throws SQLException {
        return query(SELECT_JOINED + """
                 WHERE a.stock_id = ? AND a.is_triggered = FALSE
                   AND ((a.alert_condition = 'ABOVE' AND s.current_price >= a.target_price)
                     OR (a.alert_condition = 'BELOW' AND s.current_price <= a.target_price))
                """, stockId);
    }

    /**
     * Moves alerts from ACTIVE to TRIGGERED. The is_triggered guard means an
     * alert fires once even if two ticks race.
     */
    public int markTriggered(List<Integer> alertIds, Instant at) throws SQLException {
        if (alertIds.isEmpty()) {
            return 0;
        }
        String placeholders = String.join(", ", Collections.nCopies(alertIds.size(), "?"));
        String sql = "UPDATE price_alerts SET is_triggered = TRUE, triggered_at = ? "
                + "WHERE is_triggered = FALSE AND alert_id IN (" + placeholders + ")";
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setTimestamp(1, ts(at));
            for (int i = 0; i < alertIds.size(); i++) {
                ps.setInt(i + 2, alertIds.get(i));
            }
            return ps.executeUpdate();
        }
    }

    @Override
    public PriceAlert save(PriceAlert alert) throws SQLException {
        String sql = "INSERT INTO price_alerts (user_id, stock_id, target_price, alert_condition) VALUES (?, ?, ?, ?)";
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, alert.getUserId());
            ps.setInt(2, alert.getStockId());
            ps.setBigDecimal(3, alert.getTargetPrice());
            ps.setString(4, alert.getCondition().name());
            ps.executeUpdate();
            alert.setAlertId(generatedKey(ps));
        }
        return alert;
    }

    @Override
    public boolean update(PriceAlert alert) throws SQLException {
        String sql = "UPDATE price_alerts SET target_price = ?, alert_condition = ?, is_triggered = ?, "
                + "triggered_at = ? WHERE alert_id = ?";
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setBigDecimal(1, alert.getTargetPrice());
            ps.setString(2, alert.getCondition().name());
            ps.setBoolean(3, alert.isTriggered());
            ps.setTimestamp(4, ts(alert.getTriggeredAt()));
            ps.setInt(5, alert.getAlertId());
            return ps.executeUpdate() == 1;
        }
    }

    @Override
    public boolean delete(long id) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("DELETE FROM price_alerts WHERE alert_id = ?")) {
            ps.setLong(1, id);
            return ps.executeUpdate() == 1;
        }
    }

    /** Deletes only if the alert belongs to the user. */
    public boolean deleteOwned(int alertId, int userId) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("DELETE FROM price_alerts WHERE alert_id = ? AND user_id = ?")) {
            ps.setInt(1, alertId);
            ps.setInt(2, userId);
            return ps.executeUpdate() == 1;
        }
    }

    private List<PriceAlert> query(String sql, Object... params) throws SQLException {
        List<PriceAlert> rows = new ArrayList<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            bind(ps, List.of(params));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    rows.add(map(rs));
                }
            }
        }
        return rows;
    }

    private static PriceAlert map(ResultSet rs) throws SQLException {
        PriceAlert a = new PriceAlert();
        a.setAlertId(rs.getInt("alert_id"));
        a.setUserId(rs.getInt("user_id"));
        a.setStockId(rs.getInt("stock_id"));
        a.setTargetPrice(rs.getBigDecimal("target_price"));
        a.setCondition(AlertCondition.valueOf(rs.getString("alert_condition")));
        a.setTriggered(rs.getBoolean("is_triggered"));
        a.setCreatedAt(instant(rs, "created_at"));
        a.setTriggeredAt(instant(rs, "triggered_at"));
        a.setSymbol(rs.getString("symbol"));
        a.setCompanyName(rs.getString("company_name"));
        a.setCurrentPrice(rs.getBigDecimal("current_price"));
        return a;
    }
}

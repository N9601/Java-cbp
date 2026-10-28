package com.sharemarket.dao;

import com.sharemarket.model.Holding;
import com.sharemarket.util.DBConnection;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class HoldingDAO extends BaseDao implements Dao<Holding> {
    private static final String COLUMNS = "holding_id, user_id, stock_id, quantity, avg_buy_price";

    public HoldingDAO(DBConnection db) {
        super(db);
    }

    @Override
    public Optional<Holding> find(long id) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT " + COLUMNS + " FROM holdings WHERE holding_id = ?")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    public Optional<Holding> findForUpdate(Connection c, int userId, int stockId) throws SQLException {
        String sql = "SELECT " + COLUMNS + " FROM holdings WHERE user_id = ? AND stock_id = ? FOR UPDATE";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, stockId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    @Override
    public List<Holding> findAll() throws SQLException {
        List<Holding> rows = new ArrayList<>();
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT " + COLUMNS + " FROM holdings ORDER BY holding_id");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                rows.add(map(rs));
            }
        }
        return rows;
    }

    /** The user's holdings valued at current prices, through portfolio_view. */
    public List<Holding> findPortfolio(int userId) throws SQLException {
        String sql = """
                SELECT holding_id, user_id, stock_id, symbol, company_name, sector,
                       quantity, avg_buy_price, current_price
                FROM portfolio_view
                WHERE user_id = ? AND quantity > 0
                ORDER BY market_value DESC
                """;
        List<Holding> rows = new ArrayList<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Holding h = map(rs);
                    h.setSymbol(rs.getString("symbol"));
                    h.setCompanyName(rs.getString("company_name"));
                    h.setSector(rs.getString("sector"));
                    h.setCurrentPrice(rs.getBigDecimal("current_price"));
                    rows.add(h);
                }
            }
        }
        return rows;
    }

    public BigDecimal totalMarketValue() throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT COALESCE(SUM(market_value), 0) FROM portfolio_view");
             ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getBigDecimal(1);
        }
    }

    @Override
    public Holding save(Holding holding) throws SQLException {
        try (Connection c = db.getConnection()) {
            return insert(c, holding);
        }
    }

    public Holding insert(Connection c, Holding h) throws SQLException {
        String sql = "INSERT INTO holdings (user_id, stock_id, quantity, avg_buy_price) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, h.getUserId());
            ps.setInt(2, h.getStockId());
            ps.setInt(3, h.getQuantity());
            ps.setBigDecimal(4, h.getAvgBuyPrice());
            ps.executeUpdate();
            h.setHoldingId(generatedKey(ps));
        }
        return h;
    }

    @Override
    public boolean update(Holding holding) throws SQLException {
        try (Connection c = db.getConnection()) {
            return update(c, holding);
        }
    }

    public boolean update(Connection c, Holding h) throws SQLException {
        String sql = "UPDATE holdings SET quantity = ?, avg_buy_price = ? WHERE holding_id = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, h.getQuantity());
            ps.setBigDecimal(2, h.getAvgBuyPrice());
            ps.setInt(3, h.getHoldingId());
            return ps.executeUpdate() == 1;
        }
    }

    @Override
    public boolean delete(long id) throws SQLException {
        try (Connection c = db.getConnection()) {
            return delete(c, id);
        }
    }

    public boolean delete(Connection c, long id) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("DELETE FROM holdings WHERE holding_id = ?")) {
            ps.setLong(1, id);
            return ps.executeUpdate() == 1;
        }
    }

    private static Holding map(ResultSet rs) throws SQLException {
        Holding h = new Holding();
        h.setHoldingId(rs.getInt("holding_id"));
        h.setUserId(rs.getInt("user_id"));
        h.setStockId(rs.getInt("stock_id"));
        h.setQuantity(rs.getInt("quantity"));
        h.setAvgBuyPrice(rs.getBigDecimal("avg_buy_price"));
        return h;
    }
}

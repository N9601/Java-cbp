package com.sharemarket.dao;

import com.sharemarket.model.PricePoint;
import com.sharemarket.model.PriceTick;
import com.sharemarket.model.Stock;
import com.sharemarket.util.DBConnection;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Data access for stocks and their price_history. */
@Repository
public class StockDAO extends BaseDao implements Dao<Stock> {
    private static final String COLUMNS = "stock_id, symbol, company_name, sector, current_price, updated_at";

    public StockDAO(DBConnection db) {
        super(db);
    }

    @Override
    public Optional<Stock> find(long id) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT " + COLUMNS + " FROM stocks WHERE stock_id = ?")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    public Optional<Stock> findBySymbol(String symbol) throws SQLException {
        try (Connection c = db.getConnection()) {
            return findBySymbol(c, symbol);
        }
    }

    /** Reads the stock inside an open trade transaction. */
    public Optional<Stock> findBySymbol(Connection c, String symbol) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT " + COLUMNS + " FROM stocks WHERE symbol = ?")) {
            ps.setString(1, symbol);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    @Override
    public List<Stock> findAll() throws SQLException {
        List<Stock> stocks = new ArrayList<>();
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT " + COLUMNS + " FROM stocks ORDER BY symbol");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                stocks.add(map(rs));
            }
        }
        return stocks;
    }

    public long count() throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM stocks");
             ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getLong(1);
        }
    }

    @Override
    public Stock save(Stock stock) throws SQLException {
        String sql = "INSERT INTO stocks (symbol, company_name, sector, current_price) VALUES (?, ?, ?, ?)";
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, stock.getSymbol());
            ps.setString(2, stock.getCompanyName());
            ps.setString(3, stock.getSector());
            ps.setBigDecimal(4, stock.getCurrentPrice());
            ps.executeUpdate();
            stock.setStockId(generatedKey(ps));
        }
        return stock;
    }

    /** The symbol is the stock's public identity and is not changed here. */
    @Override
    public boolean update(Stock stock) throws SQLException {
        String sql = "UPDATE stocks SET company_name = ?, sector = ?, current_price = ? WHERE stock_id = ?";
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, stock.getCompanyName());
            ps.setString(2, stock.getSector());
            ps.setBigDecimal(3, stock.getCurrentPrice());
            ps.setInt(4, stock.getStockId());
            return ps.executeUpdate() == 1;
        }
    }

    @Override
    public boolean delete(long id) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("DELETE FROM stocks WHERE stock_id = ?")) {
            ps.setLong(1, id);
            return ps.executeUpdate() == 1;
        }
    }

    /** True when holdings or transactions still reference the stock. */
    public boolean isReferenced(long stockId) throws SQLException {
        String sql = "SELECT EXISTS(SELECT 1 FROM holdings WHERE stock_id = ?) "
                + "OR EXISTS(SELECT 1 FROM transactions WHERE stock_id = ?)";
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, stockId);
            ps.setLong(2, stockId);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getBoolean(1);
            }
        }
    }

    /**
     * Applies one simulator tick in a single transaction. trg_price_log
     * writes a price_history row for every price that changes.
     */
    public void updatePrices(Map<Integer, BigDecimal> prices) throws SQLException {
        if (prices.isEmpty()) {
            return;
        }
        try (Connection c = db.getConnection()) {
            c.setAutoCommit(false);
            try (PreparedStatement ps = c.prepareStatement("UPDATE stocks SET current_price = ? WHERE stock_id = ?")) {
                for (Map.Entry<Integer, BigDecimal> e : prices.entrySet()) {
                    ps.setBigDecimal(1, e.getValue());
                    ps.setInt(2, e.getKey());
                    ps.addBatch();
                }
                ps.executeBatch();
                c.commit();
            } catch (SQLException e) {
                c.rollback();
                throw e;
            } finally {
                c.setAutoCommit(true);
            }
        }
    }

    /** Average price per time bucket since the given instant, oldest first. */
    public List<PricePoint> history(int stockId, Instant since, int bucketSeconds) throws SQLException {
        String sql = """
                SELECT FLOOR(UNIX_TIMESTAMP(recorded_at) / ?) AS bucket, AVG(price) AS price
                FROM price_history
                WHERE stock_id = ? AND recorded_at >= ?
                GROUP BY bucket
                ORDER BY bucket
                """;
        List<PricePoint> points = new ArrayList<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, bucketSeconds);
            ps.setInt(2, stockId);
            ps.setTimestamp(3, ts(since));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Instant at = Instant.ofEpochSecond(rs.getLong("bucket") * bucketSeconds);
                    points.add(new PricePoint(at, rs.getBigDecimal("price").setScale(2, RoundingMode.HALF_UP)));
                }
            }
        }
        return points;
    }

    /** Latest price at or before the instant, falling back to the oldest known price. */
    public Map<Integer, BigDecimal> referencePrices(Instant at) throws SQLException {
        String sql = """
                SELECT s.stock_id,
                       COALESCE(
                         (SELECT ph.price FROM price_history ph
                          WHERE ph.stock_id = s.stock_id AND ph.recorded_at <= ?
                          ORDER BY ph.recorded_at DESC, ph.history_id DESC LIMIT 1),
                         (SELECT ph.price FROM price_history ph
                          WHERE ph.stock_id = s.stock_id
                          ORDER BY ph.recorded_at, ph.history_id LIMIT 1),
                         s.current_price) AS ref_price
                FROM stocks s
                """;
        Map<Integer, BigDecimal> refs = new HashMap<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setTimestamp(1, ts(at));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    refs.put(rs.getInt("stock_id"), rs.getBigDecimal("ref_price"));
                }
            }
        }
        return refs;
    }

    /** The recorded price of one stock at or just before the instant. */
    public Optional<BigDecimal> priceAt(int stockId, Instant at) throws SQLException {
        String sql = "SELECT price FROM price_history WHERE stock_id = ? AND recorded_at <= ? "
                + "ORDER BY recorded_at DESC, history_id DESC LIMIT 1";
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, stockId);
            ps.setTimestamp(2, ts(at));
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(rs.getBigDecimal(1)) : Optional.empty();
            }
        }
    }

    /** [low, high] per stock since the instant. */
    public Map<Integer, BigDecimal[]> rangeSince(Instant since) throws SQLException {
        String sql = "SELECT stock_id, MIN(price) AS low, MAX(price) AS high FROM price_history "
                + "WHERE recorded_at >= ? GROUP BY stock_id";
        Map<Integer, BigDecimal[]> ranges = new HashMap<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setTimestamp(1, ts(since));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    ranges.put(rs.getInt("stock_id"),
                            new BigDecimal[]{rs.getBigDecimal("low"), rs.getBigDecimal("high")});
                }
            }
        }
        return ranges;
    }

    /** Bucketed price series per stock, for the small trend lines in the market table. */
    public Map<Integer, List<BigDecimal>> sparklines(Instant since, int bucketSeconds) throws SQLException {
        String sql = """
                SELECT stock_id, FLOOR(UNIX_TIMESTAMP(recorded_at) / ?) AS bucket, AVG(price) AS price
                FROM price_history
                WHERE recorded_at >= ?
                GROUP BY stock_id, bucket
                ORDER BY stock_id, bucket
                """;
        Map<Integer, List<BigDecimal>> series = new LinkedHashMap<>();
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, bucketSeconds);
            ps.setTimestamp(2, ts(since));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    series.computeIfAbsent(rs.getInt("stock_id"), k -> new ArrayList<>())
                            .add(rs.getBigDecimal("price").setScale(2, RoundingMode.HALF_UP));
                }
            }
        }
        return series;
    }

    public void insertHistory(List<PriceTick> ticks) throws SQLException {
        String sql = "INSERT INTO price_history (stock_id, price, recorded_at) VALUES (?, ?, ?)";
        try (Connection c = db.getConnection()) {
            c.setAutoCommit(false);
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                int pending = 0;
                for (PriceTick t : ticks) {
                    ps.setInt(1, t.stockId());
                    ps.setBigDecimal(2, t.price());
                    ps.setTimestamp(3, ts(t.time()));
                    ps.addBatch();
                    if (++pending == 2000) {
                        ps.executeBatch();
                        pending = 0;
                    }
                }
                if (pending > 0) {
                    ps.executeBatch();
                }
                c.commit();
            } catch (SQLException e) {
                c.rollback();
                throw e;
            } finally {
                c.setAutoCommit(true);
            }
        }
    }

    public long countHistory() throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM price_history");
             ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getLong(1);
        }
    }

    public int deleteHistoryBefore(Instant cutoff) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("DELETE FROM price_history WHERE recorded_at < ?")) {
            ps.setTimestamp(1, ts(cutoff));
            return ps.executeUpdate();
        }
    }

    private static Stock map(ResultSet rs) throws SQLException {
        Stock s = new Stock();
        s.setStockId(rs.getInt("stock_id"));
        s.setSymbol(rs.getString("symbol"));
        s.setCompanyName(rs.getString("company_name"));
        s.setSector(rs.getString("sector"));
        s.setCurrentPrice(rs.getBigDecimal("current_price"));
        s.setUpdatedAt(instant(rs, "updated_at"));
        return s;
    }
}

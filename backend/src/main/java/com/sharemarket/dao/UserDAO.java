package com.sharemarket.dao;

import com.sharemarket.dto.UserSummary;
import com.sharemarket.model.Role;
import com.sharemarket.model.User;
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
public class UserDAO extends BaseDao implements Dao<User> {
    private static final String COLUMNS = "user_id, name, email, password_hash, role, balance, created_at";

    public UserDAO(DBConnection db) {
        super(db);
    }

    @Override
    public Optional<User> find(long id) throws SQLException {
        try (Connection c = db.getConnection()) {
            return find(c, id, false);
        }
    }

    /** Locks the user row for the rest of the transaction; serialises trades per user. */
    public Optional<User> findForUpdate(Connection c, long id) throws SQLException {
        return find(c, id, true);
    }

    private Optional<User> find(Connection c, long id, boolean lock) throws SQLException {
        String sql = "SELECT " + COLUMNS + " FROM users WHERE user_id = ?" + (lock ? " FOR UPDATE" : "");
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    public Optional<User> findByEmail(String email) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT " + COLUMNS + " FROM users WHERE email = ?")) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    @Override
    public List<User> findAll() throws SQLException {
        List<User> users = new ArrayList<>();
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT " + COLUMNS + " FROM users ORDER BY created_at DESC");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                users.add(map(rs));
            }
        }
        return users;
    }

    @Override
    public User save(User user) throws SQLException {
        try (Connection c = db.getConnection()) {
            return save(c, user);
        }
    }

    public User save(Connection c, User user) throws SQLException {
        String sql = "INSERT INTO users (name, email, password_hash, role, balance) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, user.getName());
            ps.setString(2, user.getEmail());
            ps.setString(3, user.getPasswordHash());
            ps.setString(4, user.getRole().name());
            ps.setBigDecimal(5, user.getBalance());
            ps.executeUpdate();
            user.setUserId(generatedKey(ps));
        }
        return user;
    }

    @Override
    public boolean update(User user) throws SQLException {
        String sql = "UPDATE users SET name = ?, email = ?, role = ?, balance = ? WHERE user_id = ?";
        try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, user.getName());
            ps.setString(2, user.getEmail());
            ps.setString(3, user.getRole().name());
            ps.setBigDecimal(4, user.getBalance());
            ps.setInt(5, user.getUserId());
            return ps.executeUpdate() == 1;
        }
    }

    public void updateBalance(Connection c, int userId, BigDecimal balance) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("UPDATE users SET balance = ? WHERE user_id = ?")) {
            ps.setBigDecimal(1, balance);
            ps.setInt(2, userId);
            if (ps.executeUpdate() != 1) {
                throw new SQLException("User " + userId + " not found while updating balance");
            }
        }
    }

    public boolean updatePassword(int userId, String passwordHash) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("UPDATE users SET password_hash = ? WHERE user_id = ?")) {
            ps.setString(1, passwordHash);
            ps.setInt(2, userId);
            return ps.executeUpdate() == 1;
        }
    }

    /** Holdings, transactions and alerts go with the user (ON DELETE CASCADE). */
    @Override
    public boolean delete(long id) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("DELETE FROM users WHERE user_id = ?")) {
            ps.setLong(1, id);
            return ps.executeUpdate() == 1;
        }
    }

    public long countByRole(Role role) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM users WHERE role = ?")) {
            ps.setString(1, role.name());
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }

    public BigDecimal totalBalance(Role role) throws SQLException {
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT COALESCE(SUM(balance), 0) FROM users WHERE role = ?")) {
            ps.setString(1, role.name());
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getBigDecimal(1);
            }
        }
    }

    public List<UserSummary> listSummaries() throws SQLException {
        String sql = """
                SELECT u.user_id, u.name, u.email, u.role, u.balance, u.created_at,
                       COALESCE(pv.market_value, 0) AS holdings_value,
                       COALESCE(pv.positions, 0)    AS positions,
                       COALESCE(t.trades, 0)        AS trades
                FROM users u
                LEFT JOIN (SELECT user_id, SUM(market_value) AS market_value, COUNT(*) AS positions
                           FROM portfolio_view GROUP BY user_id) pv ON pv.user_id = u.user_id
                LEFT JOIN (SELECT user_id, COUNT(*) AS trades
                           FROM transactions GROUP BY user_id) t ON t.user_id = u.user_id
                ORDER BY u.created_at DESC, u.user_id DESC
                """;
        List<UserSummary> rows = new ArrayList<>();
        try (Connection c = db.getConnection();
             PreparedStatement ps = c.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                rows.add(new UserSummary(
                        rs.getInt("user_id"),
                        rs.getString("name"),
                        rs.getString("email"),
                        Role.valueOf(rs.getString("role")),
                        rs.getBigDecimal("balance"),
                        rs.getBigDecimal("holdings_value"),
                        rs.getInt("positions"),
                        rs.getLong("trades"),
                        instant(rs, "created_at")));
            }
        }
        return rows;
    }

    private static User map(ResultSet rs) throws SQLException {
        User u = new User();
        u.setUserId(rs.getInt("user_id"));
        u.setName(rs.getString("name"));
        u.setEmail(rs.getString("email"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setRole(Role.valueOf(rs.getString("role")));
        u.setBalance(rs.getBigDecimal("balance"));
        u.setCreatedAt(instant(rs, "created_at"));
        return u;
    }
}

package com.sharemarket.service;

import com.sharemarket.dao.UserDAO;
import com.sharemarket.dto.UserSummary;
import com.sharemarket.exception.AuthException;
import com.sharemarket.exception.ConflictException;
import com.sharemarket.exception.NotFoundException;
import com.sharemarket.exception.ValidationException;
import com.sharemarket.model.Role;
import com.sharemarket.model.User;
import com.sharemarket.util.PasswordUtil;
import com.sharemarket.util.Session;
import com.sharemarket.util.SessionManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class AuthService {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final int MIN_PASSWORD = 8;
    private static final int MAX_PASSWORD = 72;

    private final UserDAO userDao;
    private final SessionManager sessions;
    private final StreamService stream;
    private final BigDecimal initialBalance;

    public AuthService(UserDAO userDao, SessionManager sessions, StreamService stream,
                       @Value("${wallet.initial.balance:100000}") BigDecimal initialBalance) {
        this.userDao = userDao;
        this.sessions = sessions;
        this.stream = stream;
        this.initialBalance = PortfolioMath.money(initialBalance);
    }

    public User register(String name, String email, String password) throws SQLException {
        String cleanName = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        String cleanEmail = normaliseEmail(email);
        if (cleanName.length() < 2 || cleanName.length() > 100) {
            throw new ValidationException("Name must be between 2 and 100 characters.");
        }
        if (!EMAIL.matcher(cleanEmail).matches() || cleanEmail.length() > 150) {
            throw new ValidationException("Enter a valid email address.");
        }
        validatePassword(password);
        if (userDao.findByEmail(cleanEmail).isPresent()) {
            throw new ConflictException("An account with this email already exists.");
        }
        User user = new User(cleanName, cleanEmail, PasswordUtil.hash(password), Role.INVESTOR, initialBalance);
        try {
            return userDao.save(user);
        } catch (SQLIntegrityConstraintViolationException e) {
            throw new ConflictException("An account with this email already exists.");
        }
    }

    public Session login(String email, String password) throws SQLException {
        User user = userDao.findByEmail(normaliseEmail(email))
                .filter(u -> PasswordUtil.verify(password, u.getPasswordHash()))
                .orElseThrow(() -> new AuthException("Incorrect email or password."));
        return sessions.create(user);
    }

    public void logout(String token) {
        sessions.invalidate(token);
    }

    public User currentUser(int userId) throws SQLException {
        return userDao.find(userId).orElseThrow(() -> new AuthException("Your account no longer exists."));
    }

    public void changePassword(int userId, String currentPassword, String newPassword) throws SQLException {
        User user = currentUser(userId);
        if (!PasswordUtil.verify(currentPassword, user.getPasswordHash())) {
            throw new ValidationException("Your current password is incorrect.");
        }
        validatePassword(newPassword);
        userDao.updatePassword(userId, PasswordUtil.hash(newPassword));
    }

    public List<UserSummary> listUsers() throws SQLException {
        return userDao.listSummaries();
    }

    public void removeUser(int userId, int actingAdminId) throws SQLException {
        if (userId == actingAdminId) {
            throw new ValidationException("You cannot remove your own account.");
        }
        User user = userDao.find(userId).orElseThrow(() -> new NotFoundException("User not found."));
        if (user.isAdmin() && userDao.countByRole(Role.ADMIN) <= 1) {
            throw new ConflictException("The last admin account cannot be removed.");
        }
        userDao.delete(userId);
        sessions.invalidateUser(userId);
        stream.disconnect(userId);
    }

    public BigDecimal getInitialBalance() {
        return initialBalance;
    }

    static String normaliseEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static void validatePassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD) {
            throw new ValidationException("Password must be at least " + MIN_PASSWORD + " characters.");
        }
        if (password.length() > MAX_PASSWORD) {
            throw new ValidationException("Password must be at most " + MAX_PASSWORD + " characters.");
        }
        if (password.chars().noneMatch(Character::isLetter) || password.chars().noneMatch(Character::isDigit)) {
            throw new ValidationException("Password must contain at least one letter and one number.");
        }
    }
}

package com.sharemarket.service;

import com.sharemarket.dao.HoldingDAO;
import com.sharemarket.dao.StockDAO;
import com.sharemarket.dao.TransactionDAO;
import com.sharemarket.dao.UserDAO;
import com.sharemarket.dto.TradeResult;
import com.sharemarket.exception.InsufficientFundsException;
import com.sharemarket.exception.InsufficientQuantityException;
import com.sharemarket.exception.NotFoundException;
import com.sharemarket.exception.ValidationException;
import com.sharemarket.model.Holding;
import com.sharemarket.model.Stock;
import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnType;
import com.sharemarket.model.User;
import com.sharemarket.util.DBConnection;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;

/**
 * Buys and sells. Each trade runs on one Connection with autoCommit off:
 * the wallet update, the holding update and the transaction record are
 * committed together, or rolled back together on any failure.
 */
@Service
public class TradeService {
    public static final int MAX_QUANTITY = 100_000;

    private final DBConnection db;
    private final UserDAO userDao;
    private final StockDAO stockDao;
    private final HoldingDAO holdingDao;
    private final TransactionDAO transactionDao;

    public TradeService(DBConnection db, UserDAO userDao, StockDAO stockDao, HoldingDAO holdingDao,
                        TransactionDAO transactionDao) {
        this.db = db;
        this.userDao = userDao;
        this.stockDao = stockDao;
        this.holdingDao = holdingDao;
        this.transactionDao = transactionDao;
    }

    public TradeResult buy(int userId, String symbol, int quantity) throws SQLException {
        validate(symbol, quantity);
        try (Connection c = db.getConnection()) {
            c.setAutoCommit(false);
            try {
                // Locking the user row first serialises concurrent trades of the same user.
                User user = userDao.findForUpdate(c, userId)
                        .orElseThrow(() -> new NotFoundException("Account not found."));
                Stock stock = findStock(c, symbol);
                BigDecimal price = stock.getCurrentPrice();
                BigDecimal cost = PortfolioMath.tradeValue(quantity, price);
                if (user.getBalance().compareTo(cost) < 0) {
                    throw new InsufficientFundsException(cost, user.getBalance());
                }
                BigDecimal balance = user.getBalance().subtract(cost);
                userDao.updateBalance(c, userId, balance);

                Holding holding = holdingDao.findForUpdate(c, userId, stock.getStockId()).orElse(null);
                if (holding == null) {
                    holding = holdingDao.insert(c, new Holding(userId, stock.getStockId(), quantity,
                            price.setScale(PortfolioMath.AVG_SCALE, RoundingMode.HALF_UP)));
                } else {
                    holding.setAvgBuyPrice(PortfolioMath.newAverage(holding.getQuantity(), holding.getAvgBuyPrice(),
                            quantity, price));
                    holding.setQuantity(holding.getQuantity() + quantity);
                    holdingDao.update(c, holding);
                }

                Transaction txn = transactionDao.insert(c,
                        new Transaction(userId, stock.getStockId(), TxnType.BUY, quantity, price, Instant.now()));
                c.commit();
                return new TradeResult(txn.getTxnId(), TxnType.BUY, stock.getSymbol(), quantity, price, cost, balance,
                        holding.getQuantity(), holding.getAvgBuyPrice(), null, txn.getTxnTime());
            } catch (SQLException | RuntimeException e) {
                rollback(c, e);
                throw e;
            } finally {
                c.setAutoCommit(true);
            }
        }
    }

    public TradeResult sell(int userId, String symbol, int quantity) throws SQLException {
        validate(symbol, quantity);
        try (Connection c = db.getConnection()) {
            c.setAutoCommit(false);
            try {
                User user = userDao.findForUpdate(c, userId)
                        .orElseThrow(() -> new NotFoundException("Account not found."));
                Stock stock = findStock(c, symbol);
                Holding holding = holdingDao.findForUpdate(c, userId, stock.getStockId()).orElse(null);
                int held = holding == null ? 0 : holding.getQuantity();
                if (quantity > held) {
                    throw new InsufficientQuantityException(stock.getSymbol(), quantity, held);
                }
                BigDecimal price = stock.getCurrentPrice();
                BigDecimal proceeds = PortfolioMath.tradeValue(quantity, price);
                BigDecimal realised = PortfolioMath.realisedPnl(price, holding.getAvgBuyPrice(), quantity);
                BigDecimal balance = user.getBalance().add(proceeds);
                userDao.updateBalance(c, userId, balance);

                int remaining = held - quantity;
                if (remaining == 0) {
                    holdingDao.delete(c, holding.getHoldingId());
                } else {
                    holding.setQuantity(remaining);
                    holdingDao.update(c, holding);
                }

                Transaction txn = transactionDao.insert(c,
                        new Transaction(userId, stock.getStockId(), TxnType.SELL, quantity, price, Instant.now()));
                c.commit();
                return new TradeResult(txn.getTxnId(), TxnType.SELL, stock.getSymbol(), quantity, price, proceeds,
                        balance, remaining, remaining == 0 ? null : holding.getAvgBuyPrice(), realised,
                        txn.getTxnTime());
            } catch (SQLException | RuntimeException e) {
                rollback(c, e);
                throw e;
            } finally {
                c.setAutoCommit(true);
            }
        }
    }

    private Stock findStock(Connection c, String symbol) throws SQLException {
        String sym = MarketService.normaliseSymbol(symbol);
        return stockDao.findBySymbol(c, sym).orElseThrow(() -> new NotFoundException("No stock with symbol " + sym + "."));
    }

    private static void validate(String symbol, int quantity) {
        if (symbol == null || symbol.isBlank()) {
            throw new ValidationException("Choose a stock to trade.");
        }
        if (quantity <= 0) {
            throw new ValidationException("Quantity must be at least 1.");
        }
        if (quantity > MAX_QUANTITY) {
            throw new ValidationException("Quantity cannot exceed " + MAX_QUANTITY + " shares per order.");
        }
    }

    private static void rollback(Connection c, Exception cause) {
        try {
            c.rollback();
        } catch (SQLException e) {
            cause.addSuppressed(e);
        }
    }
}

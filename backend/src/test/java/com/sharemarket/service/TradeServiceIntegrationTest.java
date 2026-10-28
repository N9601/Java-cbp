package com.sharemarket.service;

import com.sharemarket.dao.HoldingDAO;
import com.sharemarket.dao.MySqlTestSupport;
import com.sharemarket.dao.StockDAO;
import com.sharemarket.dao.TransactionDAO;
import com.sharemarket.dao.UserDAO;
import com.sharemarket.dto.TradeResult;
import com.sharemarket.exception.InsufficientFundsException;
import com.sharemarket.exception.InsufficientQuantityException;
import com.sharemarket.model.Holding;
import com.sharemarket.model.Stock;
import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnType;
import com.sharemarket.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TradeServiceIntegrationTest extends MySqlTestSupport {
    private UserDAO users;
    private HoldingDAO holdings;
    private TransactionDAO transactions;
    private TradeService trades;
    private User investor;
    private Stock stock;

    @BeforeEach
    void setUp() throws SQLException {
        users = new UserDAO(db);
        holdings = new HoldingDAO(db);
        transactions = new TransactionDAO(db);
        trades = new TradeService(db, users, new StockDAO(db), holdings, transactions);
        investor = newInvestor("trader@test.dev", "10000.00");
        stock = newStock("TEST", "100.00");
    }

    private BigDecimal balance() throws SQLException {
        return users.find(investor.getUserId()).orElseThrow().getBalance();
    }

    private List<Holding> positions() throws SQLException {
        return holdings.findPortfolio(investor.getUserId());
    }

    @Test
    void buyDebitsWalletCreatesHoldingAndRecordsTransaction() throws SQLException {
        TradeResult r = trades.buy(investor.getUserId(), "test", 10);

        assertEquals(new BigDecimal("1000.00"), r.amount());
        assertEquals(new BigDecimal("9000.00"), balance());
        assertEquals(1, positions().size());
        assertEquals(10, positions().get(0).getQuantity());
        assertEquals(0, new BigDecimal("100").compareTo(positions().get(0).getAvgBuyPrice()));
        List<Transaction> history = transactions.findAllForUser(investor.getUserId());
        assertEquals(1, history.size());
        assertEquals(TxnType.BUY, history.get(0).getType());
    }

    @Test
    void secondBuyRecomputesTheAverage() throws SQLException {
        trades.buy(investor.getUserId(), "TEST", 10);
        new StockDAO(db).update(withPrice(stock, "130.00"));
        TradeResult r = trades.buy(investor.getUserId(), "TEST", 5);

        assertEquals(15, r.holdingQuantity());
        assertEquals(new BigDecimal("110.0000"), r.avgBuyPrice());
        assertEquals(new BigDecimal("8350.00"), balance());
    }

    @Test
    void buyWithoutEnoughBalanceIsRejectedAndChangesNothing() throws SQLException {
        assertThrows(InsufficientFundsException.class, () -> trades.buy(investor.getUserId(), "TEST", 101));

        assertEquals(new BigDecimal("10000.00"), balance());
        assertTrue(positions().isEmpty());
        assertEquals(0, count("SELECT COUNT(*) FROM transactions"));
    }

    @Test
    void sellingMoreThanHeldIsRejectedAndChangesNothing() throws SQLException {
        trades.buy(investor.getUserId(), "TEST", 5);
        assertThrows(InsufficientQuantityException.class, () -> trades.sell(investor.getUserId(), "TEST", 6));

        assertEquals(new BigDecimal("9500.00"), balance());
        assertEquals(5, positions().get(0).getQuantity());
        assertEquals(1, count("SELECT COUNT(*) FROM transactions"));
    }

    @Test
    void partialSellCreditsWalletAndReportsRealisedProfit() throws SQLException {
        trades.buy(investor.getUserId(), "TEST", 10);
        new StockDAO(db).update(withPrice(stock, "120.00"));
        TradeResult r = trades.sell(investor.getUserId(), "TEST", 4);

        assertEquals(new BigDecimal("80.00"), r.realisedPnl());
        assertEquals(new BigDecimal("9480.00"), balance());
        assertEquals(6, positions().get(0).getQuantity());
        assertEquals(0, new BigDecimal("100").compareTo(positions().get(0).getAvgBuyPrice()),
                "selling must not change the average buy price");
    }

    @Test
    void sellingEverythingRemovesTheHolding() throws SQLException {
        trades.buy(investor.getUserId(), "TEST", 3);
        TradeResult r = trades.sell(investor.getUserId(), "TEST", 3);

        assertEquals(0, r.holdingQuantity());
        assertNull(r.avgBuyPrice());
        assertTrue(positions().isEmpty());
        assertEquals(new BigDecimal("10000.00"), balance());
    }

    @Test
    void aFailureMidTradeRollsBackTheWalletAndHolding() throws SQLException {
        TransactionDAO failing = new TransactionDAO(db) {
            @Override
            public Transaction insert(Connection c, Transaction t) throws SQLException {
                throw new SQLException("simulated failure while recording the trade");
            }
        };
        TradeService broken = new TradeService(db, users, new StockDAO(db), holdings, failing);

        assertThrows(SQLException.class, () -> broken.buy(investor.getUserId(), "TEST", 10));

        assertEquals(new BigDecimal("10000.00"), balance(), "wallet debit must be rolled back");
        assertTrue(positions().isEmpty(), "holding insert must be rolled back");
        assertEquals(0, count("SELECT COUNT(*) FROM transactions"));
    }

    @Test
    void priceUpdateIsLoggedByTheTrigger() throws SQLException {
        long before = count("SELECT COUNT(*) FROM price_history WHERE stock_id = " + stock.getStockId());
        new StockDAO(db).update(withPrice(stock, "101.50"));
        new StockDAO(db).update(withPrice(stock, "101.50"));  // unchanged price: no new row
        long after = count("SELECT COUNT(*) FROM price_history WHERE stock_id = " + stock.getStockId());
        assertEquals(before + 1, after);
    }

    @Test
    void checkConstraintBlocksANegativeBalance() {
        assertThrows(SQLException.class, () -> {
            try (Connection c = db.getConnection()) {
                users.updateBalance(c, investor.getUserId(), new BigDecimal("-1.00"));
            }
        });
    }

    @Test
    void deletingAUserCascadesToTheirRecords() throws SQLException {
        trades.buy(investor.getUserId(), "TEST", 2);
        users.delete(investor.getUserId());
        assertEquals(0, count("SELECT COUNT(*) FROM holdings"));
        assertEquals(0, count("SELECT COUNT(*) FROM transactions"));
    }

    private static Stock withPrice(Stock s, String price) {
        s.setCurrentPrice(new BigDecimal(price));
        return s;
    }
}

package com.sharemarket.seed;

import com.sharemarket.dao.AlertDAO;
import com.sharemarket.dao.HoldingDAO;
import com.sharemarket.dao.StockDAO;
import com.sharemarket.dao.TransactionDAO;
import com.sharemarket.dao.UserDAO;
import com.sharemarket.model.AlertCondition;
import com.sharemarket.model.Holding;
import com.sharemarket.model.PriceAlert;
import com.sharemarket.model.PriceTick;
import com.sharemarket.model.Role;
import com.sharemarket.model.Stock;
import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnType;
import com.sharemarket.model.User;
import com.sharemarket.service.PortfolioMath;
import com.sharemarket.service.RealisedLedger;
import com.sharemarket.util.DBConnection;
import com.sharemarket.util.PasswordUtil;
import com.sharemarket.util.SqlScriptRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Loads the sample stocks, a week of price history and demo accounts on a
 * fresh database so every screen has something to show on first run.
 * Each step is skipped when its data is already present.
 */
@Component
@Order(2)
public class DataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    public static final String ADMIN_EMAIL = "admin@marketlab.dev";
    public static final String ADMIN_PASSWORD = "Admin@123";
    public static final String DEMO_EMAIL = "demo@marketlab.dev";
    public static final String DEMO_PASSWORD = "Demo@1234";

    private static final int HISTORY_DAYS = 7;
    private static final int STEP_MINUTES = 5;

    private record Plan(String symbol, TxnType type, int quantity, Instant time) {
    }

    private final DBConnection db;
    private final StockDAO stockDao;
    private final UserDAO userDao;
    private final HoldingDAO holdingDao;
    private final TransactionDAO transactionDao;
    private final AlertDAO alertDao;
    private final boolean seedDemo;
    private final BigDecimal initialBalance;

    public DataSeeder(DBConnection db, StockDAO stockDao, UserDAO userDao, HoldingDAO holdingDao,
                      TransactionDAO transactionDao, AlertDAO alertDao,
                      @Value("${app.seed.demo:true}") boolean seedDemo,
                      @Value("${wallet.initial.balance:100000}") BigDecimal initialBalance) {
        this.db = db;
        this.stockDao = stockDao;
        this.userDao = userDao;
        this.holdingDao = holdingDao;
        this.transactionDao = transactionDao;
        this.alertDao = alertDao;
        this.seedDemo = seedDemo;
        this.initialBalance = PortfolioMath.money(initialBalance);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (stockDao.count() == 0) {
            try (Connection c = db.getConnection()) {
                SqlScriptRunner.run(c, DatabaseInitializer.read("db/03_sample_stocks.sql"));
            }
            log.info("Loaded {} sample stocks", stockDao.count());
        }
        List<Stock> stocks = stockDao.findAll();
        if (!stocks.isEmpty() && stockDao.countHistory() < stocks.size() * 50L) {
            backfillHistory(stocks);
        }
        if (userDao.countByRole(Role.ADMIN) == 0) {
            userDao.save(new User("Platform Admin", ADMIN_EMAIL, PasswordUtil.hash(ADMIN_PASSWORD), Role.ADMIN,
                    BigDecimal.ZERO.setScale(2)));
            log.info("Created admin account {}", ADMIN_EMAIL);
        }
        if (seedDemo && userDao.findByEmail(DEMO_EMAIL).isEmpty() && !stocks.isEmpty()) {
            seedInvestors(stocks);
        }
    }

    /** Walks backwards from today's price to give every stock a week of 5-minute history. */
    private void backfillHistory(List<Stock> stocks) throws SQLException {
        Instant end = Instant.now().truncatedTo(ChronoUnit.MINUTES);
        int points = HISTORY_DAYS * 24 * 60 / STEP_MINUTES;
        int dayPoints = 24 * 60 / STEP_MINUTES;
        Random rnd = new Random(20_261_028L);
        List<PriceTick> ticks = new ArrayList<>(stocks.size() * points);
        for (Stock s : stocks) {
            double last = s.getCurrentPrice().doubleValue();
            double weekTrend = (rnd.nextDouble() - 0.5) * 0.16;
            double dayTrend = (rnd.nextDouble() - 0.5) * 0.05;
            // Per 5-minute step; close to what the live simulator produces over 5 minutes.
            double volatility = 0.0010 + rnd.nextDouble() * 0.0012;
            double p = last;
            for (int i = 1; i < points; i++) {
                double drift = weekTrend / points + (i <= dayPoints ? dayTrend / dayPoints : 0);
                p = p / (1 + drift + rnd.nextGaussian() * volatility);
                p = Math.max(last * 0.7, Math.min(last * 1.3, p));
                ticks.add(new PriceTick(s.getStockId(), BigDecimal.valueOf(p).setScale(2, RoundingMode.HALF_UP),
                        end.minus(Duration.ofMinutes((long) i * STEP_MINUTES))));
            }
        }
        stockDao.insertHistory(ticks);
        log.info("Generated {} days of price history ({} rows)", HISTORY_DAYS, ticks.size());
    }

    private void seedInvestors(List<Stock> stocks) throws SQLException {
        Map<String, Stock> bySymbol = stocks.stream().collect(Collectors.toMap(Stock::getSymbol, Function.identity()));
        Instant now = Instant.now();

        User demo = userDao.save(new User("Demo Investor", DEMO_EMAIL, PasswordUtil.hash(DEMO_PASSWORD),
                Role.INVESTOR, initialBalance));
        List<Plan> plan = List.of(
                new Plan("RELIANCE", TxnType.BUY, 12, ago(now, 6, 3)),
                new Plan("TCS", TxnType.BUY, 4, ago(now, 6, 1)),
                new Plan("INFY", TxnType.BUY, 10, ago(now, 5, 5)),
                new Plan("HDFCBANK", TxnType.BUY, 6, ago(now, 5, 2)),
                new Plan("ITC", TxnType.BUY, 30, ago(now, 4, 4)),
                new Plan("TATAMOTORS", TxnType.BUY, 15, ago(now, 4, 1)),
                new Plan("INFY", TxnType.SELL, 4, ago(now, 3, 6)),
                new Plan("SUNPHARMA", TxnType.BUY, 4, ago(now, 3, 2)),
                new Plan("RELIANCE", TxnType.BUY, 4, ago(now, 2, 5)),
                new Plan("TATAMOTORS", TxnType.SELL, 5, ago(now, 2, 1)),
                new Plan("BHARTIARTL", TxnType.BUY, 3, ago(now, 1, 4)),
                new Plan("ICICIBANK", TxnType.BUY, 4, ago(now, 0, 20)),
                new Plan("ITC", TxnType.SELL, 10, ago(now, 0, 6)),
                new Plan("TITAN", TxnType.BUY, 2, ago(now, 0, 2)));
        applyPlan(demo, plan, bySymbol);
        seedDemoAlerts(demo, bySymbol, now);

        String[][] people = {
                {"Aarav Sharma", "aarav.sharma@example.com"},
                {"Priya Nair", "priya.nair@example.com"},
                {"Rohan Gupta", "rohan.gupta@example.com"},
                {"Sneha Reddy", "sneha.reddy@example.com"},
                {"Kabir Mehta", "kabir.mehta@example.com"}};
        SecureRandom secure = new SecureRandom();
        for (int i = 0; i < people.length; i++) {
            if (userDao.findByEmail(people[i][1]).isPresent()) {
                continue;
            }
            byte[] secret = new byte[18];
            secure.nextBytes(secret);
            User u = userDao.save(new User(people[i][0], people[i][1],
                    PasswordUtil.hash(HexFormat.of().formatHex(secret)), Role.INVESTOR, initialBalance));
            applyPlan(u, randomPlan(new Random(7L * (i + 1)), stocks, now), bySymbol);
        }
        log.info("Created demo investor {} and {} sample investors", DEMO_EMAIL, people.length);
    }

    private static Instant ago(Instant now, int days, int hours) {
        return now.minus(Duration.ofDays(days)).minus(Duration.ofHours(hours));
    }

    private static List<Plan> randomPlan(Random rnd, List<Stock> stocks, Instant now) {
        List<Plan> plan = new ArrayList<>();
        int buys = 4 + rnd.nextInt(5);
        for (int b = 0; b < buys; b++) {
            Stock s = stocks.get(rnd.nextInt(stocks.size()));
            double budget = 6_000 + rnd.nextDouble() * 12_000;
            int qty = Math.max(1, (int) (budget / s.getCurrentPrice().doubleValue()));
            Instant at = now.minus(Duration.ofMinutes(60L + rnd.nextInt(HISTORY_DAYS * 24 * 60 - 120)));
            plan.add(new Plan(s.getSymbol(), TxnType.BUY, qty, at));
            if (rnd.nextDouble() < 0.35) {
                long laterMinutes = Duration.between(at, now).toMinutes() - 30;
                if (laterMinutes > 30) {
                    Instant sellAt = at.plus(Duration.ofMinutes(30 + (long) (rnd.nextDouble() * laterMinutes)));
                    plan.add(new Plan(s.getSymbol(), TxnType.SELL, Math.max(1, qty / 2), sellAt));
                }
            }
        }
        return plan;
    }

    /**
     * Applies backdated trades at the historical price, with the same balance
     * and quantity rules as TradeService, and stores them in one transaction.
     */
    private void applyPlan(User user, List<Plan> plan, Map<String, Stock> bySymbol) throws SQLException {
        List<Plan> ordered = plan.stream().sorted(Comparator.comparing(Plan::time)).toList();
        BigDecimal balance = user.getBalance();
        RealisedLedger ledger = new RealisedLedger();
        List<Transaction> applied = new ArrayList<>();
        for (Plan p : ordered) {
            Stock stock = bySymbol.get(p.symbol());
            if (stock == null) {
                continue;
            }
            BigDecimal price = stockDao.priceAt(stock.getStockId(), p.time()).orElse(stock.getCurrentPrice());
            int qty = p.quantity();
            if (p.type() == TxnType.BUY) {
                BigDecimal cost = PortfolioMath.tradeValue(qty, price);
                if (cost.compareTo(balance) > 0) {
                    continue;
                }
                balance = balance.subtract(cost);
            } else {
                qty = Math.min(qty, ledger.quantityOf(stock.getStockId()));
                if (qty <= 0) {
                    continue;
                }
                balance = balance.add(PortfolioMath.tradeValue(qty, price));
            }
            Transaction t = new Transaction(user.getUserId(), stock.getStockId(), p.type(), qty, price, p.time());
            ledger.apply(t);
            applied.add(t);
        }

        try (Connection c = db.getConnection()) {
            c.setAutoCommit(false);
            try {
                for (Transaction t : applied) {
                    transactionDao.insert(c, t);
                }
                for (Stock s : bySymbol.values()) {
                    int qty = ledger.quantityOf(s.getStockId());
                    if (qty > 0) {
                        holdingDao.insert(c, new Holding(user.getUserId(), s.getStockId(), qty,
                                ledger.averageOf(s.getStockId())));
                    }
                }
                userDao.updateBalance(c, user.getUserId(), balance);
                c.commit();
            } catch (SQLException e) {
                c.rollback();
                throw e;
            } finally {
                c.setAutoCommit(true);
            }
        }
    }

    private void seedDemoAlerts(User demo, Map<String, Stock> bySymbol, Instant now) throws SQLException {
        alert(demo, bySymbol.get("RELIANCE"), AlertCondition.ABOVE, 1.004, null);
        alert(demo, bySymbol.get("TCS"), AlertCondition.BELOW, 0.97, null);
        alert(demo, bySymbol.get("INFY"), AlertCondition.ABOVE, 1.05, null);
        alert(demo, bySymbol.get("HDFCBANK"), AlertCondition.BELOW, 0.995, now.minus(Duration.ofHours(19)));
    }

    private void alert(User user, Stock stock, AlertCondition condition, double factor, Instant triggeredAt)
            throws SQLException {
        if (stock == null) {
            return;
        }
        BigDecimal target = stock.getCurrentPrice().multiply(BigDecimal.valueOf(factor)).setScale(2, RoundingMode.HALF_UP);
        PriceAlert a = alertDao.save(new PriceAlert(user.getUserId(), stock.getStockId(), target, condition));
        if (triggeredAt != null) {
            a.setTriggered(true);
            a.setTriggeredAt(triggeredAt);
            alertDao.update(a);
        }
    }
}

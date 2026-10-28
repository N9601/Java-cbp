package com.sharemarket.service;

import com.sharemarket.dao.HoldingDAO;
import com.sharemarket.dao.StockDAO;
import com.sharemarket.dao.TransactionDAO;
import com.sharemarket.dao.UserDAO;
import com.sharemarket.dto.PlatformStats;
import com.sharemarket.dto.TransactionView;
import com.sharemarket.model.Role;
import com.sharemarket.model.TxnFilter;
import com.sharemarket.simulator.SimulatorScheduler;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Platform-wide figures for the admin overview. */
@Service
public class AdminService {
    private final UserDAO userDao;
    private final StockDAO stockDao;
    private final HoldingDAO holdingDao;
    private final TransactionDAO transactionDao;
    private final PortfolioService portfolio;
    private final SimulatorScheduler simulator;

    public AdminService(UserDAO userDao, StockDAO stockDao, HoldingDAO holdingDao, TransactionDAO transactionDao,
                        PortfolioService portfolio, SimulatorScheduler simulator) {
        this.userDao = userDao;
        this.stockDao = stockDao;
        this.holdingDao = holdingDao;
        this.transactionDao = transactionDao;
        this.portfolio = portfolio;
        this.simulator = simulator;
    }

    public PlatformStats stats() throws SQLException {
        Instant now = Instant.now();
        Instant dayAgo = now.minus(Duration.ofDays(1));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate firstDay = today.minusDays(6);
        Instant weekStart = firstDay.atStartOfDay(ZoneOffset.UTC).toInstant();

        Map<LocalDate, Object[]> daily = transactionDao.dailyActivity(weekStart);
        List<PlatformStats.DailyActivity> activity = new ArrayList<>();
        for (LocalDate d = firstDay; !d.isAfter(today); d = d.plusDays(1)) {
            Object[] row = daily.get(d);
            activity.add(new PlatformStats.DailyActivity(d, row == null ? 0 : (Long) row[0],
                    row == null ? BigDecimal.ZERO : PortfolioMath.money((BigDecimal) row[1])));
        }

        List<PlatformStats.TradedStock> mostTraded = transactionDao.mostTraded(weekStart, 5).stream()
                .map(r -> new PlatformStats.TradedStock((String) r[0], (String) r[1], (Long) r[2],
                        PortfolioMath.money((BigDecimal) r[3])))
                .toList();

        List<TransactionView> recent = portfolio
                .getAllTransactions(new TxnFilter(null, null, null, null, null, null, 0, 8)).items();

        BigDecimal cash = userDao.totalBalance(Role.INVESTOR);
        BigDecimal holdings = holdingDao.totalMarketValue();
        return new PlatformStats(userDao.countByRole(Role.INVESTOR), userDao.countByRole(Role.ADMIN),
                stockDao.count(), transactionDao.countSince(null), transactionDao.countSince(dayAgo),
                PortfolioMath.money(transactionDao.volumeSince(dayAgo)), cash, holdings, cash.add(holdings),
                activity, mostTraded, recent, simulator.status());
    }
}

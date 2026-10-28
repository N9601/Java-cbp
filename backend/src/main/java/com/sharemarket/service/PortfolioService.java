package com.sharemarket.service;

import com.sharemarket.dao.HoldingDAO;
import com.sharemarket.dao.StockDAO;
import com.sharemarket.dao.TransactionDAO;
import com.sharemarket.dao.UserDAO;
import com.sharemarket.dto.HoldingView;
import com.sharemarket.dto.Page;
import com.sharemarket.dto.PortfolioSummary;
import com.sharemarket.dto.Quote;
import com.sharemarket.dto.SectorSlice;
import com.sharemarket.dto.TransactionView;
import com.sharemarket.exception.NotFoundException;
import com.sharemarket.model.Holding;
import com.sharemarket.model.Portfolio;
import com.sharemarket.model.PricePoint;
import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnFilter;
import com.sharemarket.model.TxnType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

@Service
public class PortfolioService {
    private final UserDAO userDao;
    private final HoldingDAO holdingDao;
    private final TransactionDAO transactionDao;
    private final StockDAO stockDao;
    private final MarketService market;

    public PortfolioService(UserDAO userDao, HoldingDAO holdingDao, TransactionDAO transactionDao,
                            StockDAO stockDao, MarketService market) {
        this.userDao = userDao;
        this.holdingDao = holdingDao;
        this.transactionDao = transactionDao;
        this.stockDao = stockDao;
        this.market = market;
    }

    public Portfolio loadPortfolio(int userId) throws SQLException {
        BigDecimal cash = userDao.find(userId).orElseThrow(() -> new NotFoundException("Account not found."))
                .getBalance();
        List<Holding> holdings = holdingDao.findPortfolio(userId);
        RealisedLedger ledger = RealisedLedger.replay(transactionDao.findAllForUser(userId));
        return new Portfolio(userId, cash, holdings, ledger.byStock(), ledger.total());
    }

    public PortfolioSummary getPortfolio(int userId) throws SQLException {
        Portfolio p = loadPortfolio(userId);
        BigDecimal marketValue = p.getMarketValue();

        List<HoldingView> views = new ArrayList<>();
        BigDecimal dayChange = BigDecimal.ZERO;
        Map<String, BigDecimal> bySector = new LinkedHashMap<>();
        for (Holding h : p.getHoldings()) {
            Quote q = market.quoteById(h.getStockId()).orElse(null);
            BigDecimal ref = q == null ? h.getCurrentPrice() : q.refPrice();
            BigDecimal holdingDayChange = PortfolioMath.unrealisedPnl(h.getCurrentPrice(), ref, h.getQuantity());
            dayChange = dayChange.add(holdingDayChange);
            bySector.merge(h.getSector(), h.getMarketValue(), BigDecimal::add);
            views.add(new HoldingView(h.getStockId(), h.getSymbol(), h.getCompanyName(), h.getSector(),
                    h.getQuantity(), PortfolioMath.money(h.getAvgBuyPrice()), h.getCurrentPrice(), h.getInvested(),
                    h.getMarketValue(), h.getUnrealisedPnl(), PortfolioMath.percent(h.getUnrealisedPnl(), h.getInvested()),
                    PortfolioMath.money(p.realisedFor(h.getStockId())), holdingDayChange,
                    q == null ? BigDecimal.ZERO : q.changePct(),
                    PortfolioMath.percent(h.getMarketValue(), marketValue)));
        }

        List<SectorSlice> allocation = bySector.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(e -> new SectorSlice(e.getKey(), e.getValue(), PortfolioMath.percent(e.getValue(), marketValue)))
                .toList();

        BigDecimal unrealised = p.getUnrealisedPnl();
        BigDecimal previousValue = marketValue.subtract(dayChange);
        return new PortfolioSummary(p.getCash(), p.getInvested(), marketValue, unrealised,
                p.getUnrealisedPnlPercent(), PortfolioMath.money(p.getRealisedPnl()),
                PortfolioMath.money(unrealised.add(p.getRealisedPnl())), p.getNetWorth(), dayChange,
                PortfolioMath.percent(dayChange, previousValue), views, allocation);
    }

    /**
     * Net worth (cash + holdings at market price) over the range. Holdings
     * and cash at each point are rebuilt by replaying the user's trades, so
     * the curve reflects what the user actually owned at that time.
     */
    public List<PricePoint> getPerformance(int userId, MarketService.Range range) throws SQLException {
        Instant now = Instant.now();
        Instant since = now.minus(range.window());
        BigDecimal cashNow = userDao.find(userId).orElseThrow(() -> new NotFoundException("Account not found."))
                .getBalance();
        List<Transaction> txns = transactionDao.findAllForUser(userId);

        // Cash after time t = cash now + every cash flow that happened after t, reversed.
        BigDecimal flowsAfter = BigDecimal.ZERO;
        for (Transaction t : txns) {
            flowsAfter = flowsAfter.add(t.getType() == TxnType.BUY ? t.getAmount() : t.getAmount().negate());
        }

        Map<Integer, TreeMap<Instant, BigDecimal>> prices = new HashMap<>();
        TreeSet<Instant> times = new TreeSet<>();
        for (Integer stockId : txns.stream().map(Transaction::getStockId).distinct().toList()) {
            TreeMap<Instant, BigDecimal> series = new TreeMap<>();
            for (PricePoint p : stockDao.history(stockId, since, range.bucketSeconds())) {
                series.put(p.time(), p.price());
                times.add(p.time());
            }
            market.quoteById(stockId).ifPresent(q -> series.put(now, q.price()));
            prices.put(stockId, series);
        }
        if (times.isEmpty()) {
            for (Instant t = since; t.isBefore(now); t = t.plusSeconds(range.bucketSeconds())) {
                times.add(t);
            }
        }
        times.add(now);

        Map<Integer, Integer> quantities = new HashMap<>();
        List<PricePoint> points = new ArrayList<>(times.size());
        int next = 0;
        for (Instant t : times) {
            while (next < txns.size() && !txns.get(next).getTxnTime().isAfter(t)) {
                Transaction txn = txns.get(next++);
                int signed = txn.getType() == TxnType.BUY ? txn.getQuantity() : -txn.getQuantity();
                quantities.merge(txn.getStockId(), signed, Integer::sum);
                flowsAfter = flowsAfter.subtract(txn.getType() == TxnType.BUY ? txn.getAmount() : txn.getAmount().negate());
            }
            BigDecimal value = cashNow.add(flowsAfter);
            for (Map.Entry<Integer, Integer> q : quantities.entrySet()) {
                if (q.getValue() <= 0) {
                    continue;
                }
                TreeMap<Instant, BigDecimal> series = prices.get(q.getKey());
                Map.Entry<Instant, BigDecimal> price = series == null ? null : series.floorEntry(t);
                if (price == null && series != null) {
                    price = series.ceilingEntry(t);
                }
                if (price != null) {
                    value = value.add(PortfolioMath.tradeValue(q.getValue(), price.getValue()));
                }
            }
            points.add(new PricePoint(t, PortfolioMath.money(value)));
        }
        return points;
    }

    /** The user's own trades, newest first, with realised P/L on each SELL. */
    public Page<TransactionView> getHistory(int userId, TxnFilter filter) throws SQLException {
        Page<Transaction> page = transactionDao.search(filter.forUser(userId));
        RealisedLedger ledger = RealisedLedger.replay(transactionDao.findAllForUser(userId));
        List<TransactionView> items = page.items().stream()
                .map(t -> TransactionView.of(t, t.getType() == TxnType.SELL ? ledger.forTransaction(t.getTxnId()) : null))
                .toList();
        return new Page<>(items, page.total(), page.page(), page.size());
    }

    /** Admin: every user's trades. */
    public Page<TransactionView> getAllTransactions(TxnFilter filter) throws SQLException {
        Page<Transaction> page = transactionDao.search(filter);
        return new Page<>(page.items().stream().map(TransactionView::withUser).toList(),
                page.total(), page.page(), page.size());
    }

    /** Symbols the user has ever traded, for the history filter. */
    public List<String> tradedSymbols(int userId) throws SQLException {
        return transactionDao.findAllForUser(userId).stream().map(Transaction::getSymbol).distinct()
                .sorted(Comparator.naturalOrder()).toList();
    }
}

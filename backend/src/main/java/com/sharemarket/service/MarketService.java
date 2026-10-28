package com.sharemarket.service;

import com.sharemarket.dao.StockDAO;
import com.sharemarket.dto.Movers;
import com.sharemarket.dto.Quote;
import com.sharemarket.exception.ConflictException;
import com.sharemarket.exception.NotFoundException;
import com.sharemarket.exception.ValidationException;
import com.sharemarket.model.PricePoint;
import com.sharemarket.model.Stock;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.SQLException;
import java.sql.SQLIntegrityConstraintViolationException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Market data. Quotes live in an in-memory cache keyed by stock id that the
 * simulator updates on every tick, so the price table never waits on MySQL.
 * The cache is rebuilt from the database at start-up and every few minutes.
 */
@Service
public class MarketService {
    private static final Pattern SYMBOL = Pattern.compile("^[A-Z0-9&.-]{1,20}$");
    private static final Duration SPARKLINE_WINDOW = Duration.ofDays(1);
    private static final int SPARKLINE_BUCKET_SECONDS = 1800;
    private static final Duration SPARKLINE_TTL = Duration.ofSeconds(60);

    public enum Range {
        H1("1H", Duration.ofHours(1), 15),
        D1("1D", Duration.ofDays(1), 300),
        W1("1W", Duration.ofDays(7), 1800),
        M1("1M", Duration.ofDays(30), 7200);

        private final String label;
        private final Duration window;
        private final int bucketSeconds;

        Range(String label, Duration window, int bucketSeconds) {
            this.label = label;
            this.window = window;
            this.bucketSeconds = bucketSeconds;
        }

        public Duration window() {
            return window;
        }

        public int bucketSeconds() {
            return bucketSeconds;
        }

        public static Range parse(String value) {
            for (Range r : values()) {
                if (r.label.equalsIgnoreCase(value)) {
                    return r;
                }
            }
            throw new ValidationException("Unknown range '" + value + "'. Use 1H, 1D, 1W or 1M.");
        }
    }

    private final StockDAO stockDao;
    private final Map<Integer, Quote> quotes = new ConcurrentHashMap<>();
    private final Map<Integer, BigDecimal> anchors = new ConcurrentHashMap<>();
    private volatile boolean loaded;
    private volatile Map<Integer, List<BigDecimal>> sparklines = Map.of();
    private volatile Instant sparklinesAt = Instant.EPOCH;

    public MarketService(StockDAO stockDao) {
        this.stockDao = stockDao;
    }

    /** Rebuilds the quote cache: current prices, 24 h reference price, high and low. */
    public synchronized void reload() throws SQLException {
        Instant dayAgo = Instant.now().minus(Duration.ofDays(1));
        List<Stock> stocks = stockDao.findAll();
        Map<Integer, BigDecimal> refs = stockDao.referencePrices(dayAgo);
        Map<Integer, BigDecimal[]> ranges = stockDao.rangeSince(dayAgo);
        Map<Integer, Quote> fresh = new HashMap<>();
        for (Stock s : stocks) {
            BigDecimal[] range = ranges.get(s.getStockId());
            fresh.put(s.getStockId(), Quote.of(s, refs.get(s.getStockId()),
                    range == null ? null : range[1], range == null ? null : range[0]));
            anchors.putIfAbsent(s.getStockId(), s.getCurrentPrice());
        }
        quotes.keySet().retainAll(fresh.keySet());
        anchors.keySet().retainAll(fresh.keySet());
        quotes.putAll(fresh);
        loaded = true;
    }

    public List<Quote> getAllStocks() throws SQLException {
        ensureLoaded();
        return quotes.values().stream().sorted(Comparator.comparing(Quote::symbol)).toList();
    }

    public Quote getQuote(String symbol) throws SQLException {
        ensureLoaded();
        String wanted = normaliseSymbol(symbol);
        return quotes.values().stream().filter(q -> q.symbol().equals(wanted)).findFirst()
                .orElseThrow(() -> new NotFoundException("No stock with symbol " + wanted + "."));
    }

    public Optional<Quote> quoteById(int stockId) {
        return Optional.ofNullable(quotes.get(stockId));
    }

    public Movers getTopMovers(int n) throws SQLException {
        int limit = Math.max(1, Math.min(n, 20));
        List<Quote> all = getAllStocks();
        List<Quote> gainers = all.stream().filter(q -> q.changePct().signum() > 0)
                .sorted(Comparator.comparing(Quote::changePct).reversed()).limit(limit).toList();
        List<Quote> losers = all.stream().filter(q -> q.changePct().signum() < 0)
                .sorted(Comparator.comparing(Quote::changePct)).limit(limit).toList();
        return new Movers(gainers, losers);
    }

    public List<PricePoint> getPriceHistory(String symbol, Range range) throws SQLException {
        Quote quote = getQuote(symbol);
        Instant now = Instant.now();
        List<PricePoint> points = new ArrayList<>(
                stockDao.history(quote.stockId(), now.minus(range.window), range.bucketSeconds));
        points.add(new PricePoint(now, quote.price()));
        return points;
    }

    /** About 48 points per stock over the last day, keyed by symbol. Cached for a minute. */
    public Map<String, List<BigDecimal>> getSparklines() throws SQLException {
        ensureLoaded();
        Instant now = Instant.now();
        if (Duration.between(sparklinesAt, now).compareTo(SPARKLINE_TTL) > 0) {
            sparklines = stockDao.sparklines(now.minus(SPARKLINE_WINDOW), SPARKLINE_BUCKET_SECONDS);
            sparklinesAt = now;
        }
        Map<String, List<BigDecimal>> bySymbol = new LinkedHashMap<>();
        for (Quote q : getAllStocks()) {
            List<BigDecimal> series = new ArrayList<>(sparklines.getOrDefault(q.stockId(), List.of()));
            series.add(q.price());
            bySymbol.put(q.symbol(), series);
        }
        return bySymbol;
    }

    public List<String> sectors() throws SQLException {
        return getAllStocks().stream().map(Quote::sector).distinct().sorted().toList();
    }

    /** Admin: list a new stock (stockId null) or edit an existing one. */
    public Quote saveStock(Integer stockId, String symbol, String companyName, String sector, BigDecimal price)
            throws SQLException {
        String name = companyName == null ? "" : companyName.trim();
        String sec = sector == null ? "" : sector.trim();
        if (name.isEmpty() || name.length() > 150) {
            throw new ValidationException("Company name is required (up to 150 characters).");
        }
        if (sec.isEmpty() || sec.length() > 60) {
            throw new ValidationException("Sector is required (up to 60 characters).");
        }
        if (price == null || price.signum() <= 0) {
            throw new ValidationException("Price must be greater than zero.");
        }
        BigDecimal cleanPrice = price.setScale(2, RoundingMode.HALF_UP);

        Stock stock;
        if (stockId == null) {
            String sym = normaliseSymbol(symbol);
            if (!SYMBOL.matcher(sym).matches()) {
                throw new ValidationException("Symbol must be 1-20 characters: letters, digits, '&', '.' or '-'.");
            }
            if (stockDao.findBySymbol(sym).isPresent()) {
                throw new ConflictException("A stock with symbol " + sym + " is already listed.");
            }
            try {
                stock = stockDao.save(new Stock(sym, name, sec, cleanPrice));
            } catch (SQLIntegrityConstraintViolationException e) {
                throw new ConflictException("A stock with symbol " + sym + " is already listed.");
            }
        } else {
            stock = stockDao.find(stockId).orElseThrow(() -> new NotFoundException("Stock not found."));
            stock.setCompanyName(name);
            stock.setSector(sec);
            stock.setCurrentPrice(cleanPrice);
            stockDao.update(stock);
        }
        anchors.put(stock.getStockId(), cleanPrice);
        reload();
        sparklinesAt = Instant.EPOCH;
        return quotes.get(stock.getStockId());
    }

    public void removeStock(int stockId) throws SQLException {
        Stock stock = stockDao.find(stockId).orElseThrow(() -> new NotFoundException("Stock not found."));
        if (stockDao.isReferenced(stockId)) {
            throw new ConflictException(stock.getSymbol()
                    + " has holdings or trade history and cannot be removed without losing records.");
        }
        stockDao.delete(stockId);
        synchronized (this) {
            quotes.remove(stockId);
            anchors.remove(stockId);
        }
    }

    // ----- used by the simulator -----

    public Collection<Quote> snapshot() throws SQLException {
        ensureLoaded();
        return List.copyOf(quotes.values());
    }

    /** The price a stock's random walk is pulled back towards, which keeps it bounded. */
    public BigDecimal anchorFor(int stockId, BigDecimal fallback) {
        return anchors.computeIfAbsent(stockId, id -> fallback);
    }

    public synchronized List<Quote> applyTick(Map<Integer, BigDecimal> prices, Instant at) {
        List<Quote> changed = new ArrayList<>(prices.size());
        prices.forEach((id, price) -> {
            Quote q = quotes.get(id);
            if (q != null) {
                Quote next = q.withPrice(price, at);
                quotes.put(id, next);
                changed.add(next);
            }
        });
        return changed;
    }

    private void ensureLoaded() throws SQLException {
        if (!loaded) {
            reload();
        }
    }

    static String normaliseSymbol(String symbol) {
        return symbol == null ? "" : symbol.trim().toUpperCase(Locale.ROOT);
    }
}

package com.sharemarket.simulator;

import com.sharemarket.dao.StockDAO;
import com.sharemarket.dto.AlertView;
import com.sharemarket.dto.Quote;
import com.sharemarket.dto.TickEvent;
import com.sharemarket.model.PriceAlert;
import com.sharemarket.service.AlertService;
import com.sharemarket.service.MarketService;
import com.sharemarket.service.StreamService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;

/**
 * One tick of the simulated market. Each stock moves by a bounded random
 * walk: a shared market move plus a stock-specific move, capped at
 * +/- max.change.percent per tick, with a gentle pull back towards the
 * stock's anchor price so prices stay within a realistic band.
 */
@Component
public class MarketSimulator implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(MarketSimulator.class);
    private static final double MOVE_PROBABILITY = 0.7;
    // Typical move is maxChange / 60 per tick (about 0.03% at the default 2%),
    // which gives a few percent of movement over a day: lively but believable.
    private static final double TYPICAL_FRACTION_OF_MAX = 1.0 / 60.0;
    private static final double MEAN_REVERSION = 0.0003;
    private static final double BAND = 0.25;
    private static final BigDecimal MIN_PRICE = new BigDecimal("0.05");

    private final MarketService market;
    private final StockDAO stockDao;
    private final AlertService alerts;
    private final StreamService stream;
    private final double maxChange;
    private final Random random;

    private volatile boolean running = true;
    private volatile Instant lastTickAt;
    private final AtomicLong ticks = new AtomicLong();

    @Autowired
    public MarketSimulator(MarketService market, StockDAO stockDao, AlertService alerts, StreamService stream,
                           @Value("${simulator.max.change.percent:2}") double maxChangePercent) {
        this(market, stockDao, alerts, stream, maxChangePercent, new Random());
    }

    MarketSimulator(MarketService market, StockDAO stockDao, AlertService alerts, StreamService stream,
                    double maxChangePercent, Random random) {
        this.market = market;
        this.stockDao = stockDao;
        this.alerts = alerts;
        this.stream = stream;
        this.maxChange = Math.max(0.01, maxChangePercent) / 100.0;
        this.random = random;
    }

    @Override
    public void run() {
        if (!running) {
            return;
        }
        // An exception escaping run() would silently cancel the schedule.
        try {
            tick();
        } catch (Exception e) {
            log.warn("Market tick failed: {}", e.getMessage(), e);
        }
    }

    void tick() throws SQLException {
        Collection<Quote> current = market.snapshot();
        if (current.isEmpty()) {
            return;
        }
        double marketMove = random.nextGaussian();
        Map<Integer, BigDecimal> next = new HashMap<>();
        for (Quote q : current) {
            if (random.nextDouble() > MOVE_PROBABILITY) {
                continue;
            }
            BigDecimal price = nextPrice(q.price(), market.anchorFor(q.stockId(), q.price()), marketMove,
                    random.nextGaussian());
            if (price.compareTo(q.price()) != 0) {
                next.put(q.stockId(), price);
            }
        }

        Instant now = Instant.now();
        List<Quote> moved = List.of();
        if (!next.isEmpty()) {
            stockDao.updatePrices(next);
            moved = market.applyTick(next, now);
        }
        List<PriceAlert> fired = alerts.checkAlerts();
        lastTickAt = now;
        ticks.incrementAndGet();

        stream.broadcast("tick", new TickEvent(now, moved));
        for (PriceAlert a : fired) {
            stream.sendTo(a.getUserId(), "alert", AlertView.of(a));
        }
    }

    /**
     * @param marketMove shared standard-normal draw for this tick
     * @param ownMove    standard-normal draw for this stock
     */
    BigDecimal nextPrice(BigDecimal current, BigDecimal anchor, double marketMove, double ownMove) {
        double p = current.doubleValue();
        double a = anchor.doubleValue();
        double sigma = maxChange * TYPICAL_FRACTION_OF_MAX;
        double shock = sigma * (0.45 * marketMove + 0.9 * ownMove);
        double pull = MEAN_REVERSION * (a - p) / a;
        double pct = Math.max(-maxChange, Math.min(maxChange, shock + pull));
        double candidate = p * (1 + pct);
        candidate = Math.max(a * (1 - BAND), Math.min(a * (1 + BAND), candidate));
        BigDecimal result = BigDecimal.valueOf(candidate).setScale(2, RoundingMode.HALF_UP);
        return result.compareTo(MIN_PRICE) < 0 ? MIN_PRICE : result;
    }

    public boolean isRunning() {
        return running;
    }

    public void setRunning(boolean running) {
        this.running = running;
    }

    public Instant getLastTickAt() {
        return lastTickAt;
    }

    public long getTicks() {
        return ticks.get();
    }

    public double getMaxChangePercent() {
        return maxChange * 100.0;
    }
}

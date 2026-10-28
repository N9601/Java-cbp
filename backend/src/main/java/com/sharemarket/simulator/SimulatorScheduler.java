package com.sharemarket.simulator;

import com.sharemarket.dao.StockDAO;
import com.sharemarket.dto.SimulatorStatus;
import com.sharemarket.service.MarketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Runs the MarketSimulator on its own background thread every
 * simulator.interval.seconds, plus a housekeeping job that refreshes the
 * 24 h statistics and archives old price ticks.
 */
@Component
@Order(3)
public class SimulatorScheduler implements ApplicationRunner, DisposableBean {
    private static final Logger log = LoggerFactory.getLogger(SimulatorScheduler.class);

    private final MarketSimulator simulator;
    private final MarketService market;
    private final StockDAO stockDao;
    private final boolean enabled;
    private final int intervalSeconds;
    private final int retentionDays;
    private final ScheduledExecutorService executor = Executors.newScheduledThreadPool(2, r -> {
        Thread t = new Thread(r, "market-simulator");
        t.setDaemon(true);
        return t;
    });

    public SimulatorScheduler(MarketSimulator simulator, MarketService market, StockDAO stockDao,
                              @Value("${simulator.enabled:true}") boolean enabled,
                              @Value("${simulator.interval.seconds:5}") int intervalSeconds,
                              @Value("${simulator.history.retention.days:30}") int retentionDays) {
        this.simulator = simulator;
        this.market = market;
        this.stockDao = stockDao;
        this.enabled = enabled;
        this.intervalSeconds = Math.max(1, intervalSeconds);
        this.retentionDays = Math.max(1, retentionDays);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        market.reload();
        simulator.setRunning(enabled);
        executor.scheduleAtFixedRate(simulator, intervalSeconds, intervalSeconds, TimeUnit.SECONDS);
        executor.scheduleWithFixedDelay(this::housekeeping, 10, 10, TimeUnit.MINUTES);
        log.info("Market simulator {} (tick every {} s, max move {}%)", enabled ? "started" : "paused",
                intervalSeconds, simulator.getMaxChangePercent());
    }

    void housekeeping() {
        try {
            market.reload();
            int removed = stockDao.deleteHistoryBefore(Instant.now().minus(Duration.ofDays(retentionDays)));
            if (removed > 0) {
                log.info("Archived {} price ticks older than {} days", removed, retentionDays);
            }
        } catch (Exception e) {
            log.warn("Housekeeping failed: {}", e.getMessage());
        }
    }

    public SimulatorStatus status() {
        return new SimulatorStatus(simulator.isRunning(), intervalSeconds,
                BigDecimal.valueOf(simulator.getMaxChangePercent()).setScale(2, RoundingMode.HALF_UP),
                simulator.getLastTickAt(), simulator.getTicks());
    }

    public SimulatorStatus setRunning(boolean running) {
        simulator.setRunning(running);
        log.info("Market simulator {}", running ? "resumed" : "paused");
        return status();
    }

    @Override
    public void destroy() {
        executor.shutdownNow();
    }
}

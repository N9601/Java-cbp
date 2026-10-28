package com.sharemarket.service;

import com.sharemarket.dao.AlertDAO;
import com.sharemarket.dto.AlertView;
import com.sharemarket.dto.Quote;
import com.sharemarket.exception.NotFoundException;
import com.sharemarket.exception.ValidationException;
import com.sharemarket.model.AlertCondition;
import com.sharemarket.model.PriceAlert;
import com.sharemarket.model.Stock;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;

/** Price alerts: ACTIVE until the price crosses the target, then TRIGGERED. */
@Service
public class AlertService {
    private static final int MAX_ACTIVE_ALERTS = 50;

    private final AlertDAO alertDao;
    private final MarketService market;

    public AlertService(AlertDAO alertDao, MarketService market) {
        this.alertDao = alertDao;
        this.market = market;
    }

    public List<AlertView> list(int userId) throws SQLException {
        return alertDao.findByUser(userId).stream().map(AlertView::of).toList();
    }

    public AlertView create(int userId, String symbol, AlertCondition condition, BigDecimal targetPrice)
            throws SQLException {
        if (condition == null) {
            throw new ValidationException("Choose whether to alert when the price goes above or below the target.");
        }
        if (targetPrice == null || targetPrice.signum() <= 0) {
            throw new ValidationException("Target price must be greater than zero.");
        }
        Quote quote = market.getQuote(symbol);
        BigDecimal target = targetPrice.setScale(2, RoundingMode.HALF_UP);
        if (condition.isMet(quote.price(), target)) {
            String side = condition == AlertCondition.ABOVE ? "above" : "below";
            throw new ValidationException(quote.symbol() + " is already " + side + " " + target.toPlainString()
                    + ". Pick a target " + side + " the current price of " + quote.price().toPlainString() + ".");
        }
        long active = alertDao.findByUser(userId).stream().filter(a -> !a.isTriggered()).count();
        if (active >= MAX_ACTIVE_ALERTS) {
            throw new ValidationException("You can have up to " + MAX_ACTIVE_ALERTS + " active alerts.");
        }
        PriceAlert saved = alertDao.save(new PriceAlert(userId, quote.stockId(), target, condition));
        return alertDao.find(saved.getAlertId()).map(AlertView::of).orElseThrow();
    }

    public void delete(int userId, int alertId) throws SQLException {
        if (!alertDao.deleteOwned(alertId, userId)) {
            throw new NotFoundException("Alert not found.");
        }
    }

    /** Runs on every simulator tick. Returns the alerts that fired on this tick. */
    public List<PriceAlert> checkAlerts() throws SQLException {
        return fire(alertDao.findTriggerable());
    }

    public List<PriceAlert> checkAlerts(Stock stock) throws SQLException {
        return fire(alertDao.findTriggerable(stock.getStockId()));
    }

    private List<PriceAlert> fire(List<PriceAlert> due) throws SQLException {
        if (due.isEmpty()) {
            return due;
        }
        Instant now = Instant.now();
        alertDao.markTriggered(due.stream().map(PriceAlert::getAlertId).toList(), now);
        due.forEach(a -> {
            a.setTriggered(true);
            a.setTriggeredAt(now);
        });
        return due;
    }
}

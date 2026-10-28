package com.sharemarket.service;

import com.sharemarket.dao.AlertDAO;
import com.sharemarket.dao.MySqlTestSupport;
import com.sharemarket.dao.StockDAO;
import com.sharemarket.dto.AlertView;
import com.sharemarket.exception.ValidationException;
import com.sharemarket.model.AlertCondition;
import com.sharemarket.model.PriceAlert;
import com.sharemarket.model.Stock;
import com.sharemarket.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlertServiceIntegrationTest extends MySqlTestSupport {
    private StockDAO stocks;
    private MarketService market;
    private AlertService alerts;
    private User investor;
    private Stock stock;

    @BeforeEach
    void setUp() throws SQLException {
        stocks = new StockDAO(db);
        market = new MarketService(stocks);
        alerts = new AlertService(new AlertDAO(db), market);
        investor = newInvestor("alerts@test.dev", "5000.00");
        stock = newStock("ALRT", "200.00");
        market.reload();
    }

    @Test
    void alertFiresOnceWhenThePriceCrossesTheTarget() throws SQLException {
        AlertView created = alerts.create(investor.getUserId(), "ALRT", AlertCondition.ABOVE, new BigDecimal("210"));
        assertFalse(created.triggered());
        assertTrue(alerts.checkAlerts().isEmpty());

        stock.setCurrentPrice(new BigDecimal("211.00"));
        stocks.update(stock);
        List<PriceAlert> fired = alerts.checkAlerts();
        assertEquals(1, fired.size());
        assertEquals(created.id(), fired.get(0).getAlertId());

        assertTrue(alerts.checkAlerts().isEmpty(), "a triggered alert must not fire again");
        assertTrue(alerts.list(investor.getUserId()).get(0).triggered());
    }

    @Test
    void rejectsATargetThatIsAlreadyMet() {
        assertThrows(ValidationException.class,
                () -> alerts.create(investor.getUserId(), "ALRT", AlertCondition.BELOW, new BigDecimal("250")));
    }

    @Test
    void usersCanOnlyDeleteTheirOwnAlerts() throws SQLException {
        AlertView mine = alerts.create(investor.getUserId(), "ALRT", AlertCondition.BELOW, new BigDecimal("150"));
        User other = newInvestor("other@test.dev", "100.00");
        assertThrows(RuntimeException.class, () -> alerts.delete(other.getUserId(), mine.id()));
        alerts.delete(investor.getUserId(), mine.id());
        assertTrue(alerts.list(investor.getUserId()).isEmpty());
    }
}

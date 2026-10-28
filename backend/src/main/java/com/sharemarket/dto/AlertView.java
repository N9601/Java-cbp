package com.sharemarket.dto;

import com.sharemarket.model.AlertCondition;
import com.sharemarket.model.PriceAlert;

import java.math.BigDecimal;
import java.time.Instant;

public record AlertView(int id, String symbol, String companyName, AlertCondition condition,
                        BigDecimal targetPrice, BigDecimal currentPrice, boolean triggered,
                        Instant createdAt, Instant triggeredAt) {

    public static AlertView of(PriceAlert a) {
        return new AlertView(a.getAlertId(), a.getSymbol(), a.getCompanyName(), a.getCondition(),
                a.getTargetPrice(), a.getCurrentPrice(), a.isTriggered(), a.getCreatedAt(), a.getTriggeredAt());
    }
}

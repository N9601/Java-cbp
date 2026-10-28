package com.sharemarket.dto;

import com.sharemarket.model.Stock;
import com.sharemarket.service.PortfolioMath;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A stock with its live price and 24-hour statistics. refPrice is the price
 * 24 hours ago, so change and changePct describe the rolling day.
 */
public record Quote(int stockId, String symbol, String companyName, String sector, BigDecimal price,
                    BigDecimal refPrice, BigDecimal change, BigDecimal changePct,
                    BigDecimal dayHigh, BigDecimal dayLow, Instant updatedAt) {

    public static Quote of(Stock s, BigDecimal refPrice, BigDecimal high, BigDecimal low) {
        return build(s.getStockId(), s.getSymbol(), s.getCompanyName(), s.getSector(), s.getCurrentPrice(),
                refPrice, high, low, s.getUpdatedAt());
    }

    public Quote withPrice(BigDecimal newPrice, Instant at) {
        return build(stockId, symbol, companyName, sector, newPrice, refPrice,
                newPrice.max(dayHigh), newPrice.min(dayLow), at);
    }

    private static Quote build(int id, String symbol, String company, String sector, BigDecimal price,
                               BigDecimal ref, BigDecimal high, BigDecimal low, Instant at) {
        BigDecimal reference = ref == null ? price : ref;
        BigDecimal change = PortfolioMath.money(price.subtract(reference));
        BigDecimal hi = high == null ? price : high.max(price);
        BigDecimal lo = low == null ? price : low.min(price);
        return new Quote(id, symbol, company, sector, price, reference, change,
                PortfolioMath.percent(change, reference), hi, lo, at);
    }
}

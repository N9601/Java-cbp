package com.sharemarket.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The trading formulas from the design document, kept free of I/O so they
 * can be unit tested on their own.
 */
public final class PortfolioMath {
    public static final int MONEY_SCALE = 2;
    public static final int AVG_SCALE = 4;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private PortfolioMath() {
    }

    /** quantity x price, rounded to paise. */
    public static BigDecimal tradeValue(int quantity, BigDecimal price) {
        return price.multiply(BigDecimal.valueOf(quantity)).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /** New average buy price = (old qty x old avg + qty x price) / (old qty + qty). */
    public static BigDecimal newAverage(int oldQty, BigDecimal oldAvg, int qty, BigDecimal price) {
        if (qty <= 0) {
            throw new IllegalArgumentException("qty must be positive");
        }
        BigDecimal oldCost = oldAvg.multiply(BigDecimal.valueOf(oldQty));
        BigDecimal newCost = price.multiply(BigDecimal.valueOf(qty));
        return oldCost.add(newCost).divide(BigDecimal.valueOf((long) oldQty + qty), AVG_SCALE, RoundingMode.HALF_UP);
    }

    /** Unrealised P/L = (current price - avg buy price) x quantity. */
    public static BigDecimal unrealisedPnl(BigDecimal currentPrice, BigDecimal avgBuyPrice, int quantity) {
        return currentPrice.subtract(avgBuyPrice).multiply(BigDecimal.valueOf(quantity))
                .setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /** Realised P/L on a sell = (sell price - avg buy price) x quantity sold. */
    public static BigDecimal realisedPnl(BigDecimal sellPrice, BigDecimal avgBuyPrice, int quantitySold) {
        return unrealisedPnl(sellPrice, avgBuyPrice, quantitySold);
    }

    /** part / whole x 100, or zero when whole is zero. */
    public static BigDecimal percent(BigDecimal part, BigDecimal whole) {
        if (whole == null || whole.signum() == 0) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE);
        }
        return part.multiply(HUNDRED).divide(whole, MONEY_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }
}

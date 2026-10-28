package com.sharemarket.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PortfolioMathTest {

    private static BigDecimal d(String v) {
        return new BigDecimal(v);
    }

    @Test
    void tradeValueIsQuantityTimesPriceRoundedToPaise() {
        assertEquals(d("12914.00"), PortfolioMath.tradeValue(10, d("1291.40")));
        assertEquals(d("0.33"), PortfolioMath.tradeValue(1, d("0.333")));
    }

    @Test
    void newAverageFollowsTheWeightedFormula() {
        // (10 x 100 + 5 x 130) / 15 = 110
        assertEquals(d("110.0000"), PortfolioMath.newAverage(10, d("100"), 5, d("130")));
        // First purchase: the average is just the price.
        assertEquals(d("250.5000"), PortfolioMath.newAverage(0, BigDecimal.ZERO, 3, d("250.50")));
        // (3 x 10 + 1 x 11) / 4 = 10.25
        assertEquals(d("10.2500"), PortfolioMath.newAverage(3, d("10"), 1, d("11")));
    }

    @Test
    void newAverageRejectsNonPositiveQuantity() {
        assertThrows(IllegalArgumentException.class, () -> PortfolioMath.newAverage(1, d("1"), 0, d("1")));
    }

    @Test
    void unrealisedPnlIsPriceGapTimesQuantity() {
        assertEquals(d("150.00"), PortfolioMath.unrealisedPnl(d("115"), d("100"), 10));
        assertEquals(d("-62.50"), PortfolioMath.unrealisedPnl(d("87.50"), d("100"), 5));
    }

    @Test
    void realisedPnlUsesSellPriceAgainstAverage() {
        assertEquals(d("60.00"), PortfolioMath.realisedPnl(d("120"), d("110"), 6));
    }

    @Test
    void percentHandlesZeroBase() {
        assertEquals(d("15.00"), PortfolioMath.percent(d("150"), d("1000")));
        assertEquals(d("0.00"), PortfolioMath.percent(d("5"), BigDecimal.ZERO));
    }
}

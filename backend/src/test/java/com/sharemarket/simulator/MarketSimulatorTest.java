package com.sharemarket.simulator;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MarketSimulatorTest {
    private final MarketSimulator simulator = new MarketSimulator(null, null, null, null, 2.0, new Random(1));

    @RepeatedTest(20)
    void oneTickNeverMovesMoreThanTheConfiguredMaximum() {
        Random r = new Random();
        BigDecimal price = new BigDecimal("1000.00");
        // Extreme draws on purpose: the move must still be capped at 2 %.
        BigDecimal next = simulator.nextPrice(price, price, r.nextGaussian() * 50, r.nextGaussian() * 50);
        double change = Math.abs(next.doubleValue() - 1000.0) / 1000.0;
        assertTrue(change <= 0.02 + 1e-9, "moved " + change);
    }

    @Test
    void walkStaysWithinTheBandAroundTheAnchor() {
        Random r = new Random(42);
        BigDecimal anchor = new BigDecimal("500.00");
        BigDecimal price = anchor;
        for (int i = 0; i < 20_000; i++) {
            price = simulator.nextPrice(price, anchor, r.nextGaussian(), r.nextGaussian() + 0.5);
            assertTrue(price.doubleValue() >= 500 * 0.75 - 0.01 && price.doubleValue() <= 500 * 1.25 + 0.01,
                    "price left the band: " + price);
        }
    }

    @Test
    void neutralDrawsLeaveTheAnchorPriceUnchanged() {
        BigDecimal price = new BigDecimal("250.00");
        assertEquals(price, simulator.nextPrice(price, price, 0, 0));
    }

    @Test
    void pricesStayPositive() {
        BigDecimal anchor = new BigDecimal("0.05");
        BigDecimal next = simulator.nextPrice(anchor, anchor, -100, -100);
        assertTrue(next.signum() > 0);
    }
}

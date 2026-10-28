package com.sharemarket.service;

import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class RealisedLedgerTest {
    private long nextId = 1;

    private Transaction txn(int stockId, TxnType type, int qty, String price) {
        Transaction t = new Transaction(1, stockId, type, qty, new BigDecimal(price), Instant.now());
        t.setTxnId(nextId++);
        return t;
    }

    @Test
    void replaysWeightedAverageAndRealisedProfit() {
        Transaction buy1 = txn(7, TxnType.BUY, 10, "100");
        Transaction buy2 = txn(7, TxnType.BUY, 5, "130");   // avg becomes 110
        Transaction sell = txn(7, TxnType.SELL, 6, "120");  // (120 - 110) x 6 = 60
        RealisedLedger ledger = RealisedLedger.replay(List.of(buy1, buy2, sell));

        assertEquals(new BigDecimal("60.00"), ledger.forTransaction(sell.getTxnId()));
        assertNull(ledger.forTransaction(buy1.getTxnId()));
        assertEquals(9, ledger.quantityOf(7));
        assertEquals(new BigDecimal("110.0000"), ledger.averageOf(7));
        assertEquals(new BigDecimal("60.00"), ledger.total());
    }

    @Test
    void sellingEverythingResetsTheAverage() {
        RealisedLedger ledger = RealisedLedger.replay(List.of(
                txn(3, TxnType.BUY, 4, "50"),
                txn(3, TxnType.SELL, 4, "45"),     // -20
                txn(3, TxnType.BUY, 2, "60")));    // fresh position at 60
        assertEquals(2, ledger.quantityOf(3));
        assertEquals(new BigDecimal("60.0000"), ledger.averageOf(3));
        assertEquals(new BigDecimal("-20.00"), ledger.total());
    }

    @Test
    void keepsStocksSeparate() {
        RealisedLedger ledger = RealisedLedger.replay(List.of(
                txn(1, TxnType.BUY, 10, "10"),
                txn(2, TxnType.BUY, 10, "20"),
                txn(1, TxnType.SELL, 5, "12"),     // +10
                txn(2, TxnType.SELL, 5, "18")));   // -10
        assertEquals(new BigDecimal("10.00"), ledger.byStock().get(1));
        assertEquals(new BigDecimal("-10.00"), ledger.byStock().get(2));
        assertEquals(new BigDecimal("0.00"), ledger.total());
    }
}

package com.sharemarket.service;

import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnType;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Replays a user's trades in time order with the weighted-average cost
 * method. Realised profit is derived from the transaction history rather
 * than stored, which keeps the schema in third normal form.
 */
public final class RealisedLedger {
    private final Map<Long, BigDecimal> byTransaction = new HashMap<>();
    private final Map<Integer, BigDecimal> byStock = new HashMap<>();
    private final Map<Integer, Position> positions = new HashMap<>();
    private BigDecimal total = BigDecimal.ZERO.setScale(PortfolioMath.MONEY_SCALE);

    private static final class Position {
        int quantity;
        BigDecimal avg = BigDecimal.ZERO;
    }

    /** @param chronological the user's transactions, oldest first */
    public static RealisedLedger replay(List<Transaction> chronological) {
        RealisedLedger ledger = new RealisedLedger();
        chronological.forEach(ledger::apply);
        return ledger;
    }

    public void apply(Transaction t) {
        Position p = positions.computeIfAbsent(t.getStockId(), id -> new Position());
        if (t.getType() == TxnType.BUY) {
            p.avg = PortfolioMath.newAverage(p.quantity, p.avg, t.getQuantity(), t.getPrice());
            p.quantity += t.getQuantity();
            return;
        }
        BigDecimal pnl = PortfolioMath.realisedPnl(t.getPrice(), p.avg, t.getQuantity());
        p.quantity -= t.getQuantity();
        if (p.quantity <= 0) {
            p.quantity = 0;
            p.avg = BigDecimal.ZERO;
        }
        byTransaction.put(t.getTxnId(), pnl);
        byStock.merge(t.getStockId(), pnl, BigDecimal::add);
        total = total.add(pnl);
    }

    public BigDecimal forTransaction(long txnId) {
        return byTransaction.get(txnId);
    }

    public Map<Integer, BigDecimal> byStock() {
        return byStock;
    }

    public BigDecimal total() {
        return total;
    }

    public int quantityOf(int stockId) {
        Position p = positions.get(stockId);
        return p == null ? 0 : p.quantity;
    }

    public BigDecimal averageOf(int stockId) {
        Position p = positions.get(stockId);
        return p == null ? BigDecimal.ZERO : p.avg;
    }
}

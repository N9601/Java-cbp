package com.sharemarket.dto;

import com.sharemarket.model.Transaction;
import com.sharemarket.model.TxnType;

import java.math.BigDecimal;
import java.time.Instant;

/** realisedPnl is set for SELL rows in a user's own history and null otherwise. */
public record TransactionView(long id, String symbol, String companyName, TxnType type, int quantity,
                              BigDecimal price, BigDecimal amount, Instant time, BigDecimal realisedPnl,
                              Integer userId, String userName, String userEmail) {

    public static TransactionView of(Transaction t, BigDecimal realisedPnl) {
        return new TransactionView(t.getTxnId(), t.getSymbol(), t.getCompanyName(), t.getType(), t.getQuantity(),
                t.getPrice(), t.getAmount(), t.getTxnTime(), realisedPnl, null, null, null);
    }

    public static TransactionView withUser(Transaction t) {
        return new TransactionView(t.getTxnId(), t.getSymbol(), t.getCompanyName(), t.getType(), t.getQuantity(),
                t.getPrice(), t.getAmount(), t.getTxnTime(), null, t.getUserId(), t.getUserName(),
                t.getUserEmail());
    }
}

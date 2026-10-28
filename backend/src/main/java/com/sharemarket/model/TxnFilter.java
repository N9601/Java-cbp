package com.sharemarket.model;

import java.time.Instant;

/**
 * Filter for the transaction history. Null fields are ignored.
 * userId is set by the service from the session, never by the client.
 */
public record TxnFilter(Integer userId, String symbol, TxnType type, Instant from, Instant to,
                        String query, int page, int size) {

    public TxnFilter {
        page = Math.max(page, 0);
        size = size <= 0 ? 20 : Math.min(size, 200);
    }

    public TxnFilter forUser(int id) {
        return new TxnFilter(id, symbol, type, from, to, query, page, size);
    }
}

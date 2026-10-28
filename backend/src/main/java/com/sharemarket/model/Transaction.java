package com.sharemarket.model;

import com.sharemarket.service.PortfolioMath;

import java.math.BigDecimal;
import java.time.Instant;

public class Transaction {
    private long txnId;
    private int userId;
    private int stockId;
    private TxnType type;
    private int quantity;
    private BigDecimal price;
    private Instant txnTime;

    // Joined columns, filled in by list queries.
    private String symbol;
    private String companyName;
    private String userName;
    private String userEmail;

    public Transaction() {
    }

    public Transaction(int userId, int stockId, TxnType type, int quantity, BigDecimal price, Instant txnTime) {
        this.userId = userId;
        this.stockId = stockId;
        this.type = type;
        this.quantity = quantity;
        this.price = price;
        this.txnTime = txnTime;
    }

    public BigDecimal getAmount() {
        return PortfolioMath.tradeValue(quantity, price);
    }

    public long getTxnId() {
        return txnId;
    }

    public void setTxnId(long txnId) {
        this.txnId = txnId;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public int getStockId() {
        return stockId;
    }

    public void setStockId(int stockId) {
        this.stockId = stockId;
    }

    public TxnType getType() {
        return type;
    }

    public void setType(TxnType type) {
        this.type = type;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Instant getTxnTime() {
        return txnTime;
    }

    public void setTxnTime(Instant txnTime) {
        this.txnTime = txnTime;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }
}

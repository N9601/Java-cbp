package com.sharemarket.model;

import com.sharemarket.service.PortfolioMath;

import java.math.BigDecimal;

/**
 * One row of holdings. When loaded through portfolio_view the stock
 * details and current price are filled in as well.
 */
public class Holding {
    private int holdingId;
    private int userId;
    private int stockId;
    private int quantity;
    private BigDecimal avgBuyPrice;

    private String symbol;
    private String companyName;
    private String sector;
    private BigDecimal currentPrice;

    public Holding() {
    }

    public Holding(int userId, int stockId, int quantity, BigDecimal avgBuyPrice) {
        this.userId = userId;
        this.stockId = stockId;
        this.quantity = quantity;
        this.avgBuyPrice = avgBuyPrice;
    }

    public BigDecimal getInvested() {
        return PortfolioMath.tradeValue(quantity, avgBuyPrice);
    }

    public BigDecimal getMarketValue() {
        return PortfolioMath.tradeValue(quantity, currentPrice);
    }

    public BigDecimal getUnrealisedPnl() {
        return PortfolioMath.unrealisedPnl(currentPrice, avgBuyPrice, quantity);
    }

    public int getHoldingId() {
        return holdingId;
    }

    public void setHoldingId(int holdingId) {
        this.holdingId = holdingId;
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

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAvgBuyPrice() {
        return avgBuyPrice;
    }

    public void setAvgBuyPrice(BigDecimal avgBuyPrice) {
        this.avgBuyPrice = avgBuyPrice;
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

    public String getSector() {
        return sector;
    }

    public void setSector(String sector) {
        this.sector = sector;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }
}

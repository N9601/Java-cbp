package com.sharemarket.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PlatformStats(long investors, long admins, long stocks, long totalTrades, long tradesToday,
                            BigDecimal volumeToday, BigDecimal cashHeld, BigDecimal holdingsValue,
                            BigDecimal assetsUnderManagement, List<DailyActivity> activity,
                            List<TradedStock> mostTraded, List<TransactionView> recent,
                            SimulatorStatus simulator) {

    public record DailyActivity(LocalDate day, long trades, BigDecimal volume) {
    }

    public record TradedStock(String symbol, String companyName, long trades, BigDecimal volume) {
    }
}

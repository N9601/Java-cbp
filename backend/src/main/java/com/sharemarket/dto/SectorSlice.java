package com.sharemarket.dto;

import java.math.BigDecimal;

public record SectorSlice(String sector, BigDecimal value, BigDecimal weight) {
}

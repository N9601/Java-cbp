package com.sharemarket.dto;

import java.util.List;

public record Movers(List<Quote> gainers, List<Quote> losers) {
}

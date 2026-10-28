package com.sharemarket.dto;

import java.time.Instant;

public record PortfolioReport(Instant generatedAt, String investorName, String investorEmail,
                              PortfolioSummary summary) {
}

package com.sharemarket.util;

import com.sharemarket.dto.HoldingView;
import com.sharemarket.dto.PortfolioReport;
import com.sharemarket.dto.PortfolioSummary;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Writes the portfolio report as CSV (UTF-8 with BOM so Excel opens it cleanly). */
public final class CsvExporter {
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm:ss z");

    private CsvExporter() {
    }

    public static byte[] portfolio(PortfolioReport report, ZoneId zone) {
        PortfolioSummary s = report.summary();
        StringBuilder sb = new StringBuilder("﻿");
        row(sb, "Share Market Portfolio Report");
        row(sb, "Investor", report.investorName());
        row(sb, "Email", report.investorEmail());
        row(sb, "Generated", WHEN.format(report.generatedAt().atZone(zone)));
        row(sb, "Currency", "INR");
        sb.append("\r\n");

        row(sb, "Summary");
        row(sb, "Cash balance", s.cash());
        row(sb, "Invested amount", s.invested());
        row(sb, "Current value", s.marketValue());
        row(sb, "Unrealised P/L", s.unrealisedPnl());
        row(sb, "Unrealised P/L %", s.unrealisedPnlPct());
        row(sb, "Realised P/L", s.realisedPnl());
        row(sb, "Total P/L", s.totalPnl());
        row(sb, "Net worth", s.netWorth());
        sb.append("\r\n");

        row(sb, "Holdings");
        row(sb, "Symbol", "Company", "Sector", "Quantity", "Avg buy price", "Current price", "Invested",
                "Current value", "Unrealised P/L", "Unrealised P/L %", "Realised P/L", "Weight %");
        for (HoldingView h : s.holdings()) {
            row(sb, h.symbol(), h.companyName(), h.sector(), h.quantity(), h.avgBuyPrice(), h.currentPrice(),
                    h.invested(), h.marketValue(), h.unrealisedPnl(), h.unrealisedPnlPct(), h.realisedPnl(),
                    h.weight());
        }
        sb.append("\r\n");
        row(sb, "Prices come from the simulated market and are not real quotes.");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static void row(StringBuilder sb, Object... cells) {
        for (int i = 0; i < cells.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(escape(cells[i]));
        }
        sb.append("\r\n");
    }

    static String escape(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString();
        // Text that a spreadsheet would read as a formula is prefixed so it stays text.
        if (value instanceof String && !s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}

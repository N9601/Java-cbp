package com.sharemarket.util;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.sharemarket.dto.HoldingView;
import com.sharemarket.dto.PortfolioReport;
import com.sharemarket.dto.PortfolioSummary;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Writes the portfolio report as an A4 landscape PDF with OpenPDF. */
public final class PdfExporter {
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm z");
    private static final Color INK = new Color(17, 24, 39);
    private static final Color MUTED = new Color(107, 114, 128);
    private static final Color BRAND = new Color(79, 70, 229);
    private static final Color LINE = new Color(229, 231, 235);
    private static final Color HEADER_BG = new Color(243, 244, 246);
    private static final Color GAIN = new Color(5, 150, 105);
    private static final Color LOSS = new Color(220, 38, 38);

    private PdfExporter() {
    }

    public static byte[] portfolio(PortfolioReport report, ZoneId zone) {
        PortfolioSummary s = report.summary();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 36, 36, 32, 32);
        try {
            PdfWriter.getInstance(doc, out);
            doc.addTitle("Portfolio report - " + report.investorName());
            doc.addCreator("Share Market Portfolio Management System");
            doc.open();

            Paragraph brand = new Paragraph("MarketLab", font(FontFactory.HELVETICA_BOLD, 11, BRAND));
            doc.add(brand);
            Paragraph title = new Paragraph("Portfolio Report", font(FontFactory.HELVETICA_BOLD, 20, INK));
            title.setSpacingAfter(2);
            doc.add(title);
            Paragraph meta = new Paragraph(report.investorName() + "  |  " + report.investorEmail()
                    + "  |  Generated " + WHEN.format(report.generatedAt().atZone(zone)) + "  |  Amounts in INR",
                    font(FontFactory.HELVETICA, 9, MUTED));
            meta.setSpacingAfter(14);
            doc.add(meta);

            PdfPTable summary = new PdfPTable(4);
            summary.setWidthPercentage(100);
            summary.setSpacingAfter(16);
            summaryCell(summary, "Net worth", Money.format(s.netWorth()), INK);
            summaryCell(summary, "Cash balance", Money.format(s.cash()), INK);
            summaryCell(summary, "Invested", Money.format(s.invested()), INK);
            summaryCell(summary, "Current value", Money.format(s.marketValue()), INK);
            summaryCell(summary, "Unrealised P/L", Money.signed(s.unrealisedPnl())
                    + "  (" + s.unrealisedPnlPct().toPlainString() + "%)", tone(s.unrealisedPnl()));
            summaryCell(summary, "Realised P/L", Money.signed(s.realisedPnl()), tone(s.realisedPnl()));
            summaryCell(summary, "Total P/L", Money.signed(s.totalPnl()), tone(s.totalPnl()));
            summaryCell(summary, "Positions", String.valueOf(s.holdings().size()), INK);
            doc.add(summary);

            Paragraph holdingsTitle = new Paragraph("Holdings", font(FontFactory.HELVETICA_BOLD, 12, INK));
            holdingsTitle.setSpacingAfter(6);
            doc.add(holdingsTitle);

            String[] headers = {"Symbol", "Company", "Qty", "Avg buy", "Price", "Invested", "Value",
                    "Unrealised P/L", "P/L %", "Realised P/L"};
            PdfPTable table = new PdfPTable(new float[]{1.55f, 2.4f, 0.6f, 1.1f, 1.1f, 1.3f, 1.3f, 1.35f, 0.8f, 1.25f});
            table.setWidthPercentage(100);
            table.setHeaderRows(1);
            for (int i = 0; i < headers.length; i++) {
                PdfPCell cell = cell(headers[i], font(FontFactory.HELVETICA_BOLD, 8.5f, MUTED), i >= 2);
                cell.setBackgroundColor(HEADER_BG);
                table.addCell(cell);
            }
            Font body = font(FontFactory.HELVETICA, 9, INK);
            for (HoldingView h : s.holdings()) {
                table.addCell(cell(h.symbol(), font(FontFactory.HELVETICA_BOLD, 9, INK), false));
                table.addCell(cell(h.companyName(), body, false));
                table.addCell(cell(String.valueOf(h.quantity()), body, true));
                table.addCell(cell(Money.format(h.avgBuyPrice()), body, true));
                table.addCell(cell(Money.format(h.currentPrice()), body, true));
                table.addCell(cell(Money.format(h.invested()), body, true));
                table.addCell(cell(Money.format(h.marketValue()), body, true));
                table.addCell(cell(Money.signed(h.unrealisedPnl()), font(FontFactory.HELVETICA, 9, tone(h.unrealisedPnl())), true));
                table.addCell(cell(h.unrealisedPnlPct().toPlainString() + "%", font(FontFactory.HELVETICA, 9, tone(h.unrealisedPnl())), true));
                table.addCell(cell(Money.signed(h.realisedPnl()), font(FontFactory.HELVETICA, 9, tone(h.realisedPnl())), true));
            }
            if (s.holdings().isEmpty()) {
                PdfPCell empty = cell("No open positions.", font(FontFactory.HELVETICA_OBLIQUE, 9, MUTED), false);
                empty.setColspan(headers.length);
                table.addCell(empty);
            }
            doc.add(table);

            Paragraph note = new Paragraph(new Chunk("Prices come from the simulated market and are not real quotes. "
                    + "Realised P/L uses the weighted-average cost of each holding.", font(FontFactory.HELVETICA, 8, MUTED)));
            note.setSpacingBefore(14);
            doc.add(note);
        } catch (DocumentException e) {
            throw new IllegalStateException("Could not build the PDF report", e);
        } finally {
            doc.close();
        }
        return out.toByteArray();
    }

    private static void summaryCell(PdfPTable table, String label, String value, Color valueColor) {
        Phrase phrase = new Phrase();
        phrase.add(new Chunk(label + "\n", font(FontFactory.HELVETICA, 8.5f, MUTED)));
        phrase.add(new Chunk(value, font(FontFactory.HELVETICA_BOLD, 12, valueColor)));
        PdfPCell cell = new PdfPCell(phrase);
        cell.setPadding(9);
        cell.setBorderColor(LINE);
        table.addCell(cell);
    }

    private static PdfPCell cell(String text, Font font, boolean right) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPaddingTop(6);
        cell.setPaddingBottom(6);
        cell.setPaddingLeft(5);
        cell.setPaddingRight(5);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(LINE);
        cell.setHorizontalAlignment(right ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
        return cell;
    }

    private static Font font(String name, float size, Color color) {
        return FontFactory.getFont(name, size, Font.NORMAL, color);
    }

    private static Color tone(BigDecimal value) {
        if (value == null || value.signum() == 0) {
            return INK;
        }
        return value.signum() > 0 ? GAIN : LOSS;
    }
}

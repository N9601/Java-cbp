package com.sharemarket.service;

import com.sharemarket.dao.UserDAO;
import com.sharemarket.dto.ExportedFile;
import com.sharemarket.dto.PortfolioReport;
import com.sharemarket.exception.NotFoundException;
import com.sharemarket.exception.ValidationException;
import com.sharemarket.model.User;
import com.sharemarket.util.CsvExporter;
import com.sharemarket.util.PdfExporter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;

@Service
public class ReportService {
    public enum Format {
        CSV, PDF;

        public static Format parse(String value) {
            try {
                return valueOf(value.trim().toUpperCase(Locale.ROOT));
            } catch (RuntimeException e) {
                throw new ValidationException("Format must be csv or pdf.");
            }
        }
    }

    private final PortfolioService portfolio;
    private final UserDAO userDao;
    private final ZoneId zone;

    public ReportService(PortfolioService portfolio, UserDAO userDao,
                         @Value("${app.report.zone:Asia/Kolkata}") String zone) {
        this.portfolio = portfolio;
        this.userDao = userDao;
        this.zone = ZoneId.of(zone);
    }

    public PortfolioReport build(int userId) throws SQLException {
        User user = userDao.find(userId).orElseThrow(() -> new NotFoundException("Account not found."));
        return new PortfolioReport(Instant.now(), user.getName(), user.getEmail(), portfolio.getPortfolio(userId));
    }

    public ExportedFile export(int userId, Format format) throws SQLException {
        PortfolioReport report = build(userId);
        String base = "portfolio-report-" + LocalDate.now(zone);
        return switch (format) {
            case CSV -> new ExportedFile(base + ".csv", "text/csv; charset=UTF-8", CsvExporter.portfolio(report, zone));
            case PDF -> new ExportedFile(base + ".pdf", "application/pdf", PdfExporter.portfolio(report, zone));
        };
    }
}

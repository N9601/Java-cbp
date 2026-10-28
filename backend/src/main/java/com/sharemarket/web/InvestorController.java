package com.sharemarket.web;

import com.sharemarket.dto.AlertView;
import com.sharemarket.dto.ExportedFile;
import com.sharemarket.dto.Page;
import com.sharemarket.dto.PortfolioReport;
import com.sharemarket.dto.PortfolioSummary;
import com.sharemarket.dto.TradeResult;
import com.sharemarket.dto.TransactionView;
import com.sharemarket.model.PricePoint;
import com.sharemarket.model.TxnFilter;
import com.sharemarket.model.TxnType;
import com.sharemarket.service.AlertService;
import com.sharemarket.service.MarketService;
import com.sharemarket.service.PortfolioService;
import com.sharemarket.service.ReportService;
import com.sharemarket.service.TradeService;
import com.sharemarket.util.Session;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.sql.SQLException;
import java.time.Instant;
import java.util.List;

/** Investor features. Every call is scoped to the user id held in the session. */
@RestController
public class InvestorController {
    private final TradeService trades;
    private final PortfolioService portfolio;
    private final AlertService alerts;
    private final ReportService reports;

    public InvestorController(TradeService trades, PortfolioService portfolio, AlertService alerts,
                              ReportService reports) {
        this.trades = trades;
        this.portfolio = portfolio;
        this.alerts = alerts;
        this.reports = reports;
    }

    @PostMapping("/api/trade/buy")
    public TradeResult buy(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                           @Valid @RequestBody Requests.Trade body) throws SQLException {
        return trades.buy(session.getUserId(), body.symbol(), body.quantity());
    }

    @PostMapping("/api/trade/sell")
    public TradeResult sell(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                            @Valid @RequestBody Requests.Trade body) throws SQLException {
        return trades.sell(session.getUserId(), body.symbol(), body.quantity());
    }

    @GetMapping("/api/portfolio")
    public PortfolioSummary portfolio(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session) throws SQLException {
        return portfolio.getPortfolio(session.getUserId());
    }

    @GetMapping("/api/portfolio/transactions")
    public Page<TransactionView> history(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                                         @RequestParam(required = false) String symbol,
                                         @RequestParam(required = false) TxnType type,
                                         @RequestParam(required = false) Instant from,
                                         @RequestParam(required = false) Instant to,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) throws SQLException {
        return portfolio.getHistory(session.getUserId(), new TxnFilter(null, symbol, type, from, to, null, page, size));
    }

    @GetMapping("/api/portfolio/performance")
    public List<PricePoint> performance(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                                        @RequestParam(defaultValue = "1W") String range) throws SQLException {
        return portfolio.getPerformance(session.getUserId(), MarketService.Range.parse(range));
    }

    @GetMapping("/api/portfolio/symbols")
    public List<String> tradedSymbols(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session) throws SQLException {
        return portfolio.tradedSymbols(session.getUserId());
    }

    @GetMapping("/api/alerts")
    public List<AlertView> alerts(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session) throws SQLException {
        return alerts.list(session.getUserId());
    }

    @PostMapping("/api/alerts")
    @ResponseStatus(HttpStatus.CREATED)
    public AlertView createAlert(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                                 @Valid @RequestBody Requests.Alert body) throws SQLException {
        return alerts.create(session.getUserId(), body.symbol(), body.condition(), body.targetPrice());
    }

    @DeleteMapping("/api/alerts/{id}")
    public ResponseEntity<Void> deleteAlert(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                                            @PathVariable int id) throws SQLException {
        alerts.delete(session.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/reports/portfolio")
    public PortfolioReport report(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session) throws SQLException {
        return reports.build(session.getUserId());
    }

    @GetMapping("/api/reports/portfolio/export")
    public ResponseEntity<byte[]> export(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                                         @RequestParam(defaultValue = "pdf") String format) throws SQLException {
        ExportedFile file = reports.export(session.getUserId(), ReportService.Format.parse(format));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.filename()).build().toString())
                .body(file.content());
    }
}

package com.sharemarket.web;

import com.sharemarket.dto.Page;
import com.sharemarket.dto.PlatformStats;
import com.sharemarket.dto.Quote;
import com.sharemarket.dto.SimulatorStatus;
import com.sharemarket.dto.TransactionView;
import com.sharemarket.dto.UserSummary;
import com.sharemarket.model.TxnFilter;
import com.sharemarket.model.TxnType;
import com.sharemarket.service.AdminService;
import com.sharemarket.service.AuthService;
import com.sharemarket.service.MarketService;
import com.sharemarket.service.PortfolioService;
import com.sharemarket.simulator.SimulatorScheduler;
import com.sharemarket.util.Session;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.sql.SQLException;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService admin;
    private final AuthService auth;
    private final MarketService market;
    private final PortfolioService portfolio;
    private final SimulatorScheduler simulator;

    public AdminController(AdminService admin, AuthService auth, MarketService market, PortfolioService portfolio,
                           SimulatorScheduler simulator) {
        this.admin = admin;
        this.auth = auth;
        this.market = market;
        this.portfolio = portfolio;
        this.simulator = simulator;
    }

    @GetMapping("/stats")
    public PlatformStats stats() throws SQLException {
        return admin.stats();
    }

    @GetMapping("/users")
    public List<UserSummary> users() throws SQLException {
        return auth.listUsers();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> removeUser(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                                           @PathVariable int id) throws SQLException {
        auth.removeUser(id, session.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/stocks")
    @ResponseStatus(HttpStatus.CREATED)
    public Quote addStock(@Valid @RequestBody Requests.SaveStock body) throws SQLException {
        return market.saveStock(null, body.symbol(), body.companyName(), body.sector(), body.price());
    }

    @PutMapping("/stocks/{id}")
    public Quote updateStock(@PathVariable int id, @Valid @RequestBody Requests.SaveStock body) throws SQLException {
        return market.saveStock(id, body.symbol(), body.companyName(), body.sector(), body.price());
    }

    @DeleteMapping("/stocks/{id}")
    public ResponseEntity<Void> removeStock(@PathVariable int id) throws SQLException {
        market.removeStock(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/transactions")
    public Page<TransactionView> transactions(@RequestParam(required = false) String symbol,
                                              @RequestParam(required = false) TxnType type,
                                              @RequestParam(required = false) Instant from,
                                              @RequestParam(required = false) Instant to,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) throws SQLException {
        return portfolio.getAllTransactions(new TxnFilter(null, symbol, type, from, to, q, page, size));
    }

    @GetMapping("/simulator")
    public SimulatorStatus simulatorStatus() {
        return simulator.status();
    }

    @PostMapping("/simulator")
    public SimulatorStatus setSimulator(@RequestBody Requests.Simulator body) {
        return simulator.setRunning(body.running());
    }
}

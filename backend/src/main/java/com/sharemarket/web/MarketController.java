package com.sharemarket.web;

import com.sharemarket.dto.Movers;
import com.sharemarket.dto.Quote;
import com.sharemarket.dto.SimulatorStatus;
import com.sharemarket.model.PricePoint;
import com.sharemarket.service.MarketService;
import com.sharemarket.simulator.SimulatorScheduler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
public class MarketController {
    private final MarketService market;
    private final SimulatorScheduler simulator;

    public MarketController(MarketService market, SimulatorScheduler simulator) {
        this.market = market;
        this.simulator = simulator;
    }

    @GetMapping("/stocks")
    public List<Quote> stocks() throws SQLException {
        return market.getAllStocks();
    }

    @GetMapping("/stocks/{symbol}")
    public Quote stock(@PathVariable String symbol) throws SQLException {
        return market.getQuote(symbol);
    }

    @GetMapping("/stocks/{symbol}/history")
    public List<PricePoint> history(@PathVariable String symbol,
                                    @RequestParam(defaultValue = "1D") String range) throws SQLException {
        return market.getPriceHistory(symbol, MarketService.Range.parse(range));
    }

    @GetMapping("/movers")
    public Movers movers(@RequestParam(defaultValue = "5") int n) throws SQLException {
        return market.getTopMovers(n);
    }

    @GetMapping("/sparklines")
    public Map<String, List<BigDecimal>> sparklines() throws SQLException {
        return market.getSparklines();
    }

    @GetMapping("/sectors")
    public List<String> sectors() throws SQLException {
        return market.sectors();
    }

    @GetMapping("/status")
    public SimulatorStatus status() {
        return simulator.status();
    }
}

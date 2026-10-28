-- 02_views_triggers.sql : portfolio_view and the price-logging triggers.
-- Safe to run repeatedly.

USE share_market;

-- Portfolio is derived, never stored: holdings joined with live stock prices.
CREATE OR REPLACE VIEW portfolio_view AS
SELECT h.holding_id,
       h.user_id,
       h.stock_id,
       s.symbol,
       s.company_name,
       s.sector,
       h.quantity,
       h.avg_buy_price,
       s.current_price,
       ROUND(h.quantity * h.avg_buy_price, 2)                    AS invested_amount,
       ROUND(h.quantity * s.current_price, 2)                    AS market_value,
       ROUND((s.current_price - h.avg_buy_price) * h.quantity, 2) AS unrealised_pnl
FROM holdings h
         JOIN stocks s ON s.stock_id = h.stock_id;

DROP TRIGGER IF EXISTS trg_price_log;

DELIMITER $$
CREATE TRIGGER trg_price_log
    AFTER UPDATE
    ON stocks
    FOR EACH ROW
BEGIN
    IF NEW.current_price <> OLD.current_price THEN
        INSERT INTO price_history (stock_id, price, recorded_at)
        VALUES (NEW.stock_id, NEW.current_price, CURRENT_TIMESTAMP);
    END IF;
END$$
DELIMITER ;

-- Logs the listing price of a new stock so its chart has a starting point.
DROP TRIGGER IF EXISTS trg_price_log_insert;

DELIMITER $$
CREATE TRIGGER trg_price_log_insert
    AFTER INSERT
    ON stocks
    FOR EACH ROW
BEGIN
    INSERT INTO price_history (stock_id, price, recorded_at)
    VALUES (NEW.stock_id, NEW.current_price, CURRENT_TIMESTAMP);
END$$
DELIMITER ;

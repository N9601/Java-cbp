-- Share Market Portfolio Management System
-- 01_schema.sql : database and the six tables (3NF).
-- Run in MySQL Workbench, or let the application run it on start-up.

CREATE DATABASE IF NOT EXISTS share_market;
USE share_market;

CREATE TABLE IF NOT EXISTS users (
    user_id       INT            NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100)   NOT NULL,
    email         VARCHAR(150)   NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    role          VARCHAR(10)    NOT NULL DEFAULT 'INVESTOR',
    balance       DECIMAL(12, 2) NOT NULL DEFAULT 100000.00,
    created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('INVESTOR', 'ADMIN')),
    CONSTRAINT chk_users_balance CHECK (balance >= 0)
) ENGINE = InnoDB;

-- The UNIQUE key on symbol is also the lookup index on stocks.symbol.
CREATE TABLE IF NOT EXISTS stocks (
    stock_id      INT            NOT NULL AUTO_INCREMENT,
    symbol        VARCHAR(20)    NOT NULL,
    company_name  VARCHAR(150)   NOT NULL,
    sector        VARCHAR(60)    NOT NULL,
    current_price DECIMAL(12, 2) NOT NULL,
    updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_stocks PRIMARY KEY (stock_id),
    CONSTRAINT uq_stocks_symbol UNIQUE (symbol),
    CONSTRAINT chk_stocks_price CHECK (current_price > 0)
) ENGINE = InnoDB;

-- avg_buy_price keeps 4 decimals so repeated averaging does not drift.
CREATE TABLE IF NOT EXISTS holdings (
    holding_id    INT            NOT NULL AUTO_INCREMENT,
    user_id       INT            NOT NULL,
    stock_id      INT            NOT NULL,
    quantity      INT            NOT NULL,
    avg_buy_price DECIMAL(12, 4) NOT NULL,
    CONSTRAINT pk_holdings PRIMARY KEY (holding_id),
    CONSTRAINT uq_holdings_user_stock UNIQUE (user_id, stock_id),
    CONSTRAINT fk_holdings_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_holdings_stock FOREIGN KEY (stock_id) REFERENCES stocks (stock_id) ON DELETE RESTRICT,
    CONSTRAINT chk_holdings_quantity CHECK (quantity >= 0)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
    txn_id   BIGINT         NOT NULL AUTO_INCREMENT,
    user_id  INT            NOT NULL,
    stock_id INT            NOT NULL,
    txn_type VARCHAR(4)     NOT NULL,
    quantity INT            NOT NULL,
    price    DECIMAL(12, 2) NOT NULL,
    txn_time TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_transactions PRIMARY KEY (txn_id),
    CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_txn_stock FOREIGN KEY (stock_id) REFERENCES stocks (stock_id) ON DELETE RESTRICT,
    CONSTRAINT chk_txn_type CHECK (txn_type IN ('BUY', 'SELL')),
    CONSTRAINT chk_txn_quantity CHECK (quantity > 0),
    CONSTRAINT chk_txn_price CHECK (price > 0),
    INDEX idx_txn_user_time (user_id, txn_time),
    INDEX idx_txn_time (txn_time)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS price_alerts (
    alert_id        INT            NOT NULL AUTO_INCREMENT,
    user_id         INT            NOT NULL,
    stock_id        INT            NOT NULL,
    target_price    DECIMAL(12, 2) NOT NULL,
    alert_condition VARCHAR(5)     NOT NULL,
    is_triggered    BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_at    TIMESTAMP      NULL DEFAULT NULL,
    CONSTRAINT pk_price_alerts PRIMARY KEY (alert_id),
    CONSTRAINT fk_alert_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_stock FOREIGN KEY (stock_id) REFERENCES stocks (stock_id) ON DELETE CASCADE,
    CONSTRAINT chk_alert_condition CHECK (alert_condition IN ('ABOVE', 'BELOW')),
    CONSTRAINT chk_alert_target CHECK (target_price > 0),
    INDEX idx_alert_stock_state (stock_id, is_triggered)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS price_history (
    history_id  BIGINT         NOT NULL AUTO_INCREMENT,
    stock_id    INT            NOT NULL,
    price       DECIMAL(12, 2) NOT NULL,
    recorded_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_price_history PRIMARY KEY (history_id),
    CONSTRAINT fk_history_stock FOREIGN KEY (stock_id) REFERENCES stocks (stock_id) ON DELETE CASCADE,
    INDEX idx_history_stock_time (stock_id, recorded_at),
    INDEX idx_history_time (recorded_at)
) ENGINE = InnoDB;

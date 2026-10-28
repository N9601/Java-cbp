package com.sharemarket.exception;

import java.math.BigDecimal;

public class InsufficientFundsException extends AppException {
    private final BigDecimal required;
    private final BigDecimal available;

    public InsufficientFundsException(BigDecimal required, BigDecimal available) {
        super(422, "INSUFFICIENT_FUNDS",
                "Insufficient balance: this order needs INR " + required.toPlainString()
                        + " but your wallet has INR " + available.toPlainString() + ".");
        this.required = required;
        this.available = available;
    }

    public BigDecimal getRequired() {
        return required;
    }

    public BigDecimal getAvailable() {
        return available;
    }
}

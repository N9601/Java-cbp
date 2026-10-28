package com.sharemarket.exception;

public class InsufficientQuantityException extends AppException {
    private final int requested;
    private final int held;

    public InsufficientQuantityException(String symbol, int requested, int held) {
        super(422, "INSUFFICIENT_QUANTITY",
                "Insufficient quantity: you hold " + held + " share" + (held == 1 ? "" : "s")
                        + " of " + symbol + " and tried to sell " + requested + ".");
        this.requested = requested;
        this.held = held;
    }

    public int getRequested() {
        return requested;
    }

    public int getHeld() {
        return held;
    }
}

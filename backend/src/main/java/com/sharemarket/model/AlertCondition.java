package com.sharemarket.model;

import java.math.BigDecimal;

public enum AlertCondition {
    ABOVE,
    BELOW;

    /** True when the price has crossed the target in this direction. */
    public boolean isMet(BigDecimal price, BigDecimal target) {
        int cmp = price.compareTo(target);
        return this == ABOVE ? cmp >= 0 : cmp <= 0;
    }
}

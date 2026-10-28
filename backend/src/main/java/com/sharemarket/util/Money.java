package com.sharemarket.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Formats amounts with Indian digit grouping, e.g. 1,23,45,678.90. */
public final class Money {

    private Money() {
    }

    public static String format(BigDecimal value) {
        if (value == null) {
            return "";
        }
        BigDecimal v = value.setScale(2, RoundingMode.HALF_UP);
        String sign = v.signum() < 0 ? "-" : "";
        String plain = v.abs().toPlainString();
        int dot = plain.indexOf('.');
        String whole = plain.substring(0, dot);
        String fraction = plain.substring(dot);
        if (whole.length() <= 3) {
            return sign + whole + fraction;
        }
        String last3 = whole.substring(whole.length() - 3);
        String rest = whole.substring(0, whole.length() - 3);
        StringBuilder grouped = new StringBuilder();
        for (int i = rest.length(); i > 0; i -= 2) {
            grouped.insert(0, rest.substring(Math.max(0, i - 2), i));
            if (i - 2 > 0) {
                grouped.insert(0, ',');
            }
        }
        return sign + grouped + "," + last3 + fraction;
    }

    public static String signed(BigDecimal value) {
        return value != null && value.signum() > 0 ? "+" + format(value) : format(value);
    }
}

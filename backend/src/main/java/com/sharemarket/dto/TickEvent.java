package com.sharemarket.dto;

import java.time.Instant;
import java.util.List;

/** Pushed to every connected browser after a simulator tick: only the quotes that moved. */
public record TickEvent(Instant time, List<Quote> quotes) {
}

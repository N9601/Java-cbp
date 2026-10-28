package com.sharemarket.web;

import com.sharemarket.model.AlertCondition;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** Request bodies accepted by the API. */
public final class Requests {

    private Requests() {
    }

    public record Register(@NotBlank(message = "Name is required.") String name,
                           @NotBlank(message = "Email is required.") String email,
                           @NotBlank(message = "Password is required.") String password) {
    }

    public record Login(@NotBlank(message = "Email is required.") String email,
                        @NotBlank(message = "Password is required.") String password) {
    }

    public record ChangePassword(@NotBlank(message = "Current password is required.") String currentPassword,
                                 @NotBlank(message = "New password is required.") String newPassword) {
    }

    public record Trade(@NotBlank(message = "Choose a stock to trade.") String symbol,
                        @Min(value = 1, message = "Quantity must be at least 1.")
                        @Max(value = 100_000, message = "Quantity cannot exceed 100000 shares per order.")
                        int quantity) {
    }

    public record Alert(@NotBlank(message = "Choose a stock.") String symbol,
                        @NotNull(message = "Choose ABOVE or BELOW.") AlertCondition condition,
                        @NotNull(message = "Target price is required.")
                        @DecimalMin(value = "0.01", message = "Target price must be greater than zero.")
                        BigDecimal targetPrice) {
    }

    public record SaveStock(String symbol,
                            @NotBlank(message = "Company name is required.") String companyName,
                            @NotBlank(message = "Sector is required.") String sector,
                            @NotNull(message = "Price is required.")
                            @DecimalMin(value = "0.01", message = "Price must be greater than zero.")
                            BigDecimal price) {
    }

    public record Simulator(boolean running) {
    }
}

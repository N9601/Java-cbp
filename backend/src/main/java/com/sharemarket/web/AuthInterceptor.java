package com.sharemarket.web;

import com.sharemarket.exception.AuthException;
import com.sharemarket.exception.ForbiddenException;
import com.sharemarket.model.Role;
import com.sharemarket.util.Session;
import com.sharemarket.util.SessionManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.Set;

/**
 * Role-based access for /api. Only login, registration, logout and health
 * are public. Admin routes need ADMIN; trading, portfolio, alerts and
 * reports need INVESTOR; market data and the event stream need any session.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    private static final Set<String> PUBLIC = Set.of(
            "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/health");
    private static final List<String> INVESTOR_ONLY = List.of(
            "/api/trade", "/api/portfolio", "/api/alerts", "/api/reports");

    private final SessionManager sessions;

    public AuthInterceptor(SessionManager sessions) {
        this.sessions = sessions;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/") || PUBLIC.contains(path) || "OPTIONS".equals(request.getMethod())) {
            return true;
        }
        Session session = sessions.get(SessionCookie.read(request))
                .orElseThrow(() -> new AuthException("Please sign in to continue."));
        if (path.startsWith("/api/admin") && session.getRole() != Role.ADMIN) {
            throw new ForbiddenException("This area is for administrators only.");
        }
        if (INVESTOR_ONLY.stream().anyMatch(path::startsWith) && session.getRole() != Role.INVESTOR) {
            throw new ForbiddenException("Trading features are available to investor accounts only.");
        }
        request.setAttribute(SessionCookie.ATTRIBUTE, session);
        return true;
    }
}

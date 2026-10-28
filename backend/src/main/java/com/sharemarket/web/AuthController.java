package com.sharemarket.web;

import com.sharemarket.dto.UserView;
import com.sharemarket.model.User;
import com.sharemarket.service.AuthService;
import com.sharemarket.service.StreamService;
import com.sharemarket.util.Session;
import com.sharemarket.util.SessionManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.SQLException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final SessionManager sessions;
    private final StreamService stream;

    public AuthController(AuthService auth, SessionManager sessions, StreamService stream) {
        this.auth = auth;
        this.sessions = sessions;
        this.stream = stream;
    }

    @PostMapping("/register")
    public ResponseEntity<UserView> register(@Valid @RequestBody Requests.Register body, HttpServletRequest request)
            throws SQLException {
        User user = auth.register(body.name(), body.email(), body.password());
        Session session = auth.login(user.getEmail(), body.password());
        return withSession(HttpStatus.CREATED, session, UserView.of(user), request);
    }

    @PostMapping("/login")
    public ResponseEntity<UserView> login(@Valid @RequestBody Requests.Login body, HttpServletRequest request)
            throws SQLException {
        Session session = auth.login(body.email(), body.password());
        return withSession(HttpStatus.OK, session, UserView.of(auth.currentUser(session.getUserId())), request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        String token = SessionCookie.read(request);
        sessions.get(token).ifPresent(s -> stream.disconnect(s.getUserId()));
        auth.logout(token);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, SessionCookie.clear(request.isSecure())).build();
    }

    @GetMapping("/me")
    public UserView me(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session) throws SQLException {
        return UserView.of(auth.currentUser(session.getUserId()));
    }

    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session,
                                               @Valid @RequestBody Requests.ChangePassword body) throws SQLException {
        auth.changePassword(session.getUserId(), body.currentPassword(), body.newPassword());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<UserView> withSession(HttpStatus status, Session session, UserView user,
                                                 HttpServletRequest request) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, SessionCookie.issue(session.getToken(), sessions.getTtl(),
                        request.isSecure()))
                .body(user);
    }
}

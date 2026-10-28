package com.sharemarket.web;

import com.sharemarket.service.StreamService;
import com.sharemarket.util.Session;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
public class StreamController {
    private final StreamService stream;

    public StreamController(StreamService stream) {
        this.stream = stream;
    }

    /** Live price ticks for everyone, alert notifications for the owner. */
    @GetMapping(value = "/api/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestAttribute(SessionCookie.ATTRIBUTE) Session session) {
        return stream.subscribe(session.getUserId());
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}

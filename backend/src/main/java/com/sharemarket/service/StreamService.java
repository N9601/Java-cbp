package com.sharemarket.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Server-sent events to the browser: price ticks for everyone and alert
 * notifications for their owner. A comment line every 20 s keeps idle
 * connections open through proxies.
 */
@Service
public class StreamService {
    private final Map<Integer, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final ScheduledExecutorService heartbeat = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sse-heartbeat");
        t.setDaemon(true);
        return t;
    });

    @PostConstruct
    void start() {
        heartbeat.scheduleAtFixedRate(this::ping, 20, 20, TimeUnit.SECONDS);
    }

    @PreDestroy
    void stop() {
        heartbeat.shutdownNow();
        emitters.values().forEach(set -> set.forEach(SseEmitter::complete));
        emitters.clear();
    }

    public SseEmitter subscribe(int userId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.compute(userId, (id, set) -> {
            Set<SseEmitter> target = set == null ? new CopyOnWriteArraySet<>() : set;
            target.add(emitter);
            return target;
        });
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(e -> remove(userId, emitter));
        send(userId, emitter, SseEmitter.event().name("ready")
                .data(Map.of("connectedAt", Instant.now()), MediaType.APPLICATION_JSON));
        return emitter;
    }

    public void broadcast(String event, Object payload) {
        emitters.forEach((userId, set) -> set.forEach(e ->
                send(userId, e, SseEmitter.event().name(event).data(payload, MediaType.APPLICATION_JSON))));
    }

    public void sendTo(int userId, String event, Object payload) {
        Set<SseEmitter> set = emitters.get(userId);
        if (set != null) {
            set.forEach(e -> send(userId, e, SseEmitter.event().name(event).data(payload, MediaType.APPLICATION_JSON)));
        }
    }

    public void disconnect(int userId) {
        Set<SseEmitter> set = emitters.remove(userId);
        if (set != null) {
            set.forEach(SseEmitter::complete);
        }
    }

    public int connections() {
        return emitters.values().stream().mapToInt(Set::size).sum();
    }

    private void ping() {
        emitters.forEach((userId, set) -> set.forEach(e -> send(userId, e, SseEmitter.event().comment("ping"))));
    }

    private void send(int userId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | IllegalStateException e) {
            remove(userId, emitter);
        }
    }

    private void remove(int userId, SseEmitter emitter) {
        emitters.computeIfPresent(userId, (id, set) -> {
            set.remove(emitter);
            return set.isEmpty() ? null : set;
        });
    }
}

package com.vision.qc.security;

import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.*;
import reactor.core.publisher.Mono;
import java.util.concurrent.ConcurrentHashMap;

/** Per-instance limit, keyed by the actual peer. Never trusts client-provided forwarding headers. */
@Component @Order(-110)
public class LoginRateLimit implements WebFilter {
    private record Window(long minute,int count) {}
    private final ConcurrentHashMap<String,Window> windows=new ConcurrentHashMap<>();
    public Mono<Void> filter(ServerWebExchange exchange,WebFilterChain chain) {
        if(!exchange.getRequest().getMethod().name().equals("POST") ||
           !exchange.getRequest().getPath().value().equals("/api/auth/login")) return chain.filter(exchange);
        long minute=System.currentTimeMillis()/60000;
        if(windows.size()>5000) windows.entrySet().removeIf(e -> e.getValue().minute()<minute);
        String peer=exchange.getRequest().getRemoteAddress()==null?"unknown":exchange.getRequest().getRemoteAddress().getAddress().getHostAddress();
        if(windows.size()>10000 && !windows.containsKey(peer)) return limited(exchange);
        var window=windows.compute(peer,(k,v) -> v==null || v.minute()!=minute?new Window(minute,1):new Window(minute,v.count()+1));
        return window.count()>30?limited(exchange):chain.filter(exchange);
    }
    private Mono<Void> limited(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().set("Retry-After","60");
        return exchange.getResponse().setComplete();
    }
}

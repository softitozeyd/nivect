package com.vision.qc.api;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.server.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import java.util.Map;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    @GetMapping("/csrf")
    public Mono<Map<String,String>> csrf(ServerWebExchange exchange) {
        Mono<CsrfToken> token=exchange.getAttribute(CsrfToken.class.getName());
        return token.map(t -> Map.of("token",t.getToken(),"headerName",t.getHeaderName()));
    }
    @GetMapping("/me")
    public Map<String,Object> me(Authentication auth) {
        return Map.of("username",auth.getName(),"roles",auth.getAuthorities().stream().map(Object::toString).toList());
    }
}

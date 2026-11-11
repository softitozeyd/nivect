package com.vision.qc.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.authentication.HttpStatusServerEntryPoint;
import org.springframework.security.web.server.authentication.logout.HttpStatusReturningServerLogoutSuccessHandler;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import org.springframework.security.web.server.csrf.WebSessionServerCsrfTokenRepository;

@Configuration @EnableWebFluxSecurity
public class SecurityConfig {
    @Bean
    MapReactiveUserDetailsService users(@Value("${QC_OPERATOR_PASSWORD}") String operator,
            @Value("${QC_INGEST_PASSWORD}") String ingest) {
        if(operator.length()<16 || ingest.length()<16)
            throw new IllegalStateException("QC passwords must contain at least 16 characters");
        var encoder=new BCryptPasswordEncoder();
        return new MapReactiveUserDetailsService(
            User.withUsername("operator").password("{bcrypt}"+encoder.encode(operator)).roles("OPERATOR").build(),
            User.withUsername("camera").password("{bcrypt}"+encoder.encode(ingest)).roles("INGEST").build());
    }
    @Bean
    SecurityWebFilterChain security(ServerHttpSecurity http) {
        return http
            .authorizeExchange(e -> e
                .pathMatchers("/","/index.html","/assets/**","/media/**","/favicon.svg","/actuator/health","/api/auth/csrf").permitAll()
                .pathMatchers(HttpMethod.POST,"/api/v1/inspections").hasAnyRole("OPERATOR","INGEST")
                .pathMatchers("/api/auth/me").authenticated()
                .pathMatchers("/api/**").hasRole("OPERATOR")
                .anyExchange().denyAll())
            .csrf(c -> c.csrfTokenRepository(new WebSessionServerCsrfTokenRepository()))
            .formLogin(f -> f.loginPage("/api/auth/login")
                .authenticationSuccessHandler((w,a) -> {w.getExchange().getResponse().setStatusCode(HttpStatus.OK);return w.getExchange().getResponse().setComplete();})
                .authenticationFailureHandler((w,e) -> {w.getExchange().getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);return w.getExchange().getResponse().setComplete();}))
            .logout(l -> l.requiresLogout(ServerWebExchangeMatchers.pathMatchers(HttpMethod.POST,"/api/auth/logout"))
                .logoutSuccessHandler(new HttpStatusReturningServerLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusServerEntryPoint(HttpStatus.UNAUTHORIZED)))
            .headers(h -> h.contentSecurityPolicy(c -> c.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'")))
            .build();
    }
}

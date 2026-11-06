package com.vision.qc.api;

import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler({DataAccessException.class, org.springframework.transaction.TransactionException.class})
    ResponseEntity<ProblemDetail> databaseUnavailable(RuntimeException error) {
        var detail=ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,"Storage is unavailable. Retry the same eventId.");
        detail.setTitle("Inspection storage unavailable");
        return ResponseEntity.status(503).body(detail);
    }
}

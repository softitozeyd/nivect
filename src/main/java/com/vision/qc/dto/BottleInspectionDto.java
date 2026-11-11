package com.vision.qc.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** One observed bottle event, never a frame counter. Retries preserve eventId. */
public record BottleInspectionDto(
    @NotNull UUID eventId,
    @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,50}") String lineCode,
    @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,80}") String cameraId,
    @NotNull Boolean bottleFound,
    @NotNull @Size(max=3) List<@NotNull Defect> defects,
    @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double confidence,
    @NotBlank @Size(max=80) String modelVersion,
    @NotNull Source source,
    @NotNull Instant capturedAt
) {
    public enum Defect { underfill, missing_cap, loose_cap }
    public enum Source { CAMERA, MANUAL }
}

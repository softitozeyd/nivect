package com.vision.qc.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BottleInspectionDto {
    private String lineCode;
    private boolean capOk;
    private boolean labelOk;
    private boolean liquidLevelOk;
    private String imagePath;
}
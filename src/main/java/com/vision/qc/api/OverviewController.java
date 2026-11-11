package com.vision.qc.api;

import com.vision.qc.entity.BottleInspection;
import com.vision.qc.repository.BottleInspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class OverviewController {
    private final BottleInspectionRepository repository;
    private final JdbcTemplate jdbc;
    private Specification<BottleInspection> filter(String line,String result,String source,int hours) {
        if(hours<1 || hours>720) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"hours must be 1..720");
        if(!Set.of("ALL","PASS","FAIL","REVIEW").contains(result)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid result");
        if(!Set.of("ALL","CAMERA","MANUAL","LEGACY").contains(source)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid source");
        return (r,q,c) -> {
            var p=new ArrayList<jakarta.persistence.criteria.Predicate>();
            p.add(c.greaterThanOrEqualTo(r.get("inspectedAt"),LocalDateTime.now(ZoneOffset.UTC).minusHours(hours)));
            if(!line.isBlank()) p.add(c.equal(r.get("lineCode"),line));
            if(!result.equals("ALL")) p.add(c.equal(r.get("overallResult"),result));
            if(!source.equals("ALL")) p.add(c.equal(r.get("source"),source));
            return c.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
    @GetMapping("/records")
    public Mono<Map<String,Object>> records(@RequestParam(defaultValue="0") int page,
        @RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="") String line,
        @RequestParam(defaultValue="ALL") String result,@RequestParam(defaultValue="CAMERA") String source,
        @RequestParam(defaultValue="24") int hours) {
        if(page<0 || size<1 || size>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid pagination");
        var spec=filter(line,result,source,hours);
        return Mono.fromCallable(() -> {
            var rows=repository.findAll(spec,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"inspectedAt","id")));
            return Map.<String,Object>of("items",rows.getContent(),"total",rows.getTotalElements(),"page",page,"pages",rows.getTotalPages());
        }).subscribeOn(Schedulers.boundedElastic());
    }
    @GetMapping("/overview")
    public Mono<Map<String,Object>> overview(@RequestParam(defaultValue="") String line,
        @RequestParam(defaultValue="24") int hours,@RequestParam(defaultValue="CAMERA") String source) {
        filter(line,"ALL",source,hours);
        return Mono.fromCallable(() -> {
            String where=" WHERE inspected_at >= ? AND (? = '' OR line_code = ?) AND (? = 'ALL' OR source = ?) ";
            Object[] args={LocalDateTime.now(ZoneOffset.UTC).minusHours(hours),line,line,source,source};
            var totals=jdbc.queryForMap("SELECT count(*) AS total, count(*) FILTER (WHERE overall_result='PASS') AS passed, count(*) FILTER (WHERE overall_result='FAIL') AS failed, count(*) FILTER (WHERE overall_result='REVIEW') AS review FROM bottle_inspections"+where,args);
            var series=jdbc.queryForList("SELECT date_trunc('hour',inspected_at) AS hour,count(*) AS total,count(*) FILTER (WHERE overall_result='FAIL') AS failed FROM bottle_inspections"+where+" GROUP BY 1 ORDER BY 1",args);
            var defects=jdbc.queryForList("SELECT d AS defect,count(*) AS count FROM bottle_inspections CROSS JOIN LATERAL unnest(string_to_array(defects,',')) AS d"+where+" AND d<>'' GROUP BY d ORDER BY count(*) DESC",args);
            var cameras=jdbc.queryForList("SELECT camera_id,line_code,model_version,max(inspected_at) AS last_seen,count(*) AS events FROM bottle_inspections WHERE source='CAMERA' AND (?='' OR line_code=?) GROUP BY camera_id,line_code,model_version ORDER BY last_seen DESC LIMIT 20",line,line);
            return Map.<String,Object>of("totals",totals,"series",series,"defects",defects,"cameras",cameras,"serverTime",Instant.now().toString(),"source",source);
        }).subscribeOn(Schedulers.boundedElastic());
    }
    @GetMapping(value="/export",produces="text/csv")
    public Mono<ResponseEntity<String>> export(@RequestParam(defaultValue="") String line,
        @RequestParam(defaultValue="ALL") String result,@RequestParam(defaultValue="CAMERA") String source,
        @RequestParam(defaultValue="24") int hours) {
        var spec=filter(line,result,source,hours);
        return Mono.fromCallable(() -> {
            var rows=repository.findAll(spec,PageRequest.of(0,10000,Sort.by(Sort.Direction.DESC,"inspectedAt","id")));
            var csv=new StringBuilder("event_id,line,camera,result,defects,confidence,model,source,captured_at_utc\n");
            for(var r:rows) csv.append(String.join(",",cell(r.getEventId()),cell(r.getLineCode()),cell(r.getCameraId()),cell(r.getOverallResult()),cell(r.getDefects()),cell(r.getConfidence()),cell(r.getModelVersion()),cell(r.getSource()),cell(r.getInspectedAt()))).append('\n');
            return ResponseEntity.ok().header("Content-Disposition","attachment; filename=nivect-inspections.csv")
                .header("X-Export-Limit","10000").body(csv.toString());
        }).subscribeOn(Schedulers.boundedElastic());
    }
    private static String cell(Object value) {
        String s=Objects.toString(value,"");
        if(s.matches("^[=+@\\-\\t\\r].*")) s="'"+s;
        return "\""+s.replace("\"","\"\"")+"\"";
    }
}

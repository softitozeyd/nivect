import type { InspectionEvent } from "../domain";
export function inspectionCsv(events: InspectionEvent[]) {
  const quote = (value: string) => {
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [
    "id,timestamp,line,station,product,category,decision,confidence,model,operatorReview,note,defects,capOk,labelOk,liquidLevelOk,imagePath,sourceInspectedAt,timestampOffset",
    ...events.map((e) =>
      [
        e.id,
        e.timestamp,
        e.lineId,
        e.stationId,
        e.product,
        e.category,
        e.decision,
        e.confidence?.toString() ?? "",
        e.modelVersion,
        e.review?.outcome || "",
        e.review?.note || "",
        e.defects?.join(" | ") || "",
        e.checks?.capOk.toString() ?? "",
        e.checks?.labelOk.toString() ?? "",
        e.checks?.liquidLevelOk.toString() ?? "",
        e.imagePath || "",
        e.sourceInspectedAt || "",
        e.timestampOffset || "",
      ]
        .map(quote)
        .join(","),
    ),
  ].join("\r\n");
}

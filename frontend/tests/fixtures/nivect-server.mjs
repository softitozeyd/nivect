import http from "node:http";
import process from "node:process";
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end('{"error":"Read-only test fixture"}');
    return;
  }
  if (req.url === "/actuator/health") {
    res.end('{"status":"UP"}');
    return;
  }
  if (req.url === "/api/v1/inspections/failures" || req.url === "/api/v1/inspections") {
    res.end(
      JSON.stringify([
        {
          id: 321,
          lineCode: "line-proxy",
          capOk: false,
          labelOk: true,
          liquidLevelOk: true,
          overallResult: "FAIL",
          imagePath: null,
          inspectedAt: "2026-10-27T12:00:00",
        },
      ]),
    );
    return;
  }
  res.writeHead(404);
  res.end('{"error":"Not found"}');
});
server.listen(18080, "127.0.0.1");
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());

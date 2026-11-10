import process from "node:process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const origin = process.env.LIVE_API_URL || "http://localhost:5197";
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true});
try {
  const page = await browser.newPage();
  let writes = 0, predictions = 0, phase = "bottle";
  let session = null;
  await page.addInitScript(() => {
    localStorage.setItem("visionqc.language", "en");
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext("2d"); ctx.fillRect(0, 0, 640, 480);
      const timer = setInterval(() => ctx.fillRect(0, 0, 10, 10), 100);
      const stream = canvas.captureStream(10);
      stream.getVideoTracks()[0].addEventListener("ended", () => clearInterval(timer));
      return stream;
    };
  });
  await page.route("http://127.0.0.1:8765/predict", async route => {
    predictions++;
    const present = phase === "bottle";
    await route.fulfill({status: 200, headers: {"access-control-allow-origin": origin}, json: {decision: present ? "FAIL" : "REVIEW", defects: present ? ["underfill"] : [], detections: present ? [{name:"bottle", confidence:.9, box:[10,10,300,400]}] : [], width:640,height:480,device:"cpu"}});
  });
  await page.route("**/api/v1/production-sessions**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/latest")) return route.fulfill({json: session});
    if (path.endsWith("/products")) { writes++; session = {...session, totalCount: 1, defectCount: 1}; return route.fulfill({json: {productNumber: 1, decision: "FAIL", duplicate: false, session}}); }
    if (path.endsWith("/stop")) { session = {...session, active: null}; return route.fulfill({json: session}); }
    session = {id: 999, active:true, startedAt: new Date().toISOString(), endedAt:null, totalCount:0, passCount:0, defectCount:0, uncertainCount:0};
    return route.fulfill({status:201,json:session});
  });
  await page.route("**/api/v1/model-detections", route => route.fulfill({json:[]}));
  await page.goto(`${origin}/monitoring`);
  await page.getByRole("button",{name:"Start camera",exact:true}).click();
  await page.waitForFunction(() => document.querySelector("video")?.videoWidth > 0);
  await page.waitForTimeout(1800);
  if (predictions < 3 || writes !== 0) throw Error(`Recording off: predictions=${predictions}, writes=${writes}`);
  await page.getByRole("button",{name:"Start recording",exact:true}).click();
  await page.getByText("Recording on",{exact:true}).waitFor();
  await page.waitForTimeout(1300);
  if (writes !== 0) throw Error("A bottle still in view was counted prematurely");
  phase = "empty";
  await page.waitForTimeout(1800);
  if (writes !== 1) throw Error(`Expected one counted defect, got ${writes}`);
  await page.waitForTimeout(1000);
  if (writes !== 1) throw Error("Same bottle recorded repeatedly");
  await page.getByRole("button",{name:"Stop recording",exact:true}).click();
  await page.getByRole("button",{name:"Stop camera",exact:true}).click();
  if (await page.getByRole("button",{name:"Start recording"}).isEnabled()) throw Error("Recording active while camera stopped");
  console.log("PASS camera controls, no writes while recording off, and one count when the bottle exits");
} finally { await browser.close(); }

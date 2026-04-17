import { exec } from "child_process";

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const INITIAL_DELAY = 5000; // 5 seconds after container start

function runRefresh() {
  console.log(`[CookieRefresher] Running refresh at ${new Date().toISOString()}`);

  exec("node /app/refresh-yt-cookies.mjs", (error, stdout, stderr) => {
    if (error) {
      console.error("[CookieRefresher] ERROR:", error.message);
      return;
    }
    if (stderr) console.error("[CookieRefresher] STDERR:", stderr);
    console.log("[CookieRefresher] SUCCESS:", stdout);
  });
}

// Run once immediately (after small delay)
setTimeout(() => {
  runRefresh();

  // Then schedule every 24h
  setInterval(runRefresh, REFRESH_INTERVAL);
}, INITIAL_DELAY);

// Keep container alive
process.stdin.resume();

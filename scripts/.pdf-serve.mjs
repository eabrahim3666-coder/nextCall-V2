// Throwaway static server to make the activity-map PDF downloadable.
// Usage: node scripts/.pdf-serve.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.argv[2] || 3999);
const ROOT = path.resolve(import.meta.dirname, "..", "docs");

const MIME = {
  ".pdf": "application/pdf",
  ".mmd": "text/plain; charset=utf-8",
};

http
  .createServer((req, res) => {
    const name = path.basename(decodeURIComponent(req.url.split("?")[0]));
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": fs.statSync(file).size,
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`pdf server on http://localhost:${PORT}`));

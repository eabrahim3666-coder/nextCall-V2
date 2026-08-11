import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.join(process.cwd(), "package.json"));
const { google } = require("googleapis");

const root = process.cwd();
const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const cred = env.match(/^GOOGLE_APPLICATION_CREDENTIALS\s*=\s*(.+)$/m)?.[1]?.trim();
if (!cred) throw new Error("GOOGLE_APPLICATION_CREDENTIALS not in .env.local");
const keyFile = path.resolve(root, cred.replace(/^\.\//, ""));
if (!fs.existsSync(keyFile)) throw new Error(`Key file not found: ${keyFile}`);

const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/business.manage"],
});
const client = await auth.getClient();

const get = (url) =>
  client.request({ url, method: "GET" }).then((r) => ({ status: r.status, data: r.data }))
    .catch(async (e) => ({
      status: e.response?.status ?? e.code,
      data: e.response?.data ?? { error: { message: e.message } },
    }));
const post = (url) =>
  client.request({ url, method: "POST", body: {} }).then((r) => ({ status: r.status, data: r.data }))
    .catch(async (e) => ({
      status: e.response?.status ?? e.code,
      data: e.response?.data ?? { error: { message: e.message } },
    }));

const accounts = await get("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
console.log("1. accounts.list ->", accounts.status, JSON.stringify(accounts.data).slice(0, 600));
const list = accounts.data.accounts ?? [];
if (!list.length) {
  console.log("No accounts — cannot look up invitations. Exiting.");
  process.exit(0);
}
for (const acct of list) {
  const acctName = acct.name;
  console.log(`\n--- Account: ${acctName} (${acct.accountName}) ---`);
  const inv = await get(`https://mybusinessaccountmanagement.googleapis.com/v1/${acctName}/invitations`);
  console.log("2. invitations.list ->", inv.status, JSON.stringify(inv.data).slice(0, 600));
  const invites = inv.data.invitations ?? [];
  if (!invites.length) {
    console.log("No pending invitations on this account.");
    continue;
  }
  for (const it of invites) {
    console.log(`Invitation: ${it.name} (${it.role})`);
    const acc = await post(`https://mybusinessaccountmanagement.googleapis.com/v1/${it.name}:accept`);
    console.log("3. accept ->", acc.status, JSON.stringify(acc.data).slice(0, 400));
  }
}
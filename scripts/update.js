#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const cfg = require("./config");

function parseApkFilename(name) {
  // <PREFIX>_dev_20251010_c101_v1.1.70_release.apk
  const re = new RegExp(
    `^${cfg.prefix}_(dev|stg)_(\\d{8})_c(\\d+)_v(\\d+\\.\\d+\\.\\d+)_release\\.apk$`
  );
  const m = name.match(re);
  if (!m) return null;
  const [, env, yyyymmdd, buildStr, version] = m;
  return {
    env,
    date: yyyymmdd,
    build: Number(buildStr),
    version,
    filename: name,
  };
}

function formatDate(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(
    6,
    8
  )}`;
}

function generateItemHtml(item, isLatest, env) {
  const isDev = env === "dev";
  const subtitle = isLatest
    ? isDev
      ? "최신 개발 버전 (권장)"
      : "최신 스테이징 버전 (권장)"
    : isDev
    ? "이전 버전"
    : "이전 스테이징 버전";
  const status = isLatest ? "🟢 최신" : "🔵 이전";
  const versionLabel = `v${item.version}`;
  const buildLabel = `c${item.build}`;
  const dateLabel = formatDate(item.date);
  const href = `./download/${item.filename}`;

  return [
    '              <div class="app-item">',
    '                <div class="app-header">',
    `                  <div class="app-icon">${cfg.icon}</div>`,
    '                  <div class="app-info">',
    `                    <h3>${cfg.displayNameKo} ${versionLabel}</h3>`,
    `                    <p>${subtitle}</p>`,
    "                  </div>",
    "                </div>",
    "",
    '                <div class="app-details">',
    '                  <div class="detail-item">',
    '                    <div class="detail-label">버전</div>',
    '                    <div class="detail-value">',
    `                      <span class="version-badge">${versionLabel}</span>`,
    "                    </div>",
    "                  </div>",
    '                  <div class="detail-item">',
    '                    <div class="detail-label">빌드</div>',
    `                    <div class="detail-value">${buildLabel}</div>`,
    "                  </div>",
    '                  <div class="detail-item">',
    '                    <div class="detail-label">출시일</div>',
    `                    <div class="detail-value">${dateLabel}</div>`,
    "                  </div>",
    '                  <div class="detail-item">',
    '                    <div class="detail-label">상태</div>',
    `                    <div class="detail-value">${status}</div>`,
    "                  </div>",
    "                </div>",
    "",
    "                <a",
    `                  href="${href}"`,
    '                  class="download-btn"',
    "                  download",
    "                  >다운로드</a>",
    "              </div>",
  ].join("\n");
}

function generateListHtml(items, env) {
  if (items.length === 0) return "              <!-- 목록 없음 -->";
  const [latest, ...rest] = items;
  const blocks = [];
  blocks.push(generateItemHtml(latest, true, env));
  for (const it of rest) {
    blocks.push(generateItemHtml(it, false, env));
  }
  return blocks.join("\n");
}

function main() {
  const root = path.resolve(__dirname, "..");
  const downloadDir = path.join(root, "download");
  const indexPath = path.join(root, "index.html");

  const filenames = fs
    .readdirSync(downloadDir)
    .filter((f) => f.endsWith(".apk"));
  const parsed = filenames.map(parseApkFilename).filter(Boolean);

  const byEnv = { dev: [], stg: [] };
  for (const p of parsed) byEnv[p.env].push(p);

  const sortFn = (a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date); // desc by date
    return b.build - a.build; // desc by build
  };

  byEnv.dev.sort(sortFn);
  byEnv.stg.sort(sortFn);

  const devHtml = generateListHtml(byEnv.dev, "dev");
  const stgHtml = generateListHtml(byEnv.stg, "stg");

  let indexHtml = fs.readFileSync(indexPath, "utf8");

  const sections = [
    {
      start: "<!-- GENERATED DEV LIST START -->",
      end: "<!-- GENERATED DEV LIST END -->",
      html: devHtml,
    },
    {
      start: "<!-- GENERATED STG LIST START -->",
      end: "<!-- GENERATED STG LIST END -->",
      html: stgHtml,
    },
  ];

  for (const { start, end, html } of sections) {
    const startIdx = indexHtml.indexOf(start);
    const endIdx = indexHtml.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      console.error(`Marker not found or invalid order: ${start} .. ${end}`);
      process.exit(1);
    }
    const before = indexHtml.slice(0, startIdx + start.length);
    const after = indexHtml.slice(endIdx);
    indexHtml = `${before}\n${html}\n${after}`;
  }

  // Build-time branding: replace <title> and header <h1>
  indexHtml = indexHtml.replace(
    /<title>.*?APK 다운로드<\/title>/,
    `<title>${cfg.displayNameKo} APK 다운로드<\/title>`
  );
  const headerH1 = `${cfg.icon ? cfg.icon + ' ' : ''}${cfg.displayNameKo} APK`;
  indexHtml = indexHtml.replace(/<h1>[\s\S]*?APK<\/h1>/, `<h1>${headerH1}<\/h1>`);

  fs.writeFileSync(indexPath, indexHtml, "utf8");
  console.log("index.html updated from download folder.");
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

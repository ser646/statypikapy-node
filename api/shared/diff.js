const connectToDatabase = require("../../lib/database");
const fetch = require("node-fetch");

// Function to load excluded match IDs from database
async function loadExcludedMatches(db) {
  try {
    const excludedMatches = await db
      .collection("excluded_logs")
      .distinct("_id", {});
    console.log(
      `Loaded ${excludedMatches.length} excluded match IDs from database`,
    );
    return excludedMatches.map((id) => String(id));
  } catch (error) {
    console.error(
      "Error loading excluded matches from database:",
      error.message,
    );
    return [];
  }
}

module.exports = async function () {
  const db = await connectToDatabase();

  // Check if db connection is valid
  if (!db) {
    console.error("Failed to connect to database");
    return [];
  }

  let use_tf2pickup_api = Number(process.env.USE_TF2PICKUP_API);
  let tf2pickup_api_limit = Number(process.env.TF2PICKUP_API_LIMIT);
  let title = process.env.LOGSTF_TITLE;

  let mode = process.env.MATCH_FORMAT;
  let lt = 0;
  let gt = 0;

  if (mode == "6v6") {
    lt = 15;
    gt = 0;
  } else if (mode == "9v9") {
    lt = 30;
    gt = 15;
  }

  // Load excluded match IDs - ADDED AWAIT HERE
  const excludedMatches = await loadExcludedMatches(db);

  let p1 = fetch(`https://logs.tf/api/v1/log?title=${title}&limit=10000`)
    .then((r) => {
      if (!r.ok) {
        throw new Error(`HTTP error! status: ${r.status}`);
      }
      return r.json();
    })
    .then((r) => {
      let logs = [];
      if (r && r.logs && Array.isArray(r.logs)) {
        for (let l of r.logs) {
          if (l.players > gt && l.players < lt) logs.push(`${l.id}`);
        }
      }
      return logs;
    })
    .catch((error) => {
      console.error("Error fetching logs from logs.tf:", error.message);
      return [];
    });
  let p2 = use_tf2pickup_api
    ? fetch(`https://api.${title}/games?limit=100`)
        .then((r) => {
          if (!r.ok) {
            throw new Error(`HTTP error! status: ${r.status}`);
          }
          return r.json();
        })
        .then((r) => {
          let logs = [];
          if (r && r.results && Array.isArray(r.results)) {
            for (let l of r.results) {
              if (l.slots && typeof l.slots === "object") {
                let len = Object.keys(l.slots).length;
                if (l.logsUrl && len > gt && len < lt)
                  logs.push(l.logsUrl.slice(-7));
              }
            }
          }
          return logs;
        })
        .catch((error) => {
          console.error(
            "Error fetching logs from tf2pickup API:",
            error.message,
          );
          return [];
        })
    : [];
  let p3 = db.collection("logs").distinct("_id", {}, {});
  const d = await Promise.all([p1, p2, p3]).then((r) => {
    let diff1 = r[0].filter((x) => !r[2].includes(x));
    let diff2 = r[1].filter((x) => !r[2].includes(x));
    let diff = diff1.concat(diff2.filter((item) => diff1.indexOf(item) < 0));

    // Filter out excluded matches
    const filteredDiff = diff.filter(
      (matchId) => !excludedMatches.includes(String(matchId)),
    );

    if (excludedMatches.length > 0) {
      const excludedCount = diff.length - filteredDiff.length;
      console.log(`Filtered out ${excludedCount} excluded matches`);
    }

    return filteredDiff;
  });
  return d;
};

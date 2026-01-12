// // src/components/StarPatternDashboard.jsx
// import React, { useState, useMemo } from "react";
// import Plot from "react-plotly.js";
// import Papa from "papaparse";

// /* =============================
//    Helpers: timeframe → minutes
//    ============================= */
// function tfToMinutes(tf) {
//   if (!tf) return 1;
//   if (tf.endsWith("min")) return parseInt(tf.replace("min", ""), 10);
//   if (tf.endsWith("h")) return parseInt(tf.replace("h", ""), 10) * 60;
//   return 1;
// }

// /* =============================
//    CSV → OHLC rows
//    ============================= */
// function parseCsv(file, callback) {
//   Papa.parse(file, {
//     header: true,
//     dynamicTyping: true,
//     skipEmptyLines: true,
//     complete: (res) => {
//       const rows = res.data
//         .map((r) => {
//           const dt =
//             r.datetime ||
//             r.DATETIME ||
//             r.date ||
//             r.Date ||
//             r.time ||
//             r.Time;
//           if (!dt) return null;

//           const t = new Date(dt);
//           if (isNaN(t.getTime())) return null;

//           const open = r.open ?? r.Open ?? r.OPEN;
//           const high = r.high ?? r.High ?? r.HIGH;
//           const low = r.low ?? r.Low ?? r.LOW;
//           const close = r.close ?? r.Close ?? r.CLOSE;

//           if (
//             open == null ||
//             high == null ||
//             low == null ||
//             close == null
//           )
//             return null;

//           return {
//             time: t,
//             open: Number(open),
//             high: Number(high),
//             low: Number(low),
//             close: Number(close),
//           };
//         })
//         .filter(Boolean)
//         .sort((a, b) => a.time - b.time);

//       callback(rows);
//     },
//   });
// }

// /* =============================
//    Resample OHLC (no gaps)
//    ============================= */
// function resampleOHLC(rows, tf) {
//   const minutes = tfToMinutes(tf);
//   if (minutes === 1) return rows;

//   const bucketMs = minutes * 60 * 1000;
//   const buckets = new Map();

//   for (const r of rows) {
//     const bucket = Math.floor(r.time.getTime() / bucketMs) * bucketMs;

//     let b = buckets.get(bucket);
//     if (!b) {
//       b = {
//         time: new Date(bucket),
//         open: r.open,
//         high: r.high,
//         low: r.low,
//         close: r.close,
//       };
//       buckets.set(bucket, b);
//     } else {
//       b.high = Math.max(b.high, r.high);
//       b.low = Math.min(b.low, r.low);
//       b.close = r.close;
//     }
//   }

//   return [...buckets.values()].sort((a, b) => a.time - b.time);
// }

// /* =============================
//    Candle geometry (body/wicks)
//    ============================= */
// function addCandleParts(rows) {
//   return rows.map((r) => {
//     const range = Math.max(r.high - r.low, 1e-9);
//     const body = Math.abs(r.close - r.open);
//     const upperWick = r.high - Math.max(r.open, r.close);
//     const lowerWick = Math.min(r.open, r.close) - r.low;

//     const bodyRatio = body / range;
//     const upperWickRatio = upperWick / range;
//     const lowerWickRatio = lowerWick / range;
//     const totalWicksRatio = upperWickRatio + lowerWickRatio;

//     return {
//       ...r,
//       bodyRatio,
//       upperWickRatio,
//       lowerWickRatio,
//       totalWicksRatio,
//       isBullish: r.close > r.open,
//       isBearish: r.close < r.open,
//     };
//   });
// }

// /* =============================
//    Morning Star detection
//    (C1 red, C2 doji, C3 green)
//    ============================= */
// function detectMorningStars(candles, cfg) {
//   const patterns = [];

//   for (let i = 2; i < candles.length; i++) {
//     const c1 = candles[i - 2];
//     const c2 = candles[i - 1];
//     const c3 = candles[i];

//     // C1: big red
//     const c1Valid =
//       c1.isBearish &&
//       c1.bodyRatio >= cfg.c1BodyMin &&
//       c1.upperWickRatio <= cfg.c1WickMax &&
//       c1.lowerWickRatio <= cfg.c1WickMax;

//     // C2: doji with long wicks
//     const c2Valid =
//       c2.bodyRatio <= cfg.c2BodyMax &&
//       c2.totalWicksRatio >= cfg.c2WicksMin;

//     // C3: big green
//     const c3Valid =
//       c3.isBullish &&
//       c3.bodyRatio >= cfg.c3BodyMin &&
//       c3.upperWickRatio <= cfg.c3WickMax &&
//       c3.lowerWickRatio <= cfg.c3WickMax;

//     if (!(c1Valid && c2Valid && c3Valid)) continue;

//     // Midpoint confirmation: C3 close >= midpoint of C1
//     if (cfg.requireMidpoint) {
//       const mid = (c1.open + c1.close) / 2;
//       if (c3.close < mid) continue;
//     }

//     patterns.push({
//       index: i - 1, // mark on doji
//       y: c2.low,
//     });
//   }

//   return patterns;
// }

// /* =============================
//    Evening Star detection
//    (C1 green, C2 doji, C3 red)
//    ============================= */
// function detectEveningStars(candles, cfg) {
//   const patterns = [];

//   for (let i = 2; i < candles.length; i++) {
//     const c1 = candles[i - 2];
//     const c2 = candles[i - 1];
//     const c3 = candles[i];

//     // C1: big green
//     const c1Valid =
//       c1.isBullish &&
//       c1.bodyRatio >= cfg.c1BodyMin &&
//       c1.upperWickRatio <= cfg.c1WickMax &&
//       c1.lowerWickRatio <= cfg.c1WickMax;

//     // C2: doji
//     const c2Valid =
//       c2.bodyRatio <= cfg.c2BodyMax &&
//       c2.totalWicksRatio >= cfg.c2WicksMin;

//     // C3: big red
//     const c3Valid =
//       c3.isBearish &&
//       c3.bodyRatio >= cfg.c3BodyMin &&
//       c3.upperWickRatio <= cfg.c3WickMax &&
//       c3.lowerWickRatio <= cfg.c3WickMax;

//     if (!(c1Valid && c2Valid && c3Valid)) continue;

//     // Midpoint confirmation: C3 close <= midpoint of C1
//     if (cfg.requireMidpoint) {
//       const mid = (c1.open + c1.close) / 2;
//       if (c3.close > mid) continue;
//     }

//     patterns.push({
//       index: i - 1, // mark on doji
//       y: c2.high,
//     });
//   }

//   return patterns;
// }

// /* =============================
//    MAIN COMPONENT
//    ============================= */
// export default function StarPatternDashboard({ theme = "light" }) {
//   const [file, setFile] = useState(null);
//   const [rows, setRows] = useState([]);
//   const [tf, setTf] = useState("15min");

//   // which pattern
//   const [patternType, setPatternType] = useState("morning"); // 'morning' | 'evening'

//   // C1 / C2 / C3 body % (user input)
//   const [c1BodyPct, setC1BodyPct] = useState(70);
//   const [c2BodyPct, setC2BodyPct] = useState(30); // max body for doji
//   const [c3BodyPct, setC3BodyPct] = useState(70);
//   const [requireMidpoint, setRequireMidpoint] = useState(true);

//   const [result, setResult] = useState(null);

//   const isDark = theme === "dark";

//   function onFileChange(e) {
//     const f = e.target.files[0];
//     setFile(f || null);
//     setRows([]);
//     setResult(null);

//     if (f) {
//       parseCsv(f, setRows);
//     }
//   }

//   function runAnalysis() {
//     if (!rows.length) return;

//     const resampled = resampleOHLC(rows, tf);
//     const candles = addCandleParts(resampled);

//     // convert % → ratios; wicks auto = 1 - body
//     const c1BodyMin = Math.min(Math.max(c1BodyPct, 1), 99) / 100;
//     const c3BodyMin = Math.min(Math.max(c3BodyPct, 1), 99) / 100;
//     const c2BodyMax = Math.min(Math.max(c2BodyPct, 1), 99) / 100;

//     const cfg = {
//       c1BodyMin,
//       c1WickMax: 1 - c1BodyMin,
//       c2BodyMax,
//       c2WicksMin: 1 - c2BodyMax,
//       c3BodyMin,
//       c3WickMax: 1 - c3BodyMin,
//       requireMidpoint,
//     };

//     let patterns = [];
//     if (patternType === "morning") {
//       patterns = detectMorningStars(candles, cfg);
//     } else {
//       patterns = detectEveningStars(candles, cfg);
//     }

//     // x-axis indices (remove calendar gaps)
//     const xIdx = candles.map((_, i) => i);
//     const timeStrings = candles.map((c) =>
//       c.time.toLocaleString("en-IN", {
//         year: "numeric",
//         month: "short",
//         day: "2-digit",
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     );

//     const data = [];

//     // Candles
//     data.push({
//       type: "candlestick",
//       x: xIdx,
//       open: candles.map((c) => c.open),
//       high: candles.map((c) => c.high),
//       low: candles.map((c) => c.low),
//       close: candles.map((c) => c.close),
//       name: `OHLC (${tf})`,
//       customdata: timeStrings,
//       hovertemplate:
//         "%{customdata}<br>" +
//         "O: %{open}<br>H: %{high}<br>L: %{low}<br>C: %{close}<extra></extra>",
//     });

//     // Pattern markers
//     if (patterns.length) {
//       const xs = patterns.map((p) => p.index);
//       const ys = patterns.map((p) => p.y);

//       const isMorning = patternType === "morning";

//       data.push({
//         type: "scatter",
//         mode: "markers+text",
//         x: xs,
//         y: ys,
//         marker: {
//           symbol: "star",
//           size: 16,
//           color: isMorning ? "green" : "red",
//         },
//         text: patterns.map(() =>
//           isMorning ? "Morning Star" : "Evening Star"
//         ),
//         textposition: isMorning ? "bottom center" : "top center",
//         name: isMorning ? "Morning Star" : "Evening Star",
//       });
//     }

//     const subtitle =
//       patternType === "morning"
//         ? `C1: Red ≥${c1BodyPct}% | C2: Doji ≤${c2BodyPct}%, Wicks ≥${
//             100 - c2BodyPct
//           }% | C3: Green ≥${c3BodyPct}%`
//         : `C1: Green ≥${c1BodyPct}% | C2: Doji ≤${c2BodyPct}%, Wicks ≥${
//             100 - c2BodyPct
//           }% | C3: Red ≥${c3BodyPct}%`;

//     const layout = {
//       title:
//         (patternType === "morning"
//           ? "Morning Star Pattern Detection"
//           : "Evening Star Pattern Detection") +
//         "<br><sub>" +
//         subtitle +
//         "</sub>",
//       xaxis: {
//         title: "Candle Index",
//         type: "linear",
//         rangeslider: { visible: false },
//       },
//       yaxis: { title: "Price" },
//       height: 700,
//       template: isDark ? "plotly_dark" : "plotly_white",
//       paper_bgcolor: isDark ? "#020617" : "#ffffff",
//       plot_bgcolor: isDark ? "#020617" : "#f8fafc",
//       font: { color: isDark ? "#e5e7eb" : "#0f172a" },
//       margin: { l: 60, r: 30, t: 80, b: 60 },
//     };

//     setResult({ data, layout, count: patterns.length });
//   }

//   const chart = useMemo(() => {
//     if (!result) return null;
//     return (
//       <Plot
//         data={result.data}
//         layout={result.layout}
//         style={{ width: "100%", height: "100%" }}
//         useResizeHandler
//       />
//     );
//   }, [result]);

//   return (
//     <div className="space-y-4">
//       <h2 className="text-lg font-bold">
//         {patternType === "morning"
//           ? "Morning Star Pattern Detection"
//           : "Evening Star Pattern Detection"}
//       </h2>

//       {/* Controls row */}
//       <div className="flex flex-wrap gap-4 items-end">
//         {/* File */}
//         <div>
//           <label className="block text-xs font-semibold mb-1">
//             Choose CSV
//           </label>
//           <input
//             type="file"
//             accept=".csv"
//             onChange={onFileChange}
//             className="text-xs"
//           />
//         </div>

//         {/* Pattern Type */}
//         <div>
//           <label className="block text-xs font-semibold mb-1">
//             Pattern Type
//           </label>
//           <select
//             value={patternType}
//             onChange={(e) => {
//               setPatternType(e.target.value);
//               setResult(null);
//             }}
//             className="border px-2 py-1 rounded text-xs"
//           >
//             <option value="morning">Morning Star</option>
//             <option value="evening">Evening Star</option>
//           </select>
//         </div>

//         {/* Timeframe */}
//         <div>
//           <label className="block text-xs font-semibold mb-1">
//             Resample
//           </label>
//           <select
//             value={tf}
//             onChange={(e) => setTf(e.target.value)}
//             className="border px-2 py-1 rounded text-xs"
//           >
//             <option value="1min">1 min</option>
//             <option value="5min">5 min</option>
//             <option value="15min">15 min</option>
//             <option value="30min">30 min</option>
//             <option value="45min">45 min</option>
//             <option value="1h">1 hour</option>
//             <option value="4h">4 hour</option>
//             <option value="8h">8 hour</option>
//           </select>
//         </div>

//         {/* C1 body % */}
//         <div>
//           <label className="block text-xs font-semibold mb-1">
//             C1 Body ≥ (%)
//           </label>
//           <input
//             type="number"
//             min={1}
//             max={99}
//             value={c1BodyPct}
//             onChange={(e) => setC1BodyPct(Number(e.target.value))}
//             className="border px-2 py-1 rounded text-xs w-20"
//           />
//           <p className="text-[10px] text-gray-500">
//             Wicks ≤ {100 - c1BodyPct}%
//           </p>
//         </div>

//         {/* C2 body % */}
//         <div>
//           <label className="block text-xs font-semibold mb-1">
//             C2 Doji Body ≤ (%)
//           </label>
//           <input
//             type="number"
//             min={1}
//             max={99}
//             value={c2BodyPct}
//             onChange={(e) => setC2BodyPct(Number(e.target.value))}
//             className="border px-2 py-1 rounded text-xs w-20"
//           />
//           <p className="text-[10px] text-gray-500">
//             Wicks ≥ {100 - c2BodyPct}%
//           </p>
//         </div>

//         {/* C3 body % */}
//         <div>
//           <label className="block text-xs font-semibold mb-1">
//             C3 Body ≥ (%)
//           </label>
//           <input
//             type="number"
//             min={1}
//             max={99}
//             value={c3BodyPct}
//             onChange={(e) => setC3BodyPct(Number(e.target.value))}
//             className="border px-2 py-1 rounded text-xs w-20"
//           />
//           <p className="text-[10px] text-gray-500">
//             Wicks ≤ {100 - c3BodyPct}%
//           </p>
//         </div>

//         {/* Midpoint confirmation */}
//         <div className="flex items-center gap-1 mt-5">
//           <input
//             id="midpointCheck"
//             type="checkbox"
//             checked={requireMidpoint}
//             onChange={(e) => setRequireMidpoint(e.target.checked)}
//           />
//           <label
//             htmlFor="midpointCheck"
//             className="text-xs select-none cursor-pointer"
//           >
//             Require midpoint confirmation
//           </label>
//         </div>

//         {/* Run button */}
//         <button
//           onClick={runAnalysis}
//           className="bg-blue-600 text-white text-xs px-4 py-2 rounded shadow mt-1"
//         >
//           Generate Pattern Analysis
//         </button>
//       </div>

//       {result && (
//         <p className="text-xs">
//           Patterns detected: <strong>{result.count}</strong>
//         </p>
//       )}

//       <div className="mt-4">{chart}</div>
//     </div>
//   );
// }















// components/MorningEveningStarDashboard.jsx
import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import Papa from "papaparse";

/* ===========================
   Helpers: timeframe & parsing
   =========================== */
function tfToMinutes(tf) {
  if (tf.endsWith("min")) return parseInt(tf.replace("min", ""), 10);
  if (tf.endsWith("h")) return parseInt(tf.replace("h", ""), 10) * 60;
  return 1;
}

function parseCsv(file, callback) {
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (res) => {
      const rows = res.data
        .map((r) => {
          const dt =
            r.datetime ||
            r.DATETIME ||
            r.DateTime ||
            r.date ||
            r.Date ||
            r.time ||
            r.Time;

          if (!dt) return null;
          const t = new Date(dt);
          if (isNaN(t.getTime())) return null;

          const open = Number(r.open ?? r.Open);
          const high = Number(r.high ?? r.High);
          const low = Number(r.low ?? r.Low);
          const close = Number(r.close ?? r.Close);

          if (
            [open, high, low, close].some(
              (v) => v === null || Number.isNaN(v)
            )
          ) {
            return null;
          }

          return { time: t, open, high, low, close };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);

      callback(rows);
    },
  });
}

/* ===========================
   Resample OHLC (no date gaps)
   =========================== */

/* ===========================
   Resample OHLC - Group consecutive candles
   =========================== */
function resampleOHLC(rows, tf) {
  const minutes = tfToMinutes(tf);
  if (minutes === 1) return rows;
  if (rows.length === 0) return rows;

  const result = [];
  
  // Group every N candles together
  for (let i = 0; i < rows.length; i += minutes) {
    const group = rows.slice(i, i + minutes);
    if (group.length === 0) continue;
    
    const resampled = {
      time: group[0].time, // Start time of the period
      open: group[0].open, // First open
      high: Math.max(...group.map(r => r.high)), // Highest high
      low: Math.min(...group.map(r => r.low)), // Lowest low
      close: group[group.length - 1].close // Last close
    };
    
    result.push(resampled);
  }

  return result;
}
/* ===========================
   Candle geometry & patterns
   =========================== */
function addGeometry(rows) {
  return rows.map((r) => {
    const range = Math.max(1e-9, r.high - r.low);
    const body = Math.abs(r.close - r.open);
    const upper = (r.high - Math.max(r.open, r.close)) / range;
    const lower = (Math.min(r.open, r.close) - r.low) / range;
    const totalWicks = upper + lower;
    return {
      ...r,
      bodyRatio: body / range,
      upperWickRatio: upper,
      lowerWickRatio: lower,
      totalWicksRatio: totalWicks,
      isBullish: r.close > r.open,
      isBearish: r.close < r.open,
    };
  });
}

function detectMorningAndEvening(rows, cfg) {
  const out = {
    rows,
    morningIndices: [],
    eveningIndices: [],
  };
  if (rows.length < 3) return out;

  const {
    msC1BodyPct,
    msC2BodyPct,
    msC3BodyPct,
    esC1BodyPct,
    esC2BodyPct,
    esC3BodyPct,
    requireMidpoint,
  } = cfg;

  // Morning thresholds
  const msC1BodyMin = msC1BodyPct / 100;
  const msC1WickMax = 1 - msC1BodyMin;
  const msC2BodyMax = msC2BodyPct / 100;
  const msC2WicksMin = 1 - msC2BodyMax;
  const msC3BodyMin = msC3BodyPct / 100;
  const msC3WickMax = 1 - msC3BodyMin;

  // Evening thresholds
  const esC1BodyMin = esC1BodyPct / 100;
  const esC1WickMax = 1 - esC1BodyMin;
  const esC2BodyMax = esC2BodyPct / 100;
  const esC2WicksMin = 1 - esC2BodyMax;
  const esC3BodyMin = esC3BodyPct / 100;
  const esC3WickMax = 1 - esC3BodyMin;

  for (let i = 2; i < rows.length; i++) {
    const c1 = rows[i - 2];
    const c2 = rows[i - 1];
    const c3 = rows[i];

    // ===== Morning Star (red → doji → green) =====
    const c1Red =
      c1.isBearish &&
      c1.bodyRatio >= msC1BodyMin &&
      c1.upperWickRatio <= msC1WickMax &&
      c1.lowerWickRatio <= msC1WickMax;

    const c2Doji =
      c2.bodyRatio <= msC2BodyMax &&
      c2.totalWicksRatio >= msC2WicksMin;

    const c3Green =
      c3.isBullish &&
      c3.bodyRatio >= msC3BodyMin &&
      c3.upperWickRatio <= msC3WickMax &&
      c3.lowerWickRatio <= msC3WickMax;

    let morningOk = c1Red && c2Doji && c3Green;
    if (morningOk && requireMidpoint) {
      const mid = (c1.open + c1.close) / 2;
      if (c3.close < mid) morningOk = false;
    }
    if (morningOk) {
      // mark C2 index (doji)
      out.morningIndices.push(i - 1);
    }

    // ===== Evening Star (green → doji → red) =====
    const e1Green =
      c1.isBullish &&
      c1.bodyRatio >= esC1BodyMin &&
      c1.upperWickRatio <= esC1WickMax &&
      c1.lowerWickRatio <= esC1WickMax;

    const e2Doji =
      c2.bodyRatio <= esC2BodyMax &&
      c2.totalWicksRatio >= esC2WicksMin;

    const e3Red =
      c3.isBearish &&
      c3.bodyRatio >= esC3BodyMin &&
      c3.upperWickRatio <= esC3WickMax &&
      c3.lowerWickRatio <= esC3WickMax;

    let eveningOk = e1Green && e2Doji && e3Red;
    if (eveningOk && requireMidpoint) {
      const mid = (c1.open + c1.close) / 2;
      if (c3.close > mid) eveningOk = false;
    }
    if (eveningOk) {
      // mark C2 index (doji)
      out.eveningIndices.push(i - 1);
    }
  }

  return out;
}

/* ===========================
   MAIN COMPONENT
   =========================== */
export default function MorningEveningStarDashboard({ theme = "light" }) {
  const [file, setFile] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [tf, setTf] = useState("15min");

  // Morning config
  const [msC1BodyPct, setMsC1BodyPct] = useState(70);
  const [msC2BodyPct, setMsC2BodyPct] = useState(30); // doji
  const [msC3BodyPct, setMsC3BodyPct] = useState(70);

  // Evening config
  const [esC1BodyPct, setEsC1BodyPct] = useState(70);
  const [esC2BodyPct, setEsC2BodyPct] = useState(30);
  const [esC3BodyPct, setEsC3BodyPct] = useState(70);

  const [requireMidpoint, setRequireMidpoint] = useState(true);
  const [result, setResult] = useState(null);

  const isDark = theme === "dark";

  function handleFileChange(e) {
    const f = e.target.files[0];
    setFile(f || null);
    setRawRows([]);
    setResult(null);
    if (f) {
      parseCsv(f, setRawRows);
    }
  }

  function runAnalysis() {
    if (!rawRows.length) return;

    const resampled = resampleOHLC(rawRows, tf);
    const geom = addGeometry(resampled);

    const { morningIndices, eveningIndices } = detectMorningAndEvening(
      geom,
      {
        msC1BodyPct,
        msC2BodyPct,
        msC3BodyPct,
        esC1BodyPct,
        esC2BodyPct,
        esC3BodyPct,
        requireMidpoint,
      }
    );

    const xIdx = geom.map((_, i) => i);

    const data = [
      {
        type: "candlestick",
        x: xIdx,
        open: geom.map((r) => r.open),
        high: geom.map((r) => r.high),
        low: geom.map((r) => r.low),
        close: geom.map((r) => r.close),
        name: `OHLC (${tf})`,
        increasing: { line: { color: "#16a34a" } },
        decreasing: { line: { color: "#dc2626" } },
      },
    ];

    if (morningIndices.length) {
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: morningIndices,
        y: morningIndices.map((i) => geom[i].low - 5),
        marker: {
          symbol: "star",
          size: 14,
          color: "lime",
          line: { width: 1, color: "green" },
        },
        text: morningIndices.map(() => "Morning Star"),
        textposition: "bottom center",
        name: "Morning Star",
      });
    }

    if (eveningIndices.length) {
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: eveningIndices,
        y: eveningIndices.map((i) => geom[i].high + 5),
        marker: {
          symbol: "star",
          size: 14,
          color: "red",
          line: { width: 1, color: "darkred" },
        },
        text: eveningIndices.map(() => "Evening Star"),
        textposition: "top center",
        name: "Evening Star",
      });
    }

    const layout = {
      title: {
        text:
          "Morning & Evening Star Pattern Detection" +
          "<br><span style='font-size:11px'>" +
          `Morning: C1 Red≥${msC1BodyPct}% | C2 Doji≤${msC2BodyPct}%, Wicks≥${
            100 - msC2BodyPct
          }% | C3 Green≥${msC3BodyPct}%` +
          "<br>" +
          `Evening: C1 Green≥${esC1BodyPct}% | C2 Doji≤${esC2BodyPct}%, Wicks≥${
            100 - esC2BodyPct
          }% | C3 Red≥${esC3BodyPct}%` +
          "</span>",
        x: 0,
        xanchor: "left",
      },
      xaxis: {
        title: "Candle Index",
        rangeslider: { visible: false },
      },
      yaxis: { title: "Price" },
      template: isDark ? "plotly_dark" : "plotly_white",
      paper_bgcolor: isDark ? "#020617" : "#ffffff",
      plot_bgcolor: isDark ? "#020617" : "#f9fafb",
      font: { color: isDark ? "#e5e7eb" : "#0f172a" },
      height: 700,
      margin: { l: 60, r: 30, t: 90, b: 40 },
    };

    setResult({
      data,
      layout,
      stats: {
        morningCount: morningIndices.length,
        eveningCount: eveningIndices.length,
        candles: geom.length,
      },
    });
  }

  const chart = useMemo(() => {
    if (!result) return null;
    // small tweak so Plotly respects theme each time
    const layout = {
      ...result.layout,
      template: isDark ? "plotly_dark" : "plotly_white",
      paper_bgcolor: isDark ? "#020617" : "#ffffff",
      plot_bgcolor: isDark ? "#020617" : "#f9fafb",
      font: { color: isDark ? "#e5e7eb" : "#0f172a" },
    };
    return (
      <Plot
        data={result.data}
        layout={layout}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    );
  }, [result, isDark]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Morning &amp; Evening Star Detection</h2>

      {/* Top controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col text-xs">
          <span className="font-semibold mb-1">Choose CSV</span>
          <input type="file" accept=".csv" onChange={handleFileChange} />
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold mb-1">Resample</span>
          <select
            value={tf}
            onChange={(e) => setTf(e.target.value)}
            className={
              (isDark
                ? "bg-slate-900 border-slate-600 text-slate-100"
                : "bg-white border-gray-300 text-gray-900") +
              " px-2 py-1 rounded text-xs border"
            }
          >
            <option value="1min">1 min</option>
            <option value="5min">5 min</option>
            <option value="15min">15 min</option>
            <option value="30min">30 min</option>
            <option value="45min">45 min</option>
            <option value="1h">1 hour</option>
            <option value="4h">4 hour</option>
            <option value="8h">8 hour</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={requireMidpoint}
            onChange={(e) => setRequireMidpoint(e.target.checked)}
          />
          Require midpoint confirmation
        </label>

        <button
          onClick={runAnalysis}
          className="bg-blue-600 text-white text-xs px-4 py-2 rounded shadow"
        >
          Generate Pattern Analysis
        </button>
      </div>

      {/* Config panels */}
      <div className="grid gap-4 md:grid-cols-2 text-xs">
        {/* Morning Star config */}
        <div
          className={
            (isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-blue-100") +
            " rounded-md p-3 border space-y-2"
          }
        >
          <div className="font-semibold text-sm mb-1">
            Morning Star (Red → Doji → Green)
          </div>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="block mb-1">C1 Body ≥ (%)</label>
              <input
                type="number"
                min={50}
                max={95}
                value={msC1BodyPct}
                onChange={(e) =>
                  setMsC1BodyPct(Number(e.target.value) || 0)
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Red ≥ {msC1BodyPct}%, wicks ≤ {100 - msC1BodyPct}%
              </p>
            </div>
            <div>
              <label className="block mb-1">C2 Doji Body ≤ (%)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={msC2BodyPct}
                onChange={(e) =>
                  setMsC2BodyPct(Number(e.target.value) || 0)
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Doji ≤ {msC2BodyPct}%, wicks ≥ {100 - msC2BodyPct}%
              </p>
            </div>
            <div>
              <label className="block mb-1">C3 Body ≥ (%)</label>
              <input
                type="number"
                min={50}
                max={95}
                value={msC3BodyPct}
                onChange={(e) =>
                  setMsC3BodyPct(Number(e.target.value) || 0)
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Green ≥ {msC3BodyPct}%, wicks ≤ {100 - msC3BodyPct}%
              </p>
            </div>
          </div>
        </div>

        {/* Evening Star config */}
        <div
          className=
          {(isDark
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-blue-100") +
          " rounded-md p-3 border space-y-2"}
        >
          <div className="font-semibold text-sm mb-1">
            Evening Star (Green → Doji → Red)
          </div>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="block mb-1">C1 Body ≥ (%)</label>
              <input
                type="number"
                min={50}
                max={95}
                value={esC1BodyPct}
                onChange={(e) =>
                  setEsC1BodyPct(Number(e.target.value) || 0)
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Green ≥ {esC1BodyPct}%, wicks ≤ {100 - esC1BodyPct}%
              </p>
            </div>
            <div>
              <label className="block mb-1">C2 Doji Body ≤ (%)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={esC2BodyPct}
                onChange={(e) =>
                  setEsC2BodyPct(Number(e.target.value) || 0)
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Doji ≤ {esC2BodyPct}%, wicks ≥ {100 - esC2BodyPct}%
              </p>
            </div>
            <div>
              <label className="block mb-1">C3 Body ≥ (%)</label>
              <input
                type="number"
                min={50}
                max={95}
                value={esC3BodyPct}
                onChange={(e) =>
                  setEsC3BodyPct(Number(e.target.value) || 0)
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Red ≥ {esC3BodyPct}%, wicks ≤ {100 - esC3BodyPct}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {result && (
        <div className="text-xs">
          Patterns detected:{" "}
          <span className="font-semibold text-emerald-500">
            Morning {result.stats.morningCount}
          </span>{" "}
          |{" "}
          <span className="font-semibold text-rose-500">
            Evening {result.stats.eveningCount}
          </span>{" "}
          | Candles {result.stats.candles}
        </div>
      )}

      {/* Chart */}
      <div className="mt-2">{chart}</div>
    </div>
  );
}

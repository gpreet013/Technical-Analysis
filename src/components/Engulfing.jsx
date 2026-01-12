// // components/EngulfingDashboard.jsx
// import React, { useState, useMemo } from "react";
// import Plot from "react-plotly.js";
// import Papa from "papaparse";

// /* =============================================
//    Convert timeframe string → minutes
//    ============================================= */
// function tfToMinutes(tf) {
//   if (tf.endsWith("min")) return parseInt(tf.replace("min", ""), 10);
//   if (tf.endsWith("h")) return parseInt(tf.replace("h", ""), 10) * 60;
//   return 1;
// }

// /* =============================================
//    Parse CSV to OHLC rows
//    ============================================= */
// function parseCsv(file, callback) {
//   Papa.parse(file, {
//     header: true,
//     dynamicTyping: true,
//     skipEmptyLines: true,
//     complete: (res) => {
//       const rows = res.data
//         .map((r) => {
//           const dt =
//             r.datetime || r.DATETIME || r.time || r.Time || r.DATE || r.Date || r.date;
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

// /* =============================================
//    Resample OHLC (no gaps logic itself is fine;
//    gaps only came from date x-axis)
//    ============================================= */
// function resampleOHLC(rows, tf) {
//   const minutes = tfToMinutes(tf);
//   if (minutes === 1) return rows; // no resample

//   const bucketMs = minutes * 60 * 1000;
//   const buckets = new Map();

//   for (const r of rows) {
//     const bucketStart = Math.floor(r.time.getTime() / bucketMs) * bucketMs;
//     let b = buckets.get(bucketStart);
//     if (!b) {
//       b = {
//         time: new Date(bucketStart),
//         open: r.open,
//         high: r.high,
//         low: r.low,
//         close: r.close,
//       };
//       buckets.set(bucketStart, b);
//     } else {
//       b.high = Math.max(b.high, r.high);
//       b.low = Math.min(b.low, r.low);
//       b.close = r.close;
//     }
//   }

//   return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
// }

// /* =============================================
//    Detect Bullish/Bearish Engulfing
//    ============================================= */
// function detectEngulfing(rows) {
//   return rows.map((r, i) => {
//     if (i === 0) return { ...r, bull: false, bear: false };

//     const p = rows[i - 1];
//     const c = rows[i];

//     const prevBull = p.close > p.open;
//     const prevBear = p.close < p.open;
//     const currBull = c.close > c.open;
//     const currBear = c.close < c.open;

//     let bullish = false;
//     let bearish = false;

//     // Bullish Engulfing = red → green & engulf body
//     if (prevBear && currBull && c.close >= p.open && c.open <= p.close) {
//       bullish = true;
//     }

//     // Bearish Engulfing = green → red & engulf body
//     if (prevBull && currBear && c.open >= p.close && c.close <= p.open) {
//       bearish = true;
//     }

//     return { ...r, bull: bullish, bear: bearish };
//   });
// }

// /* =============================================
//    MAIN COMPONENT
//    ============================================= */
// export default function EngulfingDashboard({ theme = "light" }) {
//   const [file, setFile] = useState(null);
//   const [rows, setRows] = useState([]);
//   const [tf, setTf] = useState("5min");
//   const [processed, setProcessed] = useState(null);

//   const isDark = theme === "dark";

//   function onFileUpload(e) {
//     const f = e.target.files[0];
//     setFile(f || null);
//     setRows([]);
//     setProcessed(null);

//     if (f) {
//       parseCsv(f, setRows);
//     }
//   }

//   function runAnalysis() {
//     if (!rows.length) return;

//     const resampled = resampleOHLC(rows, tf);
//     const engulf = detectEngulfing(resampled);

//     const bullIdx = [];
//     const bearIdx = [];

//     engulf.forEach((r, i) => {
//       if (r.bull) bullIdx.push(i);
//       if (r.bear) bearIdx.push(i);
//     });

//     // ==== NO-GAP X-AXIS (like HHHL): use candle index ====
//     const xIndex = engulf.map((_, i) => i);

//     const data = [];

//     // Main candles
//     data.push({
//       type: "candlestick",
//       x: xIndex,
//       open: engulf.map((r) => r.open),
//       high: engulf.map((r) => r.high),
//       low: engulf.map((r) => r.low),
//       close: engulf.map((r) => r.close),
//       name: `OHLC (${tf})`,
//       customdata: engulf.map((r) => r.time),
//       hovertemplate:
//         "<b>%{customdata|%Y-%m-%d %H:%M}</b><br>" +
//         "O: %{open:.2f} H: %{high:.2f}<br>" +
//         "L: %{low:.2f} C: %{close:.2f}<extra></extra>",
//     });

//     // Bullish markers
//     if (bullIdx.length) {
//       data.push({
//         type: "scatter",
//         mode: "markers+text",
//         x: bullIdx, // indices
//         y: bullIdx.map((i) => engulf[i].low - 5),
//         marker: { color: "lime", symbol: "triangle-up", size: 12 },
//         text: bullIdx.map(() => "Bull Engulf"),
//         textposition: "bottom center",
//         name: "Bullish Engulfing",
//       });
//     }

//     // Bearish markers
//     if (bearIdx.length) {
//       data.push({
//         type: "scatter",
//         mode: "markers+text",
//         x: bearIdx, // indices
//         y: bearIdx.map((i) => engulf[i].high + 5),
//         marker: { color: "red", symbol: "triangle-down", size: 12 },
//         text: bearIdx.map(() => "Bear Engulf"),
//         textposition: "top center",
//         name: "Bearish Engulfing",
//       });
//     }

//     const baseLayout = {
//       title: `Engulfing Pattern – ${tf}`,
//       xaxis: {
//         title: "Candle Index",
//         type: "linear",
//         rangeslider: { visible: false },
//       },
//       yaxis: { title: "Price" },
//     };

//     setProcessed({ data, layout: baseLayout });
//   }

//   // Theme-aware layout (so dark mode recolors chart)
//   const themedLayout = useMemo(() => {
//     if (!processed) return null;
//     const base = processed.layout || {};
//     return {
//       ...base,
//       template: isDark ? "plotly_dark" : "plotly_white",
//       paper_bgcolor: isDark ? "#111111" : "#ffffff",
//       plot_bgcolor: isDark ? "#000000" : "#f8fafc",
//       font: { color: isDark ? "#e5e7eb" : "#111827" },
//       xaxis: {
//         ...base.xaxis,
//         gridcolor: isDark ? "#374151" : "#e5e7eb",
//         zerolinecolor: isDark ? "#4b5563" : "#9ca3af",
//       },
//       yaxis: {
//         ...base.yaxis,
//         gridcolor: isDark ? "#374151" : "#e5e7eb",
//         zerolinecolor: isDark ? "#4b5563" : "#9ca3af",
//       },
//     };
//   }, [processed, isDark]);

//   return (
//     <div className="space-y-4">
//       <h2 className="text-lg font-bold">Engulfing Pattern Detection</h2>

//       {/* File upload */}
//       <div className="flex flex-col sm:flex-row sm:items-center gap-2">
//         <div>
//           <label className="block text-xs font-semibold mb-1">
//             Choose File
//           </label>
//           <input type="file" accept=".csv" onChange={onFileUpload} />
//         </div>

//         {/* Resample dropdown */}
//         <div className="flex items-center gap-2">
//           <label className="text-xs font-semibold">Resample:</label>
//           <select
//             value={tf}
//             onChange={(e) => setTf(e.target.value)}
//             className={
//               (isDark
//                 ? "bg-slate-900 border-slate-600 text-slate-100"
//                 : "bg-white border-gray-300 text-gray-900") +
//               " px-2 py-1 rounded text-sm"
//             }
//           >
//             <option value="1min">1 min</option>
//             <option value="5min">5 min</option>
//             <option value="10min">10 min</option>
//             <option value="15min">15 min</option>
//             <option value="30min">30 min</option>
//             <option value="1h">1 hour</option>
//             <option value="4h">4 hour</option>
//           </select>

//           <button
//             onClick={runAnalysis}
//             className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
//           >
//             Run
//           </button>
//         </div>
//       </div>

//       {/* Chart */}
//       {processed && themedLayout && (
//         <Plot
//           data={processed.data}
//           layout={themedLayout}
//           style={{ width: "100%", height: "600px" }}
//           useResizeHandler={true}
//         />
//       )}
//     </div>
//   );
// }
import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import Papa from "papaparse";

/* =============================================
   Convert timeframe string → minutes
   ============================================= */
function tfToMinutes(tf) {
  if (tf.endsWith("min")) return parseInt(tf.replace("min", ""), 10);
  if (tf.endsWith("h")) return parseInt(tf.replace("h", ""), 10) * 60;
  return 1;
}

/* =============================================
   Parse CSV to OHLC rows
   ============================================= */
function parseCsv(file, callback) {
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (res) => {
      const rows = res.data
        .map((r) => {
          const dt =
            r.datetime || r.DATETIME || r.time || r.Time || r.DATE || r.Date || r.date;
          if (!dt) return null;

          const t = new Date(dt);
          if (isNaN(t.getTime())) return null;

          const open = r.open ?? r.Open ?? r.OPEN;
          const high = r.high ?? r.High ?? r.HIGH;
          const low = r.low ?? r.Low ?? r.LOW;
          const close = r.close ?? r.Close ?? r.CLOSE;

          if (
            open == null ||
            high == null ||
            low == null ||
            close == null
          )
            return null;

          return {
            time: t,
            open: Number(open),
            high: Number(high),
            low: Number(low),
            close: Number(close),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);

      callback(rows);
    },
  });
}

/* =============================================
   Resample OHLC - Group consecutive candles
   ============================================= */
function resampleOHLC(rows, tf) {
  const minutes = tfToMinutes(tf);
  if (minutes === 1) return rows; // no resample
  if (rows.length === 0) return rows;

  const result = [];
  
  // Group every N candles together (simpler approach)
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

/* =============================================
   Detect Bullish/Bearish Engulfing
   ============================================= */
function detectEngulfing(rows) {
  return rows.map((r, i) => {
    if (i === 0) return { ...r, bull: false, bear: false };

    const p = rows[i - 1];
    const c = rows[i];

    const prevBull = p.close > p.open;
    const prevBear = p.close < p.open;
    const currBull = c.close > c.open;
    const currBear = c.close < c.open;

    let bullish = false;
    let bearish = false;

    // Bullish Engulfing = red → green & engulf body
    if (prevBear && currBull && c.close >= p.open && c.open <= p.close) {
      bullish = true;
    }

    // Bearish Engulfing = green → red & engulf body
    if (prevBull && currBear && c.open >= p.close && c.close <= p.open) {
      bearish = true;
    }

    return { ...r, bull: bullish, bear: bearish };
  });
}

/* =============================================
   MAIN COMPONENT
   ============================================= */
export default function EngulfingDashboard({ theme = "light" }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [tf, setTf] = useState("5min");
  const [processed, setProcessed] = useState(null);

  const isDark = theme === "dark";

  function onFileUpload(e) {
    const f = e.target.files[0];
    setFile(f || null);
    setRows([]);
    setProcessed(null);

    if (f) {
      parseCsv(f, setRows);
    }
  }

  function runAnalysis() {
    if (!rows.length) return;

    const resampled = resampleOHLC(rows, tf);
    const engulf = detectEngulfing(resampled);

    const bullIdx = [];
    const bearIdx = [];

    engulf.forEach((r, i) => {
      if (r.bull) bullIdx.push(i);
      if (r.bear) bearIdx.push(i);
    });

    // ==== NO-GAP X-AXIS: use candle index ====
    const xIndex = engulf.map((_, i) => i);

    const data = [];

    // Main candles
    data.push({
      type: "candlestick",
      x: xIndex,
      open: engulf.map((r) => r.open),
      high: engulf.map((r) => r.high),
      low: engulf.map((r) => r.low),
      close: engulf.map((r) => r.close),
      name: `OHLC (${tf})`,
      customdata: engulf.map((r) => r.time),
      hovertemplate:
        "<b>%{customdata|%Y-%m-%d %H:%M}</b><br>" +
        "O: %{open:.2f} H: %{high:.2f}<br>" +
        "L: %{low:.2f} C: %{close:.2f}<extra></extra>",
    });

    // Bullish markers
    if (bullIdx.length) {
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: bullIdx,
        y: bullIdx.map((i) => engulf[i].low - 5),
        marker: { color: "lime", symbol: "triangle-up", size: 12 },
        text: bullIdx.map(() => "Bull Engulf"),
        textposition: "bottom center",
        name: "Bullish Engulfing",
      });
    }

    // Bearish markers
    if (bearIdx.length) {
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: bearIdx,
        y: bearIdx.map((i) => engulf[i].high + 5),
        marker: { color: "red", symbol: "triangle-down", size: 12 },
        text: bearIdx.map(() => "Bear Engulf"),
        textposition: "top center",
        name: "Bearish Engulfing",
      });
    }

    const baseLayout = {
      title: `Engulfing Pattern – ${tf} (${engulf.length} candles)`,
      xaxis: {
        title: "Candle Index",
        type: "linear",
        rangeslider: { visible: false },
      },
      yaxis: { title: "Price" },
    };

    setProcessed({ data, layout: baseLayout });
  }

  // Theme-aware layout
  const themedLayout = useMemo(() => {
    if (!processed) return null;
    const base = processed.layout || {};
    return {
      ...base,
      template: isDark ? "plotly_dark" : "plotly_white",
      paper_bgcolor: isDark ? "#111111" : "#ffffff",
      plot_bgcolor: isDark ? "#000000" : "#f8fafc",
      font: { color: isDark ? "#e5e7eb" : "#111827" },
      xaxis: {
        ...base.xaxis,
        gridcolor: isDark ? "#374151" : "#e5e7eb",
        zerolinecolor: isDark ? "#4b5563" : "#9ca3af",
      },
      yaxis: {
        ...base.yaxis,
        gridcolor: isDark ? "#374151" : "#e5e7eb",
        zerolinecolor: isDark ? "#4b5563" : "#9ca3af",
      },
    };
  }, [processed, isDark]);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Engulfing Pattern Detection</h2>

      {/* File upload */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div>
          <label className="block text-xs font-semibold mb-1">
            Choose File
          </label>
          <input type="file" accept=".csv" onChange={onFileUpload} />
        </div>

        {/* Resample dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold">Resample:</label>
          <select
            value={tf}
            onChange={(e) => setTf(e.target.value)}
            className={
              (isDark
                ? "bg-slate-900 border-slate-600 text-slate-100"
                : "bg-white border-gray-300 text-gray-900") +
              " px-2 py-1 rounded text-sm border"
            }
          >
            <option value="1min">1 min</option>
            <option value="5min">5 min</option>
            <option value="10min">10 min</option>
            <option value="15min">15 min</option>
            <option value="30min">30 min</option>
            <option value="1h">1 hour</option>
          </select>

          <button
            onClick={runAnalysis}
            disabled={!rows.length}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Run
          </button>
        </div>
      </div>

      {/* Info */}
      {rows.length > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loaded {rows.length} 1-minute candles
        </p>
      )}

      {/* Chart */}
      {processed && themedLayout && (
        <Plot
          data={processed.data}
          layout={themedLayout}
          style={{ width: "100%", height: "600px" }}
          useResizeHandler={true}
        />
      )}
    </div>
  );
}
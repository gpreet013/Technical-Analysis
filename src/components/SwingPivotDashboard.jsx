// SwingHighLowDashboard.jsx - FIXED VERSION
import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import Papa from "papaparse";

/* =============================================
   Convert timeframe string → minutes
   ============================================= */
function tfToMinutes(tf) {
  if (tf.endsWith("min")) return parseInt(tf.replace("min", ""), 10);
  if (tf.endsWith("h")) return parseInt(tf.replace("h"), 10) * 60;
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
   Resample OHLC - FIXED: Group consecutive candles
   ============================================= */
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
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map(r => r.high)),
      low: Math.min(...group.map(r => r.low)),
      close: group[group.length - 1].close
    };
    
    result.push(resampled);
  }

  return result;
}

/* =============================================
   Detect Swing High / Swing Low
   ============================================= */
function detectSwings(rows, k) {
  const swingHighs = [];
  const swingLows = [];

  for (let i = k; i < rows.length - k; i++) {
    const pivot = rows[i];
    
    // Check if it's a swing high
    let isSwingHigh = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j !== i && rows[j].high >= pivot.high) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swingHighs.push(i);
    }

    // Check if it's a swing low
    let isSwingLow = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j !== i && rows[j].low <= pivot.low) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swingLows.push(i);
    }
  }

  return { swingHighs, swingLows };
}

/* =============================================
   MAIN COMPONENT
   ============================================= */
export default function SwingHighLowDashboard({ theme = "light" }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [tf, setTf] = useState("5min");
  const [pivotK, setPivotK] = useState(2);
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
    const { swingHighs, swingLows } = detectSwings(resampled, pivotK);

    const xIndex = resampled.map((_, i) => i);

    const data = [];

    // Main candles
    data.push({
      type: "candlestick",
      x: xIndex,
      open: resampled.map((r) => r.open),
      high: resampled.map((r) => r.high),
      low: resampled.map((r) => r.low),
      close: resampled.map((r) => r.close),
      name: `OHLC (${tf})`,
      customdata: resampled.map((r) => r.time),
      hovertemplate:
        "<b>%{customdata|%Y-%m-%d %H:%M}</b><br>" +
        "O: %{open:.2f} H: %{high:.2f}<br>" +
        "L: %{low:.2f} C: %{close:.2f}<extra></extra>",
    });

    // Swing High markers
    if (swingHighs.length) {
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: swingHighs,
        y: swingHighs.map((i) => resampled[i].high * 1.0002),
        marker: { color: "red", symbol: "triangle-down", size: 10 },
        text: swingHighs.map(() => "Swing High"),
        textposition: "top center",
        name: "Swing Highs",
        showlegend: true,
      });
    }

    // Swing Low markers
    if (swingLows.length) {
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: swingLows,
        y: swingLows.map((i) => resampled[i].low * 0.9998),
        marker: { color: "lime", symbol: "triangle-up", size: 10 },
        text: swingLows.map(() => "Swing Low"),
        textposition: "bottom center",
        name: "Swing Lows",
        showlegend: true,
      });
    }

    const baseLayout = {
      title: `Swing High & Swing Low Detection<br><span style="font-size:12px">k = ${pivotK} (pivot window: ${2*pivotK + 1} candles)</span>`,
      xaxis: {
        title: "Candle Index",
        type: "linear",
        rangeslider: { visible: false },
      },
      yaxis: { title: "Price" },
      height: 600,
    };

    setProcessed({ 
      data, 
      layout: baseLayout,
      stats: {
        swingHighCount: swingHighs.length,
        swingLowCount: swingLows.length,
        candles: resampled.length
      }
    });
  }

  const themedLayout = useMemo(() => {
    if (!processed) return null;
    const base = processed.layout || {};
    return {
      ...base,
      template: isDark ? "plotly_dark" : "plotly_white",
      paper_bgcolor: isDark ? "#111827" : "#ffffff",
      plot_bgcolor: isDark ? "#0f172a" : "#f8fafc",
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
      <h2 className="text-lg font-bold">Swing High / Swing Low (k-pivot)</h2>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">
            Choose CSV
          </label>
          <input type="file" accept=".csv" onChange={onFileUpload} />
        </div>

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
            {/* <option value="30min">30 min</option>
            <option value="1h">1 hour</option>
            <option value="4h">4 hour</option> */}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold">Pivot k:</label>
          <input
            type="number"
            min={1}
            max={20}
            value={pivotK}
            onChange={(e) => setPivotK(Number(e.target.value) || 2)}
            className={
              (isDark
                ? "bg-slate-900 border-slate-600 text-slate-100"
                : "bg-white border-gray-300 text-gray-900") +
              " px-2 py-1 rounded text-sm border w-16"
            }
          />
          <span className="text-xs text-gray-500">
            k = {pivotK} → window = {2 * pivotK + 1} bars
          </span>
        </div>

        <button
          onClick={runAnalysis}
          disabled={!rows.length}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          Detect Swings
        </button>
      </div>

      {/* Info */}
      {rows.length > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loaded {rows.length} 1-minute candles
        </p>
      )}

      {/* Stats */}
      {processed && (
        <div className="text-sm">
          <span className="font-semibold">Candles: {processed.stats.candles}</span> | 
          <span className="text-red-500 font-semibold ml-2">Swing Highs: {processed.stats.swingHighCount}</span> | 
          <span className="text-lime-500 font-semibold ml-2">Swing Lows: {processed.stats.swingLowCount}</span> | 
          <span className="text-gray-500 ml-2">k = {pivotK}</span>
        </div>
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
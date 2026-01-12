"use client";

import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import Papa from "papaparse";

// =============== Fibonacci State Machine ===============
const FibState = {
  WAITING_FOR_MIN_CANDLES: "WAITING_FOR_MIN_CANDLES",
  WAITING_FOR_OPPOSITE: "WAITING_FOR_OPPOSITE",
  ACTIVE: "ACTIVE",
  VALIDATED: "VALIDATED",
  STOPLOSS_HIT: "STOPLOSS_HIT",
  TARGET_HIT: "TARGET_HIT",
  INVALIDATED: "INVALIDATED",
  TIME_EXIT: "TIME_EXIT",
};

// =============== Timeframe Helpers ===============
function timeframeToMinutes(tf) {
  if (!tf) return 1;
  if (tf.endsWith("min")) return parseInt(tf.replace("min", ""), 10);
  if (tf.endsWith("h")) return parseInt(tf.replace("h", ""), 10) * 60;
  return 1;
}

// =============== Helpers for parsing ===============
function normKey(k) {
  return String(k || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findKeyByHints(row, hints) {
  const keys = Object.keys(row || {});
  const map = new Map(keys.map((k) => [normKey(k), k]));

  for (const h of hints) {
    const nk = normKey(h);
    if (map.has(nk)) return map.get(nk);
  }

  for (const k of keys) {
    const nk = normKey(k);
    for (const h of hints) {
      if (nk.includes(normKey(h))) return k;
    }
  }
  return null;
}

function parseHHMMSS(v) {
  if (v == null) return null;
  let s = String(v).trim();

  // numeric like 91559 -> pad to 6 digits => 091559
  if (/^\d+$/.test(s)) s = s.padStart(6, "0");

  if (/^\d{6}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  if (/^\d{1,2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;

  return null;
}

function inferDateFromFilename(fileName) {
  // examples: 20250107.csv, NIFTY_20250107.csv, data_20250107_anything.csv
  const m = String(fileName || "").match(/(\d{8})/);
  if (!m) return null;
  const s = m[1]; // YYYYMMDD
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`; // YYYY-MM-DD
}

function getOHLC(row) {
  const openKey = findKeyByHints(row, ["open", "o", "openprice"]);
  const highKey = findKeyByHints(row, ["high", "h", "highprice"]);
  const lowKey = findKeyByHints(row, ["low", "l", "lowprice"]);
  const closeKey = findKeyByHints(row, ["close", "c", "closeprice", "ltp"]);

  const open = openKey ? row[openKey] : null;
  const high = highKey ? row[highKey] : null;
  const low = lowKey ? row[lowKey] : null;
  const close = closeKey ? row[closeKey] : null;

  if (open == null || high == null || low == null || close == null) return null;

  const o = Number(open);
  const h = Number(high);
  const l = Number(low);
  const c = Number(close);

  if (![o, h, l, c].every((x) => Number.isFinite(x))) return null;
  return { open: o, high: h, low: l, close: c };
}

/**
 * ✅ MAIN FIX:
 * If CSV has only `time` (HHMMSS) and no date/datetime,
 * we build datetime using baseDate from filename (e.g., 20250107.csv).
 */
function parseDateTimeFromRow(row, baseDateISO) {
  // Try datetime column first (if exists)
  const dtKey = findKeyByHints(row, ["datetime", "date_time", "timestamp", "ts"]);
  if (dtKey) {
    const d = new Date(String(row[dtKey]).trim());
    if (!isNaN(d.getTime())) return { date: d, used: { mode: "datetime_col", dtKey } };
  }

  // Try split date+time if exists
  const dateKey = findKeyByHints(row, ["date", "dt", "day"]);
  const timeKey = findKeyByHints(row, ["time", "tm", "t"]);

  if (dateKey && timeKey) {
    const datePart = String(row[dateKey]).trim().replace(/\//g, "-");
    const timePart = parseHHMMSS(row[timeKey]);
    if (timePart) {
      const d = new Date(`${datePart}T${timePart}`);
      if (!isNaN(d.getTime())) return { date: d, used: { mode: "split_cols", dateKey, timeKey } };
    }
  }

  // ✅ Your format: only time column exists
  if (timeKey && baseDateISO) {
    const timePart = parseHHMMSS(row[timeKey]);
    if (timePart) {
      const d = new Date(`${baseDateISO}T${timePart}`);
      if (!isNaN(d.getTime())) return { date: d, used: { mode: "time_only+filename_date", timeKey } };
    }
  }

  return { date: null, used: { mode: "none" } };
}

// =============== CSV Parse ===============
function parseCsvToRows(file, onDone, onLog = () => {}) {
  const baseDateISO = inferDateFromFilename(file?.name);

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: (result) => {
      const fields = result?.meta?.fields || [];
      onLog(`Parsing CSV...\n`);
      onLog(`CSV headers: ${fields.join(", ")}\n`);
      onLog(`Filename date detected: ${baseDateISO || "NONE"}\n`);

      const first = result.data?.[0];
      if (first) onLog(`First row sample: ${JSON.stringify(first)}\n`);

      const rows = [];
      let usedInfo = null;
      let droppedNoTime = 0;
      let droppedNoOHLC = 0;

      for (const r of result.data || []) {
        const ohlc = getOHLC(r);
        if (!ohlc) {
          droppedNoOHLC++;
          continue;
        }

        const parsed = parseDateTimeFromRow(r, baseDateISO);
        const t = parsed.date;
        if (!t || isNaN(t.getTime())) {
          droppedNoTime++;
          continue;
        }

        if (!usedInfo) usedInfo = parsed.used;

        rows.push({ time: t, open: ohlc.open, high: ohlc.high, low: ohlc.low, close: ohlc.close });
      }

      rows.sort((a, b) => a.time - b.time);

      onLog(`Dropped rows (no OHLC): ${droppedNoOHLC}\n`);
      onLog(`Dropped rows (no datetime): ${droppedNoTime}\n`);
      onLog(`Datetime detection: ${usedInfo ? JSON.stringify(usedInfo) : "none"}\n`);

      const uniq = new Set(rows.map((x) => x.time.getTime()));
      onLog(`Unique timestamps: ${uniq.size}\n`);

      if (rows.length) {
        onLog(`✅ Parsed rows: ${rows.length}\n`);
        onLog(`Time range: ${rows[0].time.toISOString()} → ${rows[rows.length - 1].time.toISOString()}\n`);
      } else {
        onLog(`❌ Parsed rows: 0\n`);
        onLog(`➡️ If your filename does NOT contain YYYYMMDD, rename it like 20250107.csv\n`);
      }

      onDone(rows);
    },
    error: (err) => {
      onLog(`❌ CSV parse error: ${String(err)}\n`);
      onDone([]);
    },
  });
}

// =============== Resample OHLC (date-aware) ===============
function resampleOhlc(rows, timeframe) {
  const minutes = timeframeToMinutes(timeframe);
  if (minutes <= 1) return rows;

  const buckets = new Map();

  for (const r of rows) {
    const d = r.time;
    const bucketStart = new Date(d);
    bucketStart.setSeconds(0, 0);

    const m = bucketStart.getMinutes();
    const aligned = Math.floor(m / minutes) * minutes;
    bucketStart.setMinutes(aligned);

    const key = bucketStart.getTime();
    const b = buckets.get(key);

    if (!b) {
      buckets.set(key, {
        time: bucketStart,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
      });
    } else {
      b.high = Math.max(b.high, r.high);
      b.low = Math.min(b.low, r.low);
      b.close = r.close;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

// =============== ATR Calculation ===============
function calculateATR(rows, period = 14) {
  const atr = new Array(rows.length).fill(null);
  if (rows.length < period) return atr;

  for (let i = 1; i < rows.length; i++) {
    const tr1 = rows[i].high - rows[i].low;
    const tr2 = Math.abs(rows[i].high - rows[i - 1].close);
    const tr3 = Math.abs(rows[i].low - rows[i - 1].close);
    const tr = Math.max(tr1, tr2, tr3);

    if (i < period) {
      const slice = rows.slice(Math.max(0, i - period + 1), i + 1);
      let sum = 0;
      for (let k = 0; k < slice.length; k++) {
        if (k === 0) sum += slice[k].high - slice[k].low;
        else {
          const prev = slice[k - 1];
          const cur = slice[k];
          const t1 = cur.high - cur.low;
          const t2 = Math.abs(cur.high - prev.close);
          const t3 = Math.abs(cur.low - prev.close);
          sum += Math.max(t1, t2, t3);
        }
      }
      atr[i] = sum / Math.min(i + 1, period);
    } else {
      atr[i] = (atr[i - 1] * (period - 1) + tr) / period;
    }
  }
  return atr;
}

// =============== Swing Detection ===============
function detectSwings(rows, k) {
  const n = rows.length;
  const result = rows.map((r) => ({ ...r, isSwingHigh: false, isSwingLow: false }));
  if (n <= 2 * k) return result;

  for (let i = k; i < n - k; i++) {
    const pivotHigh = result[i].high;
    const pivotLow = result[i].low;

    let maxBefore = -Infinity;
    let maxAfter = -Infinity;
    let minBefore = Infinity;
    let minAfter = Infinity;

    for (let j = i - k; j < i; j++) {
      maxBefore = Math.max(maxBefore, result[j].high);
      minBefore = Math.min(minBefore, result[j].low);
    }
    for (let j = i + 1; j <= i + k; j++) {
      maxAfter = Math.max(maxAfter, result[j].high);
      minAfter = Math.min(minAfter, result[j].low);
    }

    if (pivotHigh > maxBefore && pivotHigh > maxAfter) result[i].isSwingHigh = true;
    if (pivotLow < minBefore && pivotLow < minAfter) result[i].isSwingLow = true;
  }
  return result;
}

// =============== Fibonacci Leg Class (same logic as yours) ===============
class FibonacciLeg {
  constructor(legId, anchorSeq, anchorPrice, minGap, atrValue, timeExitMinutes) {
    this.legId = legId;
    this.anchorSeq = anchorSeq;
    this.anchorPrice = anchorPrice;
    this.minGap = minGap;
    this.atrValue = atrValue;
    this.timeExitMinutes = timeExitMinutes;

    this.oppositeSeq = null;
    this.oppositePrice = null;
    this.currentExtremeSeq = null;
    this.currentExtremePrice = null;

    this.state = FibState.WAITING_FOR_MIN_CANDLES;
    this.minGapSatisfiedSeq = this.anchorSeq + this.minGap;

    this.validationInfo = { enteredGoldenZone: false, goldenZoneEntrySeq: null, isValidFib: false };

    this.entrySeq = null;
    this.entryPrice = null;
    this.entryDt = null;

    this.stoplossSeq = null;
    this.stoplossPrice = null;
    this.targetSeq = null;
    this.targetPrice = null;
    this.timeExitSeq = null;
    this.timeExitPrice = null;

    this.invalidationSeq = null;
    this.invalidationReason = null;

    this.qualityRejected = false;
    this.qualityRejectionReason = null;

    this.lockedExtreme = false;
  }

  getFibLevels() {
    if (this.currentExtremePrice === null) return {};
    const range = this.currentExtremePrice - this.anchorPrice;
    return {
      0: this.anchorPrice,
      0.236: this.anchorPrice + range * 0.236,
      0.382: this.anchorPrice + range * 0.382,
      0.5: this.anchorPrice + range * 0.5,
      0.618: this.anchorPrice + range * 0.618,
      0.786: this.anchorPrice + range * 0.786,
      1.0: this.currentExtremePrice,
      1.5: this.anchorPrice + range * 1.5,
      1.6: this.anchorPrice + range * 1.6,
    };
  }

  checkQualityFilters(minPriceMovementPercent, minPriceMovementPoints, minATRMultiplier) {
    if (this.currentExtremePrice === null) return true;

    const move = this.currentExtremePrice - this.anchorPrice;
    const percentMove = (Math.abs(move) / Math.abs(this.anchorPrice)) * 100;

    if (percentMove < minPriceMovementPercent) {
      this.qualityRejected = true;
      this.qualityRejectionReason = `Price move too small: ${percentMove.toFixed(2)}%`;
      return false;
    }
    if (Math.abs(move) < minPriceMovementPoints) {
      this.qualityRejected = true;
      this.qualityRejectionReason = `Absolute move too small: ${Math.abs(move).toFixed(2)} points`;
      return false;
    }
    if (this.atrValue && this.atrValue > 0) {
      const atrMult = Math.abs(move) / this.atrValue;
      if (atrMult < minATRMultiplier) {
        this.qualityRejected = true;
        this.qualityRejectionReason = `Move too small vs ATR: ${atrMult.toFixed(2)}x`;
        return false;
      }
    }
    return true;
  }

  isTimeExitCandle(candleDt) {
    if (!candleDt || !this.entryDt) return false;
    if (candleDt.toDateString() !== this.entryDt.toDateString()) return false;
    const curMinutes = candleDt.getHours() * 60 + candleDt.getMinutes();
    return curMinutes >= this.timeExitMinutes;
  }

  updateCandle(
    seq,
    open,
    high,
    low,
    close,
    isPivotHigh,
    isPivotLow,
    candleDt,
    shiftAnchorEnabled,
    requireBodyInGoldenZone,
    minPriceMovementPercent,
    minPriceMovementPoints,
    minATRMultiplier
  ) {
    if ([FibState.INVALIDATED, FibState.STOPLOSS_HIT, FibState.TARGET_HIT, FibState.TIME_EXIT].includes(this.state)) {
      return false;
    }

    // Anchor shift before opposite pivot
    if (shiftAnchorEnabled && this.oppositeSeq === null) {
      if (low < this.anchorPrice) {
        this.anchorSeq = seq;
        this.anchorPrice = low;
        this.state = FibState.WAITING_FOR_MIN_CANDLES;
        this.minGapSatisfiedSeq = this.anchorSeq + this.minGap;
        this.oppositeSeq = null;
        this.oppositePrice = null;
        this.currentExtremeSeq = null;
        this.currentExtremePrice = null;
        this.validationInfo = { enteredGoldenZone: false, goldenZoneEntrySeq: null, isValidFib: false };
        return true;
      }
    }

    if (this.state === FibState.WAITING_FOR_MIN_CANDLES) {
      if (seq >= this.minGapSatisfiedSeq) this.state = FibState.WAITING_FOR_OPPOSITE;
      return true;
    }

    if (this.state === FibState.WAITING_FOR_OPPOSITE) {
      if (isPivotHigh && high > this.anchorPrice) {
        this.oppositeSeq = seq;
        this.oppositePrice = high;
        this.currentExtremeSeq = seq;
        this.currentExtremePrice = high;

        if (!this.checkQualityFilters(minPriceMovementPercent, minPriceMovementPoints, minATRMultiplier)) {
          this.state = FibState.INVALIDATED;
          this.invalidationSeq = seq;
          this.invalidationReason = `QUALITY: ${this.qualityRejectionReason}`;
          return false;
        }

        this.state = FibState.ACTIVE;
      }
      return true;
    }

    if ([FibState.ACTIVE, FibState.VALIDATED].includes(this.state)) {
      const allowExtremeUpdates = this.entrySeq === null;
      if (allowExtremeUpdates && !this.lockedExtreme) {
        if (this.currentExtremePrice !== null && isPivotHigh && high > this.currentExtremePrice) {
          this.currentExtremeSeq = seq;
          this.currentExtremePrice = high;
          if (this.validationInfo.enteredGoldenZone && this.entrySeq === null) {
            this.validationInfo = { enteredGoldenZone: false, goldenZoneEntrySeq: null, isValidFib: false };
            this.state = FibState.ACTIVE;
          }
        }
      }

      const fib = this.getFibLevels();
      if (!fib[0.382] || !fib[0.618]) return true;

      const lvl0 = fib[0];
      const lvl0382 = fib[0.382];
      const lvl0618 = fib[0.618];
      const lvl0786 = fib[0.786];
      const lvl1 = fib[1.0];
      const lvl15 = fib[1.5];
      const lvl16 = fib[1.6];

      // Before GZ invalidation
      if (!this.validationInfo.enteredGoldenZone) {
        if (low < lvl0382 || low < this.anchorPrice || close < lvl0382) {
          this.state = FibState.INVALIDATED;
          this.invalidationSeq = seq;
          this.invalidationReason = "Invalid before GZ";
          return false;
        }
      }

      // Golden zone touch
      if (!this.validationInfo.enteredGoldenZone) {
        const gzLow = Math.min(lvl0382, lvl0618);
        const gzHigh = Math.max(lvl0382, lvl0618);
        const crossed382 = low < lvl0382;

        if (!crossed382) {
          let touched = false;
          if (requireBodyInGoldenZone) {
            const bodyHi = Math.max(open, close);
            const bodyLo = Math.min(open, close);
            touched = bodyLo <= gzHigh && bodyHi >= gzLow;
          } else {
            touched = low <= gzHigh && high >= gzLow;
          }

          if (touched) {
            this.validationInfo.enteredGoldenZone = true;
            this.validationInfo.goldenZoneEntrySeq = seq;
            this.validationInfo.isValidFib = true;
            this.state = FibState.VALIDATED;
          }
        }
      }

      // After GZ
      if (this.validationInfo.enteredGoldenZone) {
        // before entry invalidation
        if (this.entrySeq == null) {
          const zLow = Math.min(lvl0, lvl0382);
          const zHigh = Math.max(lvl0, lvl0382);
          const closeInZone = close >= zLow && close <= zHigh;
          const crossed0 = low < lvl0;
          if (closeInZone || crossed0) {
            this.state = FibState.INVALIDATED;
            this.invalidationSeq = seq;
            this.invalidationReason = "Invalid after GZ";
            return false;
          }
        }

        // entry
        if (this.entrySeq == null && lvl0786 && lvl1) {
          const entryLow = Math.min(lvl0786, lvl1);
          const entryHigh = Math.max(lvl0786, lvl1);
          const closeInEntry = close >= entryLow && close <= entryHigh;

          if (closeInEntry && seq !== this.anchorSeq && seq !== this.oppositeSeq && seq !== this.currentExtremeSeq) {
            this.entrySeq = seq;
            this.entryPrice = close;
            this.entryDt = candleDt;
            this.lockedExtreme = true;
          }
        }

        // stoploss / target / timeexit after entry
        if (this.entrySeq != null) {
          const zLow = Math.min(lvl0, lvl0382);
          const zHigh = Math.max(lvl0, lvl0382);
          const closeInZone = close >= zLow && close <= zHigh;
          const crossed0 = low < lvl0;

          if (this.stoplossSeq == null && (closeInZone || crossed0)) {
            this.stoplossSeq = seq;
            this.stoplossPrice = close;
            this.state = FibState.STOPLOSS_HIT;
            return false;
          }

          if (this.targetSeq == null && lvl15 && lvl16) {
            const tLow = Math.min(lvl15, lvl16);
            const tHigh = Math.max(lvl15, lvl16);
            if (low <= tHigh && high >= tLow) {
              this.targetSeq = seq;
              this.targetPrice = (low + high) / 2;
              this.state = FibState.TARGET_HIT;
              return false;
            }
          }

          if (this.stoplossSeq == null && this.targetSeq == null && this.isTimeExitCandle(candleDt)) {
            this.timeExitSeq = seq;
            this.timeExitPrice = close;
            this.state = FibState.TIME_EXIT;
            return false;
          }
        }
      }

      return true;
    }

    return true;
  }

  tradePnLPoints() {
    if (this.entrySeq == null || this.entryPrice == null) return null;
    if (this.state === FibState.TARGET_HIT && this.targetSeq != null) return this.targetPrice - this.entryPrice;
    if (this.state === FibState.STOPLOSS_HIT && this.stoplossSeq != null) return this.stoplossPrice - this.entryPrice;
    if (this.state === FibState.TIME_EXIT && this.timeExitSeq != null) return this.timeExitPrice - this.entryPrice;
    return null;
  }
}

// =============== Simulation ===============
function simulateProfessionalFibonacci(
  rows,
  pivotK,
  minGap,
  timeExitMinutes,
  shiftAnchorEnabled,
  requireBodyInGoldenZone,
  minPriceMovementPercent,
  minPriceMovementPoints,
  minATRMultiplier
) {
  const atr = calculateATR(rows, 14);
  const legs = [];
  let currentLeg = null;
  let legId = 1;

  for (let i = pivotK; i < rows.length - pivotK; i++) {
    const row = rows[i];
    const seq = i;

    if (currentLeg === null) {
      if (row.isSwingLow) currentLeg = new FibonacciLeg(legId++, seq, row.low, minGap, atr[i], timeExitMinutes);
    }

    if (currentLeg !== null) {
      const alive = currentLeg.updateCandle(
        seq,
        row.open,
        row.high,
        row.low,
        row.close,
        row.isSwingHigh,
        row.isSwingLow,
        row.time,
        shiftAnchorEnabled,
        requireBodyInGoldenZone,
        minPriceMovementPercent,
        minPriceMovementPoints,
        minATRMultiplier
      );

      if (!alive) {
        if (!currentLeg.qualityRejected) legs.push(currentLeg);
        currentLeg = null;
      }
    }
  }

  if (currentLeg !== null && !currentLeg.qualityRejected) legs.push(currentLeg);
  return legs;
}

// =============== Chart Building (basic) ===============
function buildChart(rows, legs, isDark = false) {
  if (!rows.length) return { data: [], layout: {} };

  const x = rows.map((_, i) => i);

  const data = [
    {
      type: "candlestick",
      x,
      open: rows.map((r) => r.open),
      high: rows.map((r) => r.high),
      low: rows.map((r) => r.low),
      close: rows.map((r) => r.close),
      name: "Candles",
      increasing: { line: { color: "#26a69a" } },
      decreasing: { line: { color: "#ef5350" } },
    },
  ];

  const trades = legs.map((l) => l.tradePnLPoints()).filter((p) => p !== null);
  const totalProfit = trades.filter((x) => x > 0).reduce((a, b) => a + b, 0);
  const totalLoss = trades.filter((x) => x < 0).reduce((a, b) => a + Math.abs(b), 0);
  const net = trades.reduce((a, b) => a + b, 0);

  const layout = {
    title: { text: `Professional Fibonacci System | Net=${net.toFixed(2)} | Profit=${totalProfit.toFixed(2)} | Loss=${totalLoss.toFixed(2)}` },
    xaxis: { title: "Candle Index", rangeslider: { visible: false } },
    yaxis: { title: "Price" },
    plot_bgcolor: isDark ? "#1f2937" : "#ffffff",
    paper_bgcolor: isDark ? "#111827" : "#ffffff",
    font: { color: isDark ? "#e5e7eb" : "#111827" },
    height: 900,
  };

  return { data, layout };
}

// =============== Main Component ===============
export default function ProfessionalFibonacciSystem() {
  const [file, setFile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [resampleTf, setResampleTf] = useState("5min");
  const [pivotK, setPivotK] = useState(2);
  const [minGap, setMinGap] = useState(2);

  const [shiftAnchor, setShiftAnchor] = useState(true);
  const [requireBodyInGZ, setRequireBodyInGZ] = useState(false);
  const [minPriceMovePct, setMinPriceMovePct] = useState(0.1);
  const [minPriceMovePoints, setMinPriceMovePoints] = useState(10);
  const [minATRMult, setMinATRMult] = useState(0.8);

  const [timeExitHour, setTimeExitHour] = useState(15);
  const [timeExitMinute, setTimeExitMinute] = useState(15);

  const [processed, setProcessed] = useState(null);
  const [logs, setLogs] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setProcessed(null);
    setLogs("");
  }

  function handleRun() {
    if (!file) {
      alert("Upload a CSV first.");
      return;
    }

    setLogs("");

    parseCsvToRows(
      file,
      (rawRows) => {
        if (!rawRows.length) return;

        setLogs((l) => l + `Loaded ${rawRows.length} rows\n`);

        const resampled = resampleOhlc(rawRows, resampleTf);
        setLogs((l) => l + `Resampled to ${resampled.length} candles (${resampleTf})\n`);

        const swings = detectSwings(resampled, Number(pivotK));

        const timeExitMinutes = Number(timeExitHour) * 60 + Number(timeExitMinute);

        const legs = simulateProfessionalFibonacci(
          swings,
          Number(pivotK),
          Number(minGap),
          timeExitMinutes,
          shiftAnchor,
          requireBodyInGZ,
          Number(minPriceMovePct),
          Number(minPriceMovePoints),
          Number(minATRMult)
        );

        const { data, layout } = buildChart(swings, legs, isDarkMode);
        setProcessed({ data, layout });
      },
      (msg) => setLogs((l) => l + msg)
    );
  }

  const chart = useMemo(() => {
    if (!processed) return null;
    return (
      <Plot
        data={processed.data}
        layout={processed.layout}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler={true}
        config={{ displayModeBar: true, responsive: true }}
      />
    );
  }, [processed]);

  const bgColor = isDarkMode ? "bg-gray-900" : "bg-white";
  const textColor = isDarkMode ? "text-gray-100" : "text-gray-900";
  const borderColor = isDarkMode ? "border-gray-700" : "border-gray-300";
  const inputBg = isDarkMode ? "bg-gray-800" : "bg-white";
  const logsBg = isDarkMode ? "bg-gray-800" : "bg-gray-100";

  return (
    <div className={`p-4 space-y-4 max-w-7xl mx-auto w-full ${bgColor} ${textColor} min-h-screen`}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Professional Fibonacci System (UPTREND)</h2>
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`px-3 py-1 rounded text-sm ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"}`}
        >
          {isDarkMode ? "🌞 Light" : "🌙 Dark"}
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleFileChange} className="block text-sm" />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Timeframe</label>
          <select
            value={resampleTf}
            onChange={(e) => setResampleTf(e.target.value)}
            className={`${inputBg} border ${borderColor} ${textColor} px-2 py-1 text-sm rounded`}
          >
            <option value="1min">1min</option>
            <option value="5min">5min</option>
            <option value="10min">10min</option>
            <option value="15min">15min</option>
            <option value="30min">30min</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
          </select>
        </div>

        <button type="button" onClick={handleRun} className="bg-blue-600 text-white text-sm px-4 py-2 rounded shadow hover:bg-blue-700">
          Run Analysis
        </button>
      </div>

      <div className={`${logsBg} border ${borderColor} text-xs whitespace-pre-wrap p-2 rounded max-h-40 overflow-auto`}>
        {logs || "Logs will appear here…"}
      </div>

      <div className="mt-4">{chart}</div>
    </div>
  );
}

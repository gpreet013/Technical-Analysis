// import React, { useState, useMemo } from 'react';
// import Plot from 'react-plotly.js';
// import { Upload, TrendingUp, Settings, BarChart3 } from 'lucide-react';

// export default function ZigZagDashboard({ theme = "light" }) {
//   const [csvData, setCsvData] = useState(null);
//   const [baseDate, setBaseDate] = useState('20250111');
//   const [priceDeviation, setPriceDeviation] = useState(5.0);
//   const [pivotLegs, setPivotLegs] = useState(5);
//   const [selectedSymbol, setSelectedSymbol] = useState('');
//   const [processedData, setProcessedData] = useState(null);
//   const [fileName, setFileName] = useState('');
  
//   // Toggle states for chart visibility
//   const [showZigZag, setShowZigZag] = useState(true);
//   const [showSwingHighs, setShowSwingHighs] = useState(true);
//   const [showSwingLows, setShowSwingLows] = useState(true);
//   const [showMiniChart, setShowMiniChart] = useState(false);

//   const isDark = theme === "dark";
//   const cardClass =
//     (isDark ? "bg-slate-800 border-slate-700" : "bg-white border-blue-100") +
//     " rounded-lg shadow-sm p-3 mb-3 border";

//   // Parse CSV file
//   const handleFileUpload = (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     setFileName(file.name);
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const text = e.target.result;
//       const lines = text.trim().split('\n');
//       const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
//       const data = lines.slice(1).map(line => {
//         const values = line.split(',');
//         const row = {};
//         headers.forEach((header, i) => {
//           row[header] = values[i]?.trim();
//         });
//         return row;
//       });

//       setCsvData(data);
//       if (data.length > 0) {
//         setSelectedSymbol(data[0].symbol);
//       }
//     };
//     reader.readAsText(file);
//   };

//   const convertToDateTime = (time, baseDate) => {
//     const timeStr = time.toString().padStart(6, '0');
//     const hour = timeStr.slice(0, 2);
//     const minute = timeStr.slice(2, 4);
//     const second = timeStr.slice(4, 6);
//     const year = baseDate.slice(0, 4);
//     const month = baseDate.slice(4, 6);
//     const day = baseDate.slice(6, 8);
//     return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
//   };

//   // Resample to 5-minute OHLC
//   const resampleTo5Min = (data) => {
//     const buckets = new Map();

//     data.forEach(d => {
//       const dt = new Date(d.datetime);
//       dt.setSeconds(0, 0);
//       const bucketMin = Math.floor(dt.getMinutes() / 5) * 5;
//       dt.setMinutes(bucketMin);

//       const key = dt.getTime();
//       const existing = buckets.get(key);

//       if (!existing) {
//         buckets.set(key, {
//           ...d,
//           datetime: dt,
//           open: d.open,
//           high: d.high,
//           low: d.low,
//           close: d.close,
//         });
//       } else {
//         existing.high = Math.max(existing.high, d.high);
//         existing.low = Math.min(existing.low, d.low);
//         existing.close = d.close;
//       }
//     });

//     return Array.from(buckets.values()).sort((a, b) => a.datetime - b.datetime);
//   };

//   // Detect swing highs and lows
//   const detectPivots = (data, k) => {
//     const n = data.length;
//     const result = data.map(d => ({ ...d, swingHigh: false, swingLow: false }));

//     for (let i = k; i < n - k; i++) {
//       const highWindow = data.slice(i - k, i + k + 1).map(d => parseFloat(d.high));
//       if (parseFloat(data[i].high) === Math.max(...highWindow)) {
//         result[i].swingHigh = true;
//       }

//       const lowWindow = data.slice(i - k, i + k + 1).map(d => parseFloat(d.low));
//       if (parseFloat(data[i].low) === Math.min(...lowWindow)) {
//         result[i].swingLow = true;
//       }
//     }

//     return result;
//   };

//   // Build Zig Zag
//   const buildZigZag = (data, deviationPct) => {
//     const highs = data.filter(d => d.swingHigh);
//     const lows = data.filter(d => d.swingLow);

//     if (highs.length === 0 || lows.length === 0) return [];

//     const zigzagPoints = [];
    
//     const firstHighIdx = data.findIndex(d => d.swingHigh);
//     const firstLowIdx = data.findIndex(d => d.swingLow);
    
//     let lastPivot, lookingFor;
    
//     if (firstHighIdx < firstLowIdx) {
//       lastPivot = { type: 'high', idx: firstHighIdx, price: parseFloat(data[firstHighIdx].high) };
//       lookingFor = 'low';
//       zigzagPoints.push({ ...data[firstHighIdx], price: lastPivot.price, type: 'high', idx: firstHighIdx });
//     } else {
//       lastPivot = { type: 'low', idx: firstLowIdx, price: parseFloat(data[firstLowIdx].low) };
//       lookingFor = 'high';
//       zigzagPoints.push({ ...data[firstLowIdx], price: lastPivot.price, type: 'low', idx: firstLowIdx });
//     }

//     while (true) {
//       if (lookingFor === 'low') {
//         const candidates = data.filter((d, idx) => d.swingLow && idx > lastPivot.idx);
//         if (candidates.length === 0) break;

//         let bestCandidate = null;
//         for (const candidate of candidates) {
//           const idx = data.indexOf(candidate);
//           const price = parseFloat(candidate.low);
//           const pctChange = Math.abs((price - lastPivot.price) / lastPivot.price * 100);

//           if (pctChange >= deviationPct) {
//             if (!bestCandidate || price < bestCandidate.price) {
//               bestCandidate = { type: 'low', idx, price, data: candidate };
//             }
//           }
//         }

//         if (!bestCandidate) break;

//         zigzagPoints.push({ ...bestCandidate.data, price: bestCandidate.price, type: 'low', idx: bestCandidate.idx });
//         lastPivot = bestCandidate;
//         lookingFor = 'high';
//       } else {
//         const candidates = data.filter((d, idx) => d.swingHigh && idx > lastPivot.idx);
//         if (candidates.length === 0) break;

//         let bestCandidate = null;
//         for (const candidate of candidates) {
//           const idx = data.indexOf(candidate);
//           const price = parseFloat(candidate.high);
//           const pctChange = Math.abs((price - lastPivot.price) / lastPivot.price * 100);

//           if (pctChange >= deviationPct) {
//             if (!bestCandidate || price > bestCandidate.price) {
//               bestCandidate = { type: 'high', idx, price, data: candidate };
//             }
//           }
//         }

//         if (!bestCandidate) break;

//         zigzagPoints.push({ ...bestCandidate.data, price: bestCandidate.price, type: 'high', idx: bestCandidate.idx });
//         lastPivot = bestCandidate;
//         lookingFor = 'low';
//       }
//     }

//     return zigzagPoints;
//   };

//   // Process data
//   const processData = () => {
//     if (!csvData || !selectedSymbol) return;

//     let symbolData = csvData.filter(d => d.symbol === selectedSymbol);
    
//     symbolData = symbolData.map(d => ({
//       ...d,
//       datetime: convertToDateTime(d.time, baseDate),
//       open: parseFloat(d.open),
//       high: parseFloat(d.high),
//       low: parseFloat(d.low),
//       close: parseFloat(d.close)
//     }));

//     symbolData.sort((a, b) => a.datetime - b.datetime);

//     const resampledData = resampleTo5Min(symbolData);

//     const withPivots = detectPivots(resampledData, pivotLegs);
//     const zigzagPoints = buildZigZag(withPivots, priceDeviation);

//     setProcessedData({
//       rawData: withPivots,
//       zigzagPoints,
//       swingHighs: withPivots.filter(d => d.swingHigh).length,
//       swingLows: withPivots.filter(d => d.swingLow).length
//     });
//   };

//   // Plot data
//   const plotlyData = useMemo(() => {
//     if (!processedData) return [];

//     const { rawData, zigzagPoints } = processedData;
//     const traces = [];

//     traces.push({
//       type: 'candlestick',
//       x: rawData.map(d => d.datetime),
//       open: rawData.map(d => d.open),
//       high: rawData.map(d => d.high),
//       low: rawData.map(d => d.low),
//       close: rawData.map(d => d.close),
//       name: 'OHLC (5-min)',
//       increasing: { line: { color: '#22c55e' } },
//       decreasing: { line: { color: '#ef4444' } },
//       hoverinfo: 'x+y',
//       customdata: rawData.map(d => [d.open, d.high, d.low, d.close]),
//       hovertemplate:
//         '<b>%{x|%H:%M:%S}</b><br>O:%{customdata[0]:.2f} H:%{customdata[1]:.2f}<br>L:%{customdata[2]:.2f} C:%{customdata[3]:.2f}<extra></extra>'
//     });

//     if (showZigZag && zigzagPoints.length > 0) {
//       traces.push({
//         type: 'scatter',
//         mode: 'lines+markers',
//         x: zigzagPoints.map(p => rawData[p.idx].datetime),
//         y: zigzagPoints.map(p => p.price),
//         name: 'Zig Zag',
//         line: { color: '#8b5cf6', width: 2 },
//         marker: { size: 6, color: '#8b5cf6' },
//         hovertemplate: '<b>%{x|%H:%M:%S}</b><br>Price: %{y:.2f}<extra></extra>'
//       });
//     }

//     if (showSwingHighs) {
//       const swingHighData = rawData.filter(d => d.swingHigh);
//       if (swingHighData.length > 0) {
//         traces.push({
//           type: 'scatter',
//           mode: 'markers',
//           x: swingHighData.map(d => d.datetime),
//           y: swingHighData.map(d => d.high),
//           name: 'Swing High',
//           marker: {
//             symbol: 'triangle-down',
//             size: 12,
//             color: '#ef4444',
//             line: { color: '#dc2626', width: 1 }
//           },
//           hovertemplate: '<b>Swing High</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>'
//         });
//       }
//     }

//     if (showSwingLows) {
//       const swingLowData = rawData.filter(d => d.swingLow);
//       if (swingLowData.length > 0) {
//         traces.push({
//           type: 'scatter',
//           mode: 'markers',
//           x: swingLowData.map(d => d.datetime),
//           y: swingLowData.map(d => d.low),
//           name: 'Swing Low',
//           marker: {
//             symbol: 'triangle-up',
//             size: 12,
//             color: '#22c55e',
//             line: { color: '#16a34a', width: 1 }
//           },
//           hovertemplate: '<b>Swing Low</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>'
//         });
//       }
//     }

//     return traces;
//   }, [processedData, showZigZag, showSwingHighs, showSwingLows]);

//   const miniChartData = useMemo(() => {
//     if (!processedData || !showMiniChart) return [];
//     const { rawData, zigzagPoints } = processedData;
//     if (zigzagPoints.length === 0) return [];

//     return [
//       {
//         type: 'scatter',
//         mode: 'lines+markers',
//         x: zigzagPoints.map(p => rawData[p.idx].datetime),
//         y: zigzagPoints.map(p => p.price),
//         name: 'Zig Zag',
//         line: { color: '#8b5cf6', width: 2 },
//         marker: { size: 6, color: '#8b5cf6' }
//       }
//     ];
//   }, [processedData, showMiniChart]);

//   const mainLayout = {
//     title: `${selectedSymbol || 'Symbol'} - 5m Candlestick with Zig Zag`,
//     xaxis: {
//       type: 'date',
//       rangeslider: { visible: true },
//       tickformat: '%H:%M'
//     },
//     yaxis: { title: 'Price', autorange: true },
//     hovermode: 'x unified',
//     showlegend: true,
//     legend: { x: 0, y: 1 },
//     margin: { l: 50, r: 50, t: 50, b: 50 },
//     template: isDark ? "plotly_dark" : "plotly_white",
//     paper_bgcolor: isDark ? "#111111" : "#ffffff",
//     plot_bgcolor: isDark ? "#000000" : "#f8fafc",
//   };

//   const miniLayout = {
//     title: 'Zig Zag Only',
//     xaxis: { type: 'date', tickformat: '%H:%M' },
//     yaxis: { title: 'Price', autorange: true },
//     showlegend: false,
//     margin: { l: 50, r: 50, t: 40, b: 40 },
//     template: isDark ? "plotly_dark" : "plotly_white",
//     paper_bgcolor: isDark ? "#111111" : "#ffffff",
//     plot_bgcolor: isDark ? "#000000" : "#f8fafc",
//   };

//   const plotConfig = {
//     scrollZoom: true,
//     displaylogo: false,
//     responsive: true,
//     modeBarButtonsToAdd: ['drawline', 'eraseshape'],
//     toImageButtonOptions: {
//       format: 'png',
//       filename: `${selectedSymbol}_zigzag_5min`,
//       height: 1080,
//       width: 1920,
//       scale: 2
//     }
//   };

//   const symbols = csvData ? [...new Set(csvData.map(d => d.symbol))] : [];

//   return (
//     <div className="max-w-6xl mx-auto w-full">
//       {/* Header */}
//       <div className={cardClass}>
//         <div className="flex items-center gap-2">
//           <div className="p-1.5 bg-blue-600 rounded-md">
//             <TrendingUp className="w-4 h-4 text-white" />
//           </div>
//           <div>
//             <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
//               Technical Analysis Dashboard
//             </h1>
//             <p className="text-xs text-slate-300">
//               5-min resampled candlestick analysis with Zig Zag
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* File Upload */}
//       <div className={cardClass}>
//         <label className="flex flex-col items-center justify-center w-full h-20 px-3 border-2 border-dashed border-blue-300 rounded-md cursor-pointer hover:bg-blue-50/20 transition-all duration-300 hover:border-blue-400">
//           <div className="flex flex-col items-center">
//             <Upload className="w-6 h-6 text-blue-500 mb-1" />
//             <span className="text-xs font-medium text-gray-200">
//               {fileName ? `✓ ${fileName}` : 'Upload CSV File'}
//             </span>
//             <span className="text-[10px] text-gray-400">
//               {csvData ? `${csvData.length} rows loaded` : 'Columns: symbol, time, open, high, low, close (1-min)'}
//             </span>
//           </div>
//           <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
//         </label>
//       </div>

//       {csvData && (
//         <>
//           {/* Parameters */}
//           <div className={cardClass}>
//             <div className="flex items-center gap-2 mb-3">
//               <Settings className="w-4 h-4 text-blue-400" />
//               <h2 className="text-sm font-bold text-gray-100">Configuration</h2>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
//               <div>
//                 <label className="block text-sm font-semibold text-gray-200 mb-1">
//                   Base Date (YYYYMMDD)
//                 </label>
//                 <input
//                   type="text"
//                   value={baseDate}
//                   onChange={(e) => setBaseDate(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
//                   placeholder="20250111"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-200 mb-1">
//                   Price Deviation (%)
//                 </label>
//                 <input
//                   type="number"
//                   value={priceDeviation}
//                   onChange={(e) => setPriceDeviation(parseFloat(e.target.value))}
//                   step="0.1"
//                   className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-200 mb-1">
//                   Pivot Legs (k)
//                 </label>
//                 <input
//                   type="number"
//                   value={pivotLegs}
//                   onChange={(e) => setPivotLegs(parseInt(e.target.value))}
//                   min="1"
//                   className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-200 mb-1">
//                   Symbol
//                 </label>
//                 <select
//                   value={selectedSymbol}
//                   onChange={(e) => setSelectedSymbol(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
//                 >
//                   {symbols.map(sym => (
//                     <option key={sym} value={sym}>{sym}</option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <button
//               onClick={processData}
//               className="w-full md:w-auto px-4 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
//             >
//               <BarChart3 className="w-3.5 h-3.5" />
//               Generate Analysis (5-min)
//             </button>
//           </div>

//           {/* Statistics */}
//           {processedData && (
//             <div className={cardClass}>
//               <h3 className="text-xs font-bold text-gray-100 mb-2">
//                 Statistics (5-min bars)
//               </h3>
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
//                 <div className="bg-blue-900/40 rounded-md p-2 border border-blue-500/40">
//                   <div className="text-xl font-bold text-blue-300">
//                     {processedData.rawData.length}
//                   </div>
//                   <div className="text-[10px] text-gray-300 font-medium">
//                     Total 5-min Candles
//                   </div>
//                 </div>
//                 <div className="bg-red-900/40 rounded-md p-2 border border-red-500/40">
//                   <div className="text-xl font-bold text-red-300">
//                     {processedData.swingHighs}
//                   </div>
//                   <div className="text-[10px] text-gray-300 font-medium">
//                     Swing Highs
//                   </div>
//                 </div>
//                 <div className="bg-green-900/40 rounded-md p-2 border border-green-500/40">
//                   <div className="text-xl font-bold text-green-300">
//                     {processedData.swingLows}
//                   </div>
//                   <div className="text-[10px] text-gray-300 font-medium">
//                     Swing Lows
//                   </div>
//                 </div>
//                 <div className="bg-purple-900/40 rounded-md p-2 border border-purple-500/40">
//                   <div className="text-xl font-bold text-purple-300">
//                     {processedData.zigzagPoints.length}
//                   </div>
//                   <div className="text-[10px] text-gray-300 font-medium">
//                     Zig Zag Points
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Chart Controls */}
//           {processedData && (
//             <div className={cardClass}>
//               <h3 className="text-xs font-bold text-gray-100 mb-2">
//                 Chart Controls
//               </h3>
//               <div className="flex flex-wrap gap-3">
//                 <label className="flex items-center gap-1.5 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={showZigZag}
//                     onChange={(e) => setShowZigZag(e.target.checked)}
//                     className="w-3.5 h-3.5 text-blue-600 rounded"
//                   />
//                   <span className="text-xs font-medium text-gray-100">
//                     Show Zig Zag
//                   </span>
//                 </label>
//                 <label className="flex items-center gap-1.5 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={showSwingHighs}
//                     onChange={(e) => setShowSwingHighs(e.target.checked)}
//                     className="w-3.5 h-3.5 text-blue-600 rounded"
//                   />
//                   <span className="text-xs font-medium text-gray-100">
//                     Show Swing Highs
//                   </span>
//                 </label>
//                 <label className="flex items-center gap-1.5 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={showSwingLows}
//                     onChange={(e) => setShowSwingLows(e.target.checked)}
//                     className="w-3.5 h-3.5 text-blue-600 rounded"
//                   />
//                   <span className="text-xs font-medium text-gray-100">
//                     Show Swing Lows
//                   </span>
//                 </label>
//                 <label className="flex items-center gap-1.5 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={showMiniChart}
//                     onChange={(e) => setShowMiniChart(e.target.checked)}
//                     className="w-3.5 h-3.5 text-blue-600 rounded"
//                   />
//                   <span className="text-xs font-medium text-gray-100">
//                     Show Mini Chart
//                   </span>
//                 </label>
//               </div>
//             </div>
//           )}

//           {/* Main chart */}
//           {processedData && (
//             <div className={cardClass}>
//               <div className="flex justify-between items-center mb-2">
//                 <h2 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
//                   <BarChart3 className="w-3.5 h-3.5" />
//                   5-min Candlestick Chart with Indicators
//                 </h2>
//               </div>
//               <div className="w-full h-[70vh]">
//                 <Plot
//                   data={plotlyData}
//                   layout={mainLayout}
//                   config={plotConfig}
//                   style={{ width: "100%", height: "100%" }}
//                   useResizeHandler={true}
//                 />
//               </div>
//             </div>
//           )}

//           {/* Mini chart */}
//           {processedData && showMiniChart && (
//             <div className={cardClass}>
//               <h2 className="text-sm font-bold text-gray-100 mb-2 flex items-center gap-1.5">
//                 <TrendingUp className="w-3.5 h-3.5" />
//                 Zig Zag Trend Only (5-min)
//               </h2>
//               <div className="w-full h-[30vh]">
//                 <Plot
//                   data={miniChartData}
//                   layout={miniLayout}
//                   config={plotConfig}
//                   style={{ width: "100%", height: "100%" }}
//                   useResizeHandler={true}
//                 />
//               </div>
//             </div>
//           )}
//         </>
//       )}

//       {!csvData && (
//         <div className={cardClass + " text-center"}>
//           <BarChart3 className="w-10 h-10 text-gray-500 mx-auto mb-2" />
//           <p className="text-gray-200 text-sm">
//             Upload a CSV file to get started
//           </p>
//           <p className="text-gray-400 text-[10px] mt-1">
//             Required columns: symbol, time (HHMMSS), open, high, low, close (1-min data)
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import { Upload, TrendingUp, Settings, BarChart3 } from "lucide-react";

// ========= TIMEFRAME HELPERS =========
function timeframeToMinutes(tf) {
  if (!tf) return 1;
  if (tf.endsWith("min")) return parseInt(tf.replace("min", ""), 10);
  if (tf.endsWith("h")) return parseInt(tf.replace("h", ""), 10) * 60;
  return 1;
}

function resampleOhlc(data, timeframe) {
  const minutes = timeframeToMinutes(timeframe);
  if (minutes <= 1) return data;

  const bucketMs = minutes * 60 * 1000;
  const buckets = new Map();

  for (const d of data) {
    const t = d.datetime;
    const bucketStart = Math.floor(t.getTime() / bucketMs) * bucketMs;
    const key = bucketStart;

    let b = buckets.get(key);
    if (!b) {
      b = {
        ...d,
        datetime: new Date(bucketStart),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      };
      buckets.set(key, b);
    } else {
      b.high = Math.max(b.high, d.high);
      b.low = Math.min(b.low, d.low);
      b.close = d.close;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.datetime - b.datetime);
}

// ========= DATETIME PARSING (MULTI-DAY SAFE) =========
function normalizeTimeString(rawTime) {
  if (rawTime == null) return "00:00:00";
  let s = String(rawTime).trim();

  // HHMMSS -> HH:MM:SS
  if (/^\d{6}$/.test(s)) {
    const hh = s.slice(0, 2);
    const mm = s.slice(2, 4);
    const ss = s.slice(4, 6);
    return `${hh}:${mm}:${ss}`;
  }

  return s;
}

function normalizeDateString(rawDate) {
  if (rawDate == null) return null;
  let s = String(rawDate).trim();

  // YYYY/MM/DD -> YYYY-MM-DD
  if (s.includes("/") || s.includes("-")) return s.replace(/\//g, "-");

  // YYYYMMDD -> YYYY-MM-DD
  if (/^\d{8}$/.test(s)) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  return s;
}

/**
 * 1) If row.datetime exists → use directly
 * 2) Else if row.date exists → date + time
 * 3) Else → baseDate + time
 */
function parseRowDateTime(row, baseDate) {
  if (row.datetime) {
    const t = new Date(row.datetime);
    if (!isNaN(t.getTime())) return t;
  }

  if (row.date) {
    const dateStr = normalizeDateString(row.date);
    const timeStr = normalizeTimeString(row.time ?? row.timestamp ?? "000000");
    const candidate = new Date(`${dateStr}T${timeStr}`);
    if (!isNaN(candidate.getTime())) return candidate;
  }

  const base = normalizeDateString(baseDate);
  const timeStr = normalizeTimeString(row.time ?? "000000");
  return new Date(`${base}T${timeStr}`);
}

// ========= MAIN COMPONENT =========
export default function ZigZagDashboard({ theme = "light" }) {
  const [csvData, setCsvData] = useState(null);
  const [baseDate, setBaseDate] = useState("20250111");
  const [priceDeviation, setPriceDeviation] = useState(5.0);
  const [pivotLegs, setPivotLegs] = useState(5);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [processedData, setProcessedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [resampleTf, setResampleTf] = useState("30min");

  const [showZigZag, setShowZigZag] = useState(true);
  const [showSwingHighs, setShowSwingHighs] = useState(true);
  const [showSwingLows, setShowSwingLows] = useState(true);
  const [showMiniChart, setShowMiniChart] = useState(false);

  const isDark = theme === "dark";
  const cardClass =
    (isDark ? "bg-slate-800 border-slate-700" : "bg-white border-blue-100") +
    " rounded-lg shadow-sm p-3 mb-3 border";

  const tfLabel = resampleTf.endsWith("min")
    ? resampleTf.replace("min", "-min")
    : resampleTf;

  // ===== FILE UPLOAD =====
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const data = lines.slice(1).map((line) => {
        const values = line.split(",");
        const row = {};
        headers.forEach((header, i) => {
          row[header] = values[i]?.trim();
        });
        return row;
      });

      setCsvData(data);
      if (data.length > 0) {
        setSelectedSymbol(data[0].symbol);
      }
    };
    reader.readAsText(file);
  };

  // ===== SWING + ZIGZAG LOGIC =====
  const detectPivots = (data, k) => {
    const n = data.length;
    const result = data.map((d) => ({
      ...d,
      swingHigh: false,
      swingLow: false,
    }));

    for (let i = k; i < n - k; i++) {
      const highWindow = data
        .slice(i - k, i + k + 1)
        .map((d) => parseFloat(d.high));
      if (parseFloat(data[i].high) === Math.max(...highWindow)) {
        result[i].swingHigh = true;
      }

      const lowWindow = data
        .slice(i - k, i + k + 1)
        .map((d) => parseFloat(d.low));
      if (parseFloat(data[i].low) === Math.min(...lowWindow)) {
        result[i].swingLow = true;
      }
    }

    return result;
  };

  const buildZigZag = (data, deviationPct) => {
    const highs = data.filter((d) => d.swingHigh);
    const lows = data.filter((d) => d.swingLow);
    if (highs.length === 0 || lows.length === 0) return [];

    const zigzagPoints = [];
    const firstHighIdx = data.findIndex((d) => d.swingHigh);
    const firstLowIdx = data.findIndex((d) => d.swingLow);

    let lastPivot, lookingFor;

    if (firstHighIdx < firstLowIdx) {
      lastPivot = {
        type: "high",
        idx: firstHighIdx,
        price: parseFloat(data[firstHighIdx].high),
      };
      lookingFor = "low";
      zigzagPoints.push({
        ...data[firstHighIdx],
        price: lastPivot.price,
        type: "high",
        idx: firstHighIdx,
      });
    } else {
      lastPivot = {
        type: "low",
        idx: firstLowIdx,
        price: parseFloat(data[firstLowIdx].low),
      };
      lookingFor = "high";
      zigzagPoints.push({
        ...data[firstLowIdx],
        price: lastPivot.price,
        type: "low",
        idx: firstLowIdx,
      });
    }

    while (true) {
      if (lookingFor === "low") {
        const candidates = data.filter(
          (d, idx) => d.swingLow && idx > lastPivot.idx
        );
        if (candidates.length === 0) break;

        let bestCandidate = null;
        for (const candidate of candidates) {
          const idx = data.indexOf(candidate);
          const price = parseFloat(candidate.low);
          const pctChange =
            (Math.abs(price - lastPivot.price) / lastPivot.price) * 100;

          if (pctChange >= deviationPct) {
            if (!bestCandidate || price < bestCandidate.price) {
              bestCandidate = { type: "low", idx, price, data: candidate };
            }
          }
        }

        if (!bestCandidate) break;
        zigzagPoints.push({
          ...bestCandidate.data,
          price: bestCandidate.price,
          type: "low",
          idx: bestCandidate.idx,
        });
        lastPivot = bestCandidate;
        lookingFor = "high";
      } else {
        const candidates = data.filter(
          (d, idx) => d.swingHigh && idx > lastPivot.idx
        );
        if (candidates.length === 0) break;

        let bestCandidate = null;
        for (const candidate of candidates) {
          const idx = data.indexOf(candidate);
          const price = parseFloat(candidate.high);
          const pctChange =
            (Math.abs(price - lastPivot.price) / lastPivot.price) * 100;

          if (pctChange >= deviationPct) {
            if (!bestCandidate || price > bestCandidate.price) {
              bestCandidate = { type: "high", idx, price, data: candidate };
            }
          }
        }

        if (!bestCandidate) break;
        zigzagPoints.push({
          ...bestCandidate.data,
          price: bestCandidate.price,
          type: "high",
          idx: bestCandidate.idx,
        });
        lastPivot = bestCandidate;
        lookingFor = "low";
      }
    }

    return zigzagPoints;
  };

  // ===== PROCESS DATA (MULTI-DAY + RESAMPLE) =====
  const processData = () => {
    if (!csvData || !selectedSymbol) return;

    let symbolData = csvData.filter((d) => d.symbol === selectedSymbol);

    symbolData = symbolData.map((d) => {
      const dt = parseRowDateTime(d, baseDate);
      return {
        ...d,
        datetime: dt,
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close),
      };
    });

    symbolData.sort((a, b) => a.datetime - b.datetime);

    const resampledData = resampleOhlc(symbolData, resampleTf);

    const withPivots = detectPivots(resampledData, pivotLegs);
    const zigzagPoints = buildZigZag(withPivots, priceDeviation);

    setProcessedData({
      rawData: withPivots,
      zigzagPoints,
      swingHighs: withPivots.filter((d) => d.swingHigh).length,
      swingLows: withPivots.filter((d) => d.swingLow).length,
    });
  };

  // ===== PLOTLY DATA (INDEX AXIS – NO GAPS) =====
  const plotlyData = useMemo(() => {
    if (!processedData) return [];

    const { rawData, zigzagPoints } = processedData;
    const traces = [];

    // x-axis = candle index
    const xIdx = rawData.map((_, i) => i);

    // 1. Candles
    traces.push({
      type: "candlestick",
      x: xIdx,
      open: rawData.map((d) => d.open),
      high: rawData.map((d) => d.high),
      low: rawData.map((d) => d.low),
      close: rawData.map((d) => d.close),
      name: `OHLC (${tfLabel})`,
      increasing: { line: { color: "#22c55e" } },
      decreasing: { line: { color: "#ef4444" } },
      customdata: rawData.map((d) => [
        d.datetime,
        d.open,
        d.high,
        d.low,
        d.close,
      ]),
      hovertemplate:
        "<b>%{customdata[0]|%Y-%m-%d %H:%M}</b><br>" +
        "O:%{customdata[1]:.2f} H:%{customdata[2]:.2f}<br>" +
        "L:%{customdata[3]:.2f} C:%{customdata[4]:.2f}<extra></extra>",
    });

    // 2. ZigZag line
    if (showZigZag && zigzagPoints.length > 0) {
      traces.push({
        type: "scatter",
        mode: "lines+markers",
        x: zigzagPoints.map((p) => p.idx),
        y: zigzagPoints.map((p) => p.price),
        name: "Zig Zag",
        line: { color: "#8b5cf6", width: 2 },
        marker: { size: 6, color: "#8b5cf6" },
        customdata: zigzagPoints.map((p) => rawData[p.idx].datetime),
        hovertemplate:
          "<b>%{customdata|%Y-%m-%d %H:%M}</b><br>Price: %{y:.2f}<extra></extra>",
      });
    }

    // 3. Swing High markers
    if (showSwingHighs) {
      const swingX = [];
      const swingY = [];
      const swingDt = [];
      rawData.forEach((d, i) => {
        if (d.swingHigh) {
          swingX.push(i);
          swingY.push(d.high);
          swingDt.push(d.datetime);
        }
      });

      if (swingX.length > 0) {
        traces.push({
          type: "scatter",
          mode: "markers",
          x: swingX,
          y: swingY,
          name: "Swing High",
          marker: {
            symbol: "triangle-down",
            size: 12,
            color: "#ef4444",
            line: { color: "#dc2626", width: 1 },
          },
          customdata: swingDt,
          hovertemplate:
            "<b>Swing High</b><br>%{customdata|%Y-%m-%d %H:%M}<br>%{y:.2f}<extra></extra>",
        });
      }
    }

    // 4. Swing Low markers
    if (showSwingLows) {
      const swingX = [];
      const swingY = [];
      const swingDt = [];
      rawData.forEach((d, i) => {
        if (d.swingLow) {
          swingX.push(i);
          swingY.push(d.low);
          swingDt.push(d.datetime);
        }
      });

      if (swingX.length > 0) {
        traces.push({
          type: "scatter",
          mode: "markers",
          x: swingX,
          y: swingY,
          name: "Swing Low",
          marker: {
            symbol: "triangle-up",
            size: 12,
            color: "#22c55e",
            line: { color: "#16a34a", width: 1 },
          },
          customdata: swingDt,
          hovertemplate:
            "<b>Swing Low</b><br>%{customdata|%Y-%m-%d %H:%M}<br>%{y:.2f}<extra></extra>",
        });
      }
    }

    return traces;
  }, [processedData, showZigZag, showSwingHighs, showSwingLows, tfLabel]);

  const miniChartData = useMemo(() => {
    if (!processedData || !showMiniChart) return [];
    const { rawData, zigzagPoints } = processedData;
    if (zigzagPoints.length === 0) return [];

    return [
      {
        type: "scatter",
        mode: "lines+markers",
        x: zigzagPoints.map((p) => p.idx),
        y: zigzagPoints.map((p) => p.price),
        name: "Zig Zag",
        line: { color: "#8b5cf6", width: 2 },
        marker: { size: 6, color: "#8b5cf6" },
        customdata: zigzagPoints.map((p) => rawData[p.idx].datetime),
        hovertemplate:
          "<b>%{customdata|%Y-%m-%d %H:%M}</b><br>Price: %{y:.2f}<extra></extra>",
      },
    ];
  }, [processedData, showMiniChart]);

  // ===== LAYOUTS (INDEX X-AXIS, NO TIME GAPS) =====
  const mainLayout = {
    title: `${selectedSymbol || "Symbol"} - ${tfLabel} Candlestick with Zig Zag`,
    xaxis: {
      title: "Candle Index",
      type: "linear",
      rangeslider: { visible: false },
    },
    yaxis: { title: "Price", autorange: true },
    hovermode: "x unified",
    showlegend: true,
    legend: { x: 0, y: 1 },
    margin: { l: 50, r: 50, t: 50, b: 50 },
    template: isDark ? "plotly_dark" : "plotly_white",
    paper_bgcolor: isDark ? "#111111" : "#ffffff",
    plot_bgcolor: isDark ? "#000000" : "#f8fafc",
  };

  const miniLayout = {
    title: `Zig Zag Only (${tfLabel})`,
    xaxis: { title: "Candle Index", type: "linear" },
    yaxis: { title: "Price", autorange: true },
    showlegend: false,
    margin: { l: 50, r: 50, t: 40, b: 40 },
    template: isDark ? "plotly_dark" : "plotly_white",
    paper_bgcolor: isDark ? "#111111" : "#ffffff",
    plot_bgcolor: isDark ? "#000000" : "#f8fafc",
  };

  const plotConfig = {
    scrollZoom: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToAdd: ["drawline", "eraseshape"],
    toImageButtonOptions: {
      format: "png",
      filename: `${selectedSymbol}_zigzag_${resampleTf}`,
      height: 1080,
      width: 1920,
      scale: 2,
    },
  };

  const symbols = csvData ? [...new Set(csvData.map((d) => d.symbol))] : [];

  // ===== RENDER =====
  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-md">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Technical Analysis Dashboard
            </h1>
            <p className="text-xs text-slate-300">
              {tfLabel} resampled candlestick analysis with Zig Zag
            </p>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className={cardClass}>
        <label className="flex flex-col items-center justify-center w-full h-20 px-3 border-2 border-dashed border-blue-300 rounded-md cursor-pointer hover:bg-blue-50/20 transition-all duration-300 hover:border-blue-400">
          <div className="flex flex-col items-center">
            <Upload className="w-6 h-6 text-blue-500 mb-1" />
            <span className="text-xs font-medium text-gray-200">
              {fileName ? `✓ ${fileName}` : "Upload CSV File"}
            </span>
            <span className="text-[10px] text-gray-400">
              {csvData
                ? `${csvData.length} rows loaded`
                : "Columns: symbol, [date], time, open, high, low, close (1-min)"}
            </span>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {csvData && (
        <>
          {/* Configuration */}
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-gray-100">Configuration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-1">
                  Base Date (YYYYMMDD)
                </label>
                <input
                  type="text"
                  value={baseDate}
                  onChange={(e) => setBaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
                  placeholder="Only used if no date column"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-1">
                  Price Deviation (%)
                </label>
                <input
                  type="number"
                  value={priceDeviation}
                  onChange={(e) =>
                    setPriceDeviation(parseFloat(e.target.value))
                  }
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-1">
                  Pivot Legs (k)
                </label>
                <input
                  type="number"
                  value={pivotLegs}
                  onChange={(e) => setPivotLegs(parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-1">
                  RESAMPLE_TIMEFRAME
                </label>
                <select
                  value={resampleTf}
                  onChange={(e) => setResampleTf(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
                >
                  <option value="1min">1min</option>
                  <option value="5min">5min</option>
                  <option value="10min">10min</option>
                  <option value="15min">15min</option>
                  <option value="30min">30min</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-1">
                  Symbol
                </label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-500 rounded-md bg-slate-900 text-slate-100 text-sm"
                >
                  {symbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={processData}
              className="w-full md:w-auto px-4 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Generate Analysis ({tfLabel})
            </button>
          </div>

          {/* Statistics */}
          {processedData && (
            <div className={cardClass}>
              <h3 className="text-xs font-bold text-gray-100 mb-2">
                Statistics ({tfLabel} bars)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-blue-900/40 rounded-md p-2 border border-blue-500/40">
                  <div className="text-xl font-bold text-blue-300">
                    {processedData.rawData.length}
                  </div>
                  <div className="text-[10px] text-gray-300 font-medium">
                    Total {tfLabel} Candles
                  </div>
                </div>
                <div className="bg-red-900/40 rounded-md p-2 border border-red-500/40">
                  <div className="text-xl font-bold text-red-300">
                    {processedData.swingHighs}
                  </div>
                  <div className="text-[10px] text-gray-300 font-medium">
                    Swing Highs
                  </div>
                </div>
                <div className="bg-green-900/40 rounded-md p-2 border border-green-500/40">
                  <div className="text-xl font-bold text-green-300">
                    {processedData.swingLows}
                  </div>
                  <div className="text-[10px] text-gray-300 font-medium">
                    Swing Lows
                  </div>
                </div>
                <div className="bg-purple-900/40 rounded-md p-2 border border-purple-500/40">
                  <div className="text-xl font-bold text-purple-300">
                    {processedData.zigzagPoints.length}
                  </div>
                  <div className="text-[10px] text-gray-300 font-medium">
                    Zig Zag Points
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chart Controls */}
          {processedData && (
            <div className={cardClass}>
              <h3 className="text-xs font-bold text-gray-100 mb-2">
                Chart Controls
              </h3>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showZigZag}
                    onChange={(e) => setShowZigZag(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-xs font-medium text-gray-100">
                    Show Zig Zag
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSwingHighs}
                    onChange={(e) => setShowSwingHighs(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-xs font-medium text-gray-100">
                    Show Swing Highs
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSwingLows}
                    onChange={(e) => setShowSwingLows(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-xs font-medium text-gray-100">
                    Show Swing Lows
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMiniChart}
                    onChange={(e) => setShowMiniChart(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-xs font-medium text-gray-100">
                    Show Mini Chart
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Main chart */}
          {processedData && (
            <div className={cardClass}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {tfLabel} Candlestick Chart with Indicators
                </h2>
              </div>
              <div className="w-full h-[70vh]">
                <Plot
                  data={plotlyData}
                  layout={mainLayout}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler={true}
                />
              </div>
            </div>
          )}

          {/* Mini chart */}
          {processedData && showMiniChart && (
            <div className={cardClass}>
              <h2 className="text-sm font-bold text-gray-100 mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Zig Zag Trend Only ({tfLabel})
              </h2>
              <div className="w-full h-[30vh]">
                <Plot
                  data={miniChartData}
                  layout={miniLayout}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler={true}
                />
              </div>
            </div>
          )}
        </>
      )}

      {!csvData && (
        <div className={cardClass + " text-center"}>
          <BarChart3 className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-200 text-sm">
            Upload a CSV file to get started
          </p>
          <p className="text-gray-400 text-[10px] mt-1">
            Required columns: symbol, [date], time (HHMMSS or HH:MM:SS), open,
            high, low, close (1-min data)
          </p>
        </div>
      )}
    </div>
  );
}

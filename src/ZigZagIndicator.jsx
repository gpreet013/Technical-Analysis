// // import React, { useState, useMemo } from 'react';
// // import Plot from 'react-plotly.js';
// // import { Upload, TrendingUp, Settings, BarChart3, Maximize2, RotateCcw, Download } from 'lucide-react';

// // export default function ZigZagDashboard() {
// //   const [csvData, setCsvData] = useState(null);
// //   const [baseDate, setBaseDate] = useState('20250111');
// //   const [priceDeviation, setPriceDeviation] = useState(5.0);
// //   const [pivotLegs, setPivotLegs] = useState(5);
// //   const [selectedSymbol, setSelectedSymbol] = useState('');
// //   const [processedData, setProcessedData] = useState(null);
// //   const [fileName, setFileName] = useState('');
  
// //   // Toggle states for chart visibility
// //   const [showZigZag, setShowZigZag] = useState(true);
// //   const [showSwingHighs, setShowSwingHighs] = useState(true);
// //   const [showSwingLows, setShowSwingLows] = useState(true);
// //   const [showMiniChart, setShowMiniChart] = useState(false);

// //   // Parse CSV file
// //   const handleFileUpload = (event) => {
// //     const file = event.target.files[0];
// //     if (!file) return;

// //     setFileName(file.name);
// //     const reader = new FileReader();
// //     reader.onload = (e) => {
// //       const text = e.target.result;
// //       const lines = text.trim().split('\n');
// //       const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
// //       const data = lines.slice(1).map(line => {
// //         const values = line.split(',');
// //         const row = {};
// //         headers.forEach((header, i) => {
// //           row[header] = values[i]?.trim();
// //         });
// //         return row;
// //       });

// //       setCsvData(data);
// //       if (data.length > 0) {
// //         setSelectedSymbol(data[0].symbol);
// //       }
// //     };
// //     reader.readAsText(file);
// //   };

// //   // Convert time HHMMSS + baseDate to proper Date object
// //   const convertToDateTime = (time, baseDate) => {
// //     const timeStr = time.toString().padStart(6, '0');
// //     const hour = timeStr.slice(0, 2);
// //     const minute = timeStr.slice(2, 4);
// //     const second = timeStr.slice(4, 6);
// //     const year = baseDate.slice(0, 4);
// //     const month = baseDate.slice(4, 6);
// //     const day = baseDate.slice(6, 8);
// //     return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
// //   };

// //   // Detect swing highs and lows
// //   const detectPivots = (data, k) => {
// //     const n = data.length;
// //     const result = data.map(d => ({ ...d, swingHigh: false, swingLow: false }));

// //     for (let i = k; i < n - k; i++) {
// //       const highWindow = data.slice(i - k, i + k + 1).map(d => parseFloat(d.high));
// //       if (parseFloat(data[i].high) === Math.max(...highWindow)) {
// //         result[i].swingHigh = true;
// //       }

// //       const lowWindow = data.slice(i - k, i + k + 1).map(d => parseFloat(d.low));
// //       if (parseFloat(data[i].low) === Math.min(...lowWindow)) {
// //         result[i].swingLow = true;
// //       }
// //     }

// //     return result;
// //   };

// //   // Build Zig Zag points
// //   const buildZigZag = (data, deviationPct) => {
// //     const highs = data.filter(d => d.swingHigh);
// //     const lows = data.filter(d => d.swingLow);

// //     if (highs.length === 0 || lows.length === 0) return [];

// //     const zigzagPoints = [];
    
// //     const firstHighIdx = data.findIndex(d => d.swingHigh);
// //     const firstLowIdx = data.findIndex(d => d.swingLow);
    
// //     let lastPivot, lookingFor;
    
// //     if (firstHighIdx < firstLowIdx) {
// //       lastPivot = { type: 'high', idx: firstHighIdx, price: parseFloat(data[firstHighIdx].high) };
// //       lookingFor = 'low';
// //       zigzagPoints.push({ ...data[firstHighIdx], price: lastPivot.price, type: 'high', idx: firstHighIdx });
// //     } else {
// //       lastPivot = { type: 'low', idx: firstLowIdx, price: parseFloat(data[firstLowIdx].low) };
// //       lookingFor = 'high';
// //       zigzagPoints.push({ ...data[firstLowIdx], price: lastPivot.price, type: 'low', idx: firstLowIdx });
// //     }

// //     while (true) {
// //       if (lookingFor === 'low') {
// //         const candidates = data.filter((d, idx) => d.swingLow && idx > lastPivot.idx);
// //         if (candidates.length === 0) break;

// //         let bestCandidate = null;
// //         for (const candidate of candidates) {
// //           const idx = data.indexOf(candidate);
// //           const price = parseFloat(candidate.low);
// //           const pctChange = Math.abs((price - lastPivot.price) / lastPivot.price * 100);

// //           if (pctChange >= deviationPct) {
// //             if (!bestCandidate || price < bestCandidate.price) {
// //               bestCandidate = { type: 'low', idx, price, data: candidate };
// //             }
// //           }
// //         }

// //         if (!bestCandidate) break;

// //         zigzagPoints.push({ ...bestCandidate.data, price: bestCandidate.price, type: 'low', idx: bestCandidate.idx });
// //         lastPivot = bestCandidate;
// //         lookingFor = 'high';
// //       } else {
// //         const candidates = data.filter((d, idx) => d.swingHigh && idx > lastPivot.idx);
// //         if (candidates.length === 0) break;

// //         let bestCandidate = null;
// //         for (const candidate of candidates) {
// //           const idx = data.indexOf(candidate);
// //           const price = parseFloat(candidate.high);
// //           const pctChange = Math.abs((price - lastPivot.price) / lastPivot.price * 100);

// //           if (pctChange >= deviationPct) {
// //             if (!bestCandidate || price > bestCandidate.price) {
// //               bestCandidate = { type: 'high', idx, price, data: candidate };
// //             }
// //           }
// //         }

// //         if (!bestCandidate) break;

// //         zigzagPoints.push({ ...bestCandidate.data, price: bestCandidate.price, type: 'high', idx: bestCandidate.idx });
// //         lastPivot = bestCandidate;
// //         lookingFor = 'low';
// //       }
// //     }

// //     return zigzagPoints;
// //   };

// //   // Process data and generate charts
// //   const processData = () => {
// //     if (!csvData || !selectedSymbol) return;

// //     let symbolData = csvData.filter(d => d.symbol === selectedSymbol);
    
// //     symbolData = symbolData.map(d => ({
// //       ...d,
// //       datetime: convertToDateTime(d.time, baseDate),
// //       open: parseFloat(d.open),
// //       high: parseFloat(d.high),
// //       low: parseFloat(d.low),
// //       close: parseFloat(d.close)
// //     }));

// //     symbolData.sort((a, b) => a.datetime - b.datetime);

// //     const withPivots = detectPivots(symbolData, pivotLegs);
// //     const zigzagPoints = buildZigZag(withPivots, priceDeviation);

// //     setProcessedData({
// //       rawData: withPivots,
// //       zigzagPoints,
// //       swingHighs: withPivots.filter(d => d.swingHigh).length,
// //       swingLows: withPivots.filter(d => d.swingLow).length
// //     });
// //   };

// //   // Memoized Plotly traces to avoid re-renders
// //   const plotlyData = useMemo(() => {
// //     if (!processedData) return [];

// //     const { rawData, zigzagPoints } = processedData;
// //     const traces = [];

// //     // 1. Candlestick trace (always visible)
// //     traces.push({
// //       type: 'candlestick',
// //       x: rawData.map(d => d.datetime),
// //       open: rawData.map(d => d.open),
// //       high: rawData.map(d => d.high),
// //       low: rawData.map(d => d.low),
// //       close: rawData.map(d => d.close),
// //       name: 'OHLC',
// //       increasing: { line: { color: '#22c55e' } },
// //       decreasing: { line: { color: '#ef4444' } },
// //       hoverinfo: 'x+y',
// //       customdata: rawData.map(d => [d.open, d.high, d.low, d.close]),
// //       hovertemplate: '<b>%{x|%H:%M:%S}</b><br>O:%{customdata[0]:.2f} H:%{customdata[1]:.2f}<br>L:%{customdata[2]:.2f} C:%{customdata[3]:.2f}<extra></extra>'
// //     });

// //     // 2. ZigZag line trace
// //     if (showZigZag && zigzagPoints.length > 0) {
// //       traces.push({
// //         type: 'scatter',
// //         mode: 'lines+markers',
// //         x: zigzagPoints.map(p => rawData[p.idx].datetime),
// //         y: zigzagPoints.map(p => p.price),
// //         name: 'Zig Zag',
// //         line: { color: '#8b5cf6', width: 2 },
// //         marker: { size: 6, color: '#8b5cf6' },
// //         hovertemplate: '<b>%{x|%H:%M:%S}</b><br>Price: %{y:.2f}<extra></extra>'
// //       });
// //     }

// //     // 3. Swing High markers
// //     if (showSwingHighs) {
// //       const swingHighData = rawData.filter(d => d.swingHigh);
// //       if (swingHighData.length > 0) {
// //         traces.push({
// //           type: 'scatter',
// //           mode: 'markers',
// //           x: swingHighData.map(d => d.datetime),
// //           y: swingHighData.map(d => d.high),
// //           name: 'Swing High',
// //           marker: { 
// //             symbol: 'triangle-down', 
// //             size: 12, 
// //             color: '#ef4444',
// //             line: { color: '#dc2626', width: 1 }
// //           },
// //           hovertemplate: '<b>Swing High</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>'
// //         });
// //       }
// //     }

// //     // 4. Swing Low markers
// //     if (showSwingLows) {
// //       const swingLowData = rawData.filter(d => d.swingLow);
// //       if (swingLowData.length > 0) {
// //         traces.push({
// //           type: 'scatter',
// //           mode: 'markers',
// //           x: swingLowData.map(d => d.datetime),
// //           y: swingLowData.map(d => d.low),
// //           name: 'Swing Low',
// //           marker: { 
// //             symbol: 'triangle-up', 
// //             size: 12, 
// //             color: '#22c55e',
// //             line: { color: '#16a34a', width: 1 }
// //           },
// //           hovertemplate: '<b>Swing Low</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>'
// //         });
// //       }
// //     }

// //     return traces;
// //   }, [processedData, showZigZag, showSwingHighs, showSwingLows]);

// //   // Mini chart data (ZigZag only)
// //   const miniChartData = useMemo(() => {
// //     if (!processedData || !showMiniChart) return [];

// //     const { rawData, zigzagPoints } = processedData;
    
// //     if (zigzagPoints.length === 0) return [];

// //     return [{
// //       type: 'scatter',
// //       mode: 'lines+markers',
// //       x: zigzagPoints.map(p => rawData[p.idx].datetime),
// //       y: zigzagPoints.map(p => p.price),
// //       name: 'Zig Zag',
// //       line: { color: '#8b5cf6', width: 2 },
// //       marker: { size: 6, color: '#8b5cf6' }
// //     }];
// //   }, [processedData, showMiniChart]);

// //   // Main chart layout - ADJUSTABLE: Change height here (70vh)
// //   const mainLayout = {
// //     title: `${selectedSymbol || 'Symbol'} - Candlestick with Zig Zag`,
// //     xaxis: {
// //       type: 'date',
// //       rangeslider: { visible: true },
// //       tickformat: '%H:%M'
// //     },
// //     yaxis: {
// //       title: 'Price',
// //       autorange: true
// //     },
// //     hovermode: 'x unified',
// //     showlegend: true,
// //     legend: { x: 0, y: 1 },
// //     margin: { l: 50, r: 50, t: 50, b: 50 },
// //     paper_bgcolor: 'white',
// //     plot_bgcolor: '#f8fafc'
// //   };

// //   // Mini chart layout - ADJUSTABLE: Change height here (30vh)
// //   const miniLayout = {
// //     title: 'Zig Zag Only',
// //     xaxis: {
// //       type: 'date',
// //       tickformat: '%H:%M'
// //     },
// //     yaxis: {
// //       title: 'Price',
// //       autorange: true
// //     },
// //     showlegend: false,
// //     margin: { l: 50, r: 50, t: 40, b: 40 },
// //     paper_bgcolor: 'white',
// //     plot_bgcolor: '#f8fafc'
// //   };

// //   // Plotly config - ADJUSTABLE: Modify toolbar buttons here
// //   const plotConfig = {
// //     scrollZoom: true,
// //     displaylogo: false,
// //     responsive: true,
// //     modeBarButtonsToAdd: ['drawline', 'eraseshape'],
// //     toImageButtonOptions: {
// //       format: 'png',
// //       filename: `${selectedSymbol}_zigzag`,
// //       height: 1080,
// //       width: 1920,
// //       scale: 2
// //     }
// //   };

// //   const symbols = csvData ? [...new Set(csvData.map(d => d.symbol))] : [];

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
// //       <div className="max-w-[1800px] mx-auto">
        
// //         {/* Header */}
// //         <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6 border border-blue-100">
// //           <div className="flex items-center gap-4 mb-3">
// //             <div className="p-3 bg-blue-600 rounded-xl">
// //               <TrendingUp className="w-8 h-8 text-white" />
// //             </div>
// //             <div>
// //               <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
// //                 Zig Zag Indicator Dashboard
// //               </h1>
// //               <p className="text-gray-600 text-sm mt-1">Professional candlestick analysis with interactive controls</p>
// //             </div>
// //           </div>
// //         </div>

// //         {/* File Upload */}
// //         <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-blue-100">
// //           <label className="flex flex-col items-center justify-center w-full h-40 px-4 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:bg-blue-50 transition-all duration-300 hover:border-blue-400">
// //             <div className="flex flex-col items-center">
// //               <Upload className="w-14 h-14 text-blue-500 mb-3" />
// //               <span className="text-base font-medium text-gray-700 mb-1">
// //                 {fileName ? `✓ ${fileName}` : 'Upload CSV File'}
// //               </span>
// //               <span className="text-sm text-gray-500">
// //                 {csvData ? `${csvData.length} rows loaded` : 'Columns: symbol, time, open, high, low, close'}
// //               </span>
// //             </div>
// //             <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
// //           </label>
// //         </div>

// //         {csvData && (
// //           <>
// //             {/* Parameters */}
// //             <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-blue-100">
// //               <div className="flex items-center gap-3 mb-6">
// //                 <Settings className="w-6 h-6 text-blue-600" />
// //                 <h2 className="text-2xl font-bold text-gray-800">Configuration</h2>
// //               </div>
              
// //               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
// //                 <div>
// //                   <label className="block text-sm font-semibold text-gray-700 mb-2">
// //                     Base Date (YYYYMMDD)
// //                   </label>
// //                   <input
// //                     type="text"
// //                     value={baseDate}
// //                     onChange={(e) => setBaseDate(e.target.value)}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
// //                     placeholder="20250111"
// //                   />
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-semibold text-gray-700 mb-2">
// //                     Price Deviation (%)
// //                   </label>
// //                   <input
// //                     type="number"
// //                     value={priceDeviation}
// //                     onChange={(e) => setPriceDeviation(parseFloat(e.target.value))}
// //                     step="0.1"
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
// //                   />
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-semibold text-gray-700 mb-2">
// //                     Pivot Legs (k)
// //                   </label>
// //                   <input
// //                     type="number"
// //                     value={pivotLegs}
// //                     onChange={(e) => setPivotLegs(parseInt(e.target.value))}
// //                     min="1"
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
// //                   />
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-semibold text-gray-700 mb-2">
// //                     Symbol
// //                   </label>
// //                   <select
// //                     value={selectedSymbol}
// //                     onChange={(e) => setSelectedSymbol(e.target.value)}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
// //                   >
// //                     {symbols.map(sym => (
// //                       <option key={sym} value={sym}>{sym}</option>
// //                     ))}
// //                   </select>
// //                 </div>
// //               </div>

// //               <button
// //                 onClick={processData}
// //                 className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
// //               >
// //                 <BarChart3 className="w-5 h-5" />
// //                 Generate Analysis
// //               </button>
// //             </div>

// //             {/* Statistics */}
// //             {processedData && (
// //               <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-blue-100">
// //                 <h3 className="text-lg font-bold text-gray-800 mb-4">Statistics</h3>
// //                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
// //                   <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
// //                     <div className="text-3xl font-bold text-blue-600">{processedData.rawData.length}</div>
// //                     <div className="text-sm text-gray-600 font-medium mt-1">Total Candles</div>
// //                   </div>
// //                   <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
// //                     <div className="text-3xl font-bold text-red-600">{processedData.swingHighs}</div>
// //                     <div className="text-sm text-gray-600 font-medium mt-1">Swing Highs</div>
// //                   </div>
// //                   <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
// //                     <div className="text-3xl font-bold text-green-600">{processedData.swingLows}</div>
// //                     <div className="text-sm text-gray-600 font-medium mt-1">Swing Lows</div>
// //                   </div>
// //                   <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
// //                     <div className="text-3xl font-bold text-purple-600">{processedData.zigzagPoints.length}</div>
// //                     <div className="text-sm text-gray-600 font-medium mt-1">Zig Zag Points</div>
// //                   </div>
// //                 </div>
// //               </div>
// //             )}

// //             {/* Chart Controls & Toggles */}
// //             {processedData && (
// //               <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-blue-100">
// //                 <h3 className="text-lg font-bold text-gray-800 mb-4">Chart Controls</h3>
// //                 <div className="flex flex-wrap gap-4">
// //                   <label className="flex items-center gap-2 cursor-pointer">
// //                     <input
// //                       type="checkbox"
// //                       checked={showZigZag}
// //                       onChange={(e) => setShowZigZag(e.target.checked)}
// //                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
// //                     />
// //                     <span className="text-sm font-medium text-gray-700">Show Zig Zag</span>
// //                   </label>
// //                   <label className="flex items-center gap-2 cursor-pointer">
// //                     <input
// //                       type="checkbox"
// //                       checked={showSwingHighs}
// //                       onChange={(e) => setShowSwingHighs(e.target.checked)}
// //                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
// //                     />
// //                     <span className="text-sm font-medium text-gray-700">Show Swing Highs</span>
// //                   </label>
// //                   <label className="flex items-center gap-2 cursor-pointer">
// //                     <input
// //                       type="checkbox"
// //                       checked={showSwingLows}
// //                       onChange={(e) => setShowSwingLows(e.target.checked)}
// //                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
// //                     />
// //                     <span className="text-sm font-medium text-gray-700">Show Swing Lows</span>
// //                   </label>
// //                   <label className="flex items-center gap-2 cursor-pointer">
// //                     <input
// //                       type="checkbox"
// //                       checked={showMiniChart}
// //                       onChange={(e) => setShowMiniChart(e.target.checked)}
// //                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
// //                     />
// //                     <span className="text-sm font-medium text-gray-700">Show Mini Chart</span>
// //                   </label>
// //                 </div>
// //               </div>
// //             )}

// //             {/* Main Candlestick Chart */}
// //             {processedData && (
// //               <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-blue-100">
// //                 <div className="flex justify-between items-center mb-4">
// //                   <h2 className="text-xl font-bold text-gray-800">
// //                     📊 Candlestick Chart with Indicators
// //                   </h2>
// //                 </div>
// //                 {/* ADJUSTABLE: Change h-[70vh] to adjust main chart height */}
// //                 <div className="w-full h-[70vh]">
// //                   <Plot
// //                     data={plotlyData}
// //                     layout={mainLayout}
// //                     config={plotConfig}
// //                     style={{ width: '100%', height: '100%' }}
// //                     useResizeHandler={true}
// //                   />
// //                 </div>
// //               </div>
// //             )}

// //             {/* Mini ZigZag Chart (Optional) */}
// //             {processedData && showMiniChart && (
// //               <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
// //                 <h2 className="text-xl font-bold text-gray-800 mb-4">
// //                   📈 Zig Zag Trend Only
// //                 </h2>
// //                 {/* ADJUSTABLE: Change h-[30vh] to adjust mini chart height */}
// //                 <div className="w-full h-[30vh]">
// //                   <Plot
// //                     data={miniChartData}
// //                     layout={miniLayout}
// //                     config={plotConfig}
// //                     style={{ width: '100%', height: '100%' }}
// //                     useResizeHandler={true}
// //                   />
// //                 </div>
// //               </div>
// //             )}
// //           </>
// //         )}

// //         {!csvData && (
// //           <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-blue-100">
// //             <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
// //             <p className="text-gray-500 text-lg">Upload a CSV file to get started</p>
// //             <p className="text-gray-400 text-sm mt-2">Required columns: symbol, time, open, high, low, close</p>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // }

// // -------------------------------------------------------------------------------------

// import React, { useState, useMemo } from 'react';
// import Plot from 'react-plotly.js';
// import { Upload, TrendingUp, Settings, BarChart3, Maximize2, RotateCcw, Download } from 'lucide-react';

// export default function ZigZagDashboard() {
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

//   // Convert time HHMMSS + baseDate to proper Date object
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

//   // Build Zig Zag points
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

//   // Process data and generate charts
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

//     const withPivots = detectPivots(symbolData, pivotLegs);
//     const zigzagPoints = buildZigZag(withPivots, priceDeviation);

//     setProcessedData({
//       rawData: withPivots,
//       zigzagPoints,
//       swingHighs: withPivots.filter(d => d.swingHigh).length,
//       swingLows: withPivots.filter(d => d.swingLow).length
//     });
//   };

//   // Memoized Plotly traces to avoid re-renders
//   const plotlyData = useMemo(() => {
//     if (!processedData) return [];

//     const { rawData, zigzagPoints } = processedData;
//     const traces = [];

//     // 1. Candlestick trace (always visible)
//     traces.push({
//       type: 'candlestick',
//       x: rawData.map(d => d.datetime),
//       open: rawData.map(d => d.open),
//       high: rawData.map(d => d.high),
//       low: rawData.map(d => d.low),
//       close: rawData.map(d => d.close),
//       name: 'OHLC',
//       increasing: { line: { color: '#22c55e' } },
//       decreasing: { line: { color: '#ef4444' } },
//       hoverinfo: 'x+y',
//       customdata: rawData.map(d => [d.open, d.high, d.low, d.close]),
//       hovertemplate: '<b>%{x|%H:%M:%S}</b><br>O:%{customdata[0]:.2f} H:%{customdata[1]:.2f}<br>L:%{customdata[2]:.2f} C:%{customdata[3]:.2f}<extra></extra>'
//     });

//     // 2. ZigZag line trace
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

//     // 3. Swing High markers
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

//     // 4. Swing Low markers
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

//   // Mini chart data (ZigZag only)
//   const miniChartData = useMemo(() => {
//     if (!processedData || !showMiniChart) return [];

//     const { rawData, zigzagPoints } = processedData;
    
//     if (zigzagPoints.length === 0) return [];

//     return [{
//       type: 'scatter',
//       mode: 'lines+markers',
//       x: zigzagPoints.map(p => rawData[p.idx].datetime),
//       y: zigzagPoints.map(p => p.price),
//       name: 'Zig Zag',
//       line: { color: '#8b5cf6', width: 2 },
//       marker: { size: 6, color: '#8b5cf6' }
//     }];
//   }, [processedData, showMiniChart]);

//   // Main chart layout - ADJUSTABLE: Change height here (70vh)
//   const mainLayout = {
//     title: `${selectedSymbol || 'Symbol'} - Candlestick with Zig Zag`,
//     xaxis: {
//       type: 'date',
//       rangeslider: { visible: true },
//       tickformat: '%H:%M'
//     },
//     yaxis: {
//       title: 'Price',
//       autorange: true
//     },
//     hovermode: 'x unified',
//     showlegend: true,
//     legend: { x: 0, y: 1 },
//     margin: { l: 50, r: 50, t: 50, b: 50 },
//     paper_bgcolor: 'white',
//     plot_bgcolor: '#f8fafc'
//   };

//   // Mini chart layout - ADJUSTABLE: Change height here (30vh)
//   const miniLayout = {
//     title: 'Zig Zag Only',
//     xaxis: {
//       type: 'date',
//       tickformat: '%H:%M'
//     },
//     yaxis: {
//       title: 'Price',
//       autorange: true
//     },
//     showlegend: false,
//     margin: { l: 50, r: 50, t: 40, b: 40 },
//     paper_bgcolor: 'white',
//     plot_bgcolor: '#f8fafc'
//   };

//   // Plotly config - ADJUSTABLE: Modify toolbar buttons here
//   const plotConfig = {
//     scrollZoom: true,
//     displaylogo: false,
//     responsive: true,
//     modeBarButtonsToAdd: ['drawline', 'eraseshape'],
//     toImageButtonOptions: {
//       format: 'png',
//       filename: `${selectedSymbol}_zigzag`,
//       height: 1080,
//       width: 1920,
//       scale: 2
//     }
//   };

//   const symbols = csvData ? [...new Set(csvData.map(d => d.symbol))] : [];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
//       <div className="max-w-full mx-auto">
        
//         {/* Header */}
//         <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
//           <div className="flex items-center gap-2">
//             <div className="p-1.5 bg-blue-600 rounded-md">
//               <TrendingUp className="w-4 h-4 text-white" />
//             </div>
//             <div>
//               <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
//                 Technical Analysis Dashbord
//               </h1>
//               <p className="text-gray-600 text-[10px]">Professional candlestick analysis with interactive controls</p>
//             </div>
//           </div>
//         </div>

//         {/* File Upload */}
//         <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
//           <label className="flex flex-col items-center justify-center w-full h-20 px-3 border-2 border-dashed border-blue-300 rounded-md cursor-pointer hover:bg-blue-50 transition-all duration-300 hover:border-blue-400">
//             <div className="flex flex-col items-center">
//               <Upload className="w-6 h-6 text-blue-500 mb-1" />
//               <span className="text-xs font-medium text-gray-700">
//                 {fileName ? `✓ ${fileName}` : 'Upload CSV File'}
//               </span>
//               <span className="text-[10px] text-gray-500">
//                 {csvData ? `${csvData.length} rows loaded` : 'Columns: symbol, time, open, high, low, close'}
//               </span>
//             </div>
//             <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
//           </label>
//         </div>

//         {csvData && (
//           <>
//             {/* Parameters */}
//             <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
//               <div className="flex items-center gap-2 mb-3">
//                 <Settings className="w-4 h-4 text-blue-600" />
//                 <h2 className="text-sm font-bold text-gray-800">Configuration</h2>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     Base Date (YYYYMMDD)
//                   </label>
//                   <input
//                     type="text"
//                     value={baseDate}
//                     onChange={(e) => setBaseDate(e.target.value)}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                     placeholder="20250111"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     Price Deviation (%)
//                   </label>
//                   <input
//                     type="number"
//                     value={priceDeviation}
//                     onChange={(e) => setPriceDeviation(parseFloat(e.target.value))}
//                     step="0.1"
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     Pivot Legs (k)
//                   </label>
//                   <input
//                     type="number"
//                     value={pivotLegs}
//                     onChange={(e) => setPivotLegs(parseInt(e.target.value))}
//                     min="1"
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     Symbol
//                   </label>
//                   <select
//                     value={selectedSymbol}
//                     onChange={(e) => setSelectedSymbol(e.target.value)}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   >
//                     {symbols.map(sym => (
//                       <option key={sym} value={sym}>{sym}</option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <button
//                 onClick={processData}
//                 className="w-full md:w-auto px-4 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
//               >
//                 <BarChart3 className="w-3.5 h-3.5" />
//                 Generate Analysis
//               </button>
//             </div>

//             {/* Statistics */}
//             {processedData && (
//               <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
//                 <h3 className="text-xs font-bold text-gray-800 mb-2">Statistics</h3>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
//                   <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-md p-2 border border-blue-200">
//                     <div className="text-xl font-bold text-blue-600">{processedData.rawData.length}</div>
//                     <div className="text-[10px] text-gray-600 font-medium">Total Candles</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-md p-2 border border-red-200">
//                     <div className="text-xl font-bold text-red-600">{processedData.swingHighs}</div>
//                     <div className="text-[10px] text-gray-600 font-medium">Swing Highs</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-md p-2 border border-green-200">
//                     <div className="text-xl font-bold text-green-600">{processedData.swingLows}</div>
//                     <div className="text-[10px] text-gray-600 font-medium">Swing Lows</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-md p-2 border border-purple-200">
//                     <div className="text-xl font-bold text-purple-600">{processedData.zigzagPoints.length}</div>
//                     <div className="text-[10px] text-gray-600 font-medium">Zig Zag Points</div>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Chart Controls & Toggles */}
//             {processedData && (
//               <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
//                 <h3 className="text-xs font-bold text-gray-800 mb-2">Chart Controls</h3>
//                 <div className="flex flex-wrap gap-3">
//                   <label className="flex items-center gap-1.5 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={showZigZag}
//                       onChange={(e) => setShowZigZag(e.target.checked)}
//                       className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
//                     />
//                     <span className="text-xs font-medium text-gray-700">Show Zig Zag</span>
//                   </label>
//                   <label className="flex items-center gap-1.5 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={showSwingHighs}
//                       onChange={(e) => setShowSwingHighs(e.target.checked)}
//                       className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
//                     />
//                     <span className="text-xs font-medium text-gray-700">Show Swing Highs</span>
//                   </label>
//                   <label className="flex items-center gap-1.5 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={showSwingLows}
//                       onChange={(e) => setShowSwingLows(e.target.checked)}
//                       className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
//                     />
//                     <span className="text-xs font-medium text-gray-700">Show Swing Lows</span>
//                   </label>
//                   <label className="flex items-center gap-1.5 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={showMiniChart}
//                       onChange={(e) => setShowMiniChart(e.target.checked)}
//                       className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
//                     />
//                     <span className="text-xs font-medium text-gray-700">Show Mini Chart</span>
//                   </label>
//                 </div>
//               </div>
//             )}

//             {/* Main Candlestick Chart */}
//             {processedData && (
//               <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
//                 <div className="flex justify-between items-center mb-2">
//                   <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
//                     <BarChart3 className="w-3.5 h-3.5" />
//                     Candlestick Chart with Indicators
//                   </h2>
//                 </div>
//                 {/* ADJUSTABLE: Change h-[70vh] to adjust main chart height */}
//                 <div className="w-full h-[70vh]">
//                   <Plot
//                     data={plotlyData}
//                     layout={mainLayout}
//                     config={plotConfig}
//                     style={{ width: '100%', height: '100%' }}
//                     useResizeHandler={true}
//                   />
//                 </div>
//               </div>
//             )}

//             {/* Mini ZigZag Chart (Optional) */}
//             {processedData && showMiniChart && (
//               <div className="bg-white rounded-lg shadow-sm p-3 border border-blue-100">
//                 <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
//                   <TrendingUp className="w-3.5 h-3.5" />
//                   Zig Zag Trend Only
//                 </h2>
//                 {/* ADJUSTABLE: Change h-[30vh] to adjust mini chart height */}
//                 <div className="w-full h-[30vh]">
//                   <Plot
//                     data={miniChartData}
//                     layout={miniLayout}
//                     config={plotConfig}
//                     style={{ width: '100%', height: '100%' }}
//                     useResizeHandler={true}
//                   />
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {!csvData && (
//           <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-blue-100">
//             <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
//             <p className="text-gray-500 text-sm">Upload a CSV file to get started</p>
//             <p className="text-gray-400 text-[10px] mt-1">Required columns: symbol, time, open, high, low, close</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }






















































import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Upload, TrendingUp, Settings, BarChart3 } from 'lucide-react';

export default function ZigZagDashboard() {
  const [csvData, setCsvData] = useState(null);
  const [baseDate, setBaseDate] = useState('20250111');
  const [priceDeviation, setPriceDeviation] = useState(5.0);
  const [pivotLegs, setPivotLegs] = useState(5);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [processedData, setProcessedData] = useState(null);
  const [fileName, setFileName] = useState('');
  
  // Toggle states for chart visibility
  const [showZigZag, setShowZigZag] = useState(true);
  const [showSwingHighs, setShowSwingHighs] = useState(true);
  const [showSwingLows, setShowSwingLows] = useState(true);
  const [showMiniChart, setShowMiniChart] = useState(false);

  // Parse CSV file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
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

  // Convert time HHMMSS + baseDate to proper Date object
  const convertToDateTime = (time, baseDate) => {
    const timeStr = time.toString().padStart(6, '0');
    const hour = timeStr.slice(0, 2);
    const minute = timeStr.slice(2, 4);
    const second = timeStr.slice(4, 6);
    const year = baseDate.slice(0, 4);
    const month = baseDate.slice(4, 6);
    const day = baseDate.slice(6, 8);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  };

  // === NEW: Resample to 5-minute OHLC ===
  const resampleTo5Min = (data) => {
    // data: sorted 1-min candles for a single symbol
    const buckets = new Map();

    data.forEach(d => {
      const dt = new Date(d.datetime);
      dt.setSeconds(0, 0); // ignore seconds
      const bucketMin = Math.floor(dt.getMinutes() / 5) * 5; // 0,5,10,...
      dt.setMinutes(bucketMin);

      const key = dt.getTime();
      const existing = buckets.get(key);

      if (!existing) {
        // Start a new 5-min bar
        buckets.set(key, {
          ...d,
          datetime: dt,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        });
      } else {
        // Update existing bar
        existing.high = Math.max(existing.high, d.high);
        existing.low = Math.min(existing.low, d.low);
        // close = last candle in that 5-min bucket
        existing.close = d.close;
      }
    });

    return Array.from(buckets.values()).sort((a, b) => a.datetime - b.datetime);
  };

  // Detect swing highs and lows
  const detectPivots = (data, k) => {
    const n = data.length;
    const result = data.map(d => ({ ...d, swingHigh: false, swingLow: false }));

    for (let i = k; i < n - k; i++) {
      const highWindow = data.slice(i - k, i + k + 1).map(d => parseFloat(d.high));
      if (parseFloat(data[i].high) === Math.max(...highWindow)) {
        result[i].swingHigh = true;
      }

      const lowWindow = data.slice(i - k, i + k + 1).map(d => parseFloat(d.low));
      if (parseFloat(data[i].low) === Math.min(...lowWindow)) {
        result[i].swingLow = true;
      }
    }

    return result;
  };

  // Build Zig Zag points
  const buildZigZag = (data, deviationPct) => {
    const highs = data.filter(d => d.swingHigh);
    const lows = data.filter(d => d.swingLow);

    if (highs.length === 0 || lows.length === 0) return [];

    const zigzagPoints = [];
    
    const firstHighIdx = data.findIndex(d => d.swingHigh);
    const firstLowIdx = data.findIndex(d => d.swingLow);
    
    let lastPivot, lookingFor;
    
    if (firstHighIdx < firstLowIdx) {
      lastPivot = { type: 'high', idx: firstHighIdx, price: parseFloat(data[firstHighIdx].high) };
      lookingFor = 'low';
      zigzagPoints.push({ ...data[firstHighIdx], price: lastPivot.price, type: 'high', idx: firstHighIdx });
    } else {
      lastPivot = { type: 'low', idx: firstLowIdx, price: parseFloat(data[firstLowIdx].low) };
      lookingFor = 'high';
      zigzagPoints.push({ ...data[firstLowIdx], price: lastPivot.price, type: 'low', idx: firstLowIdx });
    }

    while (true) {
      if (lookingFor === 'low') {
        const candidates = data.filter((d, idx) => d.swingLow && idx > lastPivot.idx);
        if (candidates.length === 0) break;

        let bestCandidate = null;
        for (const candidate of candidates) {
          const idx = data.indexOf(candidate);
          const price = parseFloat(candidate.low);
          const pctChange = Math.abs((price - lastPivot.price) / lastPivot.price * 100);

          if (pctChange >= deviationPct) {
            if (!bestCandidate || price < bestCandidate.price) {
              bestCandidate = { type: 'low', idx, price, data: candidate };
            }
          }
        }

        if (!bestCandidate) break;

        zigzagPoints.push({ ...bestCandidate.data, price: bestCandidate.price, type: 'low', idx: bestCandidate.idx });
        lastPivot = bestCandidate;
        lookingFor = 'high';
      } else {
        const candidates = data.filter((d, idx) => d.swingHigh && idx > lastPivot.idx);
        if (candidates.length === 0) break;

        let bestCandidate = null;
        for (const candidate of candidates) {
          const idx = data.indexOf(candidate);
          const price = parseFloat(candidate.high);
          const pctChange = Math.abs((price - lastPivot.price) / lastPivot.price * 100);

          if (pctChange >= deviationPct) {
            if (!bestCandidate || price > bestCandidate.price) {
              bestCandidate = { type: 'high', idx, price, data: candidate };
            }
          }
        }

        if (!bestCandidate) break;

        zigzagPoints.push({ ...bestCandidate.data, price: bestCandidate.price, type: 'high', idx: bestCandidate.idx });
        lastPivot = bestCandidate;
        lookingFor = 'low';
      }
    }

    return zigzagPoints;
  };

  // Process data and generate charts
  const processData = () => {
    if (!csvData || !selectedSymbol) return;

    // Filter single symbol
    let symbolData = csvData.filter(d => d.symbol === selectedSymbol);
    
    // Parse numeric + datetime
    symbolData = symbolData.map(d => ({
      ...d,
      datetime: convertToDateTime(d.time, baseDate),
      open: parseFloat(d.open),
      high: parseFloat(d.high),
      low: parseFloat(d.low),
      close: parseFloat(d.close)
    }));

    // Sort 1-min data by time
    symbolData.sort((a, b) => a.datetime - b.datetime);

    // === NEW: Resample to 5-minute candles ===
    const resampledData = resampleTo5Min(symbolData);

    // Detect pivots and build ZigZag on 5-min data
    const withPivots = detectPivots(resampledData, pivotLegs);
    const zigzagPoints = buildZigZag(withPivots, priceDeviation);

    setProcessedData({
      rawData: withPivots,
      zigzagPoints,
      swingHighs: withPivots.filter(d => d.swingHigh).length,
      swingLows: withPivots.filter(d => d.swingLow).length
    });
  };

  // Memoized Plotly traces to avoid re-renders
  const plotlyData = useMemo(() => {
    if (!processedData) return [];

    const { rawData, zigzagPoints } = processedData;
    const traces = [];

    // 1. Candlestick trace (always visible)
    traces.push({
      type: 'candlestick',
      x: rawData.map(d => d.datetime),
      open: rawData.map(d => d.open),
      high: rawData.map(d => d.high),
      low: rawData.map(d => d.low),
      close: rawData.map(d => d.close),
      name: 'OHLC (5-min)',
      increasing: { line: { color: '#22c55e' } },
      decreasing: { line: { color: '#ef4444' } },
      hoverinfo: 'x+y',
      customdata: rawData.map(d => [d.open, d.high, d.low, d.close]),
      hovertemplate: '<b>%{x|%H:%M:%S}</b><br>O:%{customdata[0]:.2f} H:%{customdata[1]:.2f}<br>L:%{customdata[2]:.2f} C:%{customdata[3]:.2f}<extra></extra>'
    });

    // 2. ZigZag line trace
    if (showZigZag && zigzagPoints.length > 0) {
      traces.push({
        type: 'scatter',
        mode: 'lines+markers',
        x: zigzagPoints.map(p => rawData[p.idx].datetime),
        y: zigzagPoints.map(p => p.price),
        name: 'Zig Zag',
        line: { color: '#8b5cf6', width: 2 },
        marker: { size: 6, color: '#8b5cf6' },
        hovertemplate: '<b>%{x|%H:%M:%S}</b><br>Price: %{y:.2f}<extra></extra>'
      });
    }

    // 3. Swing High markers
    if (showSwingHighs) {
      const swingHighData = rawData.filter(d => d.swingHigh);
      if (swingHighData.length > 0) {
        traces.push({
          type: 'scatter',
          mode: 'markers',
          x: swingHighData.map(d => d.datetime),
          y: swingHighData.map(d => d.high),
          name: 'Swing High',
          marker: { 
            symbol: 'triangle-down', 
            size: 12, 
            color: '#ef4444',
            line: { color: '#dc2626', width: 1 }
          },
          hovertemplate: '<b>Swing High</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>'
        });
      }
    }

    // 4. Swing Low markers
    if (showSwingLows) {
      const swingLowData = rawData.filter(d => d.swingLow);
      if (swingLowData.length > 0) {
        traces.push({
          type: 'scatter',
          mode: 'markers',
          x: swingLowData.map(d => d.datetime),
          y: swingLowData.map(d => d.low),
          name: 'Swing Low',
          marker: { 
            symbol: 'triangle-up', 
            size: 12, 
            color: '#22c55e',
            line: { color: '#16a34a', width: 1 }
          },
          hovertemplate: '<b>Swing Low</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>'
        });
      }
    }

    return traces;
  }, [processedData, showZigZag, showSwingHighs, showSwingLows]);

  // Mini chart data (ZigZag only)
  const miniChartData = useMemo(() => {
    if (!processedData || !showMiniChart) return [];

    const { rawData, zigzagPoints } = processedData;
    
    if (zigzagPoints.length === 0) return [];

    return [{
      type: 'scatter',
      mode: 'lines+markers',
      x: zigzagPoints.map(p => rawData[p.idx].datetime),
      y: zigzagPoints.map(p => p.price),
      name: 'Zig Zag',
      line: { color: '#8b5cf6', width: 2 },
      marker: { size: 6, color: '#8b5cf6' }
    }];
  }, [processedData, showMiniChart]);

  // Main chart layout - ADJUSTABLE: Change height here (70vh)
  const mainLayout = {
    title: `${selectedSymbol || 'Symbol'} - 5m Candlestick with Zig Zag`,
    xaxis: {
      type: 'date',
      rangeslider: { visible: true },
      tickformat: '%H:%M'
    },
    yaxis: {
      title: 'Price',
      autorange: true
    },
    hovermode: 'x unified',
    showlegend: true,
    legend: { x: 0, y: 1 },
    margin: { l: 50, r: 50, t: 50, b: 50 },
    paper_bgcolor: 'white',
    plot_bgcolor: '#f8fafc'
  };

  // Mini chart layout - ADJUSTABLE: Change height here (30vh)
  const miniLayout = {
    title: 'Zig Zag Only',
    xaxis: {
      type: 'date',
      tickformat: '%H:%M'
    },
    yaxis: {
      title: 'Price',
      autorange: true
    },
    showlegend: false,
    margin: { l: 50, r: 50, t: 40, b: 40 },
    paper_bgcolor: 'white',
    plot_bgcolor: '#f8fafc'
  };

  // Plotly config - ADJUSTABLE: Modify toolbar buttons here
  const plotConfig = {
    scrollZoom: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToAdd: ['drawline', 'eraseshape'],
    toImageButtonOptions: {
      format: 'png',
      filename: `${selectedSymbol}_zigzag_5min`,
      height: 1080,
      width: 1920,
      scale: 2
    }
  };

  const symbols = csvData ? [...new Set(csvData.map(d => d.symbol))] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-full mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-md">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Technical Analysis Dashboard
              </h1>
              <p className="text-gray-600 text-[10px]">5-min resampled candlestick analysis with Zig Zag</p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
          <label className="flex flex-col items-center justify-center w-full h-20 px-3 border-2 border-dashed border-blue-300 rounded-md cursor-pointer hover:bg-blue-50 transition-all duration-300 hover:border-blue-400">
            <div className="flex flex-col items-center">
              <Upload className="w-6 h-6 text-blue-500 mb-1" />
              <span className="text-xs font-medium text-gray-700">
                {fileName ? `✓ ${fileName}` : 'Upload CSV File'}
              </span>
              <span className="text-[10px] text-gray-500">
                {csvData ? `${csvData.length} rows loaded` : 'Columns: symbol, time, open, high, low, close (1-min)'}
              </span>
            </div>
            <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
          </label>
        </div>

        {csvData && (
          <>
            {/* Parameters */}
            <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-800">Configuration</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Date (YYYYMMDD)
                  </label>
                  <input
                    type="text"
                    value={baseDate}
                    onChange={(e) => setBaseDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="20250111"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price Deviation (%)
                  </label>
                  <input
                    type="number"
                    value={priceDeviation}
                    onChange={(e) => setPriceDeviation(parseFloat(e.target.value))}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pivot Legs (k)
                  </label>
                  <input
                    type="number"
                    value={pivotLegs}
                    onChange={(e) => setPivotLegs(parseInt(e.target.value))}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Symbol
                  </label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {symbols.map(sym => (
                      <option key={sym} value={sym}>{sym}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={processData}
                className="w-full md:w-auto px-4 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Generate Analysis (5-min)
              </button>
            </div>

            {/* Statistics */}
            {processedData && (
              <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
                <h3 className="text-xs font-bold text-gray-800 mb-2">Statistics (5-min bars)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-md p-2 border border-blue-200">
                    <div className="text-xl font-bold text-blue-600">{processedData.rawData.length}</div>
                    <div className="text-[10px] text-gray-600 font-medium">Total 5-min Candles</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-md p-2 border border-red-200">
                    <div className="text-xl font-bold text-red-600">{processedData.swingHighs}</div>
                    <div className="text-[10px] text-gray-600 font-medium">Swing Highs</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-md p-2 border border-green-200">
                    <div className="text-xl font-bold text-green-600">{processedData.swingLows}</div>
                    <div className="text-[10px] text-gray-600 font-medium">Swing Lows</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-md p-2 border border-purple-200">
                    <div className="text-xl font-bold text-purple-600">{processedData.zigzagPoints.length}</div>
                    <div className="text-[10px] text-gray-600 font-medium">Zig Zag Points</div>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Controls & Toggles */}
            {processedData && (
              <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
                <h3 className="text-xs font-bold text-gray-800 mb-2">Chart Controls</h3>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showZigZag}
                      onChange={(e) => setShowZigZag(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-700">Show Zig Zag</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSwingHighs}
                      onChange={(e) => setShowSwingHighs(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-700">Show Swing Highs</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSwingLows}
                      onChange={(e) => setShowSwingLows(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-700">Show Swing Lows</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMiniChart}
                      onChange={(e) => setShowMiniChart(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-700">Show Mini Chart</span>
                  </label>
                </div>
              </div>
            )}

            {/* Main Candlestick Chart */}
            {processedData && (
              <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    5-min Candlestick Chart with Indicators
                  </h2>
                </div>
                <div className="w-full h-[70vh]">
                  <Plot
                    data={plotlyData}
                    layout={mainLayout}
                    config={plotConfig}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                </div>
              </div>
            )}

            {/* Mini ZigZag Chart (Optional) */}
            {processedData && showMiniChart && (
              <div className="bg-white rounded-lg shadow-sm p-3 border border-blue-100">
                <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Zig Zag Trend Only (5-min)
                </h2>
                <div className="w-full h-[30vh]">
                  <Plot
                    data={miniChartData}
                    layout={miniLayout}
                    config={plotConfig}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!csvData && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-blue-100">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Upload a CSV file to get started</p>
            <p className="text-gray-400 text-[10px] mt-1">
              Required columns: symbol, time (HHMMSS), open, high, low, close (1-min data)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


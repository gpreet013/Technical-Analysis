// src/App.jsx
import React, { useState } from "react";
import ZigZagDashboard from "./components/ZigZagDashboard";
// import HhHlFibDashboard from "./components/HhHlFibDashboard";
import Engulfing from "./components/Engulfing";
import Morning_and_evening_star from "./components/Morning_and_evening_star";
import SwingPivotDashboard from "./components/SwingPivotDashboard";


export default function App() {
  const [mode, setMode] = useState("zigzag"); // 'zigzag' | 'hhlfib'
  const [theme, setTheme] = useState("dark"); // 'light' | 'dark'

  const isDark = theme === "dark";

  return (
    <div
      className={
        isDark
          ? "min-h-screen bg-slate-900 text-slate-100 p-4"
          : "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4"
      }
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top bar: title + analysis type + theme toggle */}
        <div
          className={
            (isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-blue-100") +
            " rounded-lg shadow-sm p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border"
          }
        >
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent">
              Technical Analysis Lab
            </h1>
            <p className="text-xs text-gray-300">
              Choose which system you want to run on the uploaded file.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-200">
                Analysis Type
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className={
                  (isDark
                    ? "bg-slate-900 border-slate-600 text-slate-100"
                    : "bg-white border-gray-300 text-gray-900") +
                  " px-3 py-1.5 text-xs rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                }
              >
                <option value="zigzag">Zig Zag </option>
                {/* <option value="hhlfib">HH / HL + Fibonacci</option>
                <option value="hhlfib">LL / LH + Fibonacci</option> */}
                <option value="engulfing">Engulfing</option>
                <option value="stars">Morning / Evening Star</option>
                <option value="swings">Swing High / Swing Low</option>
           
              </select>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() =>
                setTheme((prev) => (prev === "light" ? "dark" : "light"))
              }
              className={
                (isDark
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-900 text-slate-50") +
                " px-3 py-1.5 text-xs rounded-md font-semibold flex items-center gap-1"
              }
            >
              {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </div>

        {/* Render selected dashboard */}
        {mode === "zigzag" && <ZigZagDashboard theme={theme} />}
        {/* {mode === "hhlfib" && <HhHlFibDashboard theme={theme} />} */}
        {mode === "engulfing" && <Engulfing theme={theme} />}
        {mode === "stars" && <Morning_and_evening_star theme={theme} />}
        {mode === "swings" && <SwingPivotDashboard theme={theme} />}

     
      </div>
    </div>
  );
}

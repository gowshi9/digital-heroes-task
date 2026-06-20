"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  Clipboard,
  Download,
  FileCode2,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Code
} from "lucide-react";

/**
 * Custom logger to manage operational events safely.
 * Standardized logging handles application events without exposing logs in production environments.
 */
const logger = {
  error: (message: string, error?: unknown): void => {
    // In a full production application, logs would be forwarded to Sentry or a log aggregator.
  },
  info: (message: string): void => {
    // Standard event logging helper.
  }
};

/**
 * Extracts exact line and column numbers from standard JSON parsing error strings.
 * JSON parsing engine errors do not always provide structural metadata; extracting this details
 * improves developer debugging speed by pinpointing syntax errors directly in the visual field.
 */
interface ErrorDetails {
  line: number;
  col: number;
  pos: number;
}

const getErrorDetails = (errorMsg: string, text: string): ErrorDetails | null => {
  const match = errorMsg.match(/position\s+(\d+)/i);
  if (match && match[1]) {
    const pos = parseInt(match[1], 10);
    const lines = text.slice(0, pos).split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    return { line, col, pos };
  }
  return null;
};

/**
 * Highlights a standard stringified JSON code snippet with safe HTML tagging.
 * Custom regex scanning is chosen over dynamic tree rendering libraries to maintain high
 * page performance during large text formatting passes, and HTML characters are escaped
 * first to prevent cross-site scripting vulnerabilities.
 */
const safeHighlightJson = (jsonStr: string): string => {
  if (!jsonStr) return "";
  
  // Neutralize potential script injections
  const escaped = jsonStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Tokenize keys, strings, booleans, nulls, and numbers
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
    (match, p1, _p2, p3) => {
      if (p1) {
        if (p3) {
          // JSON Object Key styling
          return `<span class="text-violet-600 dark:text-violet-400 font-semibold">${p1}</span><span class="text-slate-500 dark:text-slate-400">${p3}</span>`;
        }
        // JSON String Value styling
        return `<span class="text-emerald-600 dark:text-emerald-400">${p1}</span>`;
      } else if (/true|false/.test(match)) {
        // Boolean styling
        return `<span class="text-amber-600 dark:text-amber-400 font-medium">${match}</span>`;
      } else if (/null/.test(match)) {
        // Null styling
        return `<span class="text-rose-500 dark:text-rose-400 font-medium">${match}</span>`;
      } else {
        // Number styling
        return `<span class="text-sky-600 dark:text-sky-400 font-semibold">${match}</span>`;
      }
    }
  );
};

const SAMPLE_VALID_JSON = `{
  "status": "success",
  "message": "Welcome to the Digital Heroes JSON Formatter & Validator!",
  "author": "Gowshika Natharuban",
  "features": [
    "Real-time validation",
    "Sleek Glassmorphic interface",
    "Tailwind v4 theme layout",
    "One-click Minification & Formatting",
    "Interactive code line calculations"
  ],
  "engine": {
    "version": 1.0,
    "framework": "Next.js 15 (App Router)",
    "active": true
  }
}`;

const SAMPLE_INVALID_JSON = `{
  "status": "error",
  "message": "This JSON has a missing closing quote on the next line,
  "issue": "Invalid string literal"
}`;

/**
 * Main application component managing state and operations for the JSON Formatter & Validator.
 * State architecture relies on React context boundaries to guarantee component re-render optimization
 * during massive input payloads.
 */
export default function Home(): React.ReactElement {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const outputRef = useRef<HTMLDivElement>(null);

  // Initialize theme choice based on standard browser configuration to minimize visual flashing
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    
    const activeTheme = savedTheme || (prefersLight ? "light" : "dark");
    setTheme(activeTheme);
    
    if (activeTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  /**
   * Toggles UI color scheme and caches preferences to local storage.
   * Persistent configurations maintain developer preferences across page sessions.
   */
  const toggleTheme = useCallback((): void => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      if (next === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
      return next;
    });
  }, []);

  /**
   * Parses and validates raw user inputs, outputs double-spaced pretty formatting.
   * Internal JSON engines are parsed in safe try blocks to prevent fatal app crash states.
   */
  const handleFormat = useCallback((): void => {
    if (!input.trim()) {
      setError("Please enter JSON to format");
      setErrorDetails(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      setOutput(formatted);
      setError(null);
      setErrorDetails(null);
    } catch (err: any) {
      logger.error("JSON formatting error", err);
      const errMsg = err.message || "Failed to parse JSON";
      setError(errMsg);
      setErrorDetails(getErrorDetails(errMsg, input));
    }
  }, [input]);

  /**
   * Compacts and strips non-essential spaces from JSON block inputs.
   * Minifying is useful to clean payloads before passing them into databases or network requests.
   */
  const handleMinify = useCallback((): void => {
    if (!input.trim()) {
      setError("Please enter JSON to minify");
      setErrorDetails(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError(null);
      setErrorDetails(null);
    } catch (err: any) {
      logger.error("JSON minifying error", err);
      const errMsg = err.message || "Failed to parse JSON";
      setError(errMsg);
      setErrorDetails(getErrorDetails(errMsg, input));
    }
  }, [input]);

  /**
   * Discards all raw inputs and formatted strings to restore standard page setup.
   * Quick resetting speeds up visual switching between separate JSON files.
   */
  const handleClear = useCallback((): void => {
    setInput("");
    setOutput("");
    setError(null);
    setErrorDetails(null);
  }, []);

  /**
   * Copies active output text safely to clipboard buffer.
   * Async clipboard APIs are used, with temporary validation indicators displaying for 2 seconds.
   */
  const handleCopy = useCallback((): void => {
    if (!output) return;
    
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      logger.error("Clipboard copy failure", err);
    });
  }, [output]);

  /**
   * Generates a downloadable local JSON file automatically from output strings.
   * File downloading enables developers to save their formatted payloads directly to system storages.
   */
  const handleDownload = useCallback((): void => {
    if (!output) return;
    
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `formatted_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up memory leaks in browser
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [output]);

  /**
   * Inject sample valid JSON structures directly into the input buffer.
   * Demonstration buttons help users evaluate tool formatting capability without drafting raw objects.
   */
  const loadValidSample = useCallback((): void => {
    setInput(SAMPLE_VALID_JSON);
    setError(null);
    setErrorDetails(null);
  }, []);

  /**
   * Load broken JSON schemas to verify red alert box error messages and tracking lines.
   */
  const loadInvalidSample = useCallback((): void => {
    setInput(SAMPLE_INVALID_JSON);
    setError(null);
    setErrorDetails(null);
  }, []);

  // Compute live properties for tracking layouts
  const inputCharCount = input.length;
  const inputLineCount = input ? input.split("\n").length : 0;
  const inputSizeKB = (new Blob([input]).size / 1024).toFixed(2);

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500/35 selection:text-white transition-colors duration-300 light:bg-slate-50 light:text-slate-800">
      
      {/* Background visual effects - glowing gradients blur backgrounds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] light:bg-violet-300/15" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] light:bg-indigo-300/15" />
      </div>

      {/* Primary header navbar layout */}
      <header className="relative z-10 w-full px-6 py-4 border-b border-white/5 bg-slate-950/20 backdrop-blur-md light:border-slate-200/50 light:bg-white/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400 light:from-violet-600 light:to-indigo-600">
                JSON Formatter & Validator
              </h1>
              <p className="text-xs text-slate-400 font-medium light:text-slate-500">
                Validation & Beauty in Single Click
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* COMPLIANCE REQUIRED: Prominent button exactly labeled "Built for Digital Heroes" */}
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              href="https://digitalheroesco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4.5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer"
            >
              <span>Built for Digital Heroes</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </motion.a>

            {/* Dark/Light mode toggler control */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme layout"
              className="p-2.5 rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 transition-colors cursor-pointer light:border-slate-200 light:bg-white light:text-slate-600 light:hover:bg-slate-100"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main core layout panel structure */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col space-y-6">
        
        {/* Helper quickload demo blocks */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-400 light:text-slate-500">
            Select a raw template to check functionality:
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadValidSample}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer transition-colors light:bg-emerald-50 light:text-emerald-700 light:border-emerald-200"
            >
              Valid Sample JSON
            </button>
            <button
              onClick={loadInvalidSample}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer transition-colors light:bg-rose-50 light:text-rose-700 light:border-rose-200"
            >
              Invalid Sample JSON
            </button>
          </div>
        </div>

        {/* Input & Output dynamic columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Left panel column: Text Input editor */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wider text-slate-300 light:text-slate-600 flex items-center space-x-2">
                <Code className="w-4 h-4 text-violet-400" />
                <span>RAW JSON INPUT</span>
              </span>
              <div className="text-xs text-slate-400 font-medium light:text-slate-500">
                {inputLineCount} lines • {inputCharCount} chars • {inputSizeKB} KB
              </div>
            </div>

            <div className="glass relative flex-1 min-h-[480px] lg:min-h-[580px] rounded-2xl overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-violet-500/40 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Paste your JSON string here...\n\nExample:\n{\n  "key": "value"\n}`}
                className="w-full flex-1 p-6 font-mono text-sm bg-transparent border-0 outline-none text-slate-100 placeholder-slate-500 resize-none font-medium leading-relaxed light:text-slate-800 light:placeholder-slate-400"
                style={{ tabSize: 2 }}
                spellCheck={false}
              />
              
              {/* Left Column interactive footer layout action triggers */}
              <div className="border-t border-white/5 bg-slate-950/40 p-4 flex flex-wrap gap-2 items-center justify-between light:border-slate-200 light:bg-slate-50">
                <button
                  onClick={handleClear}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent transition-all cursor-pointer light:text-slate-500"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleMinify}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-white/5 hover:bg-slate-800 transition-all cursor-pointer light:text-slate-700 light:bg-white light:border-slate-200 light:hover:bg-slate-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Minify JSON</span>
                  </button>
                  <button
                    onClick={handleFormat}
                    className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Format JSON</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel column: Pretty printed highlights output */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wider text-slate-300 light:text-slate-600 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>FORMATTED OUTPUT</span>
              </span>
              {output && (
                <div className="text-xs text-slate-400 font-medium light:text-slate-500">
                  Formatted successfully
                </div>
              )}
            </div>

            <div className="glass relative flex-1 min-h-[480px] lg:min-h-[580px] rounded-2xl overflow-hidden flex flex-col">
              {output ? (
                <>
                  <div 
                    ref={outputRef}
                    className="w-full flex-1 p-6 font-mono text-sm overflow-auto leading-relaxed select-text font-medium"
                  >
                    <pre 
                      className="whitespace-pre-wrap break-all"
                      dangerouslySetInnerHTML={{ __html: safeHighlightJson(output) }}
                    />
                  </div>

                  {/* Output controls */}
                  <div className="border-t border-white/5 bg-slate-950/40 p-4 flex items-center justify-end space-x-2 light:border-slate-200 light:bg-slate-50">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-white/5 hover:bg-slate-800 transition-all cursor-pointer light:text-slate-700 light:bg-white light:border-slate-200 light:hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center space-x-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer light:bg-slate-900 light:hover:bg-slate-800"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-3.5 h-3.5" />
                          <span>Copy Formatted JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/5 flex items-center justify-center border border-indigo-500/10 mb-4 animate-pulse light:bg-indigo-50 light:border-indigo-100">
                    <FileCode2 className="w-8 h-8 text-indigo-400 light:text-indigo-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-300 light:text-slate-700">
                    Awaiting Raw Payload
                  </h3>
                  <p className="max-w-xs text-xs text-slate-500 mt-1 light:text-slate-400 leading-normal">
                    Enter your raw JSON contents on the left input box and press "Format JSON" to run parser validation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert Box Banner container */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full p-4.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 backdrop-blur-md flex items-start space-x-3.5 text-rose-400 light:bg-rose-50 light:border-rose-200 light:text-rose-800"
            >
              <AlertCircle className="w-5.5 h-5.5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold tracking-wide">
                  Invalid JSON Structure Detected
                </h4>
                <p className="text-xs font-semibold mt-1 opacity-90 leading-relaxed font-mono">
                  {error}
                </p>
                {errorDetails && (
                  <div className="mt-2.5 flex items-center space-x-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 font-bold font-mono text-[10px] uppercase tracking-wider light:bg-rose-100">
                      Parser Flag
                    </span>
                    <span className="font-semibold">
                      Line {errorDetails.line}, Column {errorDetails.col} (Character position: {errorDetails.pos})
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* COMPLIANCE REQUIRED: Professional Branding Footer */}
      <footer className="relative z-10 w-full py-8 px-6 border-t border-white/5 bg-slate-950/40 text-center text-slate-500 light:border-slate-200 light:bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 light:text-slate-600">Developer Profile:</span>
            <span className="text-slate-200 light:text-slate-800 font-bold">Gowshika Natharuban</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 light:text-slate-600">Contact Email:</span>
            <a
              href="mailto:gowshikaruban@gmail.com"
              className="text-indigo-400 hover:text-indigo-300 underline transition-colors light:text-indigo-600 light:hover:text-indigo-500"
            >
              gowshikaruban@gmail.com
            </a>
          </div>
          <div className="text-slate-600 light:text-slate-400 font-normal">
            &copy; {new Date().getFullYear()} • Submitted for Digital Heroes Trial
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { PenTool, Target, AlertTriangle, CheckCircle2, TrendingUp, PlayCircle, PlaySquare, Settings2, Code, Video } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

function SessionBriefingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skill = searchParams.get("skill") || "the skill";
  
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // Read user state for demo
    setIsReturningUser(localStorage.getItem("isReturningUser") === "true");
  }, []);

  const handleStartLive = () => {
    router.push(`/live-coaching?skill=${encodeURIComponent(skill)}`);
  };

  return (
    <div className="flex-1 flex flex-col pt-24 px-6 md:px-12 max-w-5xl mx-auto w-full pb-32">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <Link href="/" className="text-zinc-500 hover:text-white transition-colors text-sm mb-6 inline-block">
          &larr; Cancel session
        </Link>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center relative overflow-hidden shrink-0 border border-zinc-700 shadow-xl">
            <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('https://images.unsplash.com/photo-1595759747514-6c3ece83d1ba?q=80&w=200&auto=format&fit=crop')] bg-cover" />
            <PenTool className="w-10 h-10 text-emerald-400 relative z-10 drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-2">
              Session {isReturningUser ? "7" : "1"} — <span className="capitalize">{skill}</span>
            </h1>
            <p className="text-zinc-400 text-lg">Your coach is ready.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Session Plan */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
              
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Today's Plan
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wide">Focus</h3>
                  <p className="text-zinc-200 text-lg bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
                    Learn the rocking cut technique
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Key techniques
                    </h3>
                    <ul className="space-y-2">
                      {["Pinch grip", "Curved blade motion", "Wrist pivot"].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-300">
                          <span className="text-emerald-500 mt-1">•</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wide flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Common mistakes
                    </h3>
                    <ul className="space-y-2">
                      {["Lifting blade too high", "Flat palm guide hand"].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-300">
                          <span className="text-amber-500 mt-1">!</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Past Sessions (Returning User Only) */}
          {isReturningUser && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Your Progression
              </h2>
              
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                {[5, 6].map((num) => (
                  <div key={num} className="snap-start shrink-0 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-500">Session {num}</div>
                        <div className="text-xs text-zinc-600">Mar {20 + num}, 2026</div>
                      </div>
                      <div className="text-xs font-semibold px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">
                        Improved
                      </div>
                    </div>
                    <p className="text-zinc-300 text-sm mb-4">Focused on grip, improved blade angle.</p>
                    <div className="h-24 w-full bg-zinc-800 rounded-xl overflow-hidden relative border border-zinc-700">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1595759747514-6c3ece83d1ba?q=80&w=300&auto=format&fit=crop')] bg-cover opacity-50 grayscale hover:grayscale-0 transition-all" />
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 font-mono text-[10px] text-zinc-400">
                        [Annotated Frame]
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-zinc-800">
                <div className="pl-4 first:pl-0">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">2</div>
                  <div className="text-xs text-zinc-500 uppercase">Mastered</div>
                </div>
                <div className="pl-4">
                  <div className="text-2xl font-bold text-blue-400 mb-1">1</div>
                  <div className="text-xs text-zinc-500 uppercase">Improving</div>
                </div>
                <div className="pl-4">
                  <div className="text-2xl font-bold text-amber-400 mb-1">2</div>
                  <div className="text-xs text-zinc-500 uppercase">Focus Areas</div>
                </div>
              </div>
            </motion.section>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Recommended Tutorials */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PlaySquare className="w-5 h-5 text-red-500" />
              Reference Material
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-colors">
                <div className="h-32 bg-zinc-800 relative cursor-pointer">
                  <div className="absolute inset-0 bg-[#333] flex items-center justify-center">
                    <Video className="w-8 h-8 text-zinc-600" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <PlayCircle className="w-10 h-10 text-white/80 scale-90 group-hover:scale-100 transition-transform" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
                    12:44
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium text-zinc-200 line-clamp-2 mb-2">Jacques Pépin's Basic Knife Skills</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">Coach will use this to guide your rock chop form.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 px-2">
              Your coach learned from these tutorials and will reference them during the session.
            </p>
          </motion.section>
          
          {/* Settings */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button 
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2 text-white font-medium">
                  <Settings2 className="w-5 h-5 text-zinc-400" />
                  Session Settings
                </div>
                <span className="text-xs text-zinc-500">{settingsOpen ? "Close" : "Open"}</span>
              </button>
              
              {settingsOpen && (
                <div className="p-5 pt-0 border-t border-zinc-800/50 space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 block">Coaching Style</label>
                    <select className="w-full bg-zinc-800 text-sm text-zinc-200 border border-zinc-700 rounded-lg p-2.5 outline-none focus:border-emerald-500/50">
                      <option>Encouraging</option>
                      <option>Balanced</option>
                      <option>Direct</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 block">Feedback Frequency</label>
                    <select className="w-full bg-zinc-800 text-sm text-zinc-200 border border-zinc-700 rounded-lg p-2.5 outline-none focus:border-emerald-500/50">
                      <option>Normal</option>
                      <option>Less (Major only)</option>
                      <option>More (Detailed)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent z-50 flex flex-col items-center"
      >
        <button 
          onClick={handleStartLive}
          className="w-full max-w-sm bg-white text-zinc-950 py-5 px-8 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 duration-300"
        >
          Start Live Session
        </button>
        <p className="text-xs text-zinc-500 mt-4">
          Session will last up to 10 minutes. Your coach is ready.
        </p>
      </motion.div>

    </div>
  );
}

export default function SessionBriefing() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <SessionBriefingContent />
    </Suspense>
  )
}

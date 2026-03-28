"use client";

import { motion } from "framer-motion";
import { ArrowRight, Video, Brain, PenTool } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function StartScreen() {
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Simulate returning user toggle for demo purposes
  useEffect(() => {
    const returning = localStorage.getItem("isReturningUser") === "true";
    setIsReturningUser(returning);
  }, []);

  const toggleUserMode = () => {
    const newState = !isReturningUser;
    setIsReturningUser(newState);
    localStorage.setItem("isReturningUser", String(newState));
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-3xl w-full flex flex-col items-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            Live Video Analysis System Active
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance">
            {isReturningUser ? "Welcome back." : "Learn anything. Get coached live."}
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto text-balance">
            {isReturningUser 
              ? "Your AI coach has analyzed your progress. Let's pick up where you left off." 
              : "AI that teaches itself your skill, then teaches you — with real-time video feedback."}
          </p>
        </motion.div>

        {isReturningUser ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center w-full max-w-md gap-6"
          >
            <div className="w-full p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-md text-left flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center relative">
                {/* Simulated generated icon for returning user */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1595759747514-6c3ece83d1ba?q=80&w=200&auto=format&fit=crop')] bg-cover" />
                <PenTool className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Knife Skills</h3>
                <p className="text-zinc-400 text-sm mb-2">Session 6 • Focus: Rocking cut</p>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md">2 Mastered</span>
                  <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md">3 Sessions</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row w-full gap-4">
              <Link href="/session-briefing" className="flex-1">
                <button className="w-full group relative flex items-center justify-center gap-2 bg-white text-zinc-950 px-8 py-4 rounded-xl font-semibold hover:bg-zinc-200 transition-all duration-300">
                  Continue Session
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/skill-selection" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-8 py-4 rounded-xl font-semibold hover:bg-zinc-800 transition-all duration-300">
                  New Skill
                </button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center w-full"
          >
            <Link href="/skill-selection">
              <button className="group relative flex items-center justify-center gap-2 bg-white text-zinc-950 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-zinc-200 hover:scale-105 transition-all duration-300 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                Start Learning
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            
            <p className="mt-8 text-sm text-zinc-500 flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Brain className="w-4 h-4"/> Gemini Live</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span className="flex items-center gap-1.5"><PenTool className="w-4 h-4"/> Nano Banana</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span className="flex items-center gap-1.5"><Video className="w-4 h-4"/> Workspace</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* Dev toggle for demoing both states */}
      <button 
        onClick={toggleUserMode}
        className="absolute bottom-6 right-6 text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/50"
      >
        Toggle User State (Dev)
      </button>
    </div>
  );
}

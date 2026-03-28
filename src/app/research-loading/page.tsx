"use client";

import { motion } from "framer-motion";
import { Search, PlaySquare, Target, CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const RESEARCH_STEPS = [
  { id: 1, type: "search", text: "Searching for technique fundamentals...", time: 0 },
  { id: 2, type: "youtube", text: "Found: 'Jacques Pépin's Knife Skills'", time: 2000 },
  { id: 3, type: "youtube", text: "Analyzing grip and wrist movements at 2:43...", time: 3500 },
  { id: 4, type: "target", text: "Form identified: pinch grip, wrist pivot", time: 6000 },
  { id: 5, type: "target", text: "Common mistakes cataloged: lifting blade too high", time: 7500 },
  { id: 6, type: "check", text: "Session plan ready", time: 9000 },
];

function ResearchLoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skill = searchParams.get("skill") || "the skill";
  
  const [activeSteps, setActiveSteps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let timeouts: NodeJS.Timeout[] = [];

    // Simulate progress bar
    progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + 1.2;
      });
    }, 100);

    // Simulate arriving steps
    RESEARCH_STEPS.forEach(step => {
      const timeout = setTimeout(() => {
        setActiveSteps(prev => [...prev, step.id]);
        if (step.id === RESEARCH_STEPS.length) {
          setIsComplete(true);
          // Auto transition
          setTimeout(() => {
            router.push(`/session-briefing?skill=${encodeURIComponent(skill)}`);
          }, 2000);
        }
      }, step.time);
      timeouts.push(timeout);
    });

    return () => {
      clearInterval(progressInterval);
      timeouts.forEach(clearTimeout);
    };
  }, [skill, router]);

  const getIcon = (type: string) => {
    switch (type) {
      case "search": return <Search className="w-5 h-5 text-blue-400" />;
      case "youtube": return <PlaySquare className="w-5 h-5 text-red-500" />;
      case "target": return <Target className="w-5 h-5 text-amber-400" />;
      case "check": return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default: return <Search className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" 
      />

      <div className="max-w-2xl w-full z-10 flex flex-col items-center">
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-12 flex items-center gap-3">
          Learning about {skill}
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="inline-block w-2 h-2 rounded-full bg-emerald-500 mb-1"
          />
        </h1>

        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[300px] max-h-[300px] overflow-hidden flex flex-col justify-end shadow-2xl relative">
          
          {/* Fading overlay at top to mask incoming items nicely */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-zinc-900/50 to-transparent z-10" />

          <div className="flex flex-col gap-4 relative z-0">
            {RESEARCH_STEPS.map((step) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                animate={
                  activeSteps.includes(step.id)
                    ? { opacity: 1, x: 0, height: "auto", marginBottom: 16 }
                    : { opacity: 0, x: -20, height: 0, marginBottom: 0 }
                }
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0 bg-zinc-800 p-2 rounded-lg">
                  {getIcon(step.type)}
                </div>
                <div className="text-zinc-300 font-medium py-1">
                  {step.text}
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* Progress Bar */}
        <div className="w-full mt-10">
          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <motion.div 
              className="h-full bg-emerald-500 relative"
              style={{ width: `${progress}%` }}
              layout
            >
              <div className="absolute inset-0 bg-white/20" />
            </motion.div>
          </div>
          <div className="mt-4 flex justify-between items-center h-10">
            <span className="text-sm text-zinc-500 font-mono">
              {Math.floor(progress)}% prepared
            </span>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: isComplete ? 1 : 0 }}
              onClick={() => router.push(`/session-briefing?skill=${encodeURIComponent(skill)}`)}
              className="flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Begin Session <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ResearchLoading() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <ResearchLoadingContent />
    </Suspense>
  )
}

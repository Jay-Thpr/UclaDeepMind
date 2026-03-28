"use client";

import { motion } from "framer-motion";
import { Search, ChevronRight, PenTool } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESET_SKILLS = [
  {
    id: "knife-skills",
    name: "Knife skills",
    description: "Grip, cuts, safety",
    iconColor: "text-emerald-400",
    bgPattern: "bg-[url('https://images.unsplash.com/photo-1595759747514-6c3ece83d1ba?q=80&w=200&auto=format&fit=crop')]",
    sessions: 3,
  },
  {
    id: "free-throw",
    name: "Free throw",
    description: "Form, arc, follow-through",
    iconColor: "text-orange-400",
    bgPattern: "bg-[url('https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=200&auto=format&fit=crop')]",
    sessions: 0,
  },
  {
    id: "guitar-chords",
    name: "Guitar chords",
    description: "Finger placement, transitions",
    iconColor: "text-amber-400",
    bgPattern: "bg-[url('https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=200&auto=format&fit=crop')]",
    sessions: 0,
  },
  {
    id: "watercolor",
    name: "Watercolor",
    description: "Brush control, washes, blending",
    iconColor: "text-blue-400",
    bgPattern: "bg-[url('https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=200&auto=format&fit=crop')]",
    sessions: 1,
  },
];

export default function SkillSelection() {
  const router = useRouter();
  const [customSkill, setCustomSkill] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSelectSkill = (skillId: string, skillName: string) => {
    // In a real app we'd save to state/context. We navigate to session prep.
    router.push(`/session-prep?skill=${encodeURIComponent(skillName)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkill.trim()) {
      handleSelectSkill("custom", customSkill.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-24 px-6 md:px-12 max-w-6xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <Link href="/" className="text-zinc-500 hover:text-white transition-colors text-sm mb-6 inline-block">
          &larr; Back to start
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
          What do you want to learn?
        </h1>

        <form onSubmit={handleSubmit} className="relative group max-w-2xl">
          <div className={`absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
          <div className="relative flex items-center bg-zinc-900 border border-zinc-700/50 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all shadow-xl">
            <Search className="w-6 h-6 text-zinc-400 ml-6" />
            <input
              type="text"
              className="w-full bg-transparent border-none outline-none py-6 px-4 text-xl text-white placeholder-zinc-500"
              placeholder="Describe any skill — origami, free throws, guitar..."
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {customSkill && (
              <button 
                type="submit"
                className="mr-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-2 rounded-xl transition-colors flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Suggestions */}
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: isFocused && !customSkill ? 1 : 0, height: isFocused && !customSkill ? 'auto' : 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 px-2 text-sm text-zinc-400 flex items-center gap-2">
              <span className="text-zinc-500">Try:</span>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setCustomSkill("knife techniques"); }} className="hover:text-emerald-400 transition-colors">knife techniques</button>,
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setCustomSkill("jump rope tricks"); }} className="hover:text-emerald-400 transition-colors">jump rope tricks</button>
            </div>
          </motion.div>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pb-24"
      >
        <h2 className="text-xl font-medium text-zinc-400 mb-6">Or select a core skill</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRESET_SKILLS.map((skill, i) => (
            <motion.button
              key={skill.id}
              onClick={() => handleSelectSkill(skill.id, skill.name)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + (i * 0.05) }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex flex-col text-left bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-full"
            >
              <div className="w-full h-32 relative bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <div className={`absolute inset-0 opacity-40 mix-blend-overlay ${skill.bgPattern} bg-cover bg-center group-hover:scale-105 transition-transform duration-700`} />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                <PenTool className={`w-10 h-10 ${skill.iconColor} relative z-10 drop-shadow-lg`} />
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">{skill.name}</h3>
                  <p className="text-sm text-zinc-400 text-balance line-clamp-2">{skill.description}</p>
                </div>
                
                {skill.sessions > 0 && (
                  <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {skill.sessions} sessions
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

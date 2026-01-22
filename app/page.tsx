'use client';

import { useState } from "react";
import Link from "next/link";
import { IconLeaf, IconArrowRight } from "@tabler/icons-react";

const navItems = [
  { label: "Home", href: "#" },
  { label: "Docs", href: "#docs" },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState(0);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="fixed top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="relative rounded-full min-w-[700px]">
          <div className="backdrop-blur-md rounded-full px-8 py-3 flex items-center justify-between gap-16 border border-white/20 bg-black/80">
            <div className="flex items-center gap-2">
              <IconLeaf className="h-8 w-8 text-green-500" />
              <span className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                CarbonTrack
              </span>
            </div>
            <nav className="flex items-center gap-8">
              {navItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => setActiveNav(index)}
                  className={`text-sm font-medium transition-colors ${activeNav === index ? "text-green-400" : "text-white/70 hover:text-white"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center min-h-screen pt-20">
        <div className="text-center max-w-3xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
            Track your carbon footprint,
            <br />
            powered by AI.
          </h1>
          <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
            Upload your bills, get instant carbon insights, and receive personalized recommendations to reduce your environmental impact.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/login" className="px-8 py-3 rounded-full font-semibold text-black bg-gradient-to-r from-green-500 to-emerald-600 transition-all hover:scale-105 inline-flex items-center gap-2">
              Get Started
              <IconArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#docs" className="px-8 py-3 rounded-full font-semibold border border-white/20 text-white hover:bg-white/10 transition-all">
              Learn More
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="text-2xl font-bold text-green-400">0.82</div>
              <div className="text-xs text-white/50">kg CO2/kWh</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="text-2xl font-bold text-green-400">2.31</div>
              <div className="text-xs text-white/50">kg CO2/L Petrol</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="text-2xl font-bold text-green-400">21</div>
              <div className="text-xs text-white/50">kg CO2/Tree/Year</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <div className="text-2xl font-bold text-green-400">27</div>
              <div className="text-xs text-white/50">kg CO2/kg Beef</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="docs" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:border-green-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Bills</h3>
              <p className="text-sm text-white/60">
                Simply upload your electricity, gas, fuel, or shopping receipts. Our AI extracts all the relevant data.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:border-green-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Get Your Score</h3>
              <p className="text-sm text-white/60">
                Receive a personalized carbon score similar to a credit score. See exactly where your emissions come from.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:border-green-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Take Action</h3>
              <p className="text-sm text-white/60">
                Get AI-powered recommendations and track your progress as you reduce your environmental impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconLeaf className="h-5 w-5 text-green-500" />
            <span className="text-sm text-white/50">CarbonTrack</span>
          </div>
          <p className="text-sm text-white/30">AI-Powered Carbon Footprint Calculator</p>
        </div>
      </footer>
    </div>
  );
}

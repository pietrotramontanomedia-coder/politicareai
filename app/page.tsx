'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-dvh flex flex-col justify-center px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-2xl w-full">
        {/* Logo e titolo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <svg viewBox="0 0 120 120" className="h-20 w-20" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="35" width="20" height="20" fill="var(--accento)" rx="2"/>
            <rect x="50" y="25" width="20" height="20" fill="var(--accento)" rx="2"/>
            <rect x="90" y="35" width="20" height="20" fill="var(--accento)" rx="2"/>
            <line x1="50" y1="60" x2="70" y2="60" stroke="var(--accento)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-center text-4xl sm:text-5xl font-bold tracking-tight text-balance"
        >
          Politicare
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-4 text-center text-base sm:text-lg"
          style={{ color: 'var(--fg-muta)' }}
        >
          Capisci la politica italiana, un&apos;affermazione alla volta
        </motion.p>

        {/* Griglia moduli */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-16 space-y-4 sm:space-y-6"
        >
          {/* Test Allineamento */}
          <Link href="/test-partito">
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ y: 0 }}
              className="group relative overflow-hidden rounded-2xl border p-8 sm:p-10 transition-all hover:shadow-xl cursor-pointer"
              style={{
                borderColor: 'var(--bordo)',
                background: 'var(--bg-card)',
              }}
            >
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold mb-4"
                  style={{ background: 'rgba(255,221,0,0.1)', color: 'var(--accento)' }}>
                  📊 Test
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">Con quale partito sei allineato?</h2>
                <p className="mt-3 text-base" style={{ color: 'var(--fg-muta)' }}>
                  12 affermazioni concrete. Scopri quale partito rispecchia meglio le tue posizioni su economia, diritti, ambiente e altro.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accento)' }}>
                  Inizia il test <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                style={{ background: 'var(--accento)' }}
              />
            </motion.div>
          </Link>

          {/* Quiz Settimanale */}
          <Link href="/quiz-settimanale">
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ y: 0 }}
              className="group relative overflow-hidden rounded-2xl border p-8 sm:p-10 transition-all hover:shadow-xl cursor-pointer"
              style={{
                borderColor: 'var(--bordo)',
                background: 'var(--bg-card)',
              }}
            >
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold mb-4"
                  style={{ background: 'rgba(255,221,0,0.1)', color: 'var(--accento)' }}>
                  🧠 Quiz
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">Quiz Settimanale</h2>
                <p className="mt-3 text-base" style={{ color: 'var(--fg-muta)' }}>
                  Domande su fatti politici attuali. Testa la tua cultura politica e rimani aggiornato sugli avvenimenti della settimana.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accento)' }}>
                  Fai il quiz <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                style={{ background: 'var(--accento)' }}
              />
            </motion.div>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-16 text-center text-sm"
          style={{ color: 'var(--fg-muta)' }}
        >
          <p>Le tue risposte restano sul tuo dispositivo.</p>
          <p className="mt-2">
            <Link href="/metodologia" className="underline hover:no-underline" style={{ color: 'var(--accento)' }}>
              Scopri come funzioniamo
            </Link>
          </p>
        </motion.div>
      </div>
    </motion.main>
  );
}

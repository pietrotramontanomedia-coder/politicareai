'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import FeedSection from '@/components/FeedSection';
import UltimOraTicker from '@/components/UltimOraTicker';
import LanciAgenzie from '@/components/agenzie/LanciAgenzie';
import PostCarousel from '@/components/PostCarousel';
import Logo from '@/components/Logo';

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-dvh flex flex-col"
    >
      {/* Hero: ultim'ora, logo, claim e post */}
      <section className="banda banda-hero px-4 sm:px-6 pt-8 pb-14">
        <div className="mx-auto max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <UltimOraTicker limite={5} />
            <div className="mt-3">
              <LanciAgenzie limite={3} />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <Logo size="xl" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-4 text-center text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
          >
            La politica, spiegata
            <br />
            <span style={{ color: 'var(--accento)' }}>senza schieramenti</span>.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <PostCarousel />
          </motion.div>
        </div>
      </section>

      {/* Strumenti: test e quiz */}
      <section className="banda banda-elevata px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
          >
            <span className="occhiello">Strumenti</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold">Mettiti alla prova</h2>
            <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
              Due modi per capire dove stai e quanto ne sai. Tutto resta sul tuo dispositivo.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Link href="/test-partito">
              <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ y: 0 }}
                className="group relative overflow-hidden rounded-2xl border p-8 sm:p-10 transition-all hover:shadow-xl cursor-pointer h-full"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
              >
                <div className="relative z-10">
                  <div
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold mb-4"
                    style={{ background: 'rgba(255,221,0,0.1)', color: 'var(--accento)' }}
                  >
                    📊 Test
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold">Con quale partito sei allineato?</h3>
                  <p className="mt-3 text-base" style={{ color: 'var(--fg-muta)' }}>
                    18 affermazioni concrete. Scopri quale partito rispecchia meglio le tue posizioni su economia, diritti, giustizia, ambiente e altro.
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

            <Link href="/quiz-settimanale">
              <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ y: 0 }}
                className="group relative overflow-hidden rounded-2xl border p-8 sm:p-10 transition-all hover:shadow-xl cursor-pointer h-full"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
              >
                <div className="relative z-10">
                  <div
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold mb-4"
                    style={{ background: 'rgba(255,221,0,0.1)', color: 'var(--accento)' }}
                  >
                    🧠 Quiz
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold">Quiz Settimanale</h3>
                  <p className="mt-3 text-base" style={{ color: 'var(--fg-muta)' }}>
                    Sette domande sui fatti politici della settimana, divise fra Italia ed estero. Ogni risposta ha spiegazione e fonte.
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
        </div>
      </section>

      {/* Notizie e Ultim'ora */}
      <FeedSection />

      {/* Footer */}
      <section className="banda banda-footer px-4 sm:px-6 py-10 mt-auto">
        <div className="mx-auto max-w-6xl w-full text-center text-sm" style={{ color: 'var(--fg-muta)' }}>
          <p>Le tue risposte restano sul tuo dispositivo.</p>
          <p className="mt-2">
            <Link href="/metodologia" className="underline hover:no-underline" style={{ color: 'var(--accento)' }}>
              Scopri come funzioniamo
            </Link>
          </p>
        </div>
      </section>
    </motion.main>
  );
}

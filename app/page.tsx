'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import FeedSection from '@/components/FeedSection';
import UltimOraTicker from '@/components/UltimOraTicker';
import PostCarousel from '@/components/PostCarousel';
import Logo from '@/components/Logo';
import GrigliaStrumenti from '@/components/strumenti/GrigliaStrumenti';
import { TESTI_STRUMENTI } from '@/lib/strumenti';

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

      {/* Strumenti: griglia a mosaico, ogni strumento con la sua anteprima */}
      <section className="banda banda-elevata px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
          >
            <span className="occhiello">{TESTI_STRUMENTI.occhiello}</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold">{TESTI_STRUMENTI.titolo}</h2>
            <p className="mt-2 max-w-2xl text-base" style={{ color: 'var(--fg-muta)' }}>
              {TESTI_STRUMENTI.sottotitolo}
            </p>
          </motion.div>

          <GrigliaStrumenti />
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

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import FeedSection from '@/components/FeedSection';
import UltimOraTicker from '@/components/UltimOraTicker';
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
              Capire dove stai tu, dove stanno i partiti e come i voti diventano seggi. Tutto resta sul tuo dispositivo.
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
                    20 affermazioni concrete e 13 partiti. Scopri quale partito rispecchia meglio le tue posizioni su economia, diritti, giustizia, ambiente e altro.
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

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {[
              {
                href: '/confronta',
                etichetta: '⚖️ Confronta',
                titolo: 'Dove stanno i partiti',
                testo: 'Tema per tema, chi è favorevole, chi è contrario e da quale fonte lo sappiamo. Senza punteggi.',
                azione: 'Confronta i partiti',
              },
              {
                href: '/simulatore',
                etichetta: '🏛️ Simulatore',
                titolo: 'Dai voti ai seggi',
                testo: 'Inserisci le percentuali e guarda come diventano seggi con la nuova legge elettorale, premio al 42% compreso.',
                azione: 'Apri il simulatore',
              },
            ].map((card) => (
              <Link key={card.href} href={card.href}>
                <motion.div
                  whileHover={{ y: -4 }}
                  whileTap={{ y: 0 }}
                  className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border p-6 sm:p-8 transition-all hover:shadow-xl"
                  style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
                >
                  <div
                    className="mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold"
                    style={{ background: 'rgba(255,221,0,0.1)', color: 'var(--accento)' }}
                  >
                    {card.etichetta}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold">{card.titolo}</h3>
                  <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
                    {card.testo}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accento)' }}>
                    {card.azione} <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Gioco da tavolo */}
      <section className="banda banda-gioco px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="max-w-xl">
              <span className="occhiello">Per il gruppo</span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold">Crisi di Governo</h2>
              <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
                Il gioco di società della politica italiana: mozioni di sfiducia, ostruzionismo e leggi che restano
                in vigore. Si passa il telefono e si gioca. Riservato ai maggiorenni, con modalità analcolica.
              </p>
            </div>
            <Link
              href="/gioco"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--accento)', color: '#000' }}
            >
              Apri la seduta →
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

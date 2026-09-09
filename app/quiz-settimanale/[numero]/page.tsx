import { notFound, permanentRedirect } from 'next/navigation';
import QuizSettimanale from '@/components/quiz-settimanale/QuizSettimanale';
import { archivioQuiz, caricaQuizCorrente, caricaQuizPerNumero, formattaPeriodo, TESTI_QUIZ, TUTTI_I_QUIZ } from '@/lib/quiz';

interface Props {
  params: Promise<{ numero: string }>;
}

/** Una pagina statica per ogni quiz pubblicato: /quiz-settimanale/1, /2, ... */
export function generateStaticParams() {
  return TUTTI_I_QUIZ.map((q) => ({ numero: String(q.numero) }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { numero } = await params;
  const quiz = caricaQuizPerNumero(Number(numero));
  if (!quiz) return {};
  return {
    title: `${TESTI_QUIZ.intestazione(quiz)} — Politicare`,
    description: `${quiz.descrizione} Fatti ${formattaPeriodo(quiz.periodo.dal, quiz.periodo.al)}.`,
  };
}

export default async function QuizPerNumeroPage({ params }: Props) {
  const { numero } = await params;
  const quiz = caricaQuizPerNumero(Number(numero));
  if (!quiz) notFound();

  // Il quiz più recente ha una sola URL canonica.
  if (quiz.numero === caricaQuizCorrente().numero) permanentRedirect('/quiz-settimanale');

  return <QuizSettimanale quiz={quiz} archivio={archivioQuiz(quiz.numero)} />;
}

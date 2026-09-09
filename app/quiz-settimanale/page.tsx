import QuizSettimanale from '@/components/quiz-settimanale/QuizSettimanale';
import { caricaQuizCorrente, formattaData } from '@/lib/quiz';

const quiz = caricaQuizCorrente();

export const metadata = {
  title: `${quiz.titolo} · ${quiz.sottotitolo} — Politicare`,
  description: `${quiz.descrizione} Fatti dal ${formattaData(quiz.periodo.dal)} al ${formattaData(quiz.periodo.al)}.`,
};

export default function QuizSettimanalePage() {
  return <QuizSettimanale quiz={quiz} />;
}

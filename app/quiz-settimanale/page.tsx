import QuizSettimanale from '@/components/quiz-settimanale/QuizSettimanale';
import { archivioQuiz, caricaQuizCorrente, formattaPeriodo, TESTI_QUIZ } from '@/lib/quiz';

const quiz = caricaQuizCorrente();

export const metadata = {
  title: `${TESTI_QUIZ.intestazione(quiz)} — Politicare`,
  description: `${quiz.descrizione} Fatti ${formattaPeriodo(quiz.periodo.dal, quiz.periodo.al)}.`,
};

export default function QuizSettimanalePage() {
  return <QuizSettimanale quiz={quiz} archivio={archivioQuiz(quiz.numero)} />;
}

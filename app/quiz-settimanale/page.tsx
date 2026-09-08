import QuizSettimanale from '@/components/quiz-settimanale/QuizSettimanale';
import quizData from '@/content/quiz/2027-w36.json';
import type { QuizSettimanale as QuizSettimanaleType } from '@politicare/motore';

export const metadata = {
  title: 'Quiz Settimanale — Politicare',
  description: 'Domande settimanali su fatti politici attuali in Italia.',
};

export default function QuizSettimanalePageComponent() {
  return <QuizSettimanale quiz={quizData as QuizSettimanaleType} />;
}

import { DIFFICULTY_LABELS } from "../../utils/constants.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * One quiz question with selectable options.
 *
 * The correct answer is only used for styling after a submission has been
 * accepted; it never reaches this component before that point.
 */
export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selected,
  onSelect,
  onSubmit,
  feedback,
  disabled = false,
}) {
  if (!question) return null;

  const answered = Boolean(feedback);

  return (
    <section className="card" aria-labelledby="question-heading">
      <div className="quiz-meta">
        <span>
          Question {questionNumber} of {totalQuestions}
        </span>
        <span>
          {DIFFICULTY_LABELS[question.difficulty] || question.difficulty} ·{" "}
          {question.points} pts
        </span>
      </div>

      <h2 id="question-heading">{question.question}</h2>

      <div className="option-list" role="group" aria-labelledby="question-heading">
        {question.options.map((option, index) => {
          let className = "option-button";
          if (answered) {
            if (option === feedback.correctAnswer) className += " is-correct";
            else if (option === selected) className += " is-incorrect";
          }
          return (
            <button
              key={option}
              type="button"
              className={className}
              onClick={() => onSelect(option)}
              aria-pressed={selected === option}
              disabled={disabled || answered}
            >
              <span className="option-letter" aria-hidden="true">
                {LETTERS[index] || index + 1}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {!answered ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={disabled || !selected}
        >
          Submit answer
        </button>
      ) : null}
    </section>
  );
}

export default QuestionCard;

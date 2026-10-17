import type {Asked} from '@/lib/game';
import {clueVisual} from '@/lib/clues';

export default function ClueResult({question,compact=false}:{question:Asked;compact?:boolean}){
  const visual=clueVisual(question);
  return <div className={`clue-result clue-${visual.tone}${compact?' compact':''}`}>
    <span className="clue-result-symbol" aria-hidden="true">{visual.outcome==='hotter'?'↑':visual.outcome==='colder'?'↓':visual.outcome==='yes'?'✓':visual.outcome==='no'?'×':'•'}</span>
    <div><small>{question.category} · {question.title}</small><strong>{visual.label}</strong>
    {visual.explanation&&<p>{visual.explanation}</p>}
    {question.answer&&question.answer.trim().toLowerCase()!==visual.outcome&&<p className="clue-answer-notes">{question.answer}</p>}
    {question.status==='answered'&&!visual.outcome&&<p>Interpret this answer manually on the map.</p>}
    </div>
  </div>;
}

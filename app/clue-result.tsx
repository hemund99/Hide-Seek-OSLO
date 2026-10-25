import type {Asked} from '@/lib/game';
import {clueVisual} from '@/lib/clues';
import {ArrowDownRight,ArrowUpRight,Check,Minus,X} from 'lucide-react';

function ClueArt({question}:{question:Asked}){
 const {outcome}=clueVisual(question);
 if(question.category==='Radar'&&(outcome==='yes'||outcome==='no'))return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="clue-art"><circle cx="32" cy="32" r="27" fill="currentColor" fillOpacity=".06" stroke="currentColor" strokeOpacity=".4"/><circle cx="32" cy="32" r="18" stroke="currentColor" strokeOpacity=".3"/><circle cx="32" cy="32" r="8" stroke="currentColor" strokeOpacity=".3"/><path d="M32 5V59M5 32H59" stroke="currentColor" strokeOpacity=".18"/><path d="M32 32V5A27 27 0 0 1 55.4 18.5Z" fill="currentColor" fillOpacity=".13"/><circle cx={outcome==='yes'?40:56} cy={outcome==='yes'?22:8} r="5" fill="currentColor"/><circle cx={outcome==='yes'?40:56} cy={outcome==='yes'?22:8} r="8" stroke="currentColor" strokeOpacity=".3"/></svg>;
 if(question.category==='Thermometer'&&(outcome==='hotter'||outcome==='colder'))return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="clue-art"><path d="M26 12A7 7 0 0 1 40 12V37A13 13 0 1 1 26 37Z" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeWidth="2"/><path d={outcome==='hotter'?'M33 17V44':'M33 32V44'} stroke="currentColor" strokeWidth="5" strokeLinecap="round"/><circle cx="33" cy="47" r="7" fill="currentColor"/><path d="M15 17H20M15 26H20M15 35H20" stroke="currentColor" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round"/><path d={outcome==='hotter'?'M51 28V12M46 17L51 12L56 17':'M51 12V28M46 23L51 28L56 23'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
 const Icon=outcome==='yes'?Check:outcome==='no'?X:outcome==='closer'?ArrowUpRight:outcome==='further'?ArrowDownRight:Minus;
 return <Icon size={32} aria-hidden="true"/>;
}

export default function ClueResult({question,compact=false}:{question:Asked;compact?:boolean}){
  const visual=clueVisual(question);
  return <div className={`clue-result clue-${visual.tone}${compact?' compact':''}`}>
    <span className="clue-result-symbol" aria-hidden="true"><ClueArt question={question}/></span>
    <div><small>{question.category} · {question.title}</small><strong>{visual.label}</strong>
    {visual.explanation&&<p>{visual.explanation}</p>}
    {question.answer&&question.answer.trim().toLowerCase()!==visual.outcome&&<p className="clue-answer-notes">{question.answer}</p>}
    {question.status==='answered'&&!visual.outcome&&<p>Interpret this answer manually on the map.</p>}
    </div>
  </div>;
}

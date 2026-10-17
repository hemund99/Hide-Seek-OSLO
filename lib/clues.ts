import {distance, type Asked, type Category, type Point} from './game';

export type Outcome = 'yes'|'no'|'hotter'|'colder'|'closer'|'further'|'null';
export const needsGps = (category: Category) => category !== 'Photo';
export function outcomeChoices(category: Category): Outcome[] {
  if (category === 'Photo') return [];
  if (category === 'Thermometer') return ['hotter','colder','null'];
  if (category === 'Measuring') return ['closer','further','null'];
  return ['yes','no','null'];
}
export function outcomeOf(q: Pick<Asked,'category'|'answer'|'outcome'>): Outcome | undefined {
  const value = q.outcome ?? q.answer?.trim().toLowerCase();
  return outcomeChoices(q.category).includes(value as Outcome) ? value as Outcome : undefined;
}
export function clueVisual(q: Pick<Asked,'category'|'answer'|'outcome'|'status'>) {
  const outcome = q.status === 'answered' ? outcomeOf(q) : undefined;
  const labels: Record<Outcome,string> = {yes:q.category==='Radar'?'HIT':'YES',no:q.category==='Radar'?'MISS':'NO',hotter:'HOTTER',colder:'COLDER',closer:'CLOSER',further:'FURTHER',null:'INCONCLUSIVE'};
  const tone = outcome==='hotter'?'hot':outcome==='colder'?'cold':outcome==='yes'||outcome==='closer'?'positive':outcome==='no'||outcome==='further'?'negative':'neutral';
  const colors = {hot:'#d84232',cold:'#2469cb',positive:'#14816e',negative:'#b44b28',neutral:'#64717a'};
  const explanation = q.category==='Radar' ? outcome==='yes'?'Hider is inside the radar radius.':outcome==='no'?'Hider is outside the radar radius.':'' : q.category==='Thermometer' ? outcome==='hotter'?'Your end position is closer to the hider.':outcome==='colder'?'Your end position is further from the hider.':'' : '';
  return {outcome,tone,color:colors[tone],label:outcome?labels[outcome]:q.status==='vetoed'?'VETOED':q.status==='answered'?'ANSWER RECEIVED':'AWAITING ANSWER',explanation};
}

// Only explicit, answered geometric clues can exclude ground. Uncertainty
// bands stay unshaded; free text, null answers and vetoes never eliminate areas.
export function geometricClues(questions: Asked[]) {
  return questions.filter(q => q.status==='answered' && q.start && (
    q.category==='Radar' && !!q.distance && ['yes','no'].includes(outcomeOf(q)??'') ||
    q.category==='Thermometer' && q.end && distance(q.start!,q.end)>0 && ['hotter','colder'].includes(outcomeOf(q)??'')
  ));
}
export function excludedBy(q: Asked, candidate: Point, pixelMargin=0): boolean {
  if(q.status!=='answered'||!q.start)return false;
  const outcome=outcomeOf(q), startDistance=distance(candidate,q.start);
  if(q.category==='Radar'&&q.distance){
    const margin=(q.startAccuracy??0)+pixelMargin;
    return outcome==='yes'?startDistance>q.distance+margin:outcome==='no'?startDistance<q.distance-margin:false;
  }
  if(q.category==='Thermometer'&&q.end){
    const difference=distance(candidate,q.end)-startDistance;
    const margin=(q.startAccuracy??0)+(q.endAccuracy??0)+2*pixelMargin;
    return outcome==='hotter'?difference>margin:outcome==='colder'?difference < -margin:false;
  }
  return false;
}

export function stationRadius(zoom:number){return Math.max(2.5,Math.min(14,4*Math.pow(2,(zoom-12)/2)));}

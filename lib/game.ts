export type Category='Radar'|'Matching'|'Measuring'|'Thermometer'|'Photo'|'Tentacle';
export type Question={id:string;category:Category;title:string;detail:string;minutes:number;draw:number;keep:number;distance?:number;small:boolean};
const places=['Airport','Mountain','Park','Amusement park','Zoo','Aquarium','Golf course','Museum','Cinema','Hospital','Library','Consulate'];
const make=(category:Category,titles:string[],draw:number,detail:string,small=true):Question[]=>titles.map((title,i)=>({id:category.toLowerCase()+'-'+i,category,title,detail,minutes:category==='Photo'?10:5,draw,keep:category==='Tentacle'?2:1,small}));
export const questions:Question[]=[
 ...[500,1000,2000,5000,10000,25000,40000,80000,160000,0].map((distance,i)=>({id:'radar-'+i,category:'Radar' as Category,title:distance?(distance<1000?distance+' m':distance/1000+' km'):'Custom radius',distance,detail:'Test whether the hider is inside this radius of your GPS position when you send the question.',minutes:5,draw:2,keep:1,small:true})),
 ...make('Matching',[...places,'Transit service','Station name character count','Street / path','Landmass','Administrative area: level 1','Administrative area: level 2','Administrative area: level 3','Administrative area: level 4'],3,'Compare your nearest qualifying place or area with the hider’s. Agree the reference location before asking.'),
 ...make('Measuring',[...places,'High-speed railway','Rail station','International border','Administrative border: level 1','Administrative border: level 2','Altitude','Named water body','Coast'],3,'Compare the hider’s distance to this feature with yours. Specify the agreed reference in the question.'),
 ...make('Thermometer',['Short journey','Long journey'],2,'Capture your GPS start, travel the agreed straight-line distance, then capture your GPS end. Use the distance printed in your edition.'),
 ...make('Photo',['Building seen from station','Widest street','Entire tree','Tallest visible structure','Selfie','Sky'],1,'Follow the framing requirements in your physical investigation book. No Street View. Upload a photo or explain why it is unavailable.'),
 ...make('Tentacle',['Museums: 2 km','Libraries: 2 km','Cinemas: 2 km','Hospitals: 2 km'],4,'Not available in a small game. Available here only when enabled as a house rule.',false)
];
export const categories:Category[]=['Radar','Matching','Measuring','Thermometer','Photo','Tentacle'];
export const colors=['#f16a35','#1c9ea8','#8567d2','#df3c77','#379269','#c09217'];
export type Point=[number,number];
export type Asked={id:string;questionId:string;category:Category;title:string;detail:string;askedAt:number;deadline:number|null;answerMinutes?:number;answeredAt?:number;answer?:string;outcome?:'yes'|'no'|'hotter'|'colder'|'closer'|'further'|'null';startAccuracy?:number;endAccuracy?:number;startCapturedAt?:number;endCapturedAt?:number;photo?:string;draw:number;keep:number;repeat:number;late?:boolean;start?:Point;end?:Point;distance?:number;team:string;status:'travelling'|'waiting'|'answered'|'vetoed'};
export type Mark={id:string;kind:'exclude'|'circle'|'pin'|'boundary';points:Point[];radius?:number;label:string;author:string};
export type HandCard={id:string;name:string;type:'curse'|'powerup'|'time';effect:string;minutes:number;blocks:boolean;addedAt:number};
export type Game={networks?:import("./transit").Networks;id:string;name:string;teams:{id:string;name:string;color:string}[];hider:string;phase:'lobby'|'hiding'|'seeking'|'endgame'|'finished';round:number;hideMinutes:number;hideEnd:number;seekStart:number;pausedAt:number|null;deducted:number;questions:Asked[];marks:Mark[];scores:{team:string;round:number;seconds:number;bonus:number}[];history:{at:number;text:string}[];curses:{id:string;title:string;end:number;blocks:boolean;effect?:string;requiresClear?:boolean}[];houseTentacle:boolean;rules:string;privateHand:string;cards?:HandCard[];handLimit?:number;};
export function clock(ms:number){const sec=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor(sec/60)%60).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
export function effectivePhase(g:Game,now=Date.now()){return g.phase==='hiding'&&now>=g.hideEnd?'seeking':g.phase;}
export function scoreMs(g:Game,now=Date.now()){if(!g.seekStart)return 0;const end=g.pausedAt??now;const pending=g.questions.find(q=>q.status==='waiting');return Math.max(0,end-g.seekStart-g.deducted-(pending?.deadline?Math.max(0,end-pending.deadline):0));}
export function distance(a:Point,b:Point){const rad=Math.PI/180;const x=Math.sin((b[0]-a[0])*rad/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin((b[1]-a[1])*rad/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

// New curses stay active until explicitly cleared. Legacy timed curses retain their expiry.
export function activeCurses(g:Pick<Game,'curses'|'pausedAt'>,now=Date.now()){return g.curses.filter(c=>c.requiresClear||c.end===0||c.end>(g.pausedAt??now));}
export function questionsBlocked(g:Pick<Game,'curses'|'pausedAt'>,now=Date.now()){return activeCurses(g,now).length>0;}

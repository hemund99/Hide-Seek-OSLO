'use client';
import {useState} from 'react';
import {Camera,ExternalLink} from 'lucide-react';

export default function PhotoEvidence({photo,title}:{photo:string;title:string}){
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const src='/api/photo?key='+encodeURIComponent(photo)+(attempt?'&retry='+attempt:'');
 return <figure className="photo-evidence">{failed?<div className="photo-unavailable"><Camera size={24}/><p>Photo could not load. Check your connection and game sign-in.</p><button onClick={()=>{setFailed(false);setAttempt(n=>n+1);}}>Retry photo</button></div>:<a href={src} target="_blank" rel="noreferrer" aria-label={'Open full-size photo for '+title}><img src={src} alt={'Hider evidence for '+title} loading="lazy" onError={()=>setFailed(true)}/><span><Camera size={15}/>Photo evidence<ExternalLink size={14}/></span></a>}</figure>;
}

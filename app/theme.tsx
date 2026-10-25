'use client';

import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
import {Button} from '@/components/ui/button';

export type Theme='dark'|'light';
const storageKey='oslo-field-theme';
function applyTheme(theme:Theme){
 document.documentElement.dataset.theme=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0b141e':'#f2f5f4');
}

export function useFieldTheme(){
 const [theme,setTheme]=useState<Theme>('dark');
 useEffect(()=>{
  const saved=document.documentElement.dataset.theme;
  if(saved==='light'||saved==='dark')setTheme(saved);
  const sync=(event:StorageEvent)=>{
   if(event.key!==storageKey)return;
   const next=event.newValue==='light'?'light':'dark';
   applyTheme(next);
   setTheme(next);
  };
  window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[]);
 function toggleTheme(){
  const next=theme==='dark'?'light':'dark';
  applyTheme(next);
  setTheme(next);
  try{localStorage.setItem(storageKey,next);}catch{/* Theme still works when storage is unavailable. */}
 }
 return {theme,toggleTheme};
}

export function ThemeToggle({theme,onToggle}:{theme:Theme;onToggle:()=>void}){
 const label=theme==='dark'?'Switch to light mode':'Switch to dark mode';
 return <Button variant="ghost" className="theme-toggle" aria-label={label} title={label} onClick={onToggle}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</Button>;
}

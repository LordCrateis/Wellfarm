import { useEffect, useRef } from "react";
type Turnstile = {render:(node:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};
declare global {interface Window {turnstile?:Turnstile}}
export function Captcha({siteKey,onToken,attempt}:{siteKey:string;onToken:(token:string)=>void;attempt:number}) {
  const node=useRef<HTMLDivElement>(null);const callback=useRef(onToken);callback.current=onToken;
  useEffect(()=>{
    let id:string|undefined;let active=true;
    const render=()=>{if(active&&node.current&&window.turnstile&&!id)id=window.turnstile.render(node.current,{sitekey:siteKey,theme:"light",callback:(token:string)=>callback.current(token),"expired-callback":()=>callback.current(""),"error-callback":()=>callback.current("")});};
    let script=document.querySelector<HTMLScriptElement>('script[data-wellfarm-turnstile]');
    if(!script){script=document.createElement("script");script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.dataset.wellfarmTurnstile="true";document.head.appendChild(script);}
    script.addEventListener("load",render);render();
    return()=>{active=false;script?.removeEventListener("load",render);if(id)window.turnstile?.remove(id);};
  },[siteKey,attempt]);
  return <div ref={node} aria-label="CAPTCHA verification" className="min-h-16" />;
}

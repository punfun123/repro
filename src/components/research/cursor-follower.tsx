'use client';
import {useEffect,useRef} from 'react';
export function CursorFollower({enabled}:{enabled:boolean}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const node=root.current;const fine=matchMedia('(pointer: fine)');const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    if(!node||!enabled||!fine.matches||reduced.matches)return;
    let frame=0;let x=0;let y=0;let targetX=0;let targetY=0;let initialized=false;
    function paint(){x+=(targetX-x)*.35;y+=(targetY-y)*.35;node!.style.transform='translate3d('+x+'px,'+y+'px,0)';if(Math.abs(x-targetX)+Math.abs(y-targetY)>.1)frame=requestAnimationFrame(paint);else frame=0;}
    function move(event:PointerEvent){targetX=event.clientX;targetY=event.clientY;if(!initialized){x=targetX;y=targetY;initialized=true;}node!.dataset.active='true';if(!frame)frame=requestAnimationFrame(paint);}
    function leave(){node!.dataset.active='false';}
    window.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',leave);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);node.dataset.active='false';};
  },[enabled]);
  return <div ref={root} className="cursor-follower" data-active="false" aria-hidden="true"><i/><span/></div>;
}

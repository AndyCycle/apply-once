// Executed in the target document; the overlay never reads form values.
export function selectRegion() {
  return new Promise(resolve => {
    const overlay=document.createElement('div');
    overlay.dataset.applyOnceUi='region';
    Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483647',cursor:'crosshair',background:'rgba(15,23,42,.15)',touchAction:'none'});
    const hint=document.createElement('div');
    hint.textContent='拖动框选需要填写的区域 · Esc 取消';
    Object.assign(hint.style,{position:'absolute',top:'12px',left:'50%',transform:'translateX(-50%)',background:'#172554',color:'white',padding:'12px 20px',borderRadius:'10px',font:'16px sans-serif',pointerEvents:'none'});
    const box=document.createElement('div');
    Object.assign(box.style,{position:'absolute',border:'2px solid #14b8a6',background:'rgba(20,184,166,.15)',pointerEvents:'none',display:'none',boxSizing:'border-box'});
    overlay.append(hint,box);document.documentElement.append(overlay);
    let start;
    const rect=e=>({left:Math.min(start.x,e.clientX),top:Math.min(start.y,e.clientY),right:Math.max(start.x,e.clientX),bottom:Math.max(start.y,e.clientY)});
    const finish=value=>{overlay.remove();document.removeEventListener('keydown',key,true);resolve(value);};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(null);}};
    document.addEventListener('keydown',key,true);
    overlay.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
    overlay.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();start={x:e.clientX,y:e.clientY};overlay.setPointerCapture(e.pointerId);};
    overlay.onpointermove=e=>{if(!start)return;const r=rect(e);Object.assign(box.style,{display:'block',left:`${r.left}px`,top:`${r.top}px`,width:`${r.right-r.left}px`,height:`${r.bottom-r.top}px`});};
    overlay.onpointerup=e=>{if(!start)return;const r=rect(e);finish(r.right-r.left>=8&&r.bottom-r.top>=8?r:null);};
    overlay.onpointercancel=()=>finish(null);
  });
}

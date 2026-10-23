// Keep existing rows during loading; preserve paging position without fighting user scrolling.
export class ViewportKeeper {
  constructor(win,region){this.win=win;this.region=region;this.pending=null;}
  begin(keepHeight=false) {
    this.cancel();
    const w=this.win,t={x:w.scrollX,y:w.scrollY,moved:false,phase:'waiting'};
    if(keepHeight)this.region.style.minHeight=`${this.region.getBoundingClientRect().height}px`;
    else this.region.style.minHeight='';
    t.onScroll=()=>{if(t.phase==='waiting'&&(w.scrollX!==t.x||w.scrollY!==t.y))t.moved=true;};
    t.onInput=e=>{if(e.type!=='keydown'||['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))t.moved=true;};
    w.addEventListener('scroll',t.onScroll,{passive:true});
    for(const event of ['wheel','touchmove','keydown'])w.addEventListener(event,t.onInput,{passive:true});
    this.pending=t;return t;
  }
  commit(t,render) {
    if(this.pending!==t)return;
    t.phase='rendering';render();
    this.win.requestAnimationFrame(()=>this.win.requestAnimationFrame(()=>{
      if(this.pending!==t)return;
      if(!t.moved)this.win.scrollTo({left:t.x,top:t.y,behavior:'instant'});
      this.cancel();
    }));
  }
  cancel(){const t=this.pending;if(!t)return;this.win.removeEventListener('scroll',t.onScroll);for(const event of ['wheel','touchmove','keydown'])this.win.removeEventListener(event,t.onInput);this.pending=null;}
}

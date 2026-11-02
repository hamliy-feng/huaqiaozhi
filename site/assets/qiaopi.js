(() => {
  const root=document.querySelector('.qiaopi-page');if(!root||root.dataset.loaded)return;root.dataset.loaded='1';
  const stage=root.querySelector('.qiaopi-image-stage'),sheet=root.querySelector('.qiaopi-image-transform');
  const sourceImage=stage.querySelector('img');
  sourceImage.addEventListener('error',()=>{
    sourceImage.hidden=true;
    stage.querySelectorAll('.qiaopi-annotation').forEach(el=>el.hidden=true);
    const notice=document.createElement('div');notice.className='qiaopi-image-missing';
    notice.textContent='原始侨批影像尚未接入本地发布包；当前可继续阅读转写与译文。';
    stage.appendChild(notice);
    root.querySelectorAll('[data-zoom-in],[data-zoom-out],[data-rotate],[data-original],[data-annotations]').forEach(el=>el.disabled=true);
  });
  if(sourceImage.complete && sourceImage.naturalWidth===0)sourceImage.dispatchEvent(new Event('error'));
  const evTitle=root.querySelector('#qiaopi-evidence-title'),evText=root.querySelector('#qiaopi-evidence-text');
  let scale=1,rotation=0,px=0,py=0,down=false,downX=0,downY=0,hidden=false;
  function paint(){sheet.style.transform='translate('+px+'px,'+py+'px) rotate('+rotation+'deg) scale('+scale+')';}
  function reset(){scale=1;rotation=0;px=0;py=0;paint();}
  root.querySelector('[data-zoom-in]').onclick=()=>{scale=Math.min(4,scale+.25);paint()};
  root.querySelector('[data-zoom-out]').onclick=()=>{scale=Math.max(.5,scale-.25);paint()};
  root.querySelector('[data-rotate]').onclick=()=>{rotation=(rotation+90)%360;paint()};
  root.querySelector('[data-reset]').onclick=reset;
  root.querySelector('[data-original]').onclick=()=>{
    const img=stage.querySelector('img');const path=img.dataset.original||img.currentSrc||img.src;
    window.open(path,'_blank','noopener,noreferrer');
  };
  root.querySelector('[data-annotations]').onclick=e=>{
    hidden=!hidden;
    root.querySelectorAll('.qiaopi-annotation').forEach(b=>b.hidden=hidden);
    e.currentTarget.textContent=hidden?'显示标注':'隐藏标注';e.currentTarget.setAttribute('aria-pressed',String(!hidden));
  };
  root.querySelectorAll('[data-note]').forEach(button=>{
    button.addEventListener('click',()=>{
      evTitle.textContent=button.classList.contains('qiaopi-annotation')?button.textContent:'原文证据';
      evText.textContent=button.dataset.note;
      if(button.closest('.qiaopi-story')&&!matchMedia('(max-width:900px)').matches)root.querySelector('#image').scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
  stage.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;down=true;downX=e.clientX-px;downY=e.clientY-py;stage.setPointerCapture(e.pointerId)});
  stage.addEventListener('pointermove',e=>{if(!down)return;px=e.clientX-downX;py=e.clientY-downY;paint()});
  stage.addEventListener('pointerup',()=>{down=false});
  stage.addEventListener('pointercancel',()=>{down=false});
  stage.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();scale=Math.max(.5,Math.min(4,scale+(e.deltaY<0?.12:-.12)));paint()},{passive:false});
  stage.addEventListener('keydown',e=>{if(e.key==='+'){scale=Math.min(4,scale+.2);paint()}if(e.key==='-'){scale=Math.max(.5,scale-.2);paint()}if(e.key==='Escape')reset()});
  // All module navigation are actual anchors; original's fake tab switching is removed.
})();

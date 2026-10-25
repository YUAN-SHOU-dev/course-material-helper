import {scanMaterials} from '/extension/extractor.js';
document.querySelector('#shadow-host').attachShadow({mode:'open'}).innerHTML='<a href="/files/shadow.odt">开放 Shadow DOM 附件</a>';
document.querySelector('#run').onclick=()=>{
  const result=scanMaterials(location.href);
  const names=result.items.map(item=>item.name).sort();
  const expected=['paper.pdf','slides.pptx','lecture.docx','frame.xlsx','wrapped.pdf','shadow.odt'].sort();
  const passed=JSON.stringify(names)===JSON.stringify(expected) && result.items.find(item=>item.name==='wrapped.pdf')?.url.endsWith('wrapped.pdf?token=a%2Bb');
  document.querySelector('#report').textContent=JSON.stringify({passed,count:result.items.length,warnings:result.warnings,names},null,2);
};

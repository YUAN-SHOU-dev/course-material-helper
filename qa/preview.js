import {mountPopup} from '/extension/popup.js';
let listener;
const sample = {name:'跨文化品牌传播 · 课程参考资料.pdf',url:'https://example.edu/materials/paper.pdf?token=demo%2Bsignature',host:'example.edu',signed:true,source:'iframe#pdf-viewer[src] → file 参数'};
const browser = {
  tabs:{query:async()=>[{id:1,url:'https://example.edu/course/'}]},
  scripting:{executeScript:async()=>{
    const scenario=document.querySelector('#qa-scenario').value;
    if(scenario==='denied')throw Error('Simulated permission failure');
    return [{result:{items:scenario==='empty'?[]:[sample],warnings:scenario==='partial'?['unreadableFrame']:[]}}];
  }},
  downloads:{download:async()=>5,search:async()=>[{id:5,state:'complete',mime:'application/pdf',fileSize:1024}],onChanged:{addListener(fn){listener=fn;},removeListener(){listener=undefined;}}}
};
const app=mountPopup({browser});
document.querySelector('#qa-scenario').addEventListener('change',()=>document.querySelector('#scan').click());
window.addEventListener('unload',()=>app.dispose(),{once:true});

document.querySelector('#qa-clipboard').onclick=async()=>{
  try {
    const actual=await navigator.clipboard.readText();
    document.querySelector('#qa-clipboard-result').textContent=actual===sample.url?' 剪贴板与原始链接完全一致':' 剪贴板内容不一致';
  } catch {document.querySelector('#qa-clipboard-result').textContent=' 当前环境不允许读取剪贴板';}
};

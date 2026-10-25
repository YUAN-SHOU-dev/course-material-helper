import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, sep, extname} from 'node:path';
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.COURSE_HELPER_PREVIEW_PORT || 4178);
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server = createServer(async(req,res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/') {
      let html=await readFile(resolve(root,'extension/popup.html'),'utf8');
      html=html.replace('href="popup.css"','href="/extension/popup.css"').replace('src="popup-entry.js"','src="/qa/preview.js"');
      html=html.replace('<body>','<body><aside style="padding:14px;background:#fff1d4;color:#553e15;font-size:12px;line-height:1.6">界面预览：使用演示数据，下载为模拟操作。复制按钮写入演示链接。<br><label>场景 <select id="qa-scenario"><option value="found">找到资料</option><option value="empty">未找到</option><option value="denied">读取失败</option><option value="partial">部分可读</option></select></label><br><button id="qa-clipboard" type="button">核对演示链接剪贴板</button><span id="qa-clipboard-result" role="status"></span></aside>');
      res.writeHead(200,{'Content-Type':mime['.html']});res.end(html);return;
    }
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(root+sep) || !/^\/(extension|qa)\//.test(pathname)) {res.writeHead(403);res.end();return;}
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain; charset=utf-8'});res.end(await readFile(file));
  } catch {res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`UI preview (simulated APIs): http://127.0.0.1:${port}/\nReal DOM fixture: http://127.0.0.1:${port}/qa/fixtures.html`));

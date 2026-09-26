require('fs').mkdirSync('tests/out',{recursive:true});
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});const p=await b.newPage({viewport:{width:1280,height:1000}});const errs=[];p.on('pageerror',x=>errs.push(x.message));
await p.route('https://cdnjs.cloudflare.com/**',r=>r.fulfill({body:fs.readFileSync(require.resolve('jspdf/dist/jspdf.umd.min.js')),contentType:'text/javascript'}));
await p.addInitScript(()=>{
  const store={}; const subs=[]; const notify=()=>subs.forEach(s=>s());
  const snapDoc=(path)=>{const d=store[path];return {id:path.split('/').pop(),exists:!!d,data:()=>d?JSON.parse(JSON.stringify(d)):undefined,metadata:{}}};
  const db={doc:(path)=>({path,get:async()=>snapDoc(path),set:async(x)=>{store[path]=JSON.parse(JSON.stringify(x));notify()},update:async(x)=>{Object.assign(store[path],x);notify()},
      onSnapshot:(next)=>{const f=()=>next(snapDoc(path));subs.push(f);setTimeout(f,0);return()=>{}}}),
    collection:(c)=>({onSnapshot:(next)=>{const f=()=>{const docs=Object.keys(store).filter(k=>k.startsWith(c+'/')&&k.split('/').length===2).map(snapDoc);next({docs,size:docs.length,empty:!docs.length})};subs.push(f);setTimeout(f,0);return()=>{}}})};
  const user={id:async()=>'u_test',can:async()=>true,canEdit:async()=>true,profiles:async(ids)=>Object.fromEntries(ids.map(i=>[i,{name:'SG'}]))};
  const memo="# Policy memo: Peckham\n## Bottom line\nPeckham is about 386 homes a year short. The blocker is delivery, not consent [K04]. Registering renters matters too.\n## What the data shows\n- Builds 347 homes a year vs 734 modelled\n- **51%** of residents worried (estimated)\n## Options\n- Use the 20% fast-track route ≈ quicker → more homes [K04]\nParagraph with “quotes” and £ sign and — dash.";
  const sample=async(inp,opts)=>{opts&&opts.onText&&opts.onText({text:memo,delta:memo});return {text:memo,truncated:false,modelTierApplied:'default'}};
  window.__uploads=[];
  const assets={upload:async(blob,o)=>{window.__uploads.push({size:blob.size,type:o&&o.type});return {id:'a'.repeat(32),url:'blob-url-test',sizeBytes:blob.size,contentType:'application/pdf'}}};
  window.__store=store; window.__saved=[];
  window.claude={use:async(n)=>({db,user,sample,assets,downloads:{save:async(x)=>{window.__saved.push({f:x.filename,s:x.data.size});return {status:'saved'}}}})[n]||null};
});
await p.goto('file://'+process.cwd()+'/dist/index.html');await p.waitForTimeout(900);


await p.click('#seedbtn'); await p.click('#seedyes'); await p.waitForTimeout(1500);
const steps=async()=>p.$$eval('#steps .step',ls=>ls.map(l=>l.querySelector('h3').innerText+' | '+l.querySelector('.now').innerText));
await p.evaluate(()=>window.scrollTo(0,0)); await p.screenshot({path:'tests/out/g1.png'});
await p.selectOption('#sbor','Southwark'); await p.waitForTimeout(300);
await p.selectOption('#stot','88000'); await p.waitForTimeout(300);
await p.click('#sblk'); await p.waitForTimeout(500);
console.log(await p.evaluate(()=>[state.layer,state.sort,state.fborough,state.sel,document.querySelectorAll('#map path.seat').length,document.querySelectorAll('#map path.dim').length]), await steps());
await p.fill('#spc','E14 5AB'); await p.click('#spcf button'); await p.waitForTimeout(300);
console.log('pc sel', await p.evaluate(()=>state.sel));
await p.click('#smemo'); await p.waitForTimeout(1800);
console.log('memos', await p.evaluate(()=>Object.keys(__store).filter(k=>k.startsWith('memos/'))));
await p.hover('#map path.seat >> nth=10'); await p.waitForTimeout(200);
const a=await p.$('#area'); await a.scrollIntoViewIfNeeded(); await p.screenshot({path:'tests/out/g2.png'});
await p.click('.seg button[data-v=hex]'); await p.waitForTimeout(200); console.log('hex g',await p.evaluate(()=>document.querySelectorAll('#map g').length));
await p.click('.seg button[data-v=geo]');
await p.emulateMedia({colorScheme:'dark'}); await a.scrollIntoViewIfNeeded(); await p.screenshot({path:'tests/out/g3.png'});
await p.setViewportSize({width:375,height:800}); await p.waitForTimeout(300);
console.log('phone scrollWidth',await p.evaluate(()=>document.documentElement.scrollWidth));
console.log('errors',JSON.stringify(errs)); await b.close();})();

import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require = createRequire("/tmp/portal-playwright/qa.js");
const {chromium} = require("@playwright/test");
const base = process.env.QA_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch({headless:true,channel:"chrome",args:["--no-sandbox"]});
const expected = [
  "https://milosprofessor.github.io/matematikon-5/",
  "https://matematikon6-8.milos-python.workers.dev/",
  "https://milosprofessor.github.io/python-od-nule/"
];
const targets=[
  {label:"desktop",width:1440,height:900},
  {label:"tablet",width:768,height:1024},
  {label:"mobile",width:360,height:800},
  {label:"small-mobile",width:320,height:640}
];
const results=[];
const failures=[];
const run=async(label,fn)=>{
  try{await fn();results.push(label);console.log("PASS "+label)}
  catch(err){failures.push({label,error:String(err)});console.error("FAIL "+label,err)}
};
try{
  for(const target of targets){
    const context=await browser.newContext({viewport:{width:target.width,height:target.height},deviceScaleFactor:1,reducedMotion:"reduce"});
    const page=await context.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push("pageerror: "+e.message));
    page.on("response",r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(r.status()+" "+r.url())});
    await run(target.label+" — HTML, links, CSS/JS, navigation, no overflow",async()=>{
      await page.goto(base,{waitUntil:"networkidle",timeout:30000});
      await page.locator("#hero-title").waitFor();
      assert.match(await page.locator("#hero-title").innerText(),/Znanje koje/i);
      assert.equal(await page.locator(".platform-card").count(),3);
      assert.deepEqual(await page.locator(".platform-card").evaluateAll(xs=>xs.map(x=>x.href)),expected);
      assert.equal(await page.locator(".brand").count(),1);
      assert.equal(await page.locator(".hero-art").count(),1);
      assert.equal(await page.locator(".platform-card .card-bottom").count(),3);
      assert.equal(await page.locator(".nav-cta").count(),1);
      const vars=await page.evaluate(()=>({
        style:document.styleSheets.length,
        js:document.documentElement.classList.contains("js-ready"),
        scroll:document.documentElement.scrollWidth-innerWidth,
        heroBg:getComputedStyle(document.querySelector(".hero")).backgroundColor,
        cards:document.querySelectorAll(".platform-card").length
      }));
      assert.ok(vars.style>=1,"CSS not loaded");
      assert.ok(vars.js,"JavaScript enhancement not loaded");
      assert.ok(vars.scroll<=2,"Horizontal overflow: "+vars.scroll+"px");
      await page.locator(".nav-cta").click();
      assert.equal(new URL(page.url()).hash,"#platforme");
      await page.locator(".platform-card").last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      assert.equal(errors.length,0,JSON.stringify(errors));
    });
    await run(target.label+" — visible sections / reduced motion",async()=>{
      const overview=page.locator(".overview");
      assert.ok(await overview.isVisible());
      assert.ok(await page.locator(".platform-card").first().isVisible());
      const motion=await page.locator(".orbit--outer").evaluate(x=>getComputedStyle(x).animationName);
      assert.equal(motion,"none","Reduced-motion preference ignored");
      const footer=page.locator(".site-footer");
      await footer.scrollIntoViewIfNeeded();
      assert.ok(await footer.isVisible());
    });
    if(target.label==="desktop"||target.label==="mobile"){
      await page.goto(base,{waitUntil:"networkidle"});
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:"screenshots/portal-"+target.label+".png",fullPage:true,animations:"disabled"});
    }
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"no-preference"});
  const page=await context.newPage();
  await run("desktop animation enabled for normal motion",async()=>{
    await page.goto(base,{waitUntil:"networkidle"});
    const motion=await page.locator(".orbit--outer").evaluate(x=>getComputedStyle(x).animationName);
    assert.notEqual(motion,"none");
    await page.locator(".platform-card").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(850);
    assert.ok(await page.locator(".platform-card").first().evaluate(x=>x.classList.contains("is-visible")));
  });
  await context.close();
}finally{await browser.close()}
console.log(JSON.stringify({passed:results.length,failed:failures.length,results,failures},null,2));
if(failures.length)process.exitCode=1;

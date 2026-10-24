import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("prepared measurement stays off and sends no network requests",async()=>{
 const source=await readFile(new URL("../public/brs-measurement.js",import.meta.url),"utf8");
 const {createMeasurementClient}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
 let calls=0;const platform={location:{origin:"https://circle-of-fourths.backwerdrhythmshop.com",pathname:"/",search:"",hash:""},self:1,top:1,navigator:{},fetch(){calls++;throw new Error("must not send");}};
 const bootstrap=await readFile(new URL("../public/brs-page-count.js",import.meta.url),"utf8");
 assert.match(bootstrap,/enabled: false/);assert.match(bootstrap,/operationalApproved: false/);assert.match(bootstrap,/sponsorApproved: false/);
 const client=createMeasurementClient({enabled:false,operationalApproved:false},platform);client.open();client.setSponsorConsent(true);client.sponsorReady({},"fictional");assert.equal(calls,0);
 const layout=await readFile(new URL("../app/layout.tsx",import.meta.url),"utf8");assert.match(layout,/src="\/brs-page-count.js"/);
 
});

async function visibilityFixture(){
 const source=await readFile(new URL("../public/brs-measurement.js",import.meta.url),"utf8");
 const {createMeasurementClient}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
 let time=0,sequence=0;const timers=new Map(),sent=[],observers=[];
 const el={addEventListener(){},removeEventListener(){}};
 const p={self:1,top:1,location:{origin:"https://fixture.invalid",pathname:"/",search:"",hash:""},navigator:{},
 document:{visibilityState:"visible",addEventListener(){},removeEventListener(){}},crypto:{randomUUID:()=>"synthetic-instance"},
 fetch:async(url,init)=>{sent.push(JSON.parse(init.body));return new Response(null,{status:204});},
 setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:time+ms});return id;},clearTimeout:id=>timers.delete(id),
 IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){}}};
 const c=createMeasurementClient({id:"fixture",origin:p.location.origin,path:"/",mode:"reviewed-fixture",enabled:true,operationalApproved:true,sponsorApproved:true,placements:["slot"]},p);
 c.setSponsorConsent(true);c.sponsorReady(el,"slot");
 return {c,push:values=>observers[0].fn(values.map(intersectionRatio=>({target:el,intersectionRatio}))),
 tick(ms){time+=ms;for(const[id,t]of [...timers])if(t.at<=time){timers.delete(id);t.fn();}},
 count:()=>sent.filter(e=>e.type==="sponsor_viewable").length};
}
test("continuous qualifying visibility is not restarted by threshold changes",async()=>{
 const f=await visibilityFixture();f.push([.6]);f.tick(600);f.push([1]);f.tick(399);assert.equal(f.count(),0);f.tick(1);assert.equal(f.count(),1);
});
test("the latest batched visibility exit cancels a prior qualifying entry",async()=>{
 const f=await visibilityFixture();f.push([.6,.1]);f.tick(2000);assert.equal(f.count(),0);
});
test("an intervening batched exit requires a fresh complete interval",async()=>{
 const f=await visibilityFixture();f.push([.6]);f.tick(900);f.push([.8,.1,.8]);f.tick(999);assert.equal(f.count(),0);f.tick(1);assert.equal(f.count(),1);
});
test("removed creative cannot be measured by a queued observer entry",async()=>{
 const f=await visibilityFixture();f.c.sponsorUnavailable("slot");f.push([.8]);f.tick(2000);assert.equal(f.count(),0);
});

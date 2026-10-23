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

import fs from "fs"; import vm from "vm";
const dir = new URL("../src/", import.meta.url).pathname;
const src = ["gfx.js", "aldata.js", "teams.js", "league.js"].map(f => fs.readFileSync(dir + f, "utf8")).join("\n");
const store = {}; const ctx = { console, Math, Date, JSON, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } } };
vm.createContext(ctx); vm.runInContext(src, ctx);
const run = code => vm.runInContext(code, ctx);
const years = +(process.argv[2] || 3);
run(`
var T0=Date.now(); frCreate(0,"Coach J",1234); frPick(FR.teams.findIndex(function(t){return t.name=="Homewood"})); startSeason();
console.log("user ovr",tm(FR.user).ovr,"rank",FR.teams.filter(function(t){return t.ovr>tm(FR.user).ovr}).length,"teams",FR.teams.length,"players",Object.keys(FR.pl).length,"ms",Date.now()-T0);
var t1=Date.now();
for(var y=0;y<${years};y++){
  while(FR.phase!="offseason") advanceWeek();
  var u=tm(FR.user); var sc=[], hw=0, n=0; FR.sched.forEach(function(w){w.forEach(function(g){sc.push(g.hs+g.as); n++; if(g.hs>g.as)hw++;});});
  console.log(FR.year,u.name,u.w+"-"+u.l,FR.hist[0].res,"| 6A",tm(FR.po.b["6A"].champ).name,"| 5A",tm(FR.po.b["5A"].champ).name,"| funds",FR.funds|0,"exp",FR.exposure|0);
  console.log("  avg pts",(sc.reduce(function(a,b){return a+b})/sc.length).toFixed(1),"home win%",(hw/n*100|0),"games",n);
  var qb=leaders("ALL","py",1)[0],rb=leaders("ALL","ry",1)[0];
  console.log("  top py",qb.st.py,qb.st.ptd,"top ry",rb.st.ry,rb.st.rtd,"top tk",leaders("ALL","tk",1)[0].st.tk,"top rcy",leaders("ALL","rcy",1)[0].st.rcy);
  var off=0, tiers=[0,0,0,0,0]; teamPlayers(FR.user).forEach(function(p){off+=p.of.length; p.of.forEach(function(c){tiers[COLLEGES[c][1]]++})}); console.log("  user offers",off,JSON.stringify(tiers));
  while(FR.phase=="offseason") offNext();
  var ys={}; teamPlayers(FR.user).forEach(function(p){ys[p.yr]=(ys[p.yr]||0)+1});
  console.log("  roster",teamPlayers(FR.user).length,JSON.stringify(ys),"ovr",tm(FR.user).ovr,"signed",(FR.signHist&&FR.signHist[0]?FR.signHist[0].s.map(function(x){return COLLEGES[x.c][0]}).join(","):""));
  startSeason();
}
console.log("ms",Date.now()-t1,"save KB",(frPack().length/1024)|0);
var ovs=FR.teams.map(function(t){return t.ovr}).sort(function(a,b){return a-b}); console.log("ovr range",ovs[0],ovs[47],ovs[94]);
var r=simGame(0,1,{pbp:true}); console.log(r.hs,r.as,"plays",r.plays.length);
r.plays.slice(0,10).forEach(function(p){console.log(" ",p.q,p.c,p.x)}); console.log(r.scoring.map(function(s){return "  Q"+s.q+" "+s.x+" "+s.h+"-"+s.a}).join("\\n"));
`);
run(`frSave(); var before=JSON.stringify(leaders("ALL","py",3).map(function(p){return [p.id,p.ov,p.st.py]})); var o=FR; FR=null; frLoadSlot(0); var after=JSON.stringify(leaders("ALL","py",3).map(function(p){return [p.id,p.ov,p.st.py]})); console.log("roundtrip", before===after, Object.keys(FR.pl).length, tm(FR.user).ovr);
advanceWeek(); console.log("week after load ok", FR.week, FR.phase);`);

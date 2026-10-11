import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";

const store = getStore("mafia-rawr-rooms");
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"}});
const id = (n=18)=>randomBytes(n).toString("hex");
const code = ()=>randomBytes(3).toString("hex").toUpperCase();
async function load(c){return await store.get(c,{type:"json"})}
async function save(c,r){await store.setJSON(c,r)}
function fail(s){throw new Error(s)}
export default async (req) => {
 if(req.method==="OPTIONS") return new Response("",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}});
 if(req.method!=="POST")return json({ok:false,error:"استخدمي POST"},405);
 try{
  const b=await req.json(), a=b.action; let c=(b.code||"").toUpperCase(), room, p;
  if(a==="create"){
   const name=String(b.name||"").trim(); if(!name)fail("اكتبي اسمك");
   c=code();while(await load(c))c=code();
   const token=id();room={code:c,host:token,phase:"lobby",round:1,message:"الغرفة جاهزة، شاركي الكود.",winner:"",players:[{id:token,name:name.slice(0,18),role:null,alive:true,ready:true}],votes:{},actions:{},created:Date.now()};
   await save(c,room);return json({ok:true,code:c,token,host:true});
  }
  room=await load(c);if(!room)fail("الغرفة غير موجودة أو انتهت");
  p=room.players.find(x=>x.id===b.token); 
  if(a==="join"){
   const name=String(b.name||"").trim();if(!name)fail("اكتبي اسمك");if(room.phase!=="lobby")fail("اللعبة بدأت بالفعل");
   if(room.players.length>=20)fail("الغرفة ممتلئة");
   const token=id();room.players.push({id:token,name:name.slice(0,18),role:null,alive:true,ready:true});await save(c,room);return json({ok:true,code:c,token,host:false});
  }
  if(!p)fail("جلسة اللاعب غير صالحة؛ ادخلي الغرفة من جديد");
  if(a==="state"){
   const votes=Object.keys(room.votes||{}).length;
   return json({ok:true,host:p.id===room.host,state:{me:p.id,host:room.host,phase:room.phase,round:room.round,message:room.message,winner:room.winner,voteCount:votes,players:room.players.map(x=>({id:x.id,name:x.name,alive:x.alive,ready:x.ready,role:x.id===p.id?x.role:undefined}))}});
  }
  if(a==="start"){
   if(p.id!==room.host)fail("فقط صاحبة الغرفة تقدر تبدأ");if(room.phase!=="lobby")fail("اللعبة بدأت");if(room.players.length<4)fail("تحتاج اللعبة إلى 4 لاعبات على الأقل");
   const n=Math.max(1,Math.min(3,Number(b.mafiaCount)||1));if(n>=room.players.length)fail("عدد المافيا كبير");
   const pool=[...Array(n).fill("المافيا"),...Array(room.players.length-n).fill("مواطنة")];
   for(let i=pool.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
   room.players.forEach((x,i)=>{x.role=pool[i];x.alive=true});room.phase="night";room.round=1;room.votes={};room.actions={};room.message="حلّ الليل. المافيا تختار ضحية.";await save(c,room);return json({ok:true});
  }
  if(a==="vote"||a==="action"){
   if(!p.alive)fail("تم إقصاؤك من اللعبة");const target=room.players.find(x=>x.id===b.target&&x.alive&&x.id!==p.id);if(!target)fail("اختيار غير صالح");
   if(a==="vote"&&room.phase!=="day")fail("التصويت متاح نهارًا فقط");
   if(a==="action"&&(room.phase!=="night"||p.role!=="المافيا"))fail("الفعل الليلي متاح للمافيا فقط");
   (a==="vote"?room.votes:room.actions)[p.id]=target.id;await save(c,room);return json({ok:true});
  }
  if(a==="advance"){
   if(p.id!==room.host)fail("فقط صاحبة الغرفة تقدر تنقل المرحلة");
   if(room.phase==="night"){
    const mafia=room.players.find(x=>x.role==="المافيا"&&x.alive), victim=mafia?room.actions[mafia.id]:null;
    if(victim){let v=room.players.find(x=>x.id===victim);if(v&&v.alive)v.alive=false}
    room.phase="day";room.votes={};room.actions={};room.message=victim?"انتهى الليل. راجعن حالة اللاعبات في القائمة.":"انتهى الليل دون ضحية.";
   }else if(room.phase==="day"){
    const counts={};Object.values(room.votes).forEach(v=>counts[v]=(counts[v]||0)+1);let sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    let out=sorted.length&&(!sorted[1]||sorted[0][1]>(sorted[1]?.[1]||0))?sorted[0][0]:null;
    if(out){let v=room.players.find(x=>x.id===out);if(v)v.alive=false}
    const alive=room.players.filter(x=>x.alive), mafia=alive.filter(x=>x.role==="المافيا").length, citizens=alive.length-mafia;
    if(mafia===0||mafia>=citizens){room.phase="ended";room.winner=mafia===0?"المواطنات":"المافيا";room.message="انتهت اللعبة! الفائز: "+room.winner}
    else{room.phase="night";room.round++;room.message=out?"تم الإقصاء. حلّ الليل من جديد.":"تعادل التصويت. حلّ الليل من جديد."}
    room.votes={};room.actions={};
   }else fail("لا يمكن نقل المرحلة الآن");
   await save(c,room);return json({ok:true});
  }
  fail("طلب غير معروف");
 }catch(e){return json({ok:false,error:e.message||"حدث خطأ"},400)}
};
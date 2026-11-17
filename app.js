// Supabase public project settings
const SUPABASE_URL = "https://mdxcsasjsfkczwmrvpeg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZtRwiRgJ-ieBl_C0bl_k7w_MUlx0Fy3";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("PASTE_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const packages = [
  {key:"1k",coins:1000,price:3000},{key:"2k",coins:2000,price:6000},
  {key:"3k",coins:3000,price:9000},{key:"4k",coins:4000,price:12000},
  {key:"5k",coins:5000,price:15000},{key:"6k",coins:6000,price:18000},
  {key:"7k",coins:7000,price:21000},{key:"8k",coins:8000,price:24000},
  {key:"9k",coins:9000,price:27000},{key:"10k",coins:10000,price:30000},
  {key:"50k",coins:50000,price:150000,special:true}
];
const toman = n => new Intl.NumberFormat("fa-IR").format(n) + " تومان";
const grid = document.getElementById("package-grid");
let chosen = null;
packages.forEach(p=>{
  const el=document.createElement("article");
  el.className="package"+(p.special?" special":"");
  const packageName = p.special ? "۵۰٬۰۰۰ سکه ویژه" : "بسته "+p.key.toUpperCase()+" سکه";
  el.innerHTML=`<div class="coin-art">🪙</div><h3>${packageName}</h3><div class="price">${toman(p.price)}</div><button class="gold-btn" type="button">خرید این بسته</button>`;
  el.querySelector("button").addEventListener("click",()=>openOrder(p));
  grid.appendChild(el);
});
function openOrder(p){
  chosen=p;
  document.getElementById("order-title").textContent=`خرید ${p.coins.toLocaleString("fa-IR")} سکه`;
  document.getElementById("selected-package").textContent=`${p.coins.toLocaleString("fa-IR")}${p.special?" سکه ویژه":" سکه"} · ${toman(p.price)}`;
  document.getElementById("order-result").textContent="";
  document.getElementById("order-dialog").showModal();
}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close).close()));
function show(el,msg,ok=false){el.innerHTML=msg;el.className="result "+(ok?"success":"error");}
function requireDb(el){if(!db){show(el,"اتصال دیتابیس برقرار نشد. اتصال اینترنت و بارگذاری صفحه را بررسی کن.");return false;}return true;}

document.getElementById("order-form").addEventListener("submit",async e=>{
  e.preventDefault(); const out=document.getElementById("order-result"); if(!requireDb(out)||!chosen)return;
  const file=document.getElementById("receipt-file").files[0];
  if(!file||!file.type.startsWith("image/")||file.size>5*1024*1024){show(out,"رسید باید تصویر و حداکثر ۵ مگابایت باشد.");return;}
  const btn=document.getElementById("submit-order");btn.disabled=true;btn.textContent="در حال ثبت...";
  try{
    const payload={p_package_key:chosen.key,p_game_id:document.getElementById("game-id").value.trim(),p_buyer_name:document.getElementById("buyer-name").value.trim(),p_contact:document.getElementById("buyer-contact").value.trim()};
    const {data:created,error}=await db.rpc("create_coin_order",payload); if(error)throw error;
    const order=created?.[0]||created; const code=order?.tracking_code;
    if(!code)throw new Error("کد رهگیری از سرور دریافت نشد.");
    const path=`${code}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const {error:upErr}=await db.storage.from("coin-receipts").upload(path,file,{contentType:file.type,upsert:false});
    if(upErr){show(out,`سفارش با کد ${code} ثبت شد، اما بارگذاری رسید ناموفق بود. با پشتیبانی تماس بگیر. کد: ${code}`,true);return;}
    const {error:attachErr}=await db.rpc("attach_coin_receipt",{p_tracking_code:code,p_receipt_path:path});
    if(attachErr)throw attachErr;
    show(out,`سفارش ثبت شد!<br>کد رهگیری: <b dir="ltr">${code}</b><br>وضعیت: در انتظار بررسی پرداخت`,true);
    document.getElementById("track-code").value=code;
  }catch(err){show(out,"خطا در ثبت سفارش: "+(err.message||"خطای نامشخص"));}
  finally{btn.disabled=false;btn.textContent="ثبت سفارش و دریافت کد رهگیری";}
});

document.getElementById("track-form").addEventListener("submit",async e=>{
  e.preventDefault();const out=document.getElementById("track-result");if(!requireDb(out))return;
  const {data,error}=await db.rpc("lookup_coin_order",{p_tracking_code:document.getElementById("track-code").value.trim().toUpperCase()});
  if(error||!data?.length){show(out,"سفارشی با این کد پیدا نشد.");return;}
  const o=data[0];show(out,`سفارش: ${o.coins.toLocaleString("fa-IR")} سکه<br>مبلغ: ${toman(o.price_toman)}<br>وضعیت: <span class="status">${o.status_fa}</span>`,true);
});

document.getElementById("review-form").addEventListener("submit",async e=>{
  e.preventDefault();const out=document.getElementById("review-result");if(!requireDb(out))return;
  const {error}=await db.rpc("submit_coin_review",{p_tracking_code:document.getElementById("review-code").value.trim().toUpperCase(),p_rating:Number(document.getElementById("review-rating").value),p_message:document.getElementById("review-message").value.trim()});
  if(error){show(out,error.message.includes("completed")?"ثبت رضایت فقط پس از تکمیل سفارش ممکن است.":error.message);return;}
  show(out,"نظر شما با موفقیت ثبت شد. سپاس از اعتمادت! 💛",true);e.target.reset();
});

const adminDialog=document.getElementById("admin-dialog");
document.getElementById("admin-open").addEventListener("click",()=>{adminDialog.showModal();});
document.getElementById("admin-login-form").addEventListener("submit",async e=>{
  e.preventDefault();const email=document.getElementById("admin-email").value,password=document.getElementById("admin-password").value;
  if(!requireDb(e.target))return;
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error){alert("ورود ناموفق: "+error.message);return;}
  await loadAdmin();
});
document.getElementById("admin-logout").addEventListener("click",async()=>{await db.auth.signOut();document.getElementById("admin-dashboard").hidden=true;document.getElementById("admin-login-form").hidden=false;});
document.getElementById("refresh-orders").addEventListener("click",loadAdmin);
async function loadAdmin(){
  const {data:userData}=await db.auth.getUser();if(!userData.user)return;
  const {data:admin}=await db.from("coin_admins").select("user_id").eq("user_id",userData.user.id).maybeSingle();
  if(!admin){alert("این حساب دسترسی مدیریت ندارد.");await db.auth.signOut();return;}
  document.getElementById("admin-login-form").hidden=true;document.getElementById("admin-dashboard").hidden=false;
  const {data:orders,error}=await db.from("coin_orders").select("*").order("created_at",{ascending:false}).limit(100);
  const host=document.getElementById("admin-orders");host.innerHTML="";
  if(error){host.textContent=error.message;return;}
  for(const o of orders||[]){
    const row=document.createElement("div");row.className="order-row";
    row.innerHTML=`<b>${o.tracking_code}</b> · ${o.coins.toLocaleString("fa-IR")} سکه · ${toman(o.price_toman)}<p>${o.buyer_name} | ${o.contact} | آیدی بازی: ${o.game_id}</p><p>وضعیت: ${o.status}</p>`;
    if(o.receipt_path){const {data:signed}=await db.storage.from("coin-receipts").createSignedUrl(o.receipt_path,300);if(signed?.signedUrl){const a=document.createElement("a");a.className="receipt-link";a.href=signed.signedUrl;a.target="_blank";a.rel="noopener";a.textContent="مشاهده رسید پرداخت";row.appendChild(a);}}
    const actions=document.createElement("div");actions.className="actions";
    [["تأیید پرداخت","paid"],["تکمیل سفارش","completed"],["رد سفارش","rejected"],["لغو سفارش","cancelled"],["در انتظار","pending"]].forEach(([label,status])=>{const b=document.createElement("button");b.textContent=label;if(["rejected","cancelled"].includes(status))b.className="danger";b.onclick=()=>updateStatus(o.id,status);actions.appendChild(b);});
    row.appendChild(actions);host.appendChild(row);
  }
  const {data:reviews}=await db.from("coin_reviews").select("*").order("created_at",{ascending:false}).limit(100);
  const rh=document.getElementById("admin-reviews");rh.innerHTML="";
  (reviews||[]).forEach(r=>{const d=document.createElement("div");d.className="review-row";d.textContent=`${r.tracking_code} · ${"★".repeat(r.rating)} · ${r.message||"بدون متن"}`;rh.appendChild(d);});
}
async function updateStatus(id,status){
  const {error}=await db.from("coin_orders").update({status}).eq("id",id);
  if(error)alert("خطا: "+error.message);else await loadAdmin();
}

(() => {
  const $ = id => document.getElementById(id);
  const ready = window.SUPABASE_URL && !window.SUPABASE_URL.includes("YOUR-PROJECT") &&
    window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  const client = ready && window.supabase ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
  let currentProfile = null;
  const msg = (s, type="") => { $("authMsg").textContent=s; $("authMsg").className="msg "+type; };
  const syntheticEmail = id => `${String(id).trim().toLowerCase()}@accounts.animal-explore.invalid`;
  const needClient = () => { if(!client){msg("ابتدا آدرس و کلید عمومی Supabase را در config.js وارد کن.","error");return false;} return true; };
  async function loadApp(){
    const {data:{user}} = await client.auth.getUser();
    if(!user){$("appPanel").classList.add("hidden");$("authPanel").classList.remove("hidden");return;}
    const {data,error}=await client.from("profiles").select("*").eq("id",user.id).single();
    if(error){msg("خطا در دریافت پروفایل: "+error.message,"error");return;}
    currentProfile=data;
    $("authPanel").classList.add("hidden");$("appPanel").classList.remove("hidden");
    $("welcome").textContent=`سلام ${data.display_name} 🐾`;
    $("profileInfo").textContent=`شناسه بازی: ${data.game_id} | نقش: ${data.role}${data.is_verified?" | تیک آبی ✓":""}`;
    await Promise.all([loadFeed(),loadEntities("groups"),loadEntities("channels")]);
  }
  $("signup").onclick=async()=>{
    if(!needClient())return;
    const display_name=$("name").value.trim(), game_id=$("gameId").value.trim(), password=$("password").value;
    const age=Number($("age").value), birth_date=$("birth").value, rubika_id=$("rubika").value.trim(), referral=$("referral").value.trim();
    if(!display_name||!game_id||!password||!age||!birth_date||!rubika_id){msg("همه موارد به‌جز کد معرف را کامل کن.","error");return;}
    if(password.length<6){msg("رمز عبور باید حداقل ۶ نویسه باشد.","error");return;}
    const {data,error}=await client.auth.signUp({email:syntheticEmail(game_id),password});
    if(error){msg(error.message,"error");return;}
    if(!data.user){msg("حساب ایجاد نشد. تنظیمات تأیید ایمیل Supabase را بررسی کن.","error");return;}
    const {error:profileError}=await client.from("profiles").insert({id:data.user.id,display_name,age,birth_date,game_id,rubika_id,referral_code_used:referral||null});
    if(profileError){msg("حساب ساخته شد اما ذخیره پروفایل خطا داد: "+profileError.message,"error");return;}
    msg("حساب ساخته شد!","success"); await loadApp();
  };
  $("login").onclick=async()=>{
    if(!needClient())return;
    const id=$("gameId").value.trim(), password=$("password").value;
    if(!id||!password){msg("شناسه بازی و رمز را وارد کن.","error");return;}
    const {error}=await client.auth.signInWithPassword({email:syntheticEmail(id),password});
    if(error){msg(error.message,"error");return;} await loadApp();
  };
  $("logout").onclick=async()=>{await client.auth.signOut();currentProfile=null;await loadApp();};
  async function loadFeed(){
    const {data,error}=await client.from("posts").select("id,content,created_at,profiles(display_name)").order("created_at",{ascending:false}).limit(30);
    $("feed").innerHTML="";
    if(error){$("feed").textContent=error.message;return;}
    (data||[]).forEach(p=>{const d=document.createElement("article");d.className="post";const b=document.createElement("b");b.textContent=p.profiles?.display_name||"بازیکن";const t=document.createElement("p");t.textContent=p.content;d.append(b,t);$("feed").append(d);});
  }
  $("publish").onclick=async()=>{const content=$("postText").value.trim();if(!content)return;const {error}=await client.from("posts").insert({user_id:currentProfile.id,content});if(error){alert(error.message);return;}$("postText").value="";await loadFeed();};
  async function loadEntities(kind){
    const {data,error}=await client.from(kind).select("id,name,created_at").order("created_at",{ascending:false}).limit(20);
    const target=$(kind);target.innerHTML="";
    if(error){target.textContent=error.message;return;}
    (data||[]).forEach(x=>{const d=document.createElement("div");d.className="entity";d.textContent=x.name;target.append(d);});
  }
  async function createEntity(kind,inputId){
    const name=$(inputId).value.trim();if(!name)return;
    const {error}=await client.from(kind).insert({name,created_by:currentProfile.id});
    if(error){alert(error.message);return;}$(inputId).value="";await loadEntities(kind);
  }
  $("createGroup").onclick=()=>createEntity("groups","groupName");
  $("createChannel").onclick=()=>createEntity("channels","channelName");
  if(client) loadApp(); else msg("برای فعال‌سازی، اطلاعات Supabase را در config.js قرار بده.");
})();
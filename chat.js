/* Animal Explore - Messenger UI */
window.renderRubikaChat = async function(ctx) {
  const {db,user,chatMode,setChatMode,getCurrentRoom,setCurrentRoom,view,toast,esc,upload,openModal,modal} = ctx;
  const $ = s => view.querySelector(s);
  const $$ = s => [...view.querySelectorAll(s)];
  const modes = {private:"گفت‌وگوهای شخصی",group:"گروه‌ها",channel:"کانال‌ها"};
  view.innerHTML = `
    <section class="ae-messenger" dir="rtl">
      <header class="ae-chat-top">
        <div><h2>پیام‌رسان</h2><small>Animal Explore</small></div>
        <button class="ae-new" id="aeNew">＋ گفت‌وگوی جدید</button>
      </header>
      <input class="ae-search" id="aeSearch" placeholder="جست‌وجوی گفتگو یا آیدی...">
      <nav class="ae-tabs">
        <button data-mode="private" class="${chatMode==="private"?"active":""}">شخصی</button>
        <button data-mode="group" class="${chatMode==="group"?"active":""}">گروه‌ها</button>
        <button data-mode="channel" class="${chatMode==="channel"?"active":""}">کانال‌ها</button>
      </nav>
      <div class="ae-chat-layout">
        <aside class="ae-chat-list" id="aeList"><p class="ae-muted">در حال بارگذاری...</p></aside>
        <section class="ae-chat-window" id="aeWindow">
          <div class="ae-empty"><div>🐾</div><b>یک گفتگو انتخاب کن</b><p>یا گفت‌وگوی تازه‌ای بساز.</p></div>
        </section>
      </div>
    </section>`;
  $$("[data-mode]").forEach(b => b.onclick = () => { setChatMode(b.dataset.mode); window.chatSubscription && db.removeChannel(window.chatSubscription); window.renderRubikaChat({...ctx,chatMode:b.dataset.mode}); });
  $("#aeSearch").oninput = () => {
    const q=$("#aeSearch").value.trim().toLowerCase();
    $$(".ae-chat-item").forEach(x=>x.classList.toggle("ae-hide",!x.dataset.search.includes(q)));
  };
  $("#aeNew").onclick = () => {
    openModal(`<h3>${chatMode==="private"?"شروع گفت‌وگوی خصوصی":chatMode==="group"?"ساخت گروه":"ساخت کانال"}</h3>
      <input id="aeTarget" placeholder="${chatMode==="private"?"آیدی کاربر بدون @":"نام "+(chatMode==="group"?"گروه":"کانال")}">
      <button class="primary full" id="aeCreate">ادامه</button>`);
    view.dispatchEvent(new Event("ae-modal-open"));
    setTimeout(()=> {
      const btn=document.querySelector("#aeCreate");
      if(!btn)return;
      btn.onclick=async()=>{
        const val=document.querySelector("#aeTarget")?.value.trim().replace(/^@/,"");
        if(!val)return toast("مقدار را وارد کن");
        if(chatMode==="private"){
          const {data:p,error}=await db.from("profiles").select("id,display_name").eq("username",val.toLowerCase()).maybeSingle();
          if(error||!p)return toast("کاربر پیدا نشد");
          if(p.id===user.id)return toast("نمی‌توانی با خودت گفتگو بسازی");
          const {data:r,error:e}=await db.rpc("get_or_create_direct_room",{p_other_user:p.id});
          if(e)return toast(e.message);
          const id=typeof r==="string"?r:(r?.id||r);
          modal.classList.add("hidden"); await window.renderRubikaChat(ctx); await openRoom(id,p.display_name||val);
        } else {
          const {data:r,error}=await db.from("rooms").insert({name:val,room_type:chatMode,created_by:user.id}).select().single();
          if(error)return toast(error.message);
          const m=await db.from("room_members").insert({room_id:r.id,user_id:user.id,member_role:"owner"});
          if(m.error)return toast("اتاق ساخته شد اما عضویت انجام نشد: "+m.error.message);
          modal.classList.add("hidden"); await window.renderRubikaChat(ctx); await openRoom(r.id,val);
        }
      };
    },50);
  };

  async function loadList(){
    const box=$("#aeList");
    const {data:members,error}=await db.from("room_members").select("room_id,rooms(id,name,room_type)").eq("user_id",user.id);
    if(error){box.innerHTML=`<p class="ae-muted">خطا: ${esc(error.message)}</p>`;return;}
    let rooms=(members||[]).map(x=>x.rooms).filter(Boolean).filter(r=>r.room_type===chatMode);
    if(!rooms.length){box.innerHTML=`<div class="ae-empty-list">هنوز ${modes[chatMode]} نداری.</div>`;return;}
    box.innerHTML="";
    for(const room of rooms){
      let title=room.name||"گفت‌وگوی خصوصی";
      if(room.room_type==="private"){
        const {data:other}=await db.from("room_members").select("user_id").eq("room_id",room.id).neq("user_id",user.id).maybeSingle();
        if(other){const {data:p}=await db.from("profiles").select("display_name,username").eq("id",other.user_id).maybeSingle();title=p?.display_name||("@"+(p?.username||"کاربر"));}
      }
      const {data:last}=await db.from("messages").select("content,created_at").eq("room_id",room.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
      const item=document.createElement("button");
      item.className="ae-chat-item"; item.dataset.search=(title+" "+(last?.content||"")).toLowerCase();
      item.innerHTML=`<span class="ae-chat-avatar">${room.room_type==="group"?"👥":room.room_type==="channel"?"📢":"🐾"}</span>
        <span class="ae-chat-desc"><b>${esc(title)}</b><small>${esc(last?.content||"هنوز پیامی ارسال نشده")}</small></span>
        <time>${last?.created_at?new Date(last.created_at).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"}):""}</time>`;
      item.onclick=()=>openRoom(room.id,title); box.append(item);
    }
  }

  async function openRoom(roomId,title="گفتگو"){
    setCurrentRoom(roomId);
    const win=$("#aeWindow");
    win.innerHTML=`<header class="ae-room-head"><button id="aeBack">‹</button><div><b>${esc(title)}</b><small>گفت‌وگوی Animal Explore</small></div></header>
      <div class="ae-message-list" id="aeMessages"><p class="ae-muted">در حال دریافت پیام‌ها...</p></div>
      <div class="ae-composer">
        <label for="aeFile" title="پیوست">＋</label><input id="aeFile" type="file" accept="image/*,video/*,audio/*,.pdf,.zip" hidden>
        <textarea id="aeText" rows="1" placeholder="پیام بنویس..."></textarea><button id="aeSend">➤</button>
      </div><small class="ae-file-name" id="aeFileName"></small>`;
    $("#aeBack").onclick=()=>{setCurrentRoom(null);win.innerHTML='<div class="ae-empty"><div>🐾</div><b>یک گفتگو انتخاب کن</b></div>';};
    $("#aeFile").onchange=()=>$("#aeFileName").textContent=$("#aeFile").files[0]?.name||"";
    $("#aeSend").onclick=send;
    $("#aeText").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
    await loadMessages();
    if(window.chatSubscription)db.removeChannel(window.chatSubscription);
    window.chatSubscription=db.channel("ae-room-"+roomId).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:"room_id=eq."+roomId},loadMessages).subscribe();
  }
  async function loadMessages(){
    const box=$("#aeMessages"); if(!box||!getCurrentRoom())return;
    const {data,error}=await db.from("messages").select("*,profiles(display_name,username)").eq("room_id",getCurrentRoom()).order("created_at",{ascending:true}).limit(150);
    if(error){box.innerHTML=`<p class="ae-muted">خطا در دریافت پیام: ${esc(error.message)}</p>`;return;}
    box.innerHTML=(data||[]).map(m=>{
      const mine=m.sender_id===user.id;
      let media="";
      if(m.media_url){
        const url=esc(m.media_url);
        media=/\.(mp4|webm|mov)(\?|$)/i.test(m.media_url)?`<video controls src="${url}"></video>`:/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(m.media_url)?`<audio controls src="${url}"></audio>`:`<a href="${url}" target="_blank" rel="noopener">📎 مشاهده فایل پیوست</a>`;
      }
      return `<div class="ae-msg-row ${mine?"mine":"theirs"}"><div class="ae-bubble">${!mine?`<small>${esc(m.profiles?.display_name||m.profiles?.username||"کاربر")}</small>`:""}${m.content?`<div>${esc(m.content).replace(/\n/g,"<br>")}</div>`:""}${media}<time>${new Date(m.created_at).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})}</time></div></div>`;
    }).join("")||'<div class="ae-empty-list">هنوز پیامی نیست. اولین پیام را بفرست!</div>';
    box.scrollTop=box.scrollHeight;
  }
  async function send(){
    const btn=$("#aeSend"),text=$("#aeText").value.trim(),file=$("#aeFile").files[0];
    if(btn.disabled||(!text&&!file))return;
    btn.disabled=true;
    try{
      const media_url=file?await upload("chat-media",file):null;
      const {error}=await db.from("messages").insert({room_id:getCurrentRoom(),sender_id:user.id,content:text,media_url});
      if(error)throw error;
      $("#aeText").value="";$("#aeFile").value="";$("#aeFileName").textContent="";
      await loadMessages();await loadList();
    }catch(e){toast("ارسال ناموفق بود: "+e.message);}finally{btn.disabled=false;}
  }
  await loadList();
  const id=getCurrentRoom();
  if(id) await openRoom(id,"گفتگو");
};

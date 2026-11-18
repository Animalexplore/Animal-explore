/* Animal Explore Messenger - functional chat + stories */
window.renderRubikaChat = async function(ctx) {
  const {db,user,chatMode,setChatMode,getCurrentRoom,setCurrentRoom,view,toast,esc,upload,openModal,modal} = ctx;
  const $ = s => view.querySelector(s);
  const $$ = s => [...view.querySelectorAll(s)];
  const modes = {private:"گفت‌وگوهای شخصی",group:"گروه‌ها",channel:"کانال‌ها"};
  const avatar = (name, url) => url
    ? `<img class="ae-avatar-img" src="${esc(url)}" alt="">`
    : `<span class="ae-avatar">${esc(String(name||"؟").trim().charAt(0)||"؟")}</span>`;
  const closeSubscription = () => {
    if (window.chatSubscription) { db.removeChannel(window.chatSubscription); window.chatSubscription = null; }
  };

  view.innerHTML = `
    <section class="ae-messenger" dir="rtl">
      <header class="ae-rubika-header">
        <div class="ae-header-title"><span class="ae-header-mark">✉</span><div><b>پیام‌رسان</b><small>Animal Explore</small></div></div>
        <div class="ae-header-actions">
          <button class="ae-icon-btn" id="aeSearchToggle" aria-label="جستجو">⌕</button>
          <button class="ae-icon-btn" id="aeNew" aria-label="گفتگوی جدید">✎</button>
          <button class="ae-icon-btn" id="aeMore" aria-label="بیشتر">⋮</button>
        </div>
      </header>
      <div class="ae-search-wrap"><span>⌕</span><input class="ae-search" id="aeSearch" placeholder="جستجو در گفتگوها"></div>
      <section class="ae-stories" id="aeStories" aria-label="استوری‌ها">
        <button class="ae-story ae-story-add" id="aeAddStory"><span class="ae-story-ring"><i>＋</i></span><small>استوری من</small></button>
        <span class="ae-muted">در حال دریافت استوری‌ها...</span>
      </section>
      <nav class="ae-chat-tabs">
        <button data-mode="private" class="${chatMode==="private"?"active":""}">همه گفتگوها</button>
        <button data-mode="group" class="${chatMode==="group"?"active":""}">گروه‌ها</button>
        <button data-mode="channel" class="${chatMode==="channel"?"active":""}">کانال‌ها</button>
      </nav>
      <div class="ae-chat-layout">
        <aside class="ae-chat-list-panel" id="aeListPanel">
          <div class="ae-list-caption"><b>${modes[chatMode]}</b><span id="aeChatCount"></span></div>
          <div class="ae-chat-list" id="aeList"><p class="ae-muted">در حال بارگذاری گفتگوها...</p></div>
        </aside>
        <section class="ae-chat-window" id="aeWindow">
          <div class="ae-empty"><div class="ae-empty-icon">✉</div><b>یک گفتگو انتخاب کن</b><p>برای شروع، گفت‌وگوی تازه بساز.</p></div>
        </section>
      </div>
      <button class="ae-compose-fab" id="aeFab" aria-label="گفتگوی جدید">✎</button>
    </section>`;

  $$("[data-mode]").forEach(b => b.onclick = () => {
    setChatMode(b.dataset.mode); closeSubscription();
    window.renderRubikaChat({...ctx,chatMode:b.dataset.mode});
  });
  $("#aeSearchToggle").onclick = () => {
    $(".ae-search-wrap").classList.toggle("ae-search-open");
    $("#aeSearch").focus();
  };
  $("#aeSearch").oninput = () => {
    const q=$("#aeSearch").value.trim().toLowerCase();
    $$(".ae-chat-item").forEach(x=>x.classList.toggle("ae-hide",!x.dataset.search.includes(q)));
  };
  $("#aeMore").onclick = () => openModal(`<h3>گزینه‌ها</h3><p class="ae-modal-note">پیام‌رسان Animal Explore</p><button class="primary full" id="aeModalNew">＋ گفت‌وگوی جدید</button>`);
  $("#aeModalNew")?.addEventListener("click", () => { modal.classList.add("hidden"); createDialog(); });
  $("#aeAddStory").onclick = createStory;
  $("#aeNew").onclick = createDialog;
  $("#aeFab").onclick = createDialog;

  async function loadStories(){
    const box=$("#aeStories");
    const {data,error}=await db.from("stories")
      .select("id,user_id,media_url,media_type,created_at,expires_at")
      .gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(60);
    if(error){
      box.innerHTML=`<button class="ae-story ae-story-add" id="aeAddStory"><span class="ae-story-ring"><i>＋</i></span><small>استوری من</small></button><small class="ae-muted">استوری هنوز آماده نیست</small>`;
      $("#aeAddStory").onclick=createStory;
      return;
    }
    const ids=[...new Set((data||[]).map(s=>s.user_id))];
    const profs=ids.length?(await db.from("profiles").select("id,display_name,username,avatar_url").in("id",ids)).data||[]:[];
    const byId=Object.fromEntries(profs.map(p=>[p.id,p]));
    const mine=(data||[]).filter(s=>s.user_id===user.id);
    const others=(data||[]).filter(s=>s.user_id!==user.id);
    box.innerHTML=`<button class="ae-story ae-story-add" id="aeAddStory"><span class="ae-story-ring"><i>＋</i></span><small>استوری من</small></button>`+
      (mine.length?`<button class="ae-story" data-story-user="${user.id}">${avatar("من",byId[user.id]?.avatar_url)}<small>استوری من</small></button>`:"")+
      others.map(s=>{const p=byId[s.user_id]||{};return `<button class="ae-story" data-story-user="${s.user_id}">${avatar(p.display_name,p.avatar_url)}<small>${esc(p.display_name||p.username||"کاربر")}</small></button>`;}).join("");
    $("#aeAddStory").onclick=createStory;
    $$("[data-story-user]").forEach(b=>b.onclick=()=>viewStories(b.dataset.storyUser));
  }

  async function createStory(){
    openModal(`<h3>استوری جدید</h3><p class="ae-modal-note">عکس یا ویدیوی استوری تا ۲۴ ساعت نمایش داده می‌شود.</p><input id="aeStoryFile" type="file" accept="image/*,video/*"><button class="primary full" id="aeStoryUpload">انتشار استوری</button>`);
    $("#aeStoryUpload").onclick=async()=>{
      const f=$("#aeStoryFile").files[0];
      if(!f)return toast("یک عکس یا ویدیو انتخاب کن");
      if(f.size>50*1024*1024)return toast("حجم فایل باید کمتر از ۵۰ مگابایت باشد");
      const btn=$("#aeStoryUpload");btn.disabled=true;
      try{
        const url=await upload("stories",f);
        const {error}=await db.from("stories").insert({user_id:user.id,media_url:url,media_type:f.type,expires_at:new Date(Date.now()+86400000).toISOString()});
        if(error)throw error;
        modal.classList.add("hidden");toast("استوری منتشر شد");await loadStories();
      }catch(e){toast("انتشار ناموفق بود: "+e.message);}finally{btn.disabled=false;}
    };
  }

  async function viewStories(userId){
    const {data,error}=await db.from("stories").select("id,media_url,media_type,created_at").eq("user_id",userId).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:true});
    if(error||!data?.length)return toast("استوری فعالی وجود ندارد");
    const {data:owner}=await db.from("profiles").select("display_name").eq("id",userId).maybeSingle();
    let i=0;
    const draw=()=>{
      const s=data[i], media=s.media_type?.startsWith("video")
        ?`<video class="ae-story-view-media" src="${esc(s.media_url)}" controls autoplay playsinline></video>`
        :`<img class="ae-story-view-media" src="${esc(s.media_url)}" alt="استوری">`;
      openModal(`<div class="ae-story-viewer"><div class="ae-story-view-head"><b>${esc(owner?.display_name||"استوری")}</b><span>${i+1} از ${data.length}</span></div>${media}<div class="ae-story-view-actions"><button class="secondary" id="aeStoryPrev" ${i===0?"disabled":""}>قبلی</button><button class="primary" id="aeStoryNext">${i===data.length-1?"بستن":"بعدی"}</button></div></div>`);
      $("#aeStoryPrev")?.addEventListener("click",()=>{i--;draw();});
      $("#aeStoryNext")?.addEventListener("click",()=>{if(i===data.length-1)modal.classList.add("hidden");else{i++;draw();}});
    };
    draw();
  }

  function createDialog(){
    openModal(`<h3>${chatMode==="private"?"گفت‌وگوی خصوصی جدید":chatMode==="group"?"ساخت گروه جدید":"ساخت کانال جدید"}</h3>
      <p class="ae-modal-note">${chatMode==="private"?"آیدی پیام یا شناسه عددی کاربر را وارد کن.":"نام موردنظر را وارد کن."}</p>
      <input id="aeTarget" placeholder="${chatMode==="private"?"@username یا شناسه عددی":"نام "+(chatMode==="group"?"گروه":"کانال")}">
      <button class="primary full" id="aeCreate">ادامه</button>`);
    $("#aeCreate").onclick=async()=>{
      const val=$("#aeTarget")?.value.trim().replace(/^@/,"");
      if(!val)return toast("مقدار را وارد کن");
      if(chatMode==="private"){
        let query=db.from("profiles").select("id,display_name,username,avatar_url");
        query=/^\d{8}$/.test(val)?query.eq("public_id",val):query.eq("username",val.toLowerCase());
        const {data:p,error}=await query.maybeSingle();
        if(error||!p)return toast("کاربر پیدا نشد");
        if(p.id===user.id)return toast("نمی‌توانی با خودت گفتگو بسازی");
        const {data:r,error:e}=await db.rpc("get_or_create_direct_room",{p_other_user:p.id});
        if(e)return toast(e.message);
        const id=typeof r==="string"?r:(r?.id||r);
        modal.classList.add("hidden");closeSubscription();
        await window.renderRubikaChat(ctx);await openRoom(id,p.display_name||val,p.avatar_url);
      }else{
        const {data:r,error}=await db.from("rooms").insert({name:val,room_type:chatMode,created_by:user.id}).select().single();
        if(error)return toast(error.message);
        const m=await db.from("room_members").insert({room_id:r.id,user_id:user.id,member_role:"owner"});
        if(m.error)return toast("اتاق ساخته شد اما عضویت انجام نشد: "+m.error.message);
        modal.classList.add("hidden");closeSubscription();
        await window.renderRubikaChat(ctx);await openRoom(r.id,val);
      }
    };
  }

  async function loadList(){
    const box=$("#aeList"), count=$("#aeChatCount");
    const {data:members,error}=await db.from("room_members").select("room_id,rooms(id,name,room_type)").eq("user_id",user.id);
    if(error){box.innerHTML=`<p class="ae-muted">خطا: ${esc(error.message)}</p>`;return;}
    const rooms=(members||[]).map(x=>x.rooms).filter(Boolean).filter(r=>r.room_type===chatMode);
    const prepared=[];
    for(const room of rooms){
      let title=room.name||"گفت‌وگوی خصوصی",subname="",pic="";
      if(room.room_type==="private"){
        const {data:other}=await db.from("room_members").select("user_id").eq("room_id",room.id).neq("user_id",user.id).maybeSingle();
        if(other){const {data:p}=await db.from("profiles").select("display_name,username,avatar_url").eq("id",other.user_id).maybeSingle();title=p?.display_name||("@"+(p?.username||"کاربر"));subname=p?.username?"@"+p.username:"";pic=p?.avatar_url||"";}
      }
      const {data:last}=await db.from("messages").select("content,media_url,created_at,sender_id").eq("room_id",room.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
      prepared.push({room,title,subname,pic,last});
    }
    prepared.sort((a,b)=>new Date(b.last?.created_at||0)-new Date(a.last?.created_at||0));
    count.textContent=prepared.length?`${prepared.length}`:"";
    if(!prepared.length){box.innerHTML=`<div class="ae-empty-list"><div>☁</div><b>هنوز گفتگویی نداری</b><small>برای شروع، روی دکمه نوشتن بزن.</small></div>`;return;}
    box.innerHTML="";
    for(const x of prepared){
      const {room,title,subname,pic,last}=x;
      const item=document.createElement("button");
      item.className="ae-chat-item";item.dataset.search=(title+" "+subname+" "+(last?.content||"")).toLowerCase();
      const symbol=room.room_type==="group"?"👥":room.room_type==="channel"?"📢":title.trim().charAt(0)||"؟";
      const preview=last?.content||(last?.media_url?"رسانه":"هنوز پیامی ارسال نشده");
      item.innerHTML=`${pic?`<img class="ae-chat-avatar-img" src="${esc(pic)}">`:`<span class="ae-chat-avatar">${symbol}</span>`}
        <span class="ae-chat-desc"><span class="ae-chat-name-line"><b>${esc(title)}</b><time>${last?.created_at?new Date(last.created_at).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"}):""}</time></span>
        <span class="ae-chat-preview">${last?.sender_id===user.id?"شما: ":""}${esc(preview)}</span></span>`;
      item.onclick=()=>openRoom(room.id,title,pic);
      box.append(item);
    }
  }

  async function openRoom(roomId,title="گفتگو",pic=""){
    setCurrentRoom(roomId);
    const win=$("#aeWindow"),panel=$("#aeListPanel"),layout=$(".ae-chat-layout");
    layout.classList.add("ae-room-open");panel.classList.add("ae-mobile-hidden");win.classList.add("ae-mobile-visible");
    win.innerHTML=`<header class="ae-room-head"><button class="ae-back" id="aeBack" aria-label="بازگشت">›</button>${avatar(title,pic)}
      <div class="ae-room-title"><b>${esc(title)}</b><small>گفت‌وگوی Animal Explore</small></div><button class="ae-room-action" id="aeRoomMore">⋮</button></header>
      <div class="ae-message-list" id="aeMessages"><p class="ae-muted">در حال دریافت پیام‌ها...</p></div>
      <div class="ae-composer-wrap"><div class="ae-composer">
        <label for="aeFile" title="پیوست">＋</label><input id="aeFile" type="file" accept="image/*,video/*,audio/*,.pdf,.zip" hidden>
        <textarea id="aeText" rows="1" placeholder="پیام بنویس..."></textarea><button id="aeSend" aria-label="ارسال">➤</button>
      </div><small class="ae-file-name" id="aeFileName"></small></div>`;
    $("#aeBack").onclick=()=>{setCurrentRoom(null);layout.classList.remove("ae-room-open");panel.classList.remove("ae-mobile-hidden");win.classList.remove("ae-mobile-visible");win.innerHTML='<div class="ae-empty"><div class="ae-empty-icon">✉</div><b>یک گفتگو انتخاب کن</b></div>';};
    $("#aeRoomMore").onclick=()=>openModal(`<h3>${esc(title)}</h3><p class="ae-modal-note">گفت‌وگو در Animal Explore</p><button class="secondary full" id="aeRefreshRoom">بازخوانی پیام‌ها</button>`);
    $("#aeRefreshRoom")?.addEventListener("click",()=>{modal.classList.add("hidden");loadMessages();});
    $("#aeFile").onchange=()=>$("#aeFileName").textContent=$("#aeFile").files[0]?.name||"";
    $("#aeSend").onclick=send;
    $("#aeText").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
    await loadMessages();closeSubscription();
    window.chatSubscription=db.channel("ae-room-"+roomId).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:"room_id=eq."+roomId},loadMessages).subscribe();
  }

  async function loadMessages(){
    const box=$("#aeMessages");if(!box||!getCurrentRoom())return;
    const {data,error}=await db.from("messages").select("*").eq("room_id",getCurrentRoom()).order("created_at",{ascending:true}).limit(200);
    if(error){box.innerHTML=`<p class="ae-muted">خطا در دریافت پیام: ${esc(error.message)}</p>`;return;}
    const ids=[...new Set((data||[]).map(m=>m.sender_id))];
    const profs=ids.length?(await db.from("profiles").select("id,display_name,username").in("id",ids)).data||[]:[];
    const byId=Object.fromEntries(profs.map(p=>[p.id,p]));
    box.innerHTML=(data||[]).map(m=>{
      const mine=m.sender_id===user.id;let media="";
      if(m.media_url){
        const url=esc(m.media_url),type=m.media_type||"";
        if(type.startsWith("video"))media=`<video controls playsinline src="${url}"></video>`;
        else if(type.startsWith("audio"))media=`<audio controls src="${url}"></audio>`;
        else if(type.startsWith("image"))media=`<a class="ae-image-link" href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="تصویر پیام"></a>`;
        else media=`<a href="${url}" target="_blank" rel="noopener">📎 مشاهده فایل پیوست</a>`;
      }
      return `<div class="ae-msg-row ${mine?"mine":"theirs"}"><div class="ae-bubble">${!mine?`<small>${esc(byId[m.sender_id]?.display_name||byId[m.sender_id]?.username||"کاربر")}</small>`:""}${m.content?`<div>${esc(m.content).replace(/\n/g,"<br>")}</div>`:""}${media}<time>${new Date(m.created_at).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})}${mine?" ✓":""}</time></div></div>`;
    }).join("")||'<div class="ae-empty-list">هنوز پیامی نیست. اولین پیام را بفرست!</div>';
    box.scrollTop=box.scrollHeight;
  }
  async function send(){
    const btn=$("#aeSend"),text=$("#aeText").value.trim(),file=$("#aeFile").files[0];
    if(btn.disabled||(!text&&!file))return;
    btn.disabled=true;
    try{
      const media_url=file?await upload("chat-media",file):null;
      const {error}=await db.from("messages").insert({room_id:getCurrentRoom(),sender_id:user.id,content:text,media_url,media_type:file?.type||null});
      if(error)throw error;
      $("#aeText").value="";$("#aeFile").value="";$("#aeFileName").textContent="";
      await loadMessages();await loadList();
    }catch(e){toast("ارسال ناموفق بود: "+e.message);}finally{btn.disabled=false;}
  }
  await Promise.all([loadList(),loadStories()]);
  const id=getCurrentRoom();
  if(id)await openRoom(id,"گفتگو");
};

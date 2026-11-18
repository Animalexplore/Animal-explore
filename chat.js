/* Animal Explore Messenger - Rubika-inspired mobile-first redesign */
window.renderRubikaChat = async function(ctx) {
  const {db,user,chatMode,setChatMode,getCurrentRoom,setCurrentRoom,view,toast,esc,upload,openModal,modal} = ctx;
  const $ = s => view.querySelector(s);
  const $$ = s => [...view.querySelectorAll(s)];
  const modes = {private:"گفت‌وگوهای شخصی",group:"گروه‌ها",channel:"کانال‌ها"};
  const avatar = (name, emoji="") => `<span class="ae-avatar">${emoji || (String(name||"؟").trim().charAt(0) || "؟")}</span>`;
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
      <div class="ae-search-wrap"><span>⌕</span><input class="ae-search" id="aeSearch" placeholder="جستجو در گفتگوها، مخاطبین و پیام‌ها"></div>
      <section class="ae-stories" aria-label="مخاطبین">
        <button class="ae-story ae-story-add" id="aeAddStory"><span class="ae-story-ring"><i>＋</i></span><small>استوری من</small></button>
        <div class="ae-story-placeholder"><span class="ae-story-ring"><b>🐾</b></span><small>مخاطبین</small></div>
        <div class="ae-story-placeholder"><span class="ae-story-ring"><b>👥</b></span><small>گروه‌ها</small></div>
        <div class="ae-story-placeholder"><span class="ae-story-ring"><b>📢</b></span><small>کانال‌ها</small></div>
        <div class="ae-story-placeholder"><span class="ae-story-ring"><b>✨</b></span><small>اکسپلور</small></div>
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
          <div class="ae-empty"><div class="ae-empty-icon">✉</div><b>پیامی برای نمایش انتخاب نشده</b><p>یکی از گفتگوها را باز کن یا گفت‌وگوی تازه‌ای بساز.</p></div>
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
    if ($(".ae-search-wrap").classList.contains("ae-search-open")) $("#aeSearch").focus();
  };
  $("#aeSearch").oninput = () => {
    const q=$("#aeSearch").value.trim().toLowerCase();
    $$(".ae-chat-item").forEach(x=>x.classList.toggle("ae-hide",!x.dataset.search.includes(q)));
  };
  $("#aeMore").onclick = () => openModal(`<h3>گزینه‌ها</h3><p class="ae-modal-note">پیام‌رسان Animal Explore</p><button class="primary full" id="aeModalNew">＋ گفت‌وگوی جدید</button>`);
  $("#aeModalNew")?.addEventListener("click", () => { modal.classList.add("hidden"); createDialog(); });
  $("#aeAddStory").onclick = () => toast("بخش استوری هنوز به پایگاه داده متصل نشده است");
  $("#aeNew").onclick = createDialog;
  $("#aeFab").onclick = createDialog;

  function createDialog(){
    openModal(`<h3>${chatMode==="private"?"گفت‌وگوی خصوصی جدید":chatMode==="group"?"ساخت گروه جدید":"ساخت کانال جدید"}</h3>
      <p class="ae-modal-note">${chatMode==="private"?"آیدی کاربر را وارد کن.":"نام موردنظر را وارد کن."}</p>
      <input id="aeTarget" placeholder="${chatMode==="private"?"آیدی کاربر بدون @":"نام "+(chatMode==="group"?"گروه":"کانال")}">
      <button class="primary full" id="aeCreate">ادامه</button>`);
    setTimeout(()=> {
      const btn=document.querySelector("#aeCreate");
      if(!btn)return;
      btn.onclick=async()=>{
        const val=document.querySelector("#aeTarget")?.value.trim().replace(/^@/,"");
        if(!val)return toast("مقدار را وارد کن");
        if(chatMode==="private"){
          const {data:p,error}=await db.from("profiles").select("id,display_name,username").eq("username",val.toLowerCase()).maybeSingle();
          if(error||!p)return toast("کاربر پیدا نشد");
          if(p.id===user.id)return toast("نمی‌توانی با خودت گفتگو بسازی");
          const {data:r,error:e}=await db.rpc("get_or_create_direct_room",{p_other_user:p.id});
          if(e)return toast(e.message);
          const id=typeof r==="string"?r:(r?.id||r);
          modal.classList.add("hidden"); closeSubscription();
          await window.renderRubikaChat(ctx); await openRoom(id,p.display_name||val);
        } else {
          const {data:r,error}=await db.from("rooms").insert({name:val,room_type:chatMode,created_by:user.id}).select().single();
          if(error)return toast(error.message);
          const m=await db.from("room_members").insert({room_id:r.id,user_id:user.id,member_role:"owner"});
          if(m.error)return toast("اتاق ساخته شد اما عضویت انجام نشد: "+m.error.message);
          modal.classList.add("hidden"); closeSubscription();
          await window.renderRubikaChat(ctx); await openRoom(r.id,val);
        }
      };
    },60);
  }

  async function loadList(){
    const box=$("#aeList"), count=$("#aeChatCount");
    const {data:members,error}=await db.from("room_members").select("room_id,rooms(id,name,room_type)").eq("user_id",user.id);
    if(error){box.innerHTML=`<p class="ae-muted">خطا: ${esc(error.message)}</p>`;return;}
    let rooms=(members||[]).map(x=>x.rooms).filter(Boolean).filter(r=>r.room_type===chatMode);
    const prepared=[];
    for(const room of rooms){
      let title=room.name||"گفت‌وگوی خصوصی", subname="";
      if(room.room_type==="private"){
        const {data:other}=await db.from("room_members").select("user_id").eq("room_id",room.id).neq("user_id",user.id).maybeSingle();
        if(other){const {data:p}=await db.from("profiles").select("display_name,username").eq("id",other.user_id).maybeSingle();title=p?.display_name||("@"+(p?.username||"کاربر"));subname=p?.username?"@"+p.username:"";}
      }
      const {data:last}=await db.from("messages").select("content,created_at,sender_id").eq("room_id",room.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
      prepared.push({room,title,subname,last});
    }
    prepared.sort((a,b)=>new Date(b.last?.created_at||0)-new Date(a.last?.created_at||0));
    count.textContent=prepared.length?`${prepared.length}`:"";
    if(!prepared.length){box.innerHTML=`<div class="ae-empty-list"><div>☁</div><b>هنوز گفتگویی نداری</b><small>برای شروع، روی دکمه نوشتن بزن.</small></div>`;return;}
    box.innerHTML="";
    for(const x of prepared){
      const {room,title,subname,last}=x;
      const item=document.createElement("button");
      item.className="ae-chat-item"; item.dataset.search=(title+" "+subname+" "+(last?.content||"")).toLowerCase();
      const symbol=room.room_type==="group"?"👥":room.room_type==="channel"?"📢":title.trim().charAt(0)||"؟";
      const preview=last?.content || "هنوز پیامی ارسال نشده";
      item.innerHTML=`<span class="ae-chat-avatar">${symbol}</span>
        <span class="ae-chat-desc"><span class="ae-chat-name-line"><b>${esc(title)}</b><time>${last?.created_at?new Date(last.created_at).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"}):""}</time></span>
        <span class="ae-chat-preview">${last?.sender_id===user.id?"شما: ":""}${esc(preview)}</span></span>`;
      item.onclick=()=>openRoom(room.id,title);
      box.append(item);
    }
  }

  async function openRoom(roomId,title="گفتگو"){
    setCurrentRoom(roomId);
    const win=$("#aeWindow");
    const panel=$("#aeListPanel");
    const layout=$(".ae-chat-layout");
    layout.classList.add("ae-room-open");
    panel.classList.add("ae-mobile-hidden");
    win.classList.add("ae-mobile-visible");
    win.innerHTML=`<header class="ae-room-head">
        <button class="ae-back" id="aeBack" aria-label="بازگشت">›</button>
        ${avatar(title)}
        <div class="ae-room-title"><b>${esc(title)}</b><small>گفت‌وگوی Animal Explore</small></div>
        <button class="ae-room-action" id="aeRoomMore">⋮</button>
      </header>
      <div class="ae-message-list" id="aeMessages"><p class="ae-muted">در حال دریافت پیام‌ها...</p></div>
      <div class="ae-composer-wrap"><div class="ae-composer">
        <label for="aeFile" title="پیوست">＋</label><input id="aeFile" type="file" accept="image/*,video/*,audio/*,.pdf,.zip" hidden>
        <textarea id="aeText" rows="1" placeholder="پیام بنویس..."></textarea><button id="aeSend" aria-label="ارسال">➤</button>
      </div><small class="ae-file-name" id="aeFileName"></small></div>`;
    $("#aeBack").onclick=()=>{
      setCurrentRoom(null); layout.classList.remove("ae-room-open");
      panel.classList.remove("ae-mobile-hidden"); win.classList.remove("ae-mobile-visible");
      win.innerHTML='<div class="ae-empty"><div class="ae-empty-icon">✉</div><b>یک گفتگو انتخاب کن</b></div>';
    };
    $("#aeRoomMore").onclick=()=>toast("گزینه‌های بیشتر گفتگو به‌زودی اضافه می‌شود");
    $("#aeFile").onchange=()=>$("#aeFileName").textContent=$("#aeFile").files[0]?.name||"";
    $("#aeSend").onclick=send;
    $("#aeText").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
    await loadMessages();
    closeSubscription();
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
        media=/\.(mp4|webm|mov)(\?|$)/i.test(m.media_url)?`<video controls src="${url}"></video>`:/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(m.media_url)?`<audio controls src="${url}"></audio>`:/\.(png|jpe?g|gif|webp)(\?|$)/i.test(m.media_url)?`<a class="ae-image-link" href="${url}" target="_blank" rel="noopener">🖼 مشاهده تصویر</a>`:`<a href="${url}" target="_blank" rel="noopener">📎 مشاهده فایل پیوست</a>`;
      }
      return `<div class="ae-msg-row ${mine?"mine":"theirs"}"><div class="ae-bubble">${!mine?`<small>${esc(m.profiles?.display_name||m.profiles?.username||"کاربر")}</small>`:""}${m.content?`<div>${esc(m.content).replace(/\n/g,"<br>")}</div>`:""}${media}<time>${new Date(m.created_at).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})}${mine?" ✓":""}</time></div></div>`;
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

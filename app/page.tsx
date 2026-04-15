"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

// 🔥 Firebase 설정 (안전한 초기화)
const firebaseConfig = {
  apiKey: "AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc",
  authDomain: "dooly-66736.firebaseapp.com",
  projectId: "dooly-66736",
  storageBucket: "dooly-66736.firebasestorage.app",
  messagingSenderId: "969360298710",
  appId: "1:969360298710:web:1c09f676b9d784a0bdaf77"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const DEFAULT_AVATAR = "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";

export default function Page() {
  // --- [상태 관리: 8대 요구사항 통합] ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [myRooms, setMyRooms] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [tempName, setTempName] = useState("");
  const [tempImg, setTempImg] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [isNotiEnabled, setIsNotiEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const particleInstance = useRef(null);

  // --- [로직 1: 초기화 및 SSR 대응] ---
  useEffect(() => {
    setIsMounted(true);
    const savedName = localStorage.getItem("dooly-name");
    const savedImg = localStorage.getItem("dooly-profile");
    const savedTheme = localStorage.getItem("dooly-theme");
    const savedRooms = JSON.parse(localStorage.getItem("dooly-rooms") || "[]");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  // --- [로직 2: 6, 7. 파티클 및 마우스 모션 엔진 (빌드 에러 완벽 차단)] ---
  useEffect(() => {
    if (!isMounted) return;
    
    let script = document.getElementById('three-attraction-script');
    if (!script) {
      script = document.createElement("script");
      script.id = 'three-attraction-script';
      script.src = "https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js";
      script.type = "module";
      document.head.appendChild(script);
    }

    const initEngine = async () => {
      try {
        const module = await import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js");
        if (!particleInstance.current && canvasRef.current) {
          particleInstance.current = module.default(canvasRef.current, {
            particles: { attractionIntensity: 0.85, size: 1.2 },
          });
        }
      } catch (e) { console.error("Particle Error:", e); }
    };

    script.onload = initEngine;
    if (script.complete) initEngine(); // 이미 로드된 경우 대응

    return () => { /* 스크립트 삭제 시 엔진 꼬임 방지를 위해 유지 */ };
  }, [isMounted]);

  // --- [로직 3: 실시간 동기화] ---
  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.userName !== myName && isNotiEnabled) {
        setToastMsg({ name: lastMsg.userName, text: lastMsg.text, photo: lastMsg.userPhoto });
        setTimeout(() => setToastMsg(null), 4000);
      }
    });
  }, [currentRoom, myName, isNotiEnabled]);

  const activeUsers = useMemo(() => {
    const usersMap = new Map();
    messages.forEach(m => { if(m.userName) usersMap.set(m.userName, m.userPhoto); });
    return Array.from(usersMap, ([name, photo]) => ({ name, photo }));
  }, [messages]);

  // --- [로직 4: 기능 함수들] ---
  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if (!input.trim() && !imgData) return;
    const msg = { text: input, image: imgData, userName: myName, userPhoto: myProfileImg, type: "chat", createdAt: serverTimestamp() };
    setInput("");
    await addDoc(collection(db, "rooms", currentRoom, "messages"), msg);
  };

  if (!isMounted) return null;

  const theme = {
    card: `transition-all duration-1000 ${isDarkMode ? 'bg-black/40 border-white/10 shadow-2xl' : 'bg-white/70 border-white/80 shadow-lg'} backdrop-blur-3xl`,
    text: isDarkMode ? 'text-white' : 'text-zinc-900',
    input: isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-black/10 text-black',
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]'}`}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* 🔔 알림 레이어 (Persistent) */}
      {toastMsg && (
        <div className="absolute bottom-28 right-10 z-[100] animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 p-5 rounded-[32px] bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
            <img src={toastMsg.photo || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-11 h-11 rounded-full object-cover shrink-0 aspect-square" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{toastMsg.name}</span>
              <span className="text-white text-sm font-bold truncate max-w-[180px] mt-0.5">{toastMsg.text || "사진 전송됨"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. 팝업 & 컨트롤 (절대 위치 고정) */}
      <div className="absolute top-8 right-10 z-50 flex gap-4">
        <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest">↗ Pop-out</button>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest">{isDarkMode ? "Day" : "Night"}</button>
      </div>

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        {!currentRoom ? (
          /* ✨ 5. [INTRO] 인트로 화면 */
          <div className={`${theme.card} w-full max-w-[450px] rounded-[56px] flex flex-col items-center py-20 animate-in fade-in zoom-in duration-700`}>
            <div className="w-[340px] flex flex-col items-center mx-auto">
              <div className="relative mb-14 overflow-visible flex justify-center w-full">
                <h1 className={`ULTRA_PRISM_TEXT text-[5.5rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
              </div>

              {!myName ? (
                /* 4. 인트로 프로필 찌그러짐 방지 */
                <div className="w-full space-y-6">
                  <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden mx-auto mb-4 group aspect-square shrink-0" onClick={() => profileInputRef.current.click()}>
                    <img src={tempImg || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setTempImg(r.result); r.readAsDataURL(f); }}} />
                  <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER IDENTITY" className={`w-full ${theme.input} px-8 py-5 rounded-[26px] text-center outline-none font-bold text-sm tracking-widest`} />
                  <button onClick={() => { if(tempName.trim()){localStorage.setItem("dooly-name", tempName); localStorage.setItem("dooly-profile", tempImg); setMyName(tempName); setMyProfileImg(tempImg);}}} className="w-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-5 rounded-[26px] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl active:scale-95 transition-all">Start System</button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="relative mb-5 aspect-square shrink-0">
                    <img src={myProfileImg || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-24 h-24 rounded-full border-4 border-indigo-500/20 shadow-2xl object-cover" />
                  </div>
                  <p className={`${theme.text} font-black text-2xl mb-12 tracking-tight`}>{myName}</p>
                  <div className="w-full h-[38vh] flex flex-col">
                    <input onKeyDown={(e) => e.key === 'Enter' && (setMyRooms([...new Set([e.currentTarget.value, ...myRooms])]), setCurrentRoom(e.currentTarget.value))} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-5 rounded-[22px] text-center mb-6 font-bold text-xs tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`} />
                    <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                      {myRooms.map(room => (
                        <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-6 py-5 rounded-[22px] grid grid-cols-[1fr_2fr_1fr] items-center hover:bg-indigo-500/10 group active:scale-[0.98] transition-all`}>
                          <span className="invisible text-[9px]">Connect</span>
                          <span className={`font-black ${theme.text} text-[14px] text-center truncate px-2`}>{room}</span>
                          <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-all text-right">Connect</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 📱 8. [CHAT] 채팅 화면 (그리드 레이아웃 고정) */
          <div className="h-full w-full flex flex-col animate-in fade-in duration-700">
            {/* 헤더 겹침 방지: 3분할 그리드 및 min-width 보정 */}
            <header className={`px-12 py-7 border-b grid grid-cols-3 items-center backdrop-blur-2xl ${isDarkMode ? 'border-white/5 bg-black/30' : 'border-black/5 bg-white/50'}`}>
              <div className="flex justify-start items-center min-w-0">
                <button onClick={() => setCurrentRoom("")} className="text-white/40 text-[11px] font-black hover:text-indigo-500 transition-colors uppercase tracking-widest shrink-0">◀ Back</button>
              </div>
              <div className="flex justify-center items-center min-w-0">
                <h1 className="text-2xl font-black italic text-indigo-500 uppercase tracking-tighter truncate max-w-full px-4">{currentRoom}</h1>
              </div>
              <div className="flex justify-end items-center gap-6 min-w-0">
                {/* 2. 유저 확인 버튼 */}
                <button onClick={() => setShowUserList(!showUserList)} className="hidden sm:block text-[10px] font-black border border-white/10 px-5 py-2.5 rounded-full text-white/60 hover:bg-white/10 uppercase transition-all shrink-0">Users ({activeUsers.length})</button>
                <div className="flex items-center gap-4 pl-6 border-l border-white/10 h-10 shrink-0">
                   <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-indigo-500/30 shadow-lg shrink-0 aspect-square">
                    <img src={myProfileImg || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-12 py-16 space-y-12 no-scrollbar w-full max-w-6xl mx-auto flex flex-col">
              {messages.map((m) => (
                m.type === "system" ? (
                  /* 8. 시스템 안내 정중앙 보정 */
                  <div key={m.id} className="w-full flex justify-center py-6">
                    <div className="px-10 py-3 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                      <span className="text-white/40 text-[11px] font-black tracking-[0.2em] uppercase">{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`flex gap-6 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in`}>
                    {/* 3. 사진 깨짐 방지 Fallback */}
                    <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-white/10 shadow-lg self-end aspect-square ring-1 ring-black/10">
                      <img src={m.userPhoto || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover" />
                    </div>
                    <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      <span className="text-white/30 text-[10px] font-black mb-3 px-2 uppercase tracking-widest">{m.userName}</span>
                      <div className={`p-8 rounded-[36px] text-[15px] leading-relaxed shadow-2xl ${m.userName === myName ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-br-none' : isDarkMode ? 'bg-white/10 text-white border border-white/5 rounded-bl-none' : 'bg-white text-zinc-900 border border-black/5 rounded-bl-none shadow-xl'}`}>
                        {m.image && <img src={m.image} className="w-full max-w-md rounded-2xl mb-4 border border-white/10 shadow-lg" />}
                        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                      </div>
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-10 backdrop-blur-3xl border-t border-white/5">
              <form onSubmit={sendMessage} className={`max-w-5xl mx-auto flex gap-5 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white text-black shadow-2xl'} p-2.5 rounded-[36px] border transition-all focus-within:ring-4 focus-within:ring-indigo-500/20`}>
                <button type="button" onClick={() => fileInputRef.current.click()} className="w-14 h-14 flex items-center justify-center rounded-[24px] hover:bg-white/10 text-2xl font-light">+</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f); }}} />
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="DATA TRANSMISSION..." className="flex-1 bg-transparent px-6 outline-none text-[15px] font-bold text-inherit" />
                <button type="submit" className="bg-indigo-600 text-white px-12 py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Transmit</button>
              </form>
            </footer>
          </div>
        )}
      </main>

      {/* 2. 유저 확인 사이드바 복구 */}
      {showUserList && (
        <div className={`absolute top-32 right-12 w-80 p-8 rounded-[40px] ${theme.card} z-50 animate-in slide-in-from-right duration-500 shadow-2xl border border-white/10`}>
          <h3 className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.2em] mb-8">Connected Nodes</h3>
          <div className="space-y-5 max-h-[50vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-5 group">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 aspect-square"><img src={user.photo || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover transition-transform group-hover:scale-110" /></div>
                <span className={`${theme.text} font-black text-[15px] tracking-tight`}>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055, #ffcc00, #00ff66, #00ccff, #7700ff);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; 
          animation: prism 4s linear infinite; padding-right: 0.35em; position: relative; overflow: visible;
        }
        .ULTRA_PRISM_TEXT::before { content: "DOOLY"; position: absolute; left: 0.35em; top: 0; z-index: -1; filter: blur(35px); opacity: 0.4; }
        @keyframes prism { to { background-position: 200% center; } }
      `}</style>
    </div>
  );
}

"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// 🔥 Firebase 설정
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

export default function DoolyOS_Unabridged_Master() {
  // --- [상태 관리: 단 하나도 빠짐없이] ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [myRooms, setMyRooms] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempImg, setTempImg] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [isNotiEnabled, setIsNotiEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const particleInstance = useRef(null);

  // --- [데이터 복구 및 동기화] ---
  useEffect(() => {
    const savedName = localStorage.getItem("dooly-name");
    const savedImg = localStorage.getItem("dooly-profile");
    const savedTheme = localStorage.getItem("dooly-theme");
    const savedRooms = JSON.parse(localStorage.getItem("dooly-rooms") || "[]");
    const savedNoti = localStorage.getItem("dooly-noti");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    if (savedNoti !== null) setIsNotiEnabled(savedNoti === "true");
    setMyRooms(savedRooms);
  }, []);

  // --- [파티클 시스템: z-0 레이어] ---
  useEffect(() => {
    const initParticles = async () => {
      const module = await import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js");
      const AttractionCursor = module.default;
      if (!particleInstance.current && canvasRef.current) {
        particleInstance.current = AttractionCursor(canvasRef.current, {
          particles: { attractionIntensity: 0.8, size: 1.2 },
        });
      }
    };
    initParticles();
  }, []);

  // --- [메시지 & 알림 로직] ---
  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.userName !== myName && isNotiEnabled) {
        setToastMsg({ name: lastMsg.userName, text: lastMsg.text, photo: lastMsg.userPhoto });
        setTimeout(() => setToastMsg(null), 4000);
      }
    });
    return () => unsubscribe();
  }, [currentRoom, myName, isNotiEnabled]);

  const activeUsers = useMemo(() => {
    const usersMap = new Map();
    messages.forEach(m => { if(m.userName) usersMap.set(m.userName, m.userPhoto); });
    return Array.from(usersMap, ([name, photo]) => ({ name, photo }));
  }, [messages]);

  // --- [핵심 기능 함수] ---
  const handleProfileSave = () => {
    localStorage.setItem("dooly-name", tempName);
    localStorage.setItem("dooly-profile", tempImg || myProfileImg);
    setMyName(tempName);
    setMyProfileImg(tempImg || myProfileImg);
    setIsEditingProfile(false);
  };

  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if (!input.trim() && !imgData) return;
    const msgData = {
      text: input,
      image: imgData,
      userName: myName,
      userPhoto: myProfileImg,
      type: "chat",
      createdAt: serverTimestamp()
    };
    setInput("");
    await addDoc(collection(db, "rooms", currentRoom, "messages"), msgData);
  };

  const joinRoom = (name) => {
    if (!name.trim()) return;
    const updated = [...new Set([name, ...myRooms])];
    setMyRooms(updated);
    localStorage.setItem("dooly-rooms", JSON.stringify(updated));
    setCurrentRoom(name);
  };

  const theme = {
    card: `transition-all duration-1000 ${isDarkMode ? 'bg-black/40 border-white/10 shadow-2xl' : 'bg-white/70 border-white/80 shadow-lg'} backdrop-blur-3xl`,
    textMain: `transition-colors duration-1000 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`,
    input: `transition-all duration-1000 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-black/10 text-black'}`,
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]'}`}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* 🔔 카톡형 토스트 알림 */}
      {toastMsg && (
        <div className="absolute bottom-28 right-10 z-[100] animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 p-5 rounded-[32px] bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
            <img src={toastMsg.photo || DEFAULT_AVATAR} className="w-11 h-11 rounded-full object-cover border border-indigo-500/30" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{toastMsg.name}</span>
              <span className="text-white text-sm font-bold truncate max-w-[200px] mt-0.5">{toastMsg.text || "사진을 보냈습니다."}</span>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ 전역 헤더 컨트롤 (Pop-out, Noti, Theme 통합) */}
      <div className="absolute top-8 right-10 z-50 flex gap-4">
        <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=800')} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest">↗ Pop-out</button>
        <button onClick={() => setIsNotiEnabled(!isNotiEnabled)} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest">{isNotiEnabled ? "🔔 ON" : "🔕 OFF"}</button>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest">{isDarkMode ? "Day" : "Night"}</button>
      </div>

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        {!currentRoom ? (
          /* ✨ [INTRO] 로그인 & 방 리스트 (픽셀 보정형) */
          <div className={`${theme.card} w-full max-w-[450px] rounded-[56px] flex flex-col items-center py-20 animate-in fade-in zoom-in duration-700`}>
            <div className="w-[340px] flex flex-col items-center mx-auto">
              <div className="relative mb-14">
                <h1 className={`ULTRA_PRISM_TEXT text-[5.5rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
              </div>

              {!myName ? (
                <div className="w-full space-y-6">
                  <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden mx-auto mb-4" onClick={() => profileInputRef.current.click()}>
                    {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-white/30 font-black text-[10px]">PHOTO +</span>}
                  </div>
                  <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setTempImg(r.result); r.readAsDataURL(f); }}} />
                  <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER IDENTITY" className={`w-full ${theme.input} px-8 py-5 rounded-[26px] text-center outline-none font-bold text-sm tracking-widest`} />
                  <button onClick={handleProfileSave} className="w-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-5 rounded-[26px] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl active:scale-95 transition-all">Connect System</button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="relative group cursor-pointer" onClick={() => setIsEditingProfile(true)}>
                    <img src={myProfileImg || DEFAULT_AVATAR} className="w-24 h-24 rounded-full border-4 border-indigo-500/20 shadow-2xl mb-5 object-cover" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[9px] font-black">EDIT</span></div>
                  </div>
                  <p className={`${theme.textMain} font-black text-2xl mb-12 tracking-tight`}>{myName}</p>
                  
                  <div className="w-full flex flex-col h-[38vh]">
                    <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-5 rounded-[22px] text-center mb-6 font-bold text-xs tracking-[0.2em] outline-none`} />
                    <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                      {myRooms.map(room => (
                        <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-6 py-5 rounded-[22px] grid grid-cols-[1fr_2fr_1fr] items-center hover:bg-indigo-500/10 transition-all group active:scale-[0.98]`}>
                          <span className="invisible text-[9px] font-bold">Connect</span>
                          <span className={`font-black ${theme.textMain} text-[14px] text-center truncate`}>{room}</span>
                          <span className="text-[10px] text-indigo-500 font-bold uppercase opacity-0 group-hover:opacity-100 transition-all text-right">Connect</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-12 text-zinc-500 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all">Logout Session</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 📱 [CHAT] 채팅방 (모든 정렬 및 유저 리스트 복구) */
          <div className="h-full w-full flex flex-col animate-in fade-in duration-700">
            <header className={`px-12 py-7 border-b flex justify-between items-center backdrop-blur-2xl ${isDarkMode ? 'border-white/5 bg-black/30' : 'border-black/5 bg-white/50'}`}>
              <div className="flex items-center gap-8">
                <button onClick={() => setCurrentRoom("")} className="text-white/40 text-[11px] font-black tracking-widest hover:text-indigo-500 uppercase">◀ Back</button>
                <h1 className="text-2xl font-black italic text-indigo-500 uppercase tracking-tighter">{currentRoom}</h1>
              </div>
              
              <div className="flex items-center gap-8">
                <button onClick={() => setShowUserList(!showUserList)} className="text-[10px] font-black border border-white/10 px-5 py-2.5 rounded-full text-white/60 hover:bg-white/10 transition-all uppercase">Users ({activeUsers.length})</button>
                <div className="flex items-center gap-5 pl-8 border-l border-white/10 h-10">
                  <span className={`${theme.textMain} text-[14px] font-black tracking-tight`}>{myName}</span>
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-indigo-500/30 shadow-lg flex-shrink-0 aspect-square">
                    <img src={myProfileImg || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-12 py-16 space-y-12 no-scrollbar w-full max-w-6xl mx-auto flex flex-col">
              {messages.map((m) => (
                m.type === "system" ? (
                  <div key={m.id} className="w-full flex justify-center py-4">
                    <div className="px-10 py-3 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                      <span className="text-white/40 text-[11px] font-black tracking-widest uppercase">{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`flex gap-6 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-500`}>
                    <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-white/10 shadow-lg self-end aspect-square">
                      <img src={m.userPhoto || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                    </div>
                    <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      <span className="text-white/30 text-[10px] font-black mb-3 uppercase tracking-widest px-2">{m.userName}</span>
                      <div className={`p-8 rounded-[36px] text-[16px] leading-relaxed shadow-2xl ${m.userName === myName ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-br-none' : isDarkMode ? 'bg-white/10 text-white border border-white/5 rounded-bl-none' : 'bg-white text-zinc-900 border border-black/5 rounded-bl-none shadow-xl'}`}>
                        {m.image && <img src={m.image} className="w-full max-w-sm rounded-2xl mb-4 border border-white/10 shadow-lg" />}
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
                <button type="button" onClick={() => fileInputRef.current.click()} className="w-14 h-14 flex items-center justify-center rounded-[24px] hover:bg-white/10 transition-all text-2xl font-light">+</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f); }}} />
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="DATA TRANSMISSION..." className="flex-1 bg-transparent px-6 outline-none text-[16px] font-bold text-inherit" />
                <button type="submit" className="bg-indigo-600 text-white px-12 py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Transmit</button>
              </form>
            </footer>
          </div>
        )}
      </main>

      {/* 👥 [SIDEBAR] 유저 리스트 (복구됨) */}
      {showUserList && (
        <div className={`absolute top-32 right-12 w-80 p-8 rounded-[40px] ${theme.card} z-50 animate-in slide-in-from-right duration-500`}>
          <h3 className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.2em] mb-8">Active Nodes</h3>
          <div className="space-y-5 max-h-[50vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-5 group">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 aspect-square">
                  <img src={user.photo || DEFAULT_AVATAR} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <span className={`${theme.textMain} font-black text-[15px] tracking-tight`}>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎨 [STYLE] 픽셀 보정형 CSS */}
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055, #ffcc00, #00ff66, #00ccff, #7700ff);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; 
          animation: prism 4s linear infinite; padding-right: 0.25em; position: relative; overflow: visible;
        }
        .ULTRA_PRISM_TEXT::before { content: "DOOLY"; position: absolute; left: 0.25em; top: 0; z-index: -1; filter: blur(35px); opacity: 0.4; }
        @keyframes prism { to { background-position: 200% center; } }
      `}</style>
    </div>
  );
}

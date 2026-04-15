"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

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

export default function Page() {
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
  const [toastMsg, setToastMsg] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const particleInstance = useRef(null);

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

  // 7. 파티클 엔진 (인트로에서만 로드 및 실행)
  useEffect(() => {
    if (!isMounted || currentRoom) return; // 채팅방에서는 실행 안 함
    const loadParticles = async () => {
      try {
        const loader = new Function('return import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js")');
        const module = await loader();
        if (!particleInstance.current && canvasRef.current) {
          particleInstance.current = module.default(canvasRef.current, {
            particles: { attractionIntensity: 0.85, size: 1.2 },
          });
        }
      } catch (e) { console.error("Particle Error:", e); }
    };
    loadParticles();
  }, [isMounted, currentRoom]);

  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.userName !== myName) {
        setToastMsg({ name: lastMsg.userName, text: lastMsg.text, photo: lastMsg.userPhoto });
        setTimeout(() => setToastMsg(null), 4000);
      }
    });
  }, [currentRoom, myName]);

  const activeUsers = useMemo(() => {
    const usersMap = new Map();
    messages.forEach(m => { if(m.userName) usersMap.set(m.userName, m.userPhoto); });
    return Array.from(usersMap, ([name, photo]) => ({ name, photo }));
  }, [messages]);

  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if (!input.trim() && !imgData) return;
    const msg = { text: input, image: imgData, userName: myName, userPhoto: myProfileImg, type: "chat", createdAt: serverTimestamp() };
    setInput("");
    await addDoc(collection(db, "rooms", currentRoom, "messages"), msg);
  };

  const handleProfileSave = () => {
    if (!tempName.trim()) return;
    localStorage.setItem("dooly-name", tempName);
    localStorage.setItem("dooly-profile", tempImg || myProfileImg);
    setMyName(tempName); setMyProfileImg(tempImg || myProfileImg);
    setIsEditingProfile(false);
  };

  if (!isMounted) return null;

  const theme = {
    chatBg: isDarkMode 
      ? 'bg-gradient-to-br from-[#0a0a0c] via-[#121218] to-[#0a0a0c]' 
      : 'bg-gradient-to-br from-[#f8f9fa] via-[#e9ecef] to-[#f8f9fa]',
    card: `transition-all duration-700 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/70 border-black/5'} backdrop-blur-3xl`,
    header: `transition-all duration-700 border-b backdrop-blur-2xl ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-black/5 bg-white/60'}`,
    text: isDarkMode ? 'text-white' : 'text-zinc-900',
    input: `transition-all duration-700 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/80 border-black/10 text-black'}`,
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${currentRoom ? theme.chatBg : (isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]')}`}>
      {/* 인트로에서만 보여지는 캔버스 */}
      {!currentRoom && <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />}

      {/* 🔔 상단 컨트롤 */}
      <div className="absolute top-8 right-10 z-50 flex gap-4">
        <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest">↗ Pop-out</button>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest">{isDarkMode ? "Day" : "Night"}</button>
      </div>

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        {!currentRoom ? (
          /* ✨ [INTRO] */
          <div className={`${theme.card} w-full max-w-[450px] rounded-[56px] flex flex-col items-center py-20 animate-in fade-in zoom-in duration-700`}>
            <div className="w-[340px] flex flex-col items-center mx-auto">
              <div className="relative mb-14 overflow-visible flex justify-center w-full">
                <h1 className={`ULTRA_PRISM_TEXT text-[5.5rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
              </div>
              <div className="w-full space-y-6">
                <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden mx-auto mb-4 group aspect-square shrink-0" onClick={() => profileInputRef.current.click()}>
                  <img src={myProfileImg || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover rounded-full" />
                </div>
                <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="IDENTITY" className={`w-full ${theme.input} px-8 py-5 rounded-[26px] text-center outline-none font-bold text-sm`} />
                <div className="w-full h-[30vh] flex flex-col">
                  <input onKeyDown={(e) => e.key === 'Enter' && (setMyRooms([...new Set([e.currentTarget.value, ...myRooms])]), setCurrentRoom(e.currentTarget.value))} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-5 rounded-[22px] text-center mb-6 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all`} />
                  <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                    {myRooms.map(room => (
                      <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-6 py-5 rounded-[22px] font-black ${theme.text} text-[14px] hover:bg-indigo-500/10 transition-all`}>{room}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 📱 [CHAT] - 눈이 편안한 디자인 */
          <div className="h-full w-full flex flex-col animate-in fade-in duration-700">
            {/* 헤더: BACK 버튼 옆 프로필 수정 배치 */}
            <header className={`${theme.header} px-10 py-6 grid grid-cols-3 items-center z-20`}>
              <div className="flex justify-start items-center gap-6">
                <button onClick={() => setCurrentRoom("")} className="text-white/40 text-[11px] font-black hover:text-indigo-500 uppercase tracking-widest transition-colors">◀ Back</button>
                <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500/30 group-hover:border-indigo-500 transition-all">
                    <img src={myProfileImg || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover" />
                  </div>
                  <span className={`${theme.text} text-[12px] font-black opacity-40 group-hover:opacity-100 transition-opacity`}>Edit Identity</span>
                </button>
              </div>
              <div className="flex justify-center"><h1 className="text-2xl font-black italic text-indigo-500 uppercase tracking-tighter truncate px-4">{currentRoom}</h1></div>
              <div className="flex justify-end items-center gap-6">
                <button onClick={() => setShowUserList(!showUserList)} className="text-[10px] font-black border border-white/10 px-5 py-2.5 rounded-full text-white/60 hover:bg-white/10 transition-all uppercase">Users ({activeUsers.length})</button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-12 py-16 space-y-12 no-scrollbar w-full max-w-6xl mx-auto flex flex-col">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-6 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in`}>
                  <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-white/10 shadow-lg self-end aspect-square">
                    <img src={m.userPhoto || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover" />
                  </div>
                  <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <span className="text-white/30 text-[10px] font-black mb-3 px-2 uppercase tracking-widest">{m.userName}</span>
                    <div className={`p-8 rounded-[36px] text-[15px] leading-relaxed shadow-2xl ${m.userName === myName ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-br-none' : `${isDarkMode ? 'bg-white/10 text-white border border-white/5' : 'bg-white text-zinc-900 border border-black/5'} rounded-bl-none`}`}>
                      {m.image && <img src={m.image} className="w-full max-w-md rounded-2xl mb-4 border border-white/10" />}
                      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className={`p-10 backdrop-blur-3xl border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
              <form onSubmit={sendMessage} className={`max-w-5xl mx-auto flex gap-5 ${theme.input} p-2.5 rounded-[36px] border focus-within:ring-4 focus-within:ring-indigo-500/20`}>
                <button type="button" onClick={() => fileInputRef.current.click()} className="w-14 h-14 flex items-center justify-center rounded-[24px] hover:bg-white/10 text-2xl font-light">+</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f); }}} />
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="DATA TRANSMISSION..." className="flex-1 bg-transparent px-6 outline-none text-[15px] font-bold text-inherit" />
                <button type="submit" className="bg-indigo-600 text-white px-12 py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl">Transmit</button>
              </form>
            </footer>
          </div>
        )}
      </main>

      {/* 👤 프로필 수정 모달 */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className={`${theme.card} w-full max-w-[400px] p-12 rounded-[48px] border border-white/20 flex flex-col items-center`}>
            <h2 className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] mb-10">Update Identity</h2>
            <div className="w-32 h-32 rounded-full border-4 border-indigo-500/30 overflow-hidden mb-8 cursor-pointer relative group aspect-square" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg || DEFAULT_AVATAR} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black">CHANGE</span></div>
            </div>
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setTempImg(r.result); r.readAsDataURL(f); }}} />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`w-full ${theme.input} px-6 py-5 rounded-[22px] text-center mb-6 font-bold outline-none`} placeholder="NAME" />
            <div className="flex gap-4 w-full">
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-5 rounded-[22px] bg-white/5 text-zinc-500 font-black uppercase text-[10px] tracking-widest transition-all">Cancel</button>
              <button onClick={handleProfileSave} className="flex-1 py-5 rounded-[22px] bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* 👥 유저 확인 사이드바 */}
      {showUserList && (
        <div className={`absolute top-32 right-12 w-80 p-8 rounded-[40px] ${theme.card} z-50 animate-in slide-in-from-right duration-500 shadow-2xl border border-white/10`}>
          <h3 className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.2em] mb-8">Connected Nodes</h3>
          <div className="space-y-5 max-h-[50vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-5 group">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 aspect-square"><img src={user.photo || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover" /></div>
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

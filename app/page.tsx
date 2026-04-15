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

// 3D 캐릭터 아바타 소스
const RANDOM_AVATARS = [
  "https://image.aispace.xyz/avatars/3d_char_1.png",
  "https://image.aispace.xyz/avatars/3d_char_2.png",
  "https://image.aispace.xyz/avatars/3d_char_3.png",
  "https://image.aispace.xyz/avatars/3d_char_4.png",
  "https://image.aispace.xyz/avatars/3d_char_5.png",
  "https://image.aispace.xyz/avatars/3d_char_6.png",
];

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
    // 저장된 이미지가 없으면 랜덤 배정
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); } 
    else { const r = RANDOM_AVATARS[Math.floor(Math.random() * 6)]; setMyProfileImg(r); setTempImg(r); }
    
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  // 파티클 엔진 (인트로 전용 로더)
  useEffect(() => {
    if (!isMounted || currentRoom) return; 
    const loadParticles = async () => {
      try {
        const loader = new Function('return import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js")');
        const module = await loader();
        if (!particleInstance.current && canvasRef.current) {
          particleInstance.current = module.default(canvasRef.current, {
            particles: { attractionIntensity: 0.85, size: 1.2 },
          });
        }
      } catch (e) { console.error("Particle Load Error:", e); }
    };
    loadParticles();
  }, [isMounted, currentRoom]);

  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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

  if (!isMounted) return null;

  const theme = {
    // 채팅방 전용 심플 배경
    chatBg: isDarkMode 
      ? 'bg-gradient-to-br from-[#0a0a0c] via-[#151520] to-[#0a0a0c]' 
      : 'bg-gradient-to-br from-[#f0f2f5] via-[#ffffff] to-[#f0f2f5]',
    card: `transition-all duration-700 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/70 border-black/10'} backdrop-blur-3xl`,
    header: `transition-all duration-700 border-b backdrop-blur-3xl ${isDarkMode ? 'border-white/5 bg-black/50' : 'border-black/10 bg-white/70'}`,
    text: isDarkMode ? 'text-white' : 'text-zinc-900',
    input: `transition-all duration-700 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-black/5 text-black'}`,
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${currentRoom ? theme.chatBg : (isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]')}`}>
      {/* 파티클 캔버스: 인트로 전용 */}
      {!currentRoom && <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />}

      {/* 우측 상단 컨트롤 레이아웃 정렬 */}
      {!currentRoom && (
        <div className="absolute top-8 right-10 z-50 flex items-center gap-4 flex-nowrap">
          <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest shrink-0">↗ Pop-out</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/70 hover:bg-white/20 transition-all uppercase tracking-widest shrink-0">{isDarkMode ? "Day" : "Night"}</button>
        </div>
      )}

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        {!currentRoom ? (
          /* ✨ [INTRO] 김민혁 이름 입력창 정중앙 배치 */
          <div className={`${theme.card} w-full max-w-[450px] rounded-[56px] flex flex-col items-center py-20 animate-in fade-in zoom-in duration-700`}>
            <div className="w-[340px] flex flex-col items-center mx-auto">
              <div className="relative mb-14 overflow-visible flex justify-center w-full">
                <h1 className={`ULTRA_PRISM_TEXT text-[5.5rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
              </div>
              <div className="w-full space-y-6 flex flex-col items-center">
                <div className="w-28 h-28 rounded-full border-2 border-indigo-500/20 overflow-hidden mb-4 aspect-square shrink-0">
                  <img src={myProfileImg} className="w-full h-full object-cover" />
                </div>
                <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="ENTER IDENTITY" className={`w-full ${theme.input} px-8 py-5 rounded-[26px] text-center outline-none font-bold text-sm`} />
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
          /* 📱 [CHAT] - 레이아웃 겹침 해결 버전 */
          <div className="h-full w-full flex flex-col animate-in fade-in duration-700">
            <header className={`${theme.header} px-10 py-6 grid grid-cols-[1fr_auto_1fr] items-center z-20`}>
              {/* 왼쪽: BACK + IDENTITY EDIT */}
              <div className="flex justify-start items-center gap-6">
                <button onClick={() => setCurrentRoom("")} className="text-white/40 text-[11px] font-black hover:text-indigo-500 uppercase tracking-widest transition-colors shrink-0">◀ Back</button>
                <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3 group shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500/30 group-hover:border-indigo-500 transition-all aspect-square">
                    <img src={myProfileImg} className="w-full h-full object-cover" />
                  </div>
                  <span className={`${theme.text} text-[12px] font-black opacity-40 group-hover:opacity-100 transition-opacity`}>Identity Edit</span>
                </button>
              </div>
              <div className="flex justify-center"><h1 className="text-2xl font-black italic text-indigo-500 uppercase tracking-tighter truncate px-4">{currentRoom}</h1></div>
              {/* 오른쪽: 정렬 완료 */}
              <div className="flex justify-end items-center gap-4 flex-nowrap">
                <button onClick={() => setShowUserList(!showUserList)} className="text-[10px] font-black border border-white/10 px-4 py-2 rounded-full text-white/60 hover:bg-white/10 uppercase shrink-0">Users ({activeUsers.length})</button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-black border border-white/10 px-4 py-2 rounded-full text-white/60 hover:bg-white/10 uppercase shrink-0">{isDarkMode ? "Day" : "Night"}</button>
                <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className="text-[10px] font-black border border-white/10 px-4 py-2 rounded-full text-white/60 hover:bg-white/10 uppercase shrink-0">↗ Pop</button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-12 py-16 space-y-12 no-scrollbar w-full max-w-6xl mx-auto flex flex-col">
              {messages.map((m) => (
                m.type === "system" ? (
                  /* 공지: 보일 듯 말 듯한 글래스모피즘 */
                  <div key={m.id} className="w-full flex justify-center py-6">
                    <div className="px-10 py-3 rounded-full bg-white/5 border border-white/5 backdrop-blur-md opacity-60">
                      <span className="text-white/40 text-[11px] font-black tracking-[0.2em] uppercase">{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`flex gap-6 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in`}>
                    <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-white/10 shadow-lg self-end aspect-square ring-1 ring-black/10">
                      <img src={m.userPhoto} onError={(e) => e.currentTarget.src = RANDOM_AVATARS[0]} className="w-full h-full object-cover" />
                    </div>
                    <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <span className="text-white/30 text-[10px] font-black mb-3 px-2 uppercase tracking-widest">{m.userName}</span>
                      <div className={`p-8 rounded-[36px] text-[15px] leading-relaxed shadow-2xl ${m.userName === myName ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-br-none' : `${isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-zinc-900 border border-black/5'} rounded-bl-none shadow-xl`}`}>
                        {m.image && <img src={m.image} className="w-full max-w-md rounded-2xl mb-4 border border-white/10" />}
                        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                      </div>
                    </div>
                  </div>
                )
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

      {/* 👤 프로필 수정 모달 랜덤 아바타 배정 포함 */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className={`${theme.card} w-full max-w-[400px] p-12 rounded-[48px] border border-white/20 flex flex-col items-center`}>
            <h2 className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] mb-10">Update Identity</h2>
            <div className="w-32 h-32 rounded-full border-4 border-indigo-500/30 overflow-hidden mb-8 cursor-pointer relative group aspect-square" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black">CHANGE</span></div>
            </div>
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setTempImg(r.result); r.readAsDataURL(f); }}} />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`w-full ${theme.input} px-6 py-5 rounded-[22px] text-center mb-6 font-bold outline-none`} placeholder="NAME" />
            <div className="flex gap-4 w-full">
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-5 rounded-[22px] bg-white/5 text-zinc-500 font-black uppercase text-[10px] tracking-widest transition-all">Cancel</button>
              <button onClick={() => { localStorage.setItem("dooly-name", tempName); localStorage.setItem("dooly-profile", tempImg || myProfileImg); setMyName(tempName); setMyProfileImg(tempImg || myProfileImg); setIsEditingProfile(false); }} className="flex-1 py-5 rounded-[22px] bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* 👥 유저 확인 사이드바 */}
      {showUserList && (
        <div className={`absolute top-32 right-12 w-80 p-8 rounded-[40px] ${theme.card} z-50 animate-in slide-in-from-right duration-500 shadow-2xl border border-white/10`}>
          <h3 className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.2em] mb-8">Active Nodes</h3>
          <div className="space-y-5 max-h-[50vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-5 group">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 aspect-square"><img src={user.photo} onError={(e) => e.currentTarget.src = RANDOM_AVATARS[0]} className="w-full h-full object-cover" /></div>
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

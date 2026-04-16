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

  // 스마트 스크롤을 위한 Refs
  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null); // 채팅창 컨테이너 Ref 추가
  const isAtBottomRef = useRef(true); // 현재 유저가 스크롤을 맨 아래에 두었는지 확인

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
    else { const r = RANDOM_AVATARS[Math.floor(Math.random() * 6)]; setMyProfileImg(r); setTempImg(r); }
    
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  // Vercel 빌드 에러 우회 로더
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
      } catch (e) { console.error("Engine Load Failed", e); }
    };
    loadParticles();
  }, [isMounted, currentRoom]);

  // 실시간 동기화 및 스마트 스크롤 제어
  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      // 유저가 스크롤을 맨 밑에 두었을 때만 자동 스크롤 작동
      if (isAtBottomRef.current) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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
    
    // 내가 메시지를 보낼 때는 무조건 스크롤 하단으로 강제 이동
    isAtBottomRef.current = true;
    await addDoc(collection(db, "rooms", currentRoom, "messages"), msg);
  };

  const handleProfileSave = () => {
    const finalName = tempName.trim() || myName;
    const finalImg = tempImg || myProfileImg;
    localStorage.setItem("dooly-name", finalName);
    localStorage.setItem("dooly-profile", finalImg);
    setMyName(finalName); setMyProfileImg(finalImg);
    setIsEditingProfile(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // 스크롤 이벤트 감지: 유저가 대화창 위로 올렸는지 판단
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // 하단에서 150px 이내에 있으면 '맨 밑에 있다'고 판단
    isAtBottomRef.current = scrollHeight - scrollTop <= clientHeight + 150;
  };

  if (!isMounted) return null;

  const theme = {
    chatBg: isDarkMode 
      ? 'bg-gradient-to-br from-[#0a0a0c] via-[#12121a] to-[#08080a]' 
      : 'bg-gradient-to-br from-[#f4f4f5] via-[#ffffff] to-[#f4f4f5]', 
    text: isDarkMode ? 'text-white' : 'text-zinc-900',
    subText: isDarkMode ? 'text-white/40' : 'text-zinc-500',
    card: `transition-all duration-700 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/90 border-zinc-200'} backdrop-blur-3xl shadow-2xl`,
    header: `transition-all duration-700 border-b backdrop-blur-3xl ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-zinc-200 bg-white/80'}`,
    input: `transition-all duration-700 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-zinc-100 border-zinc-300 text-zinc-900 shadow-sm'}`,
    bubbleOther: isDarkMode ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm',
    btnDayNight: isDarkMode ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${currentRoom ? theme.chatBg : (isDarkMode ? 'bg-[#060608]' : 'bg-[#e4e4e7]')}`}>
      {!currentRoom && <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />}

      {/* 인트로 전용 전역 컨트롤러 */}
      {!currentRoom && (
        <div className="absolute top-6 right-6 z-[60] flex items-center gap-3 flex-row flex-nowrap">
          <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className={`text-[10px] font-black px-4 py-2 rounded-full backdrop-blur-md transition-all uppercase tracking-widest shrink-0 border ${theme.btnDayNight}`}>↗ Pop</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`text-[10px] font-black px-4 py-2 rounded-full backdrop-blur-md transition-all uppercase tracking-widest shrink-0 border ${theme.btnDayNight}`}>{isDarkMode ? "Day" : "Night"}</button>
        </div>
      )}

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center overflow-hidden">
        {!currentRoom ? (
          /* ✨ [INTRO] */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 overflow-y-auto no-scrollbar">
            <div className={`${theme.card} w-full max-w-[420px] rounded-[52px] flex flex-col items-center py-16 px-8 animate-in fade-in zoom-in duration-500`}>
              <div className="w-full flex flex-col items-center mx-auto">
                <div className="relative mb-12 overflow-visible flex justify-center w-full">
                  <h1 className={`ULTRA_PRISM_TEXT text-[4.5rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
                </div>
                <div className="w-full space-y-6 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-2 border-indigo-500/20 overflow-hidden mb-2 aspect-square shrink-0 shadow-xl">
                    <img src={myProfileImg} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = RANDOM_AVATARS[0]; }} className="w-full h-full object-cover" />
                  </div>
                  <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="ENTER IDENTITY" className={`w-full ${theme.input} px-6 py-4 rounded-[22px] text-center outline-none font-black text-sm tracking-widest`} />
                  <div className="w-full flex flex-col h-[25vh] min-h-[150px]">
                    <input onKeyDown={(e) => e.key === 'Enter' && (setMyRooms([...new Set([e.currentTarget.value, ...myRooms])]), setCurrentRoom(e.currentTarget.value))} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-4 rounded-[20px] text-center mb-4 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all`} />
                    <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pb-2">
                      {myRooms.map(room => (
                        <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-5 py-4 rounded-[18px] font-black ${theme.text} text-[13px] hover:scale-[0.98] active:scale-95 transition-all truncate`}>{room}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleLogout} className={`${theme.subText} mt-4 text-[9px] font-black uppercase tracking-widest hover:text-red-500 transition-colors`}>Reset Session</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 📱 [CHAT] */
          <div className="h-full w-full flex flex-col animate-in fade-in duration-500">
            <header className={`${theme.header} px-6 sm:px-10 py-5 grid grid-cols-[1fr_auto_1fr] items-center z-20 gap-4 shadow-sm`}>
              <div className="flex justify-start items-center gap-3 sm:gap-5 overflow-hidden">
                <button onClick={() => setCurrentRoom("")} className={`${theme.subText} text-[10px] font-black hover:text-indigo-500 uppercase tracking-widest transition-colors shrink-0`}>◀ Back</button>
                <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(true); }} className="flex items-center gap-2 group shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-indigo-500/30 aspect-square shrink-0">
                    <img src={myProfileImg} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = RANDOM_AVATARS[0]; }} className="w-full h-full object-cover" />
                  </div>
                  <span className={`${theme.text} text-[11px] font-black opacity-40 group-hover:opacity-100 transition-opacity truncate max-w-[60px] hidden sm:block`}>Edit</span>
                </button>
              </div>
              
              <div className="flex justify-center min-w-0">
                <h1 className="text-lg sm:text-xl font-black italic text-indigo-500 uppercase tracking-tighter truncate px-2">{currentRoom}</h1>
              </div>
              
              <div className="flex justify-end items-center gap-2 sm:gap-3 flex-nowrap shrink-0">
                <button onClick={() => setShowUserList(!showUserList)} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase transition-all shrink-0 ${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>Users ({activeUsers.length})</button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase transition-all shrink-0 ${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>{isDarkMode ? "Day" : "Night"}</button>
                <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className={`hidden sm:block px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all shrink-0 ${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>↗ Pop</button>
              </div>
            </header>
            
            {/* 스크롤 감지 이벤트 추가 */}
            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 sm:px-10 py-12 space-y-10 no-scrollbar w-full max-w-5xl mx-auto flex flex-col">
              {messages.map((m) => (
                m.type === "system" ? (
                  <div key={m.id} className="w-full flex justify-center py-4">
                    <div className={`px-8 py-2.5 rounded-full backdrop-blur-md ${isDarkMode ? 'bg-white/5 border border-white/5 opacity-40' : 'bg-zinc-200/50 border border-zinc-200 opacity-70'}`}>
                      <span className={`${theme.subText} text-[10px] font-black tracking-[0.2em] uppercase`}>{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`flex gap-4 sm:gap-5 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in`}>
                    <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-white/10 shadow-md self-end aspect-square ring-1 ring-black/5">
                      {/* 무한 루프 차단 (onerror = null) */}
                      <img src={m.userPhoto} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = RANDOM_AVATARS[0]; }} className="w-full h-full object-cover" />
                    </div>
                    <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      <span className={`${theme.subText} text-[9px] font-black mb-2 px-1 uppercase tracking-widest`}>{m.userName}</span>
                      <div className={`p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] text-[14px] sm:text-[15px] leading-relaxed shadow-lg ${m.userName === myName ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-br-none' : `${theme.bubbleOther} rounded-bl-none`}`}>
                        {m.image && <img src={m.image} className="w-full max-w-sm rounded-xl mb-3 border border-white/10" />}
                        {m.text && <p className="whitespace-pre-wrap font-medium">{m.text}</p>}
                      </div>
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className={`p-6 backdrop-blur-3xl border-t ${isDarkMode ? 'border-white/5' : 'border-zinc-200'}`}>
              <form onSubmit={sendMessage} className={`max-w-4xl mx-auto flex gap-3 sm:gap-4 ${theme.input} p-2 rounded-[30px] border focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all`}>
                <button type="button" onClick={() => fileInputRef.current.click()} className="w-12 h-12 flex items-center justify-center rounded-[20px] hover:bg-black/5 text-xl font-light shrink-0">+</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f); }}} />
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="DATA TRANSMISSION..." className="flex-1 bg-transparent px-2 sm:px-4 outline-none text-[14px] sm:text-[15px] font-bold text-inherit placeholder:opacity-30 min-w-0" />
                <button type="submit" className="bg-indigo-600 text-white px-6 sm:px-8 py-4 rounded-[24px] font-black text-[10px] sm:text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shrink-0">Send</button>
              </form>
            </footer>
          </div>
        )}
      </main>

      {/* 👤 프로필 수정 모달 */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`${theme.card} w-full max-w-[380px] p-10 rounded-[48px] border border-white/20 flex flex-col items-center shadow-full`}>
            <h2 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-8">Update ID</h2>
            <div className="w-28 h-28 rounded-full border-4 border-indigo-500/30 overflow-hidden mb-6 cursor-pointer relative group aspect-square shadow-xl" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = RANDOM_AVATARS[0]; }} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[9px] font-black">CHANGE</span></div>
            </div>
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setTempImg(r.result); r.readAsDataURL(f); }}} />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`w-full ${theme.input} px-6 py-4 rounded-[18px] text-center mb-6 font-bold outline-none`} placeholder="NAME" />
            <div className="flex gap-3 w-full">
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-4 rounded-[18px] bg-black/5 text-zinc-500 font-black uppercase text-[9px] tracking-widest">Cancel</button>
              <button onClick={handleProfileSave} className="flex-1 py-4 rounded-[18px] bg-indigo-600 text-white font-black uppercase text-[9px] tracking-widest shadow-xl hover:bg-indigo-500 transition-all">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* 👥 유저 사이드바 */}
      {showUserList && (
        <div className={`absolute top-24 right-8 w-72 p-8 rounded-[40px] ${theme.card} z-50 animate-in slide-in-from-right duration-300 shadow-2xl border border-white/10`}>
          <h3 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Active Nodes</h3>
          <div className="space-y-5 max-h-[40vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-indigo-500/10 shrink-0 aspect-square"><img src={user.photo} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = RANDOM_AVATARS[0]; }} className="w-full h-full object-cover transition-transform group-hover:scale-110" /></div>
                <span className={`${theme.text} font-black text-[14px] tracking-tight truncate`}>{user.name}</span>
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
        .ULTRA_PRISM_TEXT::before { content: "DOOLY"; position: absolute; left: 0.35em; top: 0; z-index: -1; filter: blur(40px); opacity: 0.5; }
        @keyframes prism { to { background-position: 200% center; } }
      `}</style>
    </div>
  );
}

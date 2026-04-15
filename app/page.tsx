"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// 🔥 Firebase 설정 (민혁님의 기존 정보 유지)
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

export default function DoolyOS_Attraction_Final() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [myRooms, setMyRooms] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [tempName, setTempName] = useState("");
  const [isNotiEnabled, setIsNotiEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const particleInstance = useRef(null); // 파티클 인스턴스 저장용

  // 1. 초기 데이터 로드
  useEffect(() => {
    const savedName = localStorage.getItem("dooly-name");
    const savedImg = localStorage.getItem("dooly-profile");
    const savedTheme = localStorage.getItem("dooly-theme");
    const savedRooms = JSON.parse(localStorage.getItem("dooly-rooms") || "[]");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  // 2. ✨ Three.js Attraction 파티클 시스템 이식 (Intro & 배경 절대 안깨짐)
  useEffect(() => {
    let script;
    const initParticles = async () => {
      // 라이브러리 동적 로드 (Next.js 환경 대응)
      script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js";
      script.type = "module";
      document.head.appendChild(script);

      script.onload = () => {
        // @ts-ignore (외부 라이브러리 타입 무시)
        import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js")
          .then((module) => {
            if (particleInstance.current) return; // 중복 생성 방지
            
            const AttractionCursor = module.default;
            particleInstance.current = AttractionCursor(canvasRef.current, {
              particles: {
                attractionIntensity: 0.8, // 민혁님의 역동적 취향 반영
                size: 1.2,                // 세련된 미세 입자
              },
            });
            
            // 데이/나이트 모드에 따른 초기 색상 설정
            updateParticleColors(isDarkMode);
          });
      };
    };

    initParticles();

    return () => {
      if (script) document.head.removeChild(script);
      // Clean up logic (필요시 인스턴스 파괴 로직 추가)
      particleInstance.current = null;
    };
  }, []); // 마운트 시 1회 실행

  // 데이/나이트 전환 시 파티클 조명 색상 변경 로직
  const updateParticleColors = (dark) => {
    if (!particleInstance.current) return;
    const p = particleInstance.current.particles;
    if (dark) {
      p.light1.color.set(0x4f46e5); // Indigo
      p.light2.color.set(0x7c3aed); // Purple
    } else {
      p.light1.color.set(0xff0055); // Pink
      p.light2.color.set(0x00ccff); // Sky Blue
    }
  };

  useEffect(() => {
    updateParticleColors(isDarkMode);
  }, [isDarkMode]);

  // 3. 메시지 구독 및 알림 로직
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

  const joinRoom = (name) => {
    if (!name.trim()) return;
    const updated = [...new Set([name, ...myRooms])];
    setMyRooms(updated);
    localStorage.setItem("dooly-rooms", JSON.stringify(updated));
    setCurrentRoom(name);
  };

  const theme = {
    card: `transition-all duration-1000 ${isDarkMode ? 'bg-black/40 border-white/10 shadow-2xl' : 'bg-white/60 border-white/80 shadow-lg'} backdrop-blur-3xl`,
    textMain: `transition-colors duration-1000 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`,
    input: `transition-all duration-1000 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-black/10 text-black'}`,
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]'}`}>
      
      {/* 🎨 1. 파티클 캔버스 (z-0 고정, 절대 안깨짐) */}
      <canvas ref={canvasRef} id="canvas" className="absolute inset-0 z-0 pointer-events-auto" />

      {/* 2. 전역 헤더 컨트롤 */}
      <div className="absolute top-8 right-10 z-50 flex items-center gap-4">
        <button onClick={() => { setIsDarkMode(!isDarkMode); localStorage.setItem("dooly-theme", (!isDarkMode).toString()); }} 
                className="text-[10px] font-black border border-white/20 px-6 py-3 rounded-full backdrop-blur-xl text-white/80 hover:bg-indigo-500 hover:text-white transition-all uppercase tracking-widest shadow-xl">
          {isDarkMode ? "Day Mode" : "Night Mode"}
        </button>
      </div>

      {/* 3. 토스트 알림 */}
      {toastMsg && (
        <div className="absolute bottom-24 right-10 z-[100] animate-in slide-in-from-bottom-4 duration-500 pointer-events-none">
          <div className="flex items-center gap-4 p-5 rounded-[32px] bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
            <img src={toastMsg.photo || DEFAULT_AVATAR} className="w-12 h-12 rounded-full object-cover border border-indigo-500/30" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{toastMsg.name}</span>
              <span className="text-white text-sm font-bold truncate max-w-[200px] mt-1">{toastMsg.text}</span>
            </div>
          </div>
        </div>
      )}

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        {!currentRoom ? (
          /* ✨ 메인 인트로 화면 (완벽 대칭 유지) */
          <div className="flex flex-col items-center w-full max-w-[460px] px-6">
            <div className={`${theme.card} w-full rounded-[56px] flex flex-col items-center py-20 px-0 animate-in fade-in zoom-in duration-700`}>
              <div className="w-[340px] flex flex-col items-center mx-auto">
                
                {/* 타이틀 기울기 & 클리핑 보정 완료 */}
                <div className="relative mb-14 flex justify-center w-full overflow-visible">
                  <h1 className={`ULTRA_PRISM_TEXT text-[5.5rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
                </div>

                {!myName ? (
                  <div className="w-full space-y-6">
                    <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER IDENTITY" className={`w-full ${theme.input} px-8 py-6 rounded-[28px] text-center outline-none font-bold text-sm tracking-[0.2em] focus:ring-2 focus:ring-indigo-500/50 transition-all`} />
                    <button onClick={() => { if(tempName.trim()){localStorage.setItem("dooly-name", tempName); setMyName(tempName);}}} className="w-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white py-6 rounded-[28px] font-black uppercase tracking-[0.3em] text-[13px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">Connect OS</button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full border-4 border-indigo-500/30 shadow-2xl mb-6 overflow-hidden ring-2 ring-white/10 group">
                       <img src={myProfileImg || DEFAULT_AVATAR} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <p className={`${theme.textMain} font-black text-3xl mb-14 tracking-tight`}>{myName}</p>
                    <div className="w-full flex flex-col h-[35vh]">
                      <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-5 rounded-[22px] text-center mb-6 font-bold text-xs tracking-[0.3em] outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all`} />
                      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
                        {myRooms.map(room => (
                          <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-6 py-5 rounded-[22px] grid grid-cols-[1fr_2fr_1fr] items-center hover:bg-indigo-500/10 transition-all group active:scale-[0.97]`}>
                            <span className="invisible text-[9px] font-bold">Connect</span>
                            <span className={`font-black ${theme.textMain} text-[15px] tracking-tight text-center truncate`}>{room}</span>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase opacity-0 group-hover:opacity-100 transition-all text-right">Connect</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-12 text-zinc-500 text-[11px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hover:text-red-500 transition-all">Disconnect System</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 📱 채팅방 뷰 (중앙 정렬 및 레이아웃 보정 완료) */
          <div className="h-full w-full flex flex-col animate-in fade-in slide-in-from-bottom-12 duration-700">
            <header className={`px-12 py-7 border-b flex justify-between items-center backdrop-blur-2xl ${isDarkMode ? 'border-white/5 bg-black/30' : 'border-black/5 bg-white/40'}`}>
              <div className="flex items-center gap-8">
                <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[11px] font-black tracking-widest hover:text-indigo-500 transition-colors uppercase`}>◀ Back</button>
                <div className="h-4 w-px bg-white/10" />
                <h1 className="text-2xl font-black italic text-indigo-500 uppercase tracking-tighter">{currentRoom}</h1>
              </div>
              <div className="flex items-center gap-6 pl-8 border-l border-white/10 h-12">
                <span className={`${theme.textMain} text-[15px] font-black tracking-tight`}>{myName}</span>
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-indigo-500/30 shadow-lg ring-1 ring-white/10">
                  <img src={myProfileImg || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                </div>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-12 py-16 space-y-12 no-scrollbar w-full max-w-5xl mx-auto flex flex-col">
              {messages.map((m) => (
                m.type === "system" ? (
                  <div key={m.id} className="w-full flex justify-center py-6">
                    <div className="px-10 py-3 rounded-full bg-white/5 border border-white/5 backdrop-blur-md shadow-sm">
                      <span className={`${theme.textSub} text-[12px] font-black tracking-[0.2em] opacity-60 uppercase`}>{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`flex gap-6 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-500`}>
                    <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-white/10 shadow-lg self-end ring-2 ring-black/5">
                      <img src={m.userPhoto || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                    </div>
                    <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <span className={`${theme.textSub} text-[11px] font-black mb-3 uppercase tracking-[0.2em] opacity-50 px-2`}>{m.userName}</span>
                      <div className={`p-8 rounded-[36px] text-[16px] leading-relaxed shadow-2xl transition-all duration-700 ${m.userName === myName ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-br-none' : isDarkMode ? 'bg-white/10 text-white border border-white/5 rounded-bl-none' : 'bg-white text-zinc-900 border border-black/5 rounded-bl-none shadow-xl'}`}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-12 backdrop-blur-3xl border-t border-white/5">
              <form onSubmit={(e) => { e.preventDefault(); if(input.trim()) addDoc(collection(db, "rooms", currentRoom, "messages"), { text: input, userName: myName, userPhoto: myProfileImg, createdAt: serverTimestamp() }); setInput(""); }} 
                    className={`max-w-4xl mx-auto flex gap-5 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white text-black shadow-2xl'} p-2 rounded-[36px] border transition-all focus-within:ring-4 focus-within:ring-indigo-500/20`}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="TRANSMIT DATA..." className="flex-1 bg-transparent px-10 outline-none text-[16px] font-black text-inherit placeholder:opacity-30" />
                <button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-12 py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all">Transmit</button>
              </form>
            </footer>
          </div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        #canvas { pointer-events: none; } /* UI 조작 방해 금지 */

        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055 0%, #ff5500 15%, #ffcc00 30%, #00ff66 50%, #00ccff 70%, #7700ff 85%, #ff0055 100%);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; 
          animation: prism 4s linear infinite; 
          padding: 0 0.25em; /* 이탤릭체 쏠림 완전 보정 */
          position: relative;
          overflow: visible;
        }
        .ULTRA_PRISM_TEXT::before { content: "DOOLY"; position: absolute; left: 0.25em; top: 0; z-index: -1; filter: blur(35px); opacity: 0.5; }
        .ULTRA_PRISM_TEXT.night::before { color: white; text-shadow: 0 0 50px rgba(255,255,255,0.4); }
        .ULTRA_PRISM_TEXT.day::before { color: black; text-shadow: 0 0 40px rgba(0,0,0,0.1); }
        @keyframes prism { to { background-position: 200% center; } }
      `}</style>
    </div>
  );
}

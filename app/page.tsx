"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// 1. Firebase 설정 (완벽 유지)
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

export default function DoolyOS_Ultimate() {
  // 2. 상태 관리 (모든 기능 상태 완벽 복구)
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

  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null);
  const isUserAtBottom = useRef(true);
  const doolyLogoRef = useRef(null);
  const bgLayerRef = useRef(null);

  // 3. 로컬 데이터 초기화
  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    const savedTheme = localStorage.getItem("aether-theme");
    const savedRooms = JSON.parse(localStorage.getItem("aether-my-rooms") || "[]");
    
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  // 4. 마우스 3D 모션 (로고 및 배경 젤리 요소 연동)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1

      // DOOLY 로고 3D 틸팅
      if (doolyLogoRef.current) {
        doolyLogoRef.current.style.setProperty('--rotateX', `${-y * 15}deg`);
        doolyLogoRef.current.style.setProperty('--rotateY', `${x * 15}deg`);
      }
      
      // 배경 젤리/은하수 시차 효과 (Parallax)
      if (bgLayerRef.current) {
        bgLayerRef.current.style.transform = `translate(${x * -20}px, ${y * -20}px)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 5. 핵심 기능 로직 (다운그레이드 없이 완벽 복구)
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("aether-theme", newMode.toString());
  };

  const handleProfileSave = (e) => {
    if (e) e.preventDefault();
    if (!tempName.trim()) return alert("아이디를 입력해주세요!");
    const finalImg = tempImg || myProfileImg || "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";
    localStorage.setItem("aether-name", tempName);
    localStorage.setItem("aether-profile", finalImg);
    setMyName(tempName);
    setMyProfileImg(finalImg);
    setIsEditingProfile(false); 
  };

  const handleProfileImgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempImg(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const joinRoom = async (roomName) => {
    const name = roomName.trim();
    if (!name) return;
    if (!myRooms.includes(name)) {
      const updatedRooms = [name, ...myRooms];
      setMyRooms(updatedRooms);
      localStorage.setItem("aether-my-rooms", JSON.stringify(updatedRooms));
    }
    await setDoc(doc(db, "rooms", name), { name: name, updatedAt: serverTimestamp() }, { merge: true });
    setCurrentRoom(name);
  };

  const leaveRoom = (e, roomName) => {
    e.stopPropagation();
    if (confirm(`'${roomName}' 노드에서 나가시겠습니까?`)) {
      const updatedRooms = myRooms.filter(r => r !== roomName);
      setMyRooms(updatedRooms);
      localStorage.setItem("aether-my-rooms", JSON.stringify(updatedRooms));
    }
  };

  const deleteMsg = async (id) => {
    if (confirm("메시지를 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "rooms", currentRoom, "messages", id));
    }
  };

  useEffect(() => {
    if (!currentRoom || !myName) return;
    const hasEnteredKey = `entered_${currentRoom}_${myName}`;
    if (!sessionStorage.getItem(hasEnteredKey)) {
      addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system", text: `${myName}님이 접속했습니다.`, createdAt: serverTimestamp()
      });
      sessionStorage.setItem(hasEnteredKey, 'true');
    }
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      if (currentRoom && myName) {
        addDoc(collection(db, "rooms", currentRoom, "messages"), {
          type: "system", text: `${myName}님이 연결을 해제했습니다.`, createdAt: serverTimestamp()
        });
        sessionStorage.removeItem(hasEnteredKey);
      }
      unsubscribe();
    };
  }, [currentRoom, myName]);

  useEffect(() => {
    if (isUserAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !imgData) || !myName) return;
    const currentInput = input;
    setInput("");
    try {
      await addDoc(collection(db, "rooms", currentRoom, "messages"), {
        text: currentInput, image: imgData, userName: myName, userPhoto: myProfileImg, type: "chat", createdAt: serverTimestamp()
      });
      await setDoc(doc(db, "rooms", currentRoom), { updatedAt: serverTimestamp() }, { merge: true });
      isUserAtBottom.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      alert("🚨 전송 실패!");
      setInput(currentInput);
    }
  };

  // ✨ 테마 컬러 팔레트
  const theme = {
    bg: isDarkMode ? "bg-[#050508]" : "bg-[#F3F4F8]",
    chatBg: isDarkMode ? "bg-[#0A0A0F]" : "bg-[#FCFCFD]",
    card: isDarkMode ? "bg-[#11121A]/60 border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]" : "bg-white/80 border border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
    textMain: isDarkMode ? "text-white" : "text-[#1A1A1A]",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    input: isDarkMode ? "bg-white/5 border border-white/10 text-white" : "bg-black/5 border border-black/5 text-black",
    bubbleMe: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg",
    bubbleOther: isDarkMode ? "bg-[#1A1B26] border border-white/5 text-zinc-300" : "bg-white border border-black/5 text-zinc-700 shadow-sm",
  };

  // ✨ 빈 공간을 가득 채우는 젤리 & 은하수 배경 (가장 안정적이고 화려한 방식)
  const GalaxyJellyBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ perspective: '1000px' }}>
      <div ref={bgLayerRef} className="absolute inset-[-5%] w-[110%] h-[110%] transition-transform duration-300 ease-out">
        {/* 별빛 은하수 베이스 */}
        <div className={`absolute inset-0 ${isDarkMode ? 'opacity-40' : 'opacity-10'} bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-screen`}></div>
        
        {/* 좌측 여백을 채우는 몽글몽글한 보라/파랑 젤리 */}
        <div className={`absolute -top-20 -left-20 w-[40vw] h-[40vw] ${isDarkMode ? 'bg-purple-600/30' : 'bg-purple-300/40'} rounded-[40%_60%_70%_30%] blur-[80px] animate-blob mix-blend-screen`}></div>
        <div className={`absolute top-[40%] -left-32 w-[30vw] h-[30vw] ${isDarkMode ? 'bg-indigo-600/20' : 'bg-indigo-300/30'} rounded-[60%_40%_30%_70%] blur-[90px] animate-blob animation-delay-2000 mix-blend-screen`}></div>
        
        {/* 우측 여백을 채우는 몽글몽글한 에메랄드/핑크 젤리 */}
        <div className={`absolute -bottom-20 -right-20 w-[45vw] h-[45vw] ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-300/30'} rounded-[30%_70%_70%_30%] blur-[100px] animate-blob animation-delay-4000 mix-blend-screen`}></div>
        <div className={`absolute top-10 -right-10 w-[35vw] h-[35vw] ${isDarkMode ? 'bg-pink-600/20' : 'bg-pink-300/30'} rounded-[70%_30%_50%_50%] blur-[90px] animate-blob mix-blend-screen`}></div>

        {/* 3D 부유하는 프리즘 크리스탈 조각들 (CSS 3D로 안정적 구현) */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute animate-float" style={{
            top: `${15 + Math.random() * 70}%`,
            left: `${i % 2 === 0 ? Math.random() * 20 : 80 + Math.random() * 15}%`, // 좌우 여백에 집중 배치
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${10 + Math.random() * 10}s`
          }}>
            <div className={`w-16 h-16 ${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'} border backdrop-blur-md rotate-45 rounded-lg shadow-2xl`}></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!myName) return (
    <div className={`h-screen ${theme.bg} flex items-center justify-center p-6 font-sans relative overflow-hidden transition-colors duration-700`}>
      <GalaxyJellyBackground />
      
      {/* 팝업 중앙 정렬 완벽 복구 */}
      <div className={`${theme.card} p-12 w-full max-w-[460px] rounded-[40px] flex flex-col items-center gap-10 z-10 backdrop-blur-2xl animate-in zoom-in duration-700`}>
          <div className="flex flex-col items-center w-full">
            <h1 ref={doolyLogoRef} className="PRISM_DOOLY text-[5.5rem] font-black italic tracking-tighter uppercase select-none mb-1">
              DOOLY
            </h1>
            <button onClick={toggleTheme} className={`${theme.textSub} text-[10px] font-bold uppercase tracking-[0.2em] hover:text-indigo-500 transition-colors mt-2`}>
              {isDarkMode ? "Day Protocol" : "Night Protocol"}
            </button>
          </div>

          <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center space-y-6">
            <div className={`w-28 h-28 rounded-full ${theme.input} overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all group relative`} onClick={() => profileInputRef.current.click()}>
              {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[11px] font-bold tracking-widest group-hover:text-indigo-400">PHOTO +</span>}
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER ID" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-sm font-bold tracking-widest`} />
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[12px] shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all">Start System</button>
          </form>
      </div>

      {/* 글로벌 CSS (고딕 폰트 및 애니메이션) */}
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', -apple-system, sans-serif; box-sizing: border-box; }
        
        /* 젤리 애니메이션 */
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.1) rotate(10deg); }
          66% { transform: translate(-20px, 20px) scale(0.9) rotate(-10deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
        }
        .animate-blob { animation: blob 15s infinite alternate ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(45deg); }
          50% { transform: translateY(-20px) rotate(60deg); }
        }
        .animate-float { animation: float infinite ease-in-out; }

        /* 무지개 프리즘 3D 로고 */
        .PRISM_DOOLY {
          background: linear-gradient(180deg, ${isDarkMode ? '#FFFFFF 0%, #AAAAAA' : '#333333 0%, #111111'} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          position: relative;
          transform-style: preserve-3d;
          transform: perspective(1000px) rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg));
          filter: drop-shadow(0 10px 15px rgba(0,0,0,${isDarkMode ? '0.5' : '0.1'}));
        }
        .PRISM_DOOLY::after {
          content: "DOOLY";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(148,0,211,0.8), rgba(0,191,255,0.8), rgba(50,205,50,0.8));
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          mix-blend-mode: ${isDarkMode ? 'color-dodge' : 'overlay'};
          opacity: ${isDarkMode ? '0.7' : '0.4'};
          animation: prismFlow 3s linear infinite;
          z-index: 1;
        }
        @keyframes prismFlow { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );

  // 리스트 화면 (팝업 모드)
  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex items-center justify-center p-6 relative overflow-hidden transition-all duration-700`}>
      <GalaxyJellyBackground />
      <div className={`${theme.card} p-10 w-full max-w-[460px] rounded-[40px] flex flex-col items-center gap-8 z-10 backdrop-blur-2xl animate-in fade-in zoom-in duration-500`}>
          <div className="flex flex-col items-center w-full relative">
            <h1 ref={doolyLogoRef} className="PRISM_DOOLY text-[3rem] font-black italic tracking-tighter uppercase select-none mb-6">DOOLY</h1>
            <div className="relative mb-3">
              <img src={myProfileImg} className="w-20 h-20 rounded-full object-cover shadow-xl border-2 border-indigo-500/30" />
            </div>
            <p className={`${theme.textMain} font-black text-xl tracking-tight`}>{myName}</p>
            <div className="flex gap-4 mt-3">
               <button onClick={toggleTheme} className={`${theme.textSub} text-[9px] font-bold uppercase tracking-widest hover:text-indigo-400 transition-all`}>{isDarkMode ? "Day Mode" : "Night Mode"}</button>
               <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
            </div>
          </div>

          <div className="w-full flex flex-col h-[35vh]">
            <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE (ENTER)" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center mb-6 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-xs font-bold tracking-widest`} />
            <h2 className={`text-[10px] font-black text-left text-indigo-500 tracking-widest uppercase mb-3 pl-2`}>My Nodes</h2>
            
            {myRooms.length === 0 && (
              <div className={`flex-1 flex items-center justify-center border border-dashed ${isDarkMode ? 'border-white/10' : 'border-black/10'} rounded-2xl`}>
                <span className={`${theme.textSub} text-[10px] font-bold`}>NO NODES FOUND</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
              {myRooms.map((roomName) => (
                <div key={roomName} className="relative group">
                  <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.input} px-5 py-4 rounded-xl flex items-center justify-between hover:bg-indigo-500/10 transition-all active:scale-[0.98]`}>
                    <span className={`font-black ${theme.textMain} text-sm tracking-tight`}>{roomName}</span>
                    <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Connect</span>
                  </button>
                  <button onClick={(e) => leaveRoom(e, roomName)} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500/20 text-red-500 rounded-full text-[9px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );

  // 채팅방 화면 (기능 완벽 복구)
  return (
    <div className={`flex flex-col h-screen ${theme.chatBg} transition-colors relative`}>
      {/* 1. 기능 복구: 풀 헤더 (방이름, 정보, 수정, 테마) */}
      <header className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/5' : 'border-black/5'} flex justify-between items-center backdrop-blur-xl bg-inherit z-20`}>
        <div className="flex items-center gap-5">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[10px] font-bold uppercase hover:text-indigo-500 transition-colors`}>◀ EXIT</button>
          <div className="flex flex-col text-left gap-0.5">
            <h1 className="text-sm font-black italic text-indigo-500 uppercase tracking-tighter">{currentRoom}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] ${theme.textMain} font-bold opacity-80`}>{myName}</span>
              {/* 기능 복구: 프로필 수정 버튼 */}
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className={`text-[9px] ${theme.textSub} font-bold uppercase underline hover:text-indigo-400`}>EDIT</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[9px] font-black border ${isDarkMode ? 'border-white/10' : 'border-black/5'} ${theme.textSub} px-3 py-1.5 rounded-full hover:bg-indigo-500 hover:text-white transition-all`}>
            {isDarkMode ? "DAY" : "NIGHT"}
          </button>
          <img src={myProfileImg} className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-sm" />
        </div>
      </header>

      {/* 2. 기능 복구: 프로필 수정 모달/오버레이 */}
      {isEditingProfile && (
        <div className={`absolute top-[70px] left-0 w-full p-6 bg-black/40 backdrop-blur-2xl border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'} animate-in slide-in-from-top duration-300 z-30`}>
          <form onSubmit={handleProfileSave} className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden cursor-pointer border border-zinc-700 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-white">EDIT</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`flex-1 ${theme.input} px-4 py-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500/50`} placeholder="NEW ID" />
            <button type="submit" className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">SAVE</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className={`${theme.textSub} text-[10px] font-bold px-2 hover:text-red-400`}>CANCEL</button>
          </form>
        </div>
      )}

      {/* 3. 기능 복구: 메시지 리스트 (시스템 메시지 미니멀 처리 포함) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide z-0">
        {messages.map((m) => (
          m.type === "system" ? (
             <div key={m.id} className="flex justify-center my-2">
                {/* 톤앤매너 수정: 보일듯 안보일듯한 시스템 메시지 */}
                <span className={`${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'} text-[10px] font-medium tracking-tight px-3 py-1 bg-transparent`}>{m.text}</span>
             </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className="w-8 h-8 rounded-full shrink-0 object-cover border border-white/5 shadow-sm" />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className={`${theme.textSub} text-[9px] font-bold mb-1.5 px-1 uppercase opacity-80 tracking-widest`}>{m.userName}</span>
                <div className={`group relative p-4 rounded-[20px] text-[13px] leading-relaxed shadow-sm ${m.userName === myName ? theme.bubbleMe + ' rounded-tr-[4px]' : `${theme.bubbleOther} rounded-tl-[4px]`}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-3 border border-white/10" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {/* 기능 복구: 내 메시지 삭제 버튼 */}
                  {m.userName === myName && (
                    <button onClick={() => deleteMsg(m.id)} className={`absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 text-[10px] font-bold transition-all`}>DEL</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. 기능 복구: 메시지 전송 푸터 (이미지 첨부 포함) */}
      <footer className={`p-5 border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'} z-10 bg-inherit`}>
        <form onSubmit={sendMessage} className={`max-w-5xl mx-auto flex items-center gap-3 ${theme.input} p-1.5 rounded-2xl focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`w-10 h-10 flex items-center justify-center rounded-xl ${isDarkMode ? 'text-zinc-400 hover:bg-white/10' : 'text-zinc-500 hover:bg-black/5'} transition-all`}>
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-2 text-sm ${theme.textMain} outline-none font-medium placeholder:text-zinc-500`} />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-indigo-500/20 active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}

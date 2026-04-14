"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

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

// 하이엔드 Serif 폰트 로드
const FontLink = () => (
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap" rel="stylesheet" />
);

export default function AetherOS_PrismGlow_Refined() {
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

  // ✨ 테마 컬러: 레퍼런스 이미지처럼 매우 깊고 어두운 톤 베이스
  const theme = {
    bg: isDarkMode ? "bg-[#09090E]" : "bg-[#F3F4F6]",
    chatBg: isDarkMode ? "bg-[#0B0C10]" : "bg-[#FAFAFA]",
    headerBg: isDarkMode ? "bg-black/40 backdrop-blur-2xl" : "bg-white/60 backdrop-blur-2xl",
    border: isDarkMode ? "border-white/5" : "border-black/5",
    textMain: isDarkMode ? "text-white" : "text-zinc-800",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    card: isDarkMode ? "bg-[#161722]/60 border border-white/5 backdrop-blur-2xl shadow-2xl" : "bg-white/80 border border-black/5 backdrop-blur-2xl shadow-xl",
    input: isDarkMode ? "bg-black/50 border border-white/5" : "bg-zinc-100/50 border border-black/5",
    bubbleOther: isDarkMode ? "bg-[#1E1F2A] border border-white/5 text-zinc-300" : "bg-white border border-black/5 text-zinc-700 shadow-sm",
    bubbleMe: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20",
  };

  // ✨ CSS 기반 몽글몽글한 프리즘 글로우 배경 (가볍고 예쁨!)
  const PrismGlowBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* 보라색 큰 구름 */}
      <div className={`absolute -top-20 -left-20 w-96 h-96 ${isDarkMode ? 'bg-purple-600/30' : 'bg-purple-300/30'} rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob`}></div>
      {/* 파란색 구름 */}
      <div className={`absolute top-1/4 -right-20 w-80 h-80 ${isDarkMode ? 'bg-blue-600/30' : 'bg-blue-300/30'} rounded-full mix-blend-screen filter blur-[120px] opacity-60 animate-blob animation-delay-2000`}></div>
      {/* 초록/민트 구름 */}
      <div className={`absolute -bottom-32 left-1/3 w-96 h-96 ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-300/30'} rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob animation-delay-4000`}></div>
    </div>
  );

  if (!myName) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-10 font-sans transition-colors duration-500 relative overflow-hidden`}>
      <FontLink />
      <PrismGlowBackground />
      
      {/* ✨ 중앙 팝업창 모드 완벽 복원 */}
      <div className={`${theme.card} p-12 w-full max-w-md rounded-[40px] flex flex-col items-center gap-10 z-10 animate-in fade-in zoom-in duration-700`}>
          
          <div className="flex flex-col items-center">
            {/* ✨ 레퍼런스 스타일의 금속 질감 DOOLY 로고 */}
            <h1 className="DOOLY_LOGO text-[6rem] font-black italic tracking-tighter uppercase select-none mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              DOOLY
            </h1>
            <button onClick={toggleTheme} className={`${theme.textSub} text-[9px] font-bold uppercase tracking-widest hover:text-blue-500 transition-colors`}>
              {isDarkMode ? "DAY MODE" : "NIGHT MODE"}
            </button>
          </div>

          <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center space-y-6">
            <div className={`w-28 h-28 rounded-full ${theme.input} overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all group`} onClick={() => profileInputRef.current.click()}>
              {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[10px] font-bold tracking-widest group-hover:text-blue-400">PHOTO +</span>}
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="아이디 입력" className={`w-full ${theme.input} px-6 py-4 rounded-full ${theme.textMain} text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm font-bold placeholder:font-normal`} />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-full font-black uppercase tracking-widest text-[13px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">Start System</button>
          </form>
      </div>

    {/* ✨ CSS 애니메이션 및 로고 스타일 */}
    <style jsx global>{`
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob {
        animation: blob 10s infinite alternate ease-in-out;
      }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-4000 { animation-delay: 4s; }
      
      /* ✨ 이미지 c499de 스타일의 DOOLY 로고 */
      .DOOLY_LOGO {
        background: linear-gradient(180deg, ${isDarkMode ? '#FFFFFF' : '#333333'} 0%, ${isDarkMode ? '#888888' : '#111111'} 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 
          0px 4px 10px rgba(0,0,0,${isDarkMode ? '0.5' : '0.2'}),
          0px -1px 1px rgba(255,255,255,${isDarkMode ? '0.3' : '0.8'});
        position: relative;
      }
      /* 은은한 프리즘 아우라 */
      .DOOLY_LOGO::after {
        content: "DOOLY";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(148,0,211,0.5), rgba(0,191,255,0.5), rgba(50,205,50,0.5));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: blur(8px);
        opacity: ${isDarkMode ? '0.6' : '0.2'};
        z-index: -1;
      }
    `}</style>
    </div>
  );

  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-5 text-center font-sans transition-colors duration-500 relative overflow-hidden`}>
      <PrismGlowBackground />
      
      {/* ✨ 중앙 팝업창 모드 완벽 복원 */}
      <div className={`${theme.card} p-10 w-full max-w-md rounded-[40px] flex flex-col items-center gap-8 z-10 animate-in fade-in zoom-in duration-500`}>
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <img src={myProfileImg} className="w-24 h-24 rounded-full border border-white/10 object-cover shadow-2xl" />
              <div className="absolute inset-0 rounded-full ring-2 ring-blue-500/30"></div>
            </div>
            <p className={`${theme.textMain} font-black text-2xl`}>{myName}</p>
            <div className="flex gap-4 mt-3">
               <button onClick={toggleTheme} className={`${theme.textSub} text-[9px] font-bold uppercase tracking-widest hover:text-blue-400 transition-all`}>{isDarkMode ? "Day Mode" : "Night Mode"}</button>
               <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
            </div>
          </div>

          <div className="w-full flex flex-col h-[40vh]">
            <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="접속할 노드 ID 검색 (Enter)" className={`w-full ${theme.input} px-6 py-4 rounded-full ${theme.textMain} text-center mb-6 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm font-bold placeholder:font-normal`} />
            
            <h2 className={`text-[10px] font-black text-left ${theme.textSub} tracking-widest uppercase mb-3 pl-4`}>My Nodes</h2>
            
            {myRooms.length === 0 && (
              <div className={`flex-1 flex items-center justify-center border border-dashed ${isDarkMode ? 'border-white/10' : 'border-black/10'} rounded-3xl`}>
                <span className={`${theme.textSub} text-[11px] font-bold`}>초대받은 노드 ID를 검색하세요.</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide pr-2">
              {myRooms.map((roomName) => (
                <div key={roomName} className="relative group">
                  <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.input} px-6 py-4 rounded-[24px] flex items-center justify-between hover:bg-blue-600/10 hover:border-blue-500/30 transition-all active:scale-[0.98]`}>
                    <span className={`font-black ${theme.textMain} text-sm tracking-tight`}>{roomName}</span>
                    <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Connect</span>
                  </button>
                  <button onClick={(e) => leaveRoom(e, roomName)} className="absolute -right-2 -top-2 w-7 h-7 bg-red-500/20 text-red-500 rounded-full border border-red-500/30 text-[10px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">✕</button>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${theme.chatBg} ${theme.textMain} overflow-hidden font-sans transition-colors duration-500 relative`}>
      <FontLink />
      <header className={`px-6 py-4 border-b ${theme.border} flex justify-between items-center ${theme.headerBg} shrink-0 z-10`}>
        <div className="flex items-center gap-5">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[10px] font-bold uppercase hover:text-blue-500 transition-colors`}>◀ Exit</button>
          <div className="flex flex-col text-left gap-0.5">
            <h1 className="text-sm font-black italic text-blue-500 uppercase leading-none tracking-tight">{currentRoom}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] ${theme.textMain} font-bold opacity-80`}>{myName}</span>
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className={`text-[9px] ${theme.textSub} font-bold uppercase underline hover:text-blue-400`}>Edit</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[9px] font-black border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-black/5'} ${theme.textSub} px-3 py-2 rounded-full hover:bg-blue-500 hover:text-white transition-all`}>
            {isDarkMode ? "DAY" : "NIGHT"}
          </button>
          <img src={myProfileImg} className={`w-9 h-9 rounded-full border ${theme.border} object-cover shadow-sm`} />
        </div>
      </header>

      {isEditingProfile && (
        <div className={`p-6 ${theme.headerBg} border-b ${theme.border} backdrop-blur-2xl animate-in slide-in-from-top duration-300 z-10`}>
          <form onSubmit={handleProfileSave} className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="relative w-12 h-12 rounded-full bg-black shrink-0 overflow-hidden cursor-pointer border border-zinc-700 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-white drop-shadow-md">Edit</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`flex-1 ${theme.input} px-4 py-3 rounded-full text-xs ${theme.textMain} focus:outline-none focus:ring-1 focus:ring-blue-500/50`} placeholder="새 아이디" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Save</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className={`${theme.textSub} text-[10px] uppercase font-bold px-2 hover:text-white`}>Cancel</button>
          </form>
        </div>
      )}

      <div ref={scrollRef} onScroll={(e) => { isUserAtBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 150; }} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide z-0">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className={`${isDarkMode ? 'text-zinc-500 bg-white/5' : 'text-zinc-500 bg-black/5'} text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border ${theme.border}`}>{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className={`w-8 h-8 rounded-full mt-1 shrink-0 border ${theme.border} object-cover shadow-sm`} />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className={`${theme.textSub} text-[9px] font-bold mb-1.5 px-1 uppercase opacity-80`}>{m.userName}</span>
                <div className={`group relative p-4 rounded-[20px] text-[14px] leading-relaxed ${m.userName === myName ? theme.bubbleMe + ' rounded-tr-[4px]' : `${theme.bubbleOther} rounded-tl-[4px]`}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-3 shadow-md border border-white/10" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className={`px-6 py-5 ${theme.headerBg} border-t ${theme.border} shrink-0 z-10`}>
        <form onSubmit={sendMessage} className={`flex items-center gap-3 max-w-5xl mx-auto ${theme.input} p-1.5 rounded-full focus-within:ring-1 focus-within:ring-blue-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`w-10 h-10 flex items-center justify-center rounded-full ${isDarkMode ? 'text-zinc-400 hover:bg-white/10' : 'text-zinc-500 hover:bg-black/5'} transition-all`}>
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-2 py-2 text-sm ${theme.textMain} focus:outline-none placeholder:text-zinc-500`} />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-full font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}

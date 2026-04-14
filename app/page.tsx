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

export default function DoolyOS_Galaxy_Prism() {
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
  const chromeTextRef = useRef(null);

  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    const savedTheme = localStorage.getItem("aether-theme");
    const savedRooms = JSON.parse(localStorage.getItem("aether-my-rooms") || "[]");
    
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);

    const handleMouseMove = (e) => {
        if (!currentRoom) { 
            const text = chromeTextRef.current;
            if (text) {
                const rect = text.getBoundingClientRect();
                const rotateX = (e.clientY - (rect.top + rect.height/2)) * -0.05; 
                const rotateY = (e.clientX - (rect.left + rect.width/2)) * 0.05;
                text.style.setProperty('--rotateX', `${rotateX}deg`);
                text.style.setProperty('--rotateY', `${rotateY}deg`);
            }
        }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [currentRoom]);

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
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
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

  const theme = {
    bg: isDarkMode ? "bg-[#020205]" : "bg-[#F0F2F5]",
    textMain: isDarkMode ? "text-white" : "text-black",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    card: isDarkMode ? "bg-black/40 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "bg-white/80 border border-black/5 backdrop-blur-3xl shadow-2xl",
    input: isDarkMode ? "bg-white/5 border border-white/10" : "bg-black/5 border border-black/5",
  };

  // ✨ 은하수 & 젤리 배경 컴포넌트
  const GalaxyBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      {/* 젤리 형태의 유동적 구름들 */}
      <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-200/40'} rounded-full blur-[120px] animate-pulse`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-200/40'} rounded-full blur-[120px] animate-pulse animation-delay-2000`}></div>
      {/* 별빛 입자들 */}
      {[...Array(50)].map((_, i) => (
        <div key={i} className="absolute bg-white rounded-full animate-twinkle" 
             style={{ 
               top: `${Math.random() * 100}%`, 
               left: `${Math.random() * 100}%`, 
               width: `${Math.random() * 3}px`, 
               height: `${Math.random() * 3}px`,
               animationDelay: `${Math.random() * 5}s`
             }}></div>
      ))}
    </div>
  );

  if (!myName) return (
    <div className={`h-screen ${theme.bg} flex items-center justify-center p-6 font-sans relative overflow-hidden transition-colors duration-700`}>
      <GalaxyBackground />
      <div className={`${theme.card} p-12 w-full max-w-[450px] rounded-[50px] flex flex-col items-center gap-10 z-10 animate-in zoom-in duration-1000`}>
          <div className="flex flex-col items-center gap-2">
            <h1 ref={chromeTextRef} className="PRISM_TEXT text-8xl font-black tracking-tighter uppercase italic select-none" data-text="DOOLY">DOOLY</h1>
            <button onClick={toggleTheme} className="text-[10px] font-bold tracking-[0.2em] text-blue-500 uppercase hover:brightness-125 transition-all">
                {isDarkMode ? "Switch to Day Mode" : "Switch to Night Mode"}
            </button>
          </div>
          <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center gap-8">
            <div className={`w-32 h-32 rounded-full ${theme.input} overflow-hidden flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all`} onClick={() => profileInputRef.current.click()}>
              {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Photo +</span>}
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER YOUR ID" className={`w-full ${theme.input} px-8 py-5 rounded-2xl ${theme.textMain} text-center focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-bold tracking-widest placeholder:text-zinc-600`} />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-blue-500/40 transition-all active:scale-95">Start System</button>
          </form>
      </div>

      <style jsx global>{`
        @font-face { font-family: 'Gothic'; src: local('Pretendard-Bold'), local('Inter-Bold'), sans-serif; }
        * { font-family: 'Gothic', sans-serif; }
        @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; transform: scale(1.2); } }
        .animate-twinkle { animation: twinkle 3s infinite ease-in-out; }
        
        .PRISM_TEXT {
          position: relative;
          background: linear-gradient(180deg, #fff 0%, #aaa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          transform-style: preserve-3d;
          transform: perspective(1000px) rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg));
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
        }
        .PRISM_TEXT::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, #ff00ff, #00ffff, #ffff00, #ff00ff);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          mix-blend-mode: ${isDarkMode ? 'color-dodge' : 'overlay'};
          opacity: 0.8;
          animation: prismFlow 4s linear infinite;
          z-index: 1;
        }
        @keyframes prismFlow { 0% { background-position: 0% center; } 100% { background-position: 300% center; } }
      `}</style>
    </div>
  );

  // 리스트 및 채팅창은 팝업 모드와 고딕 폰트 테마를 유지하며 기능 수행
  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-700`}>
      <GalaxyBackground />
      <div className={`${theme.card} p-10 w-full max-w-[450px] rounded-[40px] z-10 animate-in fade-in duration-500`}>
          <div className="flex flex-col items-center mb-10">
            <img src={myProfileImg} className="w-24 h-24 rounded-full border-2 border-blue-500/20 mb-4 object-cover shadow-2xl" />
            <h2 className={`text-2xl font-black ${theme.textMain} tracking-tighter uppercase`}>{myName}</h2>
            <div className="flex gap-6 mt-4">
               <button onClick={toggleTheme} className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{isDarkMode ? "Day Mode" : "Night Mode"}</button>
               <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Logout</button>
            </div>
          </div>
          <div className="space-y-6">
            <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH OR CREATE NODE" className={`w-full ${theme.input} px-6 py-4 rounded-xl ${theme.textMain} text-center focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold tracking-widest`} />
            <div className="max-h-[30vh] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {myRooms.map((room) => (
                <div key={room} className="relative group">
                  <button onClick={() => joinRoom(room)} className={`w-full ${theme.input} p-4 rounded-xl flex items-center justify-between hover:bg-blue-600/10 transition-all`}>
                    <span className={`font-black ${theme.textMain} text-sm`}>{room}</span>
                    <span className="text-[9px] text-blue-500 font-bold uppercase">Connect</span>
                  </button>
                  <button onClick={(e) => leaveRoom(e, room)} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500/20 text-red-500 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-all">✕</button>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-[#F9F9F9]'} transition-colors`}>
      <header className={`px-8 py-5 border-b ${theme.border} flex justify-between items-center backdrop-blur-md z-10`}>
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentRoom("")} className="text-blue-500 text-[10px] font-black uppercase tracking-widest">◀ Exit</button>
          <h1 className="text-sm font-black text-blue-500 uppercase tracking-tighter italic">{currentRoom}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[9px] font-bold border ${theme.border} px-3 py-2 rounded-full ${theme.textSub}`}>{isDarkMode ? "DAY" : "NIGHT"}</button>
          <img src={myProfileImg} className="w-9 h-9 rounded-full object-cover border ${theme.border}" />
        </div>
      </header>

      <div ref={scrollRef} onScroll={(e) => { isUserAtBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 150; }} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
            <img src={m.userPhoto} className="w-9 h-9 rounded-full shrink-0 object-cover border ${theme.border}" />
            <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[70%]`}>
              <span className="text-[9px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">{m.userName}</span>
              <div className={`p-5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${m.userName === myName ? 'bg-blue-600 text-white rounded-tr-none' : `${theme.card} rounded-tl-none ${theme.textMain}`}`}>
                {m.image && <img src={m.image} className="w-full rounded-xl mb-4 border border-white/10" />}
                <p>{m.text}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-6">
        <form onSubmit={sendMessage} className={`max-w-4xl mx-auto flex items-center gap-3 ${theme.input} p-2 rounded-2xl focus-within:ring-1 focus-within:ring-blue-500 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-11 h-11 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-blue-500 hover:text-white transition-all">+</button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-2 py-3 text-sm ${theme.textMain} focus:outline-none font-bold`} />
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}

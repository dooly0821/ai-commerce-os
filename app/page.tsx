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

// ✨ Google Fonts: 하이엔드 Serif 폰트 (Playfair Display) 로드 링크 추가
const FontLink = () => (
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap" rel="stylesheet" />
);

export default function AetherOS_ChromeGlass_Premium() {
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

  // ✨ JS 기반 입자 애니메이션 배경을 위한 Ref
  const canvasRef = useRef(null);

  // ✨ 마우스 위치 추적을 위한 상태 및 효과 추가 (3D 제목 모션)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
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

    // ✨ JS 입자 애니메이션 시작
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      let particles = [];
      const particleCount = 100;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5,
          color: `rgba(${isDarkMode ? '255, 255, 255' : '100, 100, 100'}, ${Math.random() * 0.5})`
        });
      }
      const animate = () => {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.random() * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });
      };
      animate();
    }

    // ✨ 마우스 움직임 감지 이벤트 리스너 추가 (첫 화면용)
    const handleMouseMove = (e) => {
        if (!myName) { // 로그인 전 설정 화면에서만 작동
            const text = chromeTextRef.current;
            if (text) {
                const rect = text.getBoundingClientRect();
                const textCenterX = rect.left + rect.width / 2;
                const textCenterY = rect.top + rect.height / 2;
                
                // 마우스와 제목 중심 간의 거리 계산 및 부드러운 회전 값 도출
                const rotateX = (e.clientY - textCenterY) * -0.05; 
                const rotateY = (e.clientX - textCenterX) * 0.05;

                // CSS 변수로 회전 값 주입
                text.style.setProperty('--rotateX', `${rotateX}deg`);
                text.style.setProperty('--rotateY', `${rotateY}deg`);
            }
        }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);

  }, [isDarkMode, myName]);

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

  // ✨ 테마별 컬러 및 질감 변수 설정
  const theme = {
    bg: isDarkMode ? "bg-gradient-to-br from-[#050A1A] to-[#120520]" : "bg-gradient-to-br from-[#F0F2F5] to-[#E9EBF0]",
    chatBg: isDarkMode ? "bg-[#080808]/60" : "bg-white/70",
    headerBg: isDarkMode ? "bg-black/40 backdrop-blur-xl" : "bg-white/60 backdrop-blur-xl",
    border: isDarkMode ? "border-white/5" : "border-black/5",
    textMain: isDarkMode ? "text-white" : "text-black",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    card: isDarkMode ? "bg-white/5 border border-white/10 backdrop-blur-md shadow-inner" : "bg-white/80 border border-black/5 backdrop-blur-md shadow-sm",
    input: isDarkMode ? "bg-black/50 border border-white/10 shadow-inner" : "bg-white border border-black/10 shadow-sm",
    bubbleOther: isDarkMode ? "bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm" : "bg-zinc-100 border border-zinc-200 text-zinc-700 shadow-sm",
    bubbleMe: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/10",
    // ✨ 크롬/유리 질감 테두리 (레퍼런스의 금색/크롬 톤)
    chromeBorder: isDarkMode ? "border border-[#E0BC6C]/30 shadow-[#E0BC6C]/10 shadow-md" : "border border-[#C0C0C0]/50 shadow-sm",
  };

  if (!myName) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-10 font-sans transition-colors duration-500 relative overflow-hidden`}>
      <FontLink />
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      
      <div className={`${theme.card} p-16 rounded-[40px] flex flex-col items-center gap-12 z-10 ${theme.chromeBorder}`}>
          {/* ✨ DOOLY 텍스트: 레퍼런스의 크롬/유리 3D 효과 적용 및 마우스 모션 적용 */}
          <h1 ref={chromeTextRef} className="DOOLY_CHROME text-9xl font-black italic tracking-tighter uppercase select-none transition-all" style={{ fontFamily: "'Playfair Display', serif" }} data-text="DOOLY">
            DOOLY
          </h1>
          <form onSubmit={handleProfileSave} className="w-full max-w-sm flex flex-col items-center space-y-8">
            <div className={`w-32 h-32 rounded-full ${theme.input} border-2 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all ${theme.chromeBorder}`} onClick={() => profileInputRef.current.click()}>
              {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[12px] font-bold">PHOTO +</span>}
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="아이디 입력" className={`w-full ${theme.input} p-6 rounded-full ${theme.textMain} text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xl font-bold`} />
            <button type="submit" className="CHROME_BUTTON bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-full font-black uppercase tracking-widest text-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Start System</button>
          </form>
      </div>
    <style jsx global>{`
      @keyframes chromeShift {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
      .DOOLY_CHROME {
        background: linear-gradient(135deg, ${isDarkMode ? '#A0AEC0' : '#4A5568'}, ${isDarkMode ? '#E2E8F0' : '#A0AEC0'}, ${isDarkMode ? '#A0AEC0' : '#4A5568'});
        -webkit-background-clip: text;
        -webkit-text-fill-color: rgba(255,255,255,0.05);
        background-size: 200% 200%;
        text-shadow: 
          0px 2px 3px rgba(255,255,255,${isDarkMode ? '0.3' : '0.1'}),
          0px -1px 1px rgba(0,0,0,0.5),
          0px 4px 8px rgba(0,0,0,0.3);
        position: relative;
        filter: ${isDarkMode ? 'brightness(1.1) contrast(1.1)' : 'none'};
        /* ✨ 마우스 모션에 반응하는 3D 트랜스폼 */
        transform-style: preserve-3d;
        transform: perspective(1000px) rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg));
      }
      .DOOLY_CHROME::before {
        content: attr(data-text);
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.3) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        mix-blend-mode: overlay;
        filter: blur(2px);
      }
      .DOOLY_CHROME::after {
        content: attr(data-text);
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #FFD700 0%, transparent 50%, #FFD700 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        opacity: ${isDarkMode ? '0.15' : '0.05'};
        mix-blend-mode: color-dodge;
      }
      .CHROME_BUTTON {
        /* ✨ 버튼 글래스 모피즘 및 글로우 효과 */
        backdrop-filter: blur(5px);
        background-color: rgba(59, 130, 246, ${isDarkMode ? '0.6' : '0.8'});
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
      }
      .CHROME_BUTTON:hover {
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
      }
    `}</style>
    </div>
  );

  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-5 text-center font-sans transition-colors duration-500 relative overflow-hidden`}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      <div className={`${theme.card} p-12 rounded-[30px] flex flex-col items-center gap-10 z-10 ${theme.chromeBorder}`}>
          <div className="mb-4 flex flex-col items-center">
            <img src={myProfileImg} className={`w-20 h-20 rounded-full border-2 ${isDarkMode ? 'border-blue-500/30' : 'border-blue-500/10'} mb-3 object-cover shadow-2xl ${theme.chromeBorder}`} />
            <p className={`${theme.textMain} font-black text-xl`}>{myName}</p>
            <div className="flex gap-5 mt-3">
               <button onClick={toggleTheme} className="text-blue-500 text-[10px] font-bold uppercase tracking-widest CHROME_MODE_BUTTON">{isDarkMode ? "Day Mode" : "Night Mode"}</button>
               <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
            </div>
          </div>
          <div className="w-full max-w-sm flex flex-col h-[55vh]">
            <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="접속할 노드 ID(방 이름) 입력 후 Enter..." className={`w-full ${theme.input} border p-6 rounded-full ${theme.textMain} text-center mb-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner text-sm font-bold`} />
            
            <h2 className="text-[11px] font-black text-left text-blue-500 tracking-widest uppercase mb-5 pl-3">My Nodes</h2>
            
            {myRooms.length === 0 && (
              <div className={`${theme.card} p-10 rounded-3xl border border-dashed ${theme.textSub} text-[12px] font-bold`}>
                초대받은 노드 ID를 검색하여 접속하세요.
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {myRooms.map((roomName) => (
                <div key={roomName} className="relative group">
                  <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.card} p-5 rounded-[20px] flex items-center justify-between hover:bg-blue-500/5 transition-all active:scale-[0.98]`}>
                    <span className={`font-black ${theme.textMain} text-md tracking-tight`}>{roomName}</span>
                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Connect</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
      </div>
    <style jsx global>{`
      .CHROME_MODE_BUTTON:hover {
        color: white;
        text-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
      }
    `}</style>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${theme.chatBg} ${theme.textMain} overflow-hidden font-sans transition-colors duration-500`}>
      <header className={`p-5 border-b ${theme.border} flex justify-between items-center ${theme.headerBg} shrink-0 z-10`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[11px] font-bold uppercase hover:text-blue-500 transition-colors`}>◀ Exit</button>
          <div className="flex flex-col text-left gap-0.5">
            <h1 className="text-sm font-black italic text-blue-500 uppercase leading-none">{currentRoom}</h1>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'} font-bold`}>{myName}</span>
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className="text-[10px] text-blue-500 font-bold uppercase underline">Edit</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[10px] font-black border ${theme.border} ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'} ${theme.textSub} px-4 py-2.5 rounded-full hover:bg-blue-500 hover:text-white transition-all CHROME_BUTTON`}>
            {isDarkMode ? "DAY MODE" : "NIGHT MODE"}
          </button>
          <img src={myProfileImg} className={`w-10 h-10 rounded-full border ${theme.border} object-cover shadow-sm ${theme.chromeBorder}`} />
        </div>
      </header>

      {isEditingProfile && (
        <div className={`p-6 ${theme.headerBg} border-b ${theme.border} backdrop-blur-md animate-in slide-in-from-top duration-300`}>
          <form onSubmit={handleProfileSave} className="flex items-center gap-5 max-w-lg mx-auto">
            <div className="relative w-14 h-14 rounded-full bg-black shrink-0 overflow-hidden cursor-pointer border border-zinc-700 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Edit</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`flex-1 ${theme.input} p-3 rounded-full text-xs ${theme.textMain} focus:outline-none Focus:ring-2 focus:ring-blue-500/50`} placeholder="새 아이디" />
            <button type="submit" className="CHROME_BUTTON bg-gradient-to-br from-blue-600 to-blue-700 text-white px-5 py-3 rounded-full text-[11px] font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Save</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className={`${theme.textSub} text-[11px] uppercase font-bold px-2`}>Cancel</button>
          </form>
        </div>
      )}

      <div ref={scrollRef} onScroll={(e) => { isUserAtBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 150; }} className="flex-1 overflow-y-auto p-6 space-y-7 scrollbar-hide">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className={`${isDarkMode ? 'text-zinc-700 bg-zinc-900/50' : 'text-zinc-400 bg-zinc-100'} text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-zinc-800/50`}>{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className={`w-8 h-8 rounded-full mt-1 shrink-0 border ${theme.border} object-cover shadow-sm ${theme.chromeBorder}`} />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <span className={`${theme.textSub} text-[10px] font-black mb-1 px-1 uppercase`}>{m.userName}</span>
                <div className={`group relative p-5 rounded-[20px] text-[14px] ${m.userName === myName ? theme.bubbleMe + ' rounded-tr-none' : `${theme.bubbleOther} rounded-tl-none`}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-4 shadow-md border border-black/5" />}
                  {m.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className={`p-5 ${theme.headerBg} border-t ${theme.border} shrink-0`}>
        <form onSubmit={sendMessage} className={`flex items-center gap-3 max-w-5xl mx-auto ${theme.input} p-2 rounded-full border focus-within:border-blue-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'} w-11 h-11 flex items-center justify-center rounded-full hover:bg-blue-500 hover:text-white transition-all`}>
            <span className="text-2xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-4 py-3 text-md ${theme.textMain} focus:outline-none font-medium`} />
          <button type="submit" className="CHROME_BUTTON bg-gradient-to-br from-blue-600 to-blue-700 text-white px-8 py-3.5 rounded-full font-black text-[12px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}

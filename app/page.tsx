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

// ✨ Google Fonts: 하이엔드 Serif 폰트
const FontLink = () => (
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap" rel="stylesheet" />
);

export default function AetherOS_Prism3D_Fixed() {
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

  const threeCanvasRef = useRef(null);
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

    // ✨ Three.js를 CDN에서 안전하게 불러오는 무적의 로직
    const initThreeJS = () => {
      const THREE = window.THREE;
      if (!THREE || !threeCanvasRef.current) return;
      
      const canvas = threeCanvasRef.current;
      // 이미 렌더링된 요소가 있다면 초기화
      if (canvas.hasChildNodes()) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      // 몽롱한 느낌의 라이팅
      const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.4 : 0.8);
      scene.add(ambientLight);
      const dirLight1 = new THREE.DirectionalLight(0xff00ff, isDarkMode ? 0.6 : 0.2); // 보라빛
      dirLight1.position.set(1, 1, 1).normalize();
      scene.add(dirLight1);
      const dirLight2 = new THREE.DirectionalLight(0x00ffff, isDarkMode ? 0.5 : 0.2); // 민트빛
      dirLight2.position.set(-1, -1, 1).normalize();
      scene.add(dirLight2);

      // 3D 도형 (별, 조개, 몽글한 구체 등)
      const geometries = [
          new THREE.IcosahedronGeometry(0.7, 1), 
          new THREE.TorusGeometry(0.4, 0.15, 16, 100), 
          new THREE.ConeGeometry(0.4, 0.8, 5), 
          new THREE.SphereGeometry(0.5, 32, 32), 
      ];

      // 프리즘 색상 질감
      const prismMaterials = [
          new THREE.MeshPhysicalMaterial({ color: isDarkMode ? 0x9400D3 : 0xD8BFD8, metalness: 0.5, roughness: 0.1, transmission: 0.9, thickness: 0.5 }), // 보라 유리
          new THREE.MeshPhysicalMaterial({ color: isDarkMode ? 0x00BFFF : 0x87CEFA, metalness: 0.5, roughness: 0.1, transmission: 0.9, thickness: 0.5 }), // 파란 유리
          new THREE.MeshPhysicalMaterial({ color: isDarkMode ? 0x32CD32 : 0x98FB98, metalness: 0.5, roughness: 0.1, transmission: 0.9, thickness: 0.5 }), // 연녹 유리
      ];

      let shapes = [];
      const shapeCount = 25; 
      for (let i = 0; i < shapeCount; i++) {
          const geometry = geometries[Math.floor(Math.random() * geometries.length)];
          const material = prismMaterials[Math.floor(Math.random() * prismMaterials.length)];
          const shape = new THREE.Mesh(geometry, material);
          
          // 양쪽 여백 위주로 배치
          shape.position.x = (Math.random() - 0.5) * 16 + (i % 2 === 0 ? -6 : 6); 
          shape.position.y = (Math.random() - 0.5) * 10;
          shape.position.z = (Math.random() - 0.5) * 5 - 2;
          
          shape.rotation.x = Math.random() * 2 * Math.PI;
          shape.rotation.y = Math.random() * 2 * Math.PI;
          
          shape.userData = { 
            vx: (Math.random() - 0.5) * 0.015, 
            vy: (Math.random() - 0.5) * 0.015,
            rx: (Math.random() - 0.5) * 0.02,
            ry: (Math.random() - 0.5) * 0.02
          };
          shapes.push(shape);
          scene.add(shape);
      }

      camera.position.z = 6;

      let animationFrameId;
      const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          shapes.forEach(shape => {
              shape.rotation.x += shape.userData.rx;
              shape.rotation.y += shape.userData.ry;
              shape.position.x += shape.userData.vx;
              shape.position.y += shape.userData.vy;
              
              if (shape.position.x < -12 || shape.position.x > 12) shape.userData.vx *= -1;
              if (shape.position.y < -8 || shape.position.y > 8) shape.userData.vy *= -1;
          });
          renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        renderer.dispose();
      };
    };

    // 3D 라이브러리 스크립트 로드
    if (!window.THREE) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      script.onload = initThreeJS;
      document.head.appendChild(script);
    } else {
      initThreeJS();
    }

    // 마우스 모션
    const handleMouseMove = (e) => {
        if (!myName) { 
            const text = chromeTextRef.current;
            if (text) {
                const rect = text.getBoundingClientRect();
                const textCenterX = rect.left + rect.width / 2;
                const textCenterY = rect.top + rect.height / 2;
                const rotateX = (e.clientY - textCenterY) * -0.05; 
                const rotateY = (e.clientX - textCenterX) * 0.05;
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

  const leaveRoom = (e, roomName) => {
    e.stopPropagation();
    if (confirm(`'${roomName}' 노드에서 나가시겠습니까? (다른 사람의 대화는 유지됩니다)`)) {
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

  const theme = {
    bg: isDarkMode ? "bg-gradient-to-br from-[#02040A] to-[#0A0514]" : "bg-gradient-to-br from-[#F5F7FA] to-[#E2E8F0]",
    chatBg: isDarkMode ? "bg-[#050505]/80" : "bg-white/80",
    headerBg: isDarkMode ? "bg-black/50 backdrop-blur-xl" : "bg-white/70 backdrop-blur-xl",
    border: isDarkMode ? "border-white/10" : "border-black/5",
    textMain: isDarkMode ? "text-white" : "text-black",
    textSub: isDarkMode ? "text-zinc-400" : "text-zinc-500",
    card: isDarkMode ? "bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl" : "bg-white/90 border border-black/5 backdrop-blur-xl shadow-xl",
    input: isDarkMode ? "bg-black/60 border border-white/10 shadow-inner" : "bg-white border border-black/10 shadow-sm",
    bubbleOther: isDarkMode ? "bg-zinc-900/90 border border-zinc-800 text-zinc-300 shadow-sm" : "bg-zinc-100/90 border border-zinc-200 text-zinc-700 shadow-sm",
    bubbleMe: "bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-500/20",
    chromeBorder: isDarkMode ? "border border-[#A8B2C1]/20 shadow-[0_0_15px_rgba(168,178,193,0.1)]" : "border border-[#C0C0C0]/50 shadow-sm",
  };

  if (!myName) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-10 font-sans transition-colors duration-500 relative overflow-hidden`}>
      <FontLink />
      {/* ✨ 3D 배경 (자동 로드됨) */}
      <canvas ref={threeCanvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      
      {/* ✨ 팝업창 스타일의 중앙 카드 */}
      <div className={`${theme.card} p-16 rounded-[40px] flex flex-col items-center gap-12 z-10 ${theme.chromeBorder} animate-in fade-in zoom-in duration-700`}>
          <h1 ref={chromeTextRef} className="DOOLY_CHROME text-[8rem] font-black italic tracking-tighter uppercase select-none transition-all" style={{ fontFamily: "'Playfair Display', serif" }} data-text="DOOLY">
            DOOLY
          </h1>
          <form onSubmit={handleProfileSave} className="w-full max-w-sm flex flex-col items-center space-y-8">
            <div className={`w-32 h-32 rounded-full ${theme.input} border-2 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all ${theme.chromeBorder}`} onClick={() => profileInputRef.current.click()}>
              {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[12px] font-bold tracking-widest">PHOTO</span>}
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="아이디 입력" className={`w-full ${theme.input} p-6 rounded-full ${theme.textMain} text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xl font-bold`} />
            <button type="submit" className="CHROME_BUTTON bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white p-6 rounded-full font-black uppercase tracking-widest text-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all w-full">Start System</button>
          </form>
      </div>
    <style jsx global>{`
      .DOOLY_CHROME {
        background: linear-gradient(135deg, ${isDarkMode ? '#E2E8F0' : '#4A5568'}, ${isDarkMode ? '#FFFFFF' : '#A0AEC0'}, ${isDarkMode ? '#A0AEC0' : '#2D3748'});
        -webkit-background-clip: text;
        -webkit-text-fill-color: rgba(255,255,255,0.1);
        text-shadow: 
          0px 2px 4px rgba(255,255,255,${isDarkMode ? '0.4' : '0.1'}),
          0px -1px 1px rgba(0,0,0,0.8),
          0px 8px 16px rgba(0,0,0,0.5);
        position: relative;
        transform-style: preserve-3d;
        transform: perspective(1000px) rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg));
      }
      .DOOLY_CHROME::before {
        content: attr(data-text);
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.4) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        mix-blend-mode: overlay;
      }
      .DOOLY_CHROME::after {
        content: attr(data-text);
        position: absolute;
        inset: 0;
        background: linear-gradient(45deg, #FF00FF, #00FFFF, #00FF00);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        opacity: ${isDarkMode ? '0.2' : '0.1'};
        mix-blend-mode: color-dodge;
        animation: prismHue 5s infinite linear;
      }
      @keyframes prismHue {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
      .CHROME_BUTTON {
        background-size: 200% auto;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .CHROME_BUTTON:hover {
        background-position: right center;
        box-shadow: 0 0 25px rgba(139, 92, 246, 0.6);
      }
    `}</style>
    </div>
  );

  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-5 text-center font-sans transition-colors duration-500 relative overflow-hidden`}>
      <canvas ref={threeCanvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      <div className={`${theme.card} p-12 rounded-[30px] flex flex-col items-center gap-10 z-10 ${theme.chromeBorder} animate-in fade-in zoom-in duration-500`}>
          <div className="mb-4 flex flex-col items-center">
            <img src={myProfileImg} className={`w-24 h-24 rounded-full border-2 ${isDarkMode ? 'border-indigo-500/30' : 'border-indigo-500/10'} mb-4 object-cover shadow-2xl ${theme.chromeBorder}`} />
            <p className={`${theme.textMain} font-black text-2xl`}>{myName}</p>
            <div className="flex gap-6 mt-4">
               <button onClick={toggleTheme} className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">{isDarkMode ? "Day Mode" : "Night Mode"}</button>
               <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
            </div>
          </div>
          <div className="w-full max-w-sm flex flex-col h-[50vh]">
            <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="접속할 노드 ID 검색 (Enter)" className={`w-full ${theme.input} border p-6 rounded-full ${theme.textMain} text-center mb-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner text-sm font-bold`} />
            <h2 className="text-[11px] font-black text-left text-indigo-400 tracking-widest uppercase mb-5 pl-3">My Nodes</h2>
            {myRooms.length === 0 && (
              <div className={`${theme.card} p-10 rounded-3xl border border-dashed ${theme.textSub} text-[12px] font-bold`}>
                초대받은 노드 ID를 검색하여 접속하세요.
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {myRooms.map((roomName) => (
                <div key={roomName} className="relative group">
                  <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.card} p-5 rounded-[20px] flex items-center justify-between hover:bg-indigo-500/10 transition-all active:scale-[0.98]`}>
                    <span className={`font-black ${theme.textMain} text-md tracking-tight`}>{roomName}</span>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Connect</span>
                  </button>
                  <button onClick={(e) => leaveRoom(e, roomName)} className="absolute -right-2 -top-2 w-7 h-7 bg-red-500/20 text-red-500 rounded-full border border-red-500/30 text-[11px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm shadow-sm">✕</button>
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
      <header className={`p-5 border-b ${theme.border} flex justify-between items-center ${theme.headerBg} shrink-0 z-10`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[11px] font-bold uppercase hover:text-indigo-400 transition-colors`}>◀ Exit</button>
          <div className="flex flex-col text-left gap-0.5">
            <h1 className="text-sm font-black italic text-indigo-400 uppercase leading-none">{currentRoom}</h1>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'} font-bold`}>{myName}</span>
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className="text-[10px] text-indigo-400 font-bold uppercase underline">Edit</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[10px] font-black border ${theme.border} ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'} ${theme.textSub} px-4 py-2.5 rounded-full hover:bg-indigo-500 hover:text-white transition-all CHROME_BUTTON`}>
            {isDarkMode ? "DAY" : "NIGHT"}
          </button>
          <img src={myProfileImg} className={`w-10 h-10 rounded-full border ${theme.border} object-cover shadow-sm ${theme.chromeBorder}`} />
        </div>
      </header>

      {isEditingProfile && (
        <div className={`p-6 ${theme.headerBg} border-b ${theme.border} backdrop-blur-md animate-in slide-in-from-top duration-300 z-10`}>
          <form onSubmit={handleProfileSave} className="flex items-center gap-5 max-w-lg mx-auto">
            <div className="relative w-14 h-14 rounded-full bg-black shrink-0 overflow-hidden cursor-pointer border border-zinc-700 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Edit</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`flex-1 ${theme.input} p-3 rounded-full text-xs ${theme.textMain} focus:outline-none focus:ring-2 focus:ring-indigo-500/50`} placeholder="새 아이디" />
            <button type="submit" className="CHROME_BUTTON bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-full text-[11px] font-black uppercase shadow-lg shadow-purple-500/20 active:scale-95">Save</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className={`${theme.textSub} text-[11px] uppercase font-bold px-2`}>Cancel</button>
          </form>
        </div>
      )}

      <div ref={scrollRef} onScroll={(e) => { isUserAtBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 150; }} className="flex-1 overflow-y-auto p-6 space-y-7 scrollbar-hide z-0">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className={`${isDarkMode ? 'text-zinc-500 bg-zinc-900/50' : 'text-zinc-500 bg-zinc-100'} text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border ${theme.border}`}>{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className={`w-9 h-9 rounded-full mt-1 shrink-0 border ${theme.border} object-cover shadow-sm ${theme.chromeBorder}`} />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <span className={`${theme.textSub} text-[10px] font-black mb-1.5 px-1 uppercase`}>{m.userName}</span>
                <div className={`group relative p-5 rounded-[24px] text-[14px] ${m.userName === myName ? theme.bubbleMe + ' rounded-tr-none' : `${theme.bubbleOther} rounded-tl-none`}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-4 shadow-md border border-black/5" />}
                  {m.text && <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">{m.text}</p>}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className={`p-5 ${theme.headerBg} border-t ${theme.border} shrink-0 z-10`}>
        <form onSubmit={sendMessage} className={`flex items-center gap-3 max-w-5xl mx-auto ${theme.input} p-2 rounded-full border focus-within:border-indigo-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'} w-11 h-11 flex items-center justify-center rounded-full hover:bg-indigo-500 hover:text-white transition-all`}>
            <span className="text-2xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-4 py-3 text-md ${theme.textMain} focus:outline-none font-medium`} />
          <button type="submit" className="CHROME_BUTTON bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-full font-black text-[12px] uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}

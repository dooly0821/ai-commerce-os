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

export default function AetherOS_Private_Nodes() {
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
    bg: isDarkMode ? "bg-[#050505]" : "bg-[#F7F7F9]",
    chatBg: isDarkMode ? "bg-[#080808]" : "bg-white",
    headerBg: isDarkMode ? "bg-black/60" : "bg-white/80",
    border: isDarkMode ? "border-zinc-900/50" : "border-zinc-200",
    textMain: isDarkMode ? "text-white" : "text-black",
    textSub: isDarkMode ? "text-zinc-600" : "text-zinc-400",
    card: isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100 shadow-sm",
    bubbleOther: isDarkMode ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700",
    input: isDarkMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
  };

  if (!myName) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-10 font-sans transition-colors duration-500`}>
      <h1 className="text-4xl font-black italic text-blue-500 mb-10 tracking-tighter uppercase">Aether Setup</h1>
      <form onSubmit={handleProfileSave} className="w-full max-w-sm flex flex-col items-center space-y-6">
        <div className={`w-24 h-24 rounded-full ${theme.card} border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all`} onClick={() => profileInputRef.current.click()}>
          {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[10px] font-bold">PHOTO +</span>}
        </div>
        <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
        <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="아이디 입력" className={`w-full ${theme.card} border p-5 rounded-3xl ${theme.textMain} text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50`} />
        <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Start System</button>
      </form>
    </div>
  );

  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex flex-col items-center justify-center p-5 text-center font-sans transition-colors duration-500`}>
      <div className="mb-10 flex flex-col items-center">
        <img src={myProfileImg} className={`w-16 h-16 rounded-full border-2 ${isDarkMode ? 'border-blue-500/30' : 'border-blue-500/10'} mb-3 object-cover shadow-2xl`} />
        <p className={`${theme.textMain} font-black text-lg`}>{myName}</p>
        <div className="flex gap-4 mt-2">
           <button onClick={toggleTheme} className="text-blue-500 text-[9px] font-bold uppercase tracking-widest">{isDarkMode ? "Day Mode" : "Night Mode"}</button>
           <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
        </div>
      </div>
      <div className="w-full max-w-sm flex flex-col h-[60vh]">
        <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="접속할 노드 ID(방 이름) 입력 후 Enter..." className={`w-full ${theme.input} border p-5 rounded-3xl ${theme.textMain} text-center mb-8 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner`} />
        
        <h2 className="text-[10px] font-black text-left text-blue-500 tracking-widest uppercase mb-4 pl-2">My Nodes</h2>
        
        {myRooms.length === 0 && (
          <div className={`p-8 rounded-2xl border border-dashed ${theme.border} ${theme.textSub} text-[11px] font-bold`}>
            초대받은 노드 ID를 검색하여 접속하세요.
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
          {myRooms.map((roomName) => (
            <div key={roomName} className="relative group">
              <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.card} border p-4 rounded-2xl flex items-center justify-between hover:bg-blue-500/5 transition-all active:scale-[0.98]`}>
                <span className={`font-black ${theme.textMain} text-sm tracking-tight`}>{roomName}</span>
                <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Connect</span>
              </button>
              <button onClick={(e) => leaveRoom(e, roomName)} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 text-[10px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm shadow-sm">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${theme.chatBg} ${theme.textMain} overflow-hidden font-sans transition-colors duration-500`}>
      <header className={`p-4 border-b ${theme.border} flex justify-between items-center ${theme.headerBg} backdrop-blur-xl shrink-0 z-10`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[10px] font-bold uppercase hover:text-blue-500 transition-colors`}>◀ Exit</button>
          <div className="flex flex-col text-left">
            <h1 className="text-xs font-black italic text-blue-500 uppercase leading-none">{currentRoom}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'} font-bold`}>{myName}</span>
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className="text-[8px] text-blue-500 font-bold uppercase underline">Edit</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* ✨ 채팅방 우측 상단에 테마 변경 버튼 추가 */}
          <button onClick={toggleTheme} className={`text-[9px] font-black border ${theme.border} ${theme.textSub} px-3 py-2 rounded-xl hover:bg-blue-500 hover:text-white transition-all`}>
            {isDarkMode ? "DAY" : "NIGHT"}
          </button>
          <img src={myProfileImg} className={`w-8 h-8 rounded-full border ${theme.border} object-cover shadow-sm`} />
        </div>
      </header>

      {isEditingProfile && (
        <div className={`p-5 ${theme.headerBg} border-b ${theme.border} backdrop-blur-md animate-in slide-in-from-top duration-300`}>
          <form onSubmit={handleProfileSave} className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="relative w-12 h-12 rounded-full bg-black shrink-0 overflow-hidden cursor-pointer border border-zinc-700 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Edit</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-zinc-50'} border ${theme.border} p-2 rounded-xl text-xs ${theme.textMain} focus:outline-none`} placeholder="새 아이디" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">Save</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className={`${theme.textSub} text-[10px] uppercase font-bold px-2`}>Cancel</button>
          </form>
        </div>
      )}

      <div ref={scrollRef} onScroll={(e) => { isUserAtBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 150; }} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className={`${isDarkMode ? 'text-zinc-700 bg-zinc-900/50' : 'text-zinc-400 bg-zinc-100'} text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${theme.border}`}>{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className={`w-7 h-7 rounded-full mt-1 shrink-0 border ${theme.border} object-cover shadow-sm`} />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <span className={`${theme.textSub} text-[9px] font-black mb-1 px-1 uppercase`}>{m.userName}</span>
                <div className={`group relative p-4 rounded-2xl text-[13px] ${m.userName === myName ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/20' : `${theme.bubbleOther} rounded-tl-none shadow-sm`}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-3 shadow-md border border-black/5" />}
                  {m.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>}
                  {m.userName === myName && (
                    <button onClick={() => deleteMsg(m.id)} className={`absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 ${isDarkMode ? 'text-zinc-800' : 'text-zinc-300'} hover:text-red-500 text-[10px] font-bold transition-all`}>DEL</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className={`p-4 ${theme.headerBg} border-t ${theme.border} shrink-0`}>
        <form onSubmit={sendMessage} className={`flex items-center gap-2 max-w-5xl mx-auto ${theme.input} p-1.5 rounded-2xl border focus-within:border-blue-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'} w-10 h-10 flex items-center justify-center rounded-xl hover:bg-blue-500 hover:text-white transition-all`}>
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-3 py-2 text-sm ${theme.textMain} focus:outline-none`} />
          <button type="submit" className="bg-blue-600 text-white px-7 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}

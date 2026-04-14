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

export default function AetherOS_RoomList() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [roomList, setRoomList] = useState([]); // ✨ 생성된 방 목록 상태
  
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [tempName, setTempName] = useState("");
  const [tempImg, setTempImg] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null);
  const isUserAtBottom = useRef(true); 

  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    if (savedName) setMyName(savedName);
    if (savedImg) setMyProfileImg(savedImg);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  // ✨ 방 목록 실시간 불러오기
  useEffect(() => {
    if (!myName) return;
    const q = query(collection(db, "rooms"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRoomList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [myName]);

  const handleProfileSetup = (e) => {
    e.preventDefault();
    if (!tempName.trim()) return alert("아이디를 입력해주세요!");
    const finalImg = tempImg || "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";
    setMyName(tempName);
    setMyProfileImg(finalImg);
    localStorage.setItem("aether-name", tempName);
    localStorage.setItem("aether-profile", finalImg);
  };

  const handleProfileImgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempImg(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    if(confirm("프로필 정보를 삭제하고 초기 화면으로 가시겠습니까?")) {
      setMyName("");
      setMyProfileImg("");
      setCurrentRoom("");
      localStorage.removeItem("aether-name");
      localStorage.removeItem("aether-profile");
    }
  };

  // ✨ 방 입장 및 생성 로직
  const joinRoom = async (roomName) => {
    const name = roomName.trim();
    if (!name) return;
    
    // 방 목록에 기록하기 (업데이트 시간이 최신순으로 정렬됨)
    await setDoc(doc(db, "rooms", name), {
      name: name,
      updatedAt: serverTimestamp()
    }, { merge: true });

    setCurrentRoom(name);
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) {
      isUserAtBottom.current = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    }
  };

  useEffect(() => {
    if (!currentRoom || !myName) return;

    const hasEnteredKey = `entered_${currentRoom}_${myName}`;
    if (!sessionStorage.getItem(hasEnteredKey)) {
      addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system",
        text: `${myName}님이 입장하셨습니다.`,
        createdAt: serverTimestamp()
      });
      sessionStorage.setItem(hasEnteredKey, 'true');
    }

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

  const sendMessage = async (e, img = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !img) || !myName) return;
    
    await addDoc(collection(db, "rooms", currentRoom, "messages"), {
      text: input,
      image: img,
      userName: myName,
      userPhoto: myProfileImg,
      type: "chat",
      createdAt: serverTimestamp()
    });
    setInput("");
    
    // 메시지를 보낼 때마다 방 업데이트 시간을 갱신하여 목록 최상단으로 올림
    await setDoc(doc(db, "rooms", currentRoom), {
      updatedAt: serverTimestamp()
    }, { merge: true });

    isUserAtBottom.current = true;
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const deleteMsg = async (id) => {
    if (confirm("삭제할까요?")) await deleteDoc(doc(db, "rooms", currentRoom, "messages", id));
  };

  const handlePopupMode = () => {
    window.open(window.location.href, '_blank', 'width=380,height=650,left=100,top=100,menubar=no,status=no');
  };

  if (!myName) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <h1 className="text-4xl font-black italic text-blue-500 mb-10 tracking-tighter">AETHER PROFILE</h1>
      <form onSubmit={handleProfileSetup} className="w-full max-w-sm flex flex-col items-center space-y-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all"
               onClick={() => profileInputRef.current.click()}>
            {tempImg ? (
              <img src={tempImg} className="w-full h-full object-cover" alt="preview" />
            ) : (
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Image +</span>
            )}
          </div>
          <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
        </div>
        <input 
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          placeholder="아이디를 입력하세요" 
          className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-center"
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/10 transition-all">
          START SYSTEM
        </button>
      </form>
    </div>
  );

  if (!currentRoom) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-5 text-center">
      <div className="mb-8 flex flex-col items-center">
        <img src={myProfileImg} className="w-16 h-16 rounded-full border-2 border-blue-500/30 mb-3 shadow-lg object-cover" alt="me" />
        <p className="text-white font-black text-lg tracking-tight">{myName}</p>
        <button onClick={handleLogout} className="text-zinc-600 text-[9px] font-bold uppercase mt-2 tracking-widest hover:text-red-500 transition-colors">Reset Profile</button>
      </div>
      
      <div className="w-full max-w-sm flex flex-col h-[50vh]">
        <h2 className="text-[10px] font-black text-left text-zinc-500 tracking-widest uppercase mb-3 pl-2">Create New Node</h2>
        <input 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              joinRoom(e.currentTarget.value);
            }
          }}
          placeholder="새 방 이름을 입력하고 Enter..." 
          className="w-full bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm mb-6 shadow-inner"
        />

        <h2 className="text-[10px] font-black text-left text-blue-500 tracking-widest uppercase mb-3 pl-2 flex items-center justify-between">
          Active Nodes
          <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full text-[8px]">{roomList.length}</span>
        </h2>
        
        {/* ✨ 채팅방 리스트 영역 */}
        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide pr-1">
          {roomList.length === 0 ? (
            <div className="p-8 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 text-xs font-bold uppercase tracking-widest">
              아직 생성된 방이 없습니다.
            </div>
          ) : (
            roomList.map((room) => (
              <button 
                key={room.id}
                onClick={() => joinRoom(room.name)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:border-blue-500/50 hover:bg-zinc-800 transition-all group active:scale-[0.98]"
              >
                <span className="font-black text-white text-sm tracking-tight">{room.name}</span>
                <span className="text-[9px] text-zinc-500 font-bold group-hover:text-blue-400 uppercase tracking-widest">Join ➔</span>
              </button>
            ))
          )}
        </div>

        {deferredPrompt && (
          <button onClick={handleInstallApp} className="w-full bg-blue-600/10 text-blue-400 p-4 rounded-2xl border border-blue-500/20 text-xs font-bold uppercase mt-4 hover:bg-blue-600 hover:text-white transition-all">
            📱 앱 설치하기
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-white overflow-hidden">
      <header className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className="text-zinc-600 text-[10px] font-bold uppercase hover:text-white transition-colors">◀ EXIT</button>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <h1 className="text-xs font-black italic text-blue-500 uppercase leading-none">{currentRoom}</h1>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">{myName}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handlePopupMode} className="bg-zinc-900 text-zinc-400 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-zinc-800 border border-zinc-800 transition-all">POPUP</button>
        </div>
      </header>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center"><span className="text-zinc-800 text-[9px] font-black uppercase tracking-widest">{m.text}</span></div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className="w-7 h-7 rounded-full mt-1 shrink-0 border border-zinc-800 shadow-sm object-cover" alt="p" />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <span className="text-[9px] text-zinc-600 font-black mb-1 px-1 uppercase tracking-tighter">{m.userName}</span>
                <div className={`group relative p-4 rounded-2xl text-[13px] shadow-xl ${m.userName === myName ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-zinc-900 border border-zinc-800 rounded-tl-none text-zinc-300'}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-3 shadow-md" alt="u" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.userName === myName && (
                    <button onClick={() => deleteMsg(m.id)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-800 hover:text-red-500 text-[10px] font-bold transition-all">DEL</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/60 border-t border-zinc-900/30 shrink-0">
        <div className="flex items-center gap-2 max-w-5xl mx-auto bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50 transition-all">
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-700 transition-all shrink-0">
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files[0];
            if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); }
          }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none" />
          <button type="submit" className="bg-blue-600 text-white px-7 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all shrink-0">SEND</button>
        </div>
      </form>
    </div>
  );
}

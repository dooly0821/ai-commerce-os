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

export default function AetherOS_Advanced() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [roomList, setRoomList] = useState([]);
  
  // 유저 정보 및 수정 상태
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempImg, setTempImg] = useState("");

  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null); // 프로필 사진 업로드용 Ref
  const isUserAtBottom = useRef(true); 

  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
  }, []);

  useEffect(() => {
    if (!myName) return;
    const q = query(collection(db, "rooms"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRoomList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [myName]);

  useEffect(() => {
    if (!currentRoom || !myName) return;

    const hasEnteredKey = `entered_${currentRoom}_${myName}`;
    if (!sessionStorage.getItem(hasEnteredKey)) {
      addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system", text: `${myName}님이 입장하셨습니다.`, createdAt: serverTimestamp()
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
          type: "system", text: `${myName}님이 퇴장하셨습니다.`, createdAt: serverTimestamp()
        });
        sessionStorage.removeItem(hasEnteredKey);
      }
      unsubscribe();
    };
  }, [currentRoom, myName]);

  const handleProfileSetup = (e) => {
    e.preventDefault();
    if (!tempName.trim()) return alert("아이디를 입력해주세요!");
    const finalImg = tempImg || "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";
    setMyName(tempName);
    setMyProfileImg(finalImg);
    localStorage.setItem("aether-name", tempName);
    localStorage.setItem("aether-profile", finalImg);
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
    await setDoc(doc(db, "rooms", name), { name: name, updatedAt: serverTimestamp() }, { merge: true });
    setCurrentRoom(name);
  };

  const deleteRoomFromList = async (e, roomId) => {
    e.stopPropagation();
    if (confirm(`'${roomId}' 방을 목록에서 지울까요? (이름을 검색하면 다시 입장 가능)`)) {
      await deleteDoc(doc(db, "rooms", roomId));
    }
  };

  const sendMessage = async (e, img = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !img) || !myName) return;
    await addDoc(collection(db, "rooms", currentRoom, "messages"), {
      text: input, image: img, userName: myName, userPhoto: myProfileImg, type: "chat", createdAt: serverTimestamp()
    });
    setInput("");
    await setDoc(doc(db, "rooms", currentRoom), { updatedAt: serverTimestamp() }, { merge: true });
    isUserAtBottom.current = true;
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  if (!myName) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <h1 className="text-4xl font-black italic text-blue-500 mb-10 tracking-tighter">AETHER SETUP</h1>
      <form onSubmit={handleProfileSetup} className="w-full max-w-sm flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => profileInputRef.current.click()}>
          {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-600 text-[10px] font-bold">PHOTO +</span>}
        </div>
        {/* 첫 화면용 숨겨진 파일 입력창 */}
        <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
        <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="아이디 입력" className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest">START</button>
      </form>
    </div>
  );

  if (!currentRoom) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-5 text-center">
      <div className="mb-10 flex flex-col items-center">
        <img src={myProfileImg} className="w-16 h-16 rounded-full border-2 border-blue-500/30 mb-3 object-cover shadow-2xl" />
        <p className="text-white font-black text-lg">{myName}</p>
        <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-700 text-[9px] font-bold uppercase mt-2 tracking-widest hover:text-red-500 transition-colors">Logout</button>
      </div>
      <div className="w-full max-w-sm flex flex-col h-[60vh]">
        <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="새로운 노드 생성 혹은 검색..." className="w-full bg-zinc-900/80 border border-zinc-800 p-5 rounded-3xl text-white text-center mb-8 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        <h2 className="text-[10px] font-black text-left text-blue-500 tracking-widest uppercase mb-4 pl-2">Available Nodes</h2>
        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
          {roomList.map((room) => (
            <div key={room.id} className="relative group">
              <button onClick={() => joinRoom(room.name)} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:bg-zinc-800 transition-all">
                <span className="font-black text-white text-sm tracking-tight">{room.name}</span>
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Connect</span>
              </button>
              <button onClick={(e) => deleteRoomFromList(e, room.id)} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 text-[10px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-white overflow-hidden">
      <header className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className="text-zinc-600 text-[10px] font-bold uppercase hover:text-white transition-colors">◀ EXIT</button>
          <div className="flex flex-col">
            <h1 className="text-xs font-black italic text-blue-500 uppercase leading-none">{currentRoom}</h1>
            <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter mt-1 text-left hover:text-blue-400 underline transition-colors">Edit Profile</button>
          </div>
        </div>
        <img src={myProfileImg} className="w-8 h-8 rounded-full border border-zinc-800 object-cover" />
      </header>

      {/* ✨ 인-채팅 프로필 수정 섹션 */}
      {isEditingProfile && (
        <div className="p-5 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md animate-in slide-in-from-top duration-300">
          <form onSubmit={handleProfileSetup} className="flex items-center gap-4 max-w-lg mx-auto">
            {/* ✨ 버그 해결: 클릭하면 아래 숨겨진 input이 작동하도록 연결 */}
            <div className="relative w-12 h-12 rounded-full bg-black shrink-0 overflow-hidden cursor-pointer border border-zinc-700 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              {/* ✨ 디자인 개선: 흰색 사진 위에서도 잘 보이도록 그림자 추가 */}
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Edit</span>
            </div>
            
            {/* ✨ 여기가 빠져있었습니다! 파일 선택 창을 띄워주는 숨겨진 부품 */}
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className="flex-1 bg-black border border-zinc-800 p-2 rounded-xl text-xs focus:outline-none focus:border-blue-500/50" placeholder="새 아이디" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-500 transition-colors">Save</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className="text-zinc-500 text-[10px] uppercase font-bold px-2 hover:text-white transition-colors">Cancel</button>
          </form>
        </div>
      )}

      <div ref={scrollRef} onScroll={(e) => { isUserAtBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 150; }} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center"><span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800/50">{m.text}</span></div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className="w-7 h-7 rounded-full mt-1 shrink-0 border border-zinc-800 object-cover" />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <span className="text-[9px] text-zinc-600 font-black mb-1 px-1 uppercase tracking-tighter">{m.userName}</span>
                <div className={`group relative p-4 rounded-2xl text-[13px] ${m.userName === myName ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' : 'bg-zinc-900 border border-zinc-800 rounded-tl-none text-zinc-300'}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-3 shadow-md border border-black/20" />}
                  {m.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/60 border-t border-zinc-900/30 shrink-0">
        <div className="flex items-center gap-2 max-w-5xl mx-auto bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50 transition-all">
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-all shrink-0">
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none" />
          <button type="submit" className="bg-blue-600 text-white px-7 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">SEND</button>
        </div>
      </form>
    </div>
  );
}

"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

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
const storage = getStorage(app);

export default function AetherOS_Final_Fixed() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [roomList, setRoomList] = useState([]);
  
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

  // ✨ 프로필 저장 핵심 함수 (버그 수정 완료)
  const handleProfileSave = async (e) => {
    if (e) e.preventDefault();
    if (!tempName.trim()) return alert("아이디를 입력해주세요!");
    
    try {
      let finalImg = tempImg || myProfileImg;
      
      // 이미지가 새로 업로드된 경우(Base64) 스토리지에 저장
      if (tempImg && tempImg.startsWith('data:image')) {
        const storageRef = ref(storage, `profiles/${tempName}_${Date.now()}`);
        await uploadString(storageRef, tempImg, 'data_url');
        finalImg = await getDownloadURL(storageRef);
      }

      // 1. 브라우저 저장소 업데이트
      localStorage.setItem("aether-name", tempName);
      localStorage.setItem("aether-profile", finalImg);
      
      // 2. 현재 상태 업데이트 (이게 빠지면 즉시 안 바뀝니다)
      setMyName(tempName);
      setMyProfileImg(finalImg);
      
      setIsEditingProfile(false);
      alert("프로필이 성공적으로 저장되었습니다! ✅");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
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

  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !imgData) || !myName) return;
    let uploadedImageUrl = null;
    if (imgData) {
      const imageRef = ref(storage, `chats/${currentRoom}/${Date.now()}`);
      await uploadString(imageRef, imgData, 'data_url');
      uploadedImageUrl = await getDownloadURL(imageRef);
    }
    await addDoc(collection(db, "rooms", currentRoom, "messages"), {
      text: input, image: uploadedImageUrl, userName: myName, userPhoto: myProfileImg, type: "chat", createdAt: serverTimestamp()
    });
    setInput("");
    await setDoc(doc(db, "rooms", currentRoom), { updatedAt: serverTimestamp() }, { merge: true });
  };

  // 초기 셋업 화면
  if (!myName) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <h1 className="text-4xl font-black italic text-blue-500 mb-10 tracking-tighter uppercase">Aether Setup</h1>
      <form onSubmit={handleProfileSave} className="w-full max-w-sm flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => profileInputRef.current.click()}>
          {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-600 text-[10px] font-bold">PHOTO +</span>}
        </div>
        <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
        <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="아이디 입력" className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">Start System</button>
      </form>
    </div>
  );

  // 대기실 화면
  if (!currentRoom) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-5 text-center">
      <div className="mb-10 flex flex-col items-center">
        <img src={myProfileImg} className="w-16 h-16 rounded-full border-2 border-blue-500/30 mb-3 object-cover shadow-2xl" />
        <p className="text-white font-black text-lg">{myName}</p>
        <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-700 text-[9px] font-bold uppercase mt-2 tracking-widest hover:text-red-500">Reset</button>
      </div>
      <div className="w-full max-w-sm flex flex-col h-[60vh]">
        <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="새 노드 검색 또는 생성..." className="w-full bg-zinc-900/80 border border-zinc-800 p-5 rounded-3xl text-white text-center mb-8 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
          {roomList.map((room) => (
            <button key={room.id} onClick={() => joinRoom(room.name)} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:bg-zinc-800">
              <span className="font-black text-white text-sm tracking-tight">{room.name}</span>
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Connect</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-white overflow-hidden">
      <header className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className="text-zinc-600 text-[10px] font-bold uppercase">◀ Exit</button>
          <div className="flex flex-col text-left">
            <h1 className="text-xs font-black italic text-blue-500 uppercase leading-none">{currentRoom}</h1>
            <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className="text-[8px] text-zinc-500 font-bold uppercase mt-1 underline">Edit Profile</button>
          </div>
        </div>
        <img src={myProfileImg} className="w-8 h-8 rounded-full border border-zinc-800 object-cover" />
      </header>

      {/* ✨ 인-채팅 프로필 수정 섹션 */}
      {isEditingProfile && (
        <div className="p-5 bg-zinc-900/95 border-b border-zinc-800 backdrop-blur-md">
          <div className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="relative w-12 h-12 rounded-full bg-black shrink-0 overflow-hidden cursor-pointer border border-zinc-700 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Edit</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className="flex-1 bg-black border border-zinc-800 p-2 rounded-xl text-xs text-white focus:outline-none" placeholder="새 아이디" />
            
            {/* ✨ 여기가 수정되었습니다. handleProfileSave를 정확히 호출합니다. */}
            <button onClick={handleProfileSave} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/20">Save</button>
            <button onClick={() => setIsEditingProfile(false)} className="text-zinc-500 text-[10px] uppercase font-bold px-2">Cancel</button>
          </div>
        </div>
      )}

      <div ref={scrollRef} onScroll={(e) => { isUserAtBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 150; }} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
            <img src={m.userPhoto} className="w-7 h-7 rounded-full mt-1 shrink-0 border border-zinc-800 object-cover" />
            <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[80%]`}>
              <span className="text-[9px] text-zinc-600 font-black mb-1 px-1 uppercase">{m.userName}</span>
              <div className={`p-4 rounded-2xl text-[13px] ${m.userName === myName ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' : 'bg-zinc-900 border border-zinc-800 rounded-tl-none text-zinc-300'}`}>
                {m.image && <img src={m.image} className="w-full rounded-xl mb-3" />}
                {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/60 border-t border-zinc-900/30 shrink-0">
        <div className="flex items-center gap-2 max-w-5xl mx-auto bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50">
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 shrink-0">
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none" />
          <button type="submit" className="bg-blue-600 text-white px-7 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Send</button>
        </div>
      </form>
    </div>
  );
}

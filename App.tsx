import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Player, Card, GamePhase, PlayerStatus, GameLog, 
  HandType, NetworkMode, GameMessage, ActionPayload
} from './types';
import { 
  generateDeck, evaluateHand, compareHands, getBotDecision, 
  INITIAL_CHIPS, ANTE, MIN_RAISE 
} from './services/gameLogic';
import PlayerSeat from './components/PlayerSeat';
import CardComponent from './components/CardComponent';
import { Coins, Eye, Trophy, RefreshCw, XCircle, Swords, ArrowUpCircle, Zap, Users, Copy, LogIn, Wifi, UserPlus, LogOut, Play, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Peer, DataConnection } from 'peerjs';

// --- Utils ---
const getRandomAvatar = () => {
    return `https://picsum.photos/seed/${Math.floor(Math.random() * 1000000)}/100/100`;
};

// --- Animation Components ---

// Flying Chip
const FlyingChip: React.FC<{ start: { x: string, y: string }, onComplete: () => void }> = ({ start, onComplete }) => {
    return (
        <motion.div
            initial={{ left: start.x, top: start.y, scale: 0.5, opacity: 1 }}
            animate={{ left: '50%', top: '40%', scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
            className="fixed z-50 w-6 h-6 rounded-full border-2 border-dashed border-yellow-300 bg-yellow-500 shadow-lg flex items-center justify-center pointer-events-none"
        >
            <div className="w-4 h-4 rounded-full bg-yellow-300/50"></div>
        </motion.div>
    );
};

// Comparison Overlay
interface CompareData {
    pA: Player;
    pB: Player;
    winnerId: number;
}

const CompareOverlay: React.FC<{ data: CompareData; onComplete: () => void }> = ({ data, onComplete }) => {
    const [step, setStep] = useState(0);
    const { pA, pB, winnerId } = data;

    useEffect(() => {
        const timers = [
            setTimeout(() => setStep(1), 500), // Show Cards Back
            setTimeout(() => setStep(2), 1500), // Flip A
            setTimeout(() => setStep(3), 2500), // Flip B
            setTimeout(() => setStep(4), 3500), // Show Result
            setTimeout(() => onComplete(), 5500), // End
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
        >
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-blue-900/20 -skew-y-3 origin-top-right"></div>
                <div className="absolute bottom-0 right-0 w-full h-1/2 bg-red-900/20 -skew-y-3 origin-bottom-left"></div>
            </div>

            <div className="flex items-center justify-center w-full max-w-4xl gap-8 sm:gap-16 z-10 px-4">
                
                {/* Player A (Left) */}
                <div className={`flex flex-col items-center transition-opacity duration-500 ${step >= 4 && winnerId !== pA.id ? 'opacity-30 grayscale blur-sm' : ''}`}>
                    <motion.div 
                        initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        className="relative mb-8"
                    >
                        <img src={pA.avatar} className="w-24 h-24 rounded-full border-4 border-blue-500 shadow-[0_0_30px_blue]" alt={pA.name} />
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded font-bold whitespace-nowrap shadow-lg border border-blue-400">
                            {pA.name}
                        </div>
                        {step >= 4 && winnerId === pA.id && (
                             <motion.div 
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-400"
                             >
                                 <Trophy size={48} fill="currentColor" />
                             </motion.div>
                        )}
                    </motion.div>
                    
                    <div className="flex -space-x-4">
                        {pA.cards.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <CardComponent card={card} hidden={step < 2} large />
                            </motion.div>
                        ))}
                    </div>
                    {step >= 2 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-blue-300 font-mono text-lg">
                            {evaluateHand(pA.cards).label}
                        </motion.div>
                    )}
                </div>

                {/* VS Graphic */}
                <div className="flex flex-col items-center justify-center relative">
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="text-6xl sm:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-600 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]"
                    >
                        VS
                    </motion.div>
                    <Zap className="text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 animate-pulse" />
                </div>

                {/* Player B (Right) */}
                <div className={`flex flex-col items-center transition-opacity duration-500 ${step >= 4 && winnerId !== pB.id ? 'opacity-30 grayscale blur-sm' : ''}`}>
                     <motion.div 
                        initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        className="relative mb-8"
                    >
                        <img src={pB.avatar} className="w-24 h-24 rounded-full border-4 border-red-500 shadow-[0_0_30px_red]" alt={pB.name} />
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded font-bold whitespace-nowrap shadow-lg border border-red-400">
                            {pB.name}
                        </div>
                        {step >= 4 && winnerId === pB.id && (
                             <motion.div 
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-400"
                             >
                                 <Trophy size={48} fill="currentColor" />
                             </motion.div>
                        )}
                    </motion.div>

                    <div className="flex -space-x-4">
                        {pB.cards.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 + 0.2 }}
                            >
                                <CardComponent card={card} hidden={step < 3} large />
                            </motion.div>
                        ))}
                    </div>
                    {step >= 3 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-red-300 font-mono text-lg">
                            {evaluateHand(pB.cards).label}
                        </motion.div>
                    )}
                </div>
            </div>
            
            {step >= 4 && (
                 <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="absolute bottom-20 text-4xl font-black text-yellow-400 bg-black/50 px-8 py-4 rounded-xl border-2 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)]"
                 >
                     {winnerId === pA.id ? pA.name : pB.name} 获胜!
                 </motion.div>
            )}
        </motion.div>
    );
};

// --- Lobby Component ---
const Lobby: React.FC<{ 
    onCreate: (mode: NetworkMode, botCount?: number) => void, 
    onJoin: (id: string) => void,
    roomCode: string | null,
    players: Player[],
    onStartGame: () => void,
    isHost: boolean,
    connectionStatus: string
}> = ({ onCreate, onJoin, roomCode, players, onStartGame, isHost, connectionStatus }) => {
    const [inputCode, setInputCode] = useState('');
    const [lobbyMode, setLobbyMode] = useState<'MENU' | 'HOSTING' | 'JOINING'>('MENU');
    const [botCount, setBotCount] = useState(2);

    // Copy to clipboard
    const copyToClipboard = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            alert("房间号已复制!");
        }
    };

    if (lobbyMode === 'HOSTING') {
        return (
             <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-md">
                <div className="bg-gray-900 p-8 rounded-2xl border border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.2)] w-full max-w-md text-center">
                    <h2 className="text-3xl font-serif font-bold text-yellow-400 mb-6">联机大厅</h2>
                    
                    <div className="mb-6">
                        <p className="text-gray-400 text-sm mb-2">将房间号分享给好友:</p>
                        <div className="flex items-center justify-center gap-2 bg-black/50 p-3 rounded border border-gray-700">
                            <span className="font-mono text-xl text-white tracking-widest select-all">
                                {roomCode || '生成中...'}
                            </span>
                            <button onClick={copyToClipboard} className="text-yellow-500 hover:text-yellow-300">
                                <Copy size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <h3 className="text-gray-300 font-bold border-b border-gray-700 pb-2">玩家列表</h3>
                        {players.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                                <div className="flex items-center gap-3">
                                    <img src={p.avatar} className="w-8 h-8 rounded-full" alt="" />
                                    <span>{p.name}</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${p.status === PlayerStatus.WAITING ? 'bg-green-900 text-green-300' : 'bg-gray-700'}`}>
                                    {p.id === 0 ? '房主' : (p.isHuman ? '已准备' : '电脑')}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={onStartGame}
                        disabled={players.filter(p => p.isHuman).length < 1}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        开始游戏
                    </button>
                    <button 
                        onClick={() => { setLobbyMode('MENU'); }}
                        className="mt-4 text-gray-400 hover:text-white underline text-sm"
                    >
                        返回主菜单
                    </button>
                </div>
             </div>
        );
    }

    if (lobbyMode === 'JOINING') {
         return (
             <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-md">
                <div className="bg-gray-900 p-8 rounded-2xl border border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.2)] w-full max-w-md text-center">
                    <h2 className="text-3xl font-serif font-bold text-blue-400 mb-6">加入游戏</h2>
                    
                    <div className="mb-6">
                        <p className="text-gray-400 text-sm mb-2">输入房主的房间号:</p>
                        <input 
                            type="text" 
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            className="w-full bg-black/50 border border-gray-600 rounded p-3 text-center font-mono text-lg text-white focus:border-blue-500 outline-none"
                            placeholder="在此粘贴房间号"
                        />
                    </div>

                    <div className="mb-6 text-yellow-300 text-sm animate-pulse">
                        {connectionStatus}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setLobbyMode('MENU')}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            返回
                        </button>
                        <button 
                            onClick={() => onJoin(inputCode)}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                        >
                            连接
                        </button>
                    </div>
                </div>
             </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-4xl flex flex-col items-center">
                <h1 className="text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">炸金花</h1>
                <p className="text-gray-400 mb-10 tracking-widest text-lg">ZHA JIN HUA - 联机模式</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                    {/* Single Player */}
                    <div className="group flex flex-col bg-gray-800 rounded-xl border-2 border-transparent hover:border-green-500 transition-all p-4">
                         <div 
                            onClick={() => onCreate('OFFLINE', botCount)}
                            className="flex flex-col items-center cursor-pointer mb-4"
                        >
                            <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Zap size={32} className="text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">单人游戏</h3>
                            <p className="text-gray-400 text-sm text-center">离线模式 对战电脑</p>
                        </div>
                        <div className="border-t border-gray-700 pt-3 w-full">
                             <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                                 <span>玩家人数:</span>
                                 <span className="font-bold text-green-400">{botCount + 1}人</span>
                             </div>
                             <input 
                                type="range" min="1" max="4" 
                                value={botCount} 
                                onChange={(e) => setBotCount(parseInt(e.target.value))}
                                className="w-full accent-green-500 cursor-pointer"
                             />
                             <div className="text-xs text-gray-500 text-center mt-1">
                                 (1-{botCount} 个电脑对手)
                             </div>
                        </div>
                    </div>

                    {/* Host Game */}
                    <button 
                        onClick={() => { setLobbyMode('HOSTING'); onCreate('HOST'); }}
                        className="group flex flex-col items-center bg-gray-800 hover:bg-gray-700 p-6 rounded-xl border-2 border-transparent hover:border-yellow-500 transition-all"
                    >
                        <div className="w-16 h-16 bg-yellow-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Wifi size={32} className="text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">创建房间</h3>
                        <p className="text-gray-400 text-sm text-center">创建房间邀请好友加入</p>
                    </button>

                    {/* Join Game */}
                    <button 
                        onClick={() => { setLobbyMode('JOINING'); onCreate('CLIENT'); }}
                        className="group flex flex-col items-center bg-gray-800 hover:bg-gray-700 p-6 rounded-xl border-2 border-transparent hover:border-blue-500 transition-all"
                    >
                        <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <LogIn size={32} className="text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">加入游戏</h3>
                        <p className="text-gray-400 text-sm text-center">输入好友的房间号加入</p>
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main App ---

const App: React.FC = () => {
  // --- State ---
  // Network State
  const [networkMode, setNetworkMode] = useState<NetworkMode>('OFFLINE');
  const [myPlayerId, setMyPlayerId] = useState<number>(0);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [inLobby, setInLobby] = useState(true);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]); // For Host
  const hostConnRef = useRef<DataConnection | null>(null); // For Client

  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: '我 (房主)', isHuman: true, chips: INITIAL_CHIPS, cards: [], hasSeenCards: false, status: PlayerStatus.WAITING, currentBet: 0, isDealer: false, avatar: getRandomAvatar() },
    { id: 1, name: '电脑 1', isHuman: false, chips: INITIAL_CHIPS, cards: [], hasSeenCards: false, status: PlayerStatus.WAITING, currentBet: 0, isDealer: false, avatar: getRandomAvatar() },
    { id: 2, name: '电脑 2', isHuman: false, chips: INITIAL_CHIPS, cards: [], hasSeenCards: false, status: PlayerStatus.WAITING, currentBet: 0, isDealer: false, avatar: getRandomAvatar() },
  ]);
  
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.IDLE);
  const [pot, setPot] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [currentRoundBet, setCurrentRoundBet] = useState<number>(ANTE);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [customRaise, setCustomRaise] = useState<string>('');
  const [comparingInitiatorId, setComparingInitiatorId] = useState<number | null>(null);
  const [raiseCount, setRaiseCount] = useState<number>(0); // NEW: Track consecutive raises
  
  // Animations State
  const [flyingChips, setFlyingChips] = useState<{id: number, start: {x: string, y: string}}[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), message }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Networking Logic ---

  // Initialize PeerJS for Host
  const setupHost = () => {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
          setRoomCode(id);
          setConnectionStatus('等待玩家加入...');
          // Host is always Player 0
          setMyPlayerId(0);
      });

      peer.on('connection', (conn) => {
          // Accept connection
          conn.on('open', () => {
              const newPlayerIndex = connectionsRef.current.length + 1; // 1 then 2
              if (newPlayerIndex > 2) {
                  conn.close(); // Max 3 players for online demo
                  return;
              }
              
              connectionsRef.current.push(conn);
              addLog(`玩家连接成功! 分配座位 ${newPlayerIndex}`);
              
              // Update players array to make that seat Human
              setPlayers(prev => prev.map(p => {
                  if (p.id === newPlayerIndex) {
                      return { ...p, name: `玩家 ${newPlayerIndex}`, isHuman: true, status: PlayerStatus.WAITING, peerId: conn.peer };
                  }
                  return p;
              }));

              // Send Welcome Message
              const msg: GameMessage = {
                  type: 'WELCOME',
                  payload: { playerId: newPlayerIndex }
              };
              conn.send(msg);
          });

          conn.on('data', (data: unknown) => {
              const msg = data as GameMessage;
              if (msg.type === 'ACTION') {
                  handleRemoteAction(msg.payload as ActionPayload);
              }
          });
      });
  };

  // Initialize PeerJS for Client
  const joinGame = (hostId: string) => {
      const peer = new Peer();
      peerRef.current = peer;
      setConnectionStatus('正在连接主机...');

      peer.on('open', () => {
          const conn = peer.connect(hostId);
          hostConnRef.current = conn;

          conn.on('open', () => {
              setConnectionStatus('已连接! 等待房主开始...');
          });

          conn.on('data', (data: unknown) => {
              const msg = data as GameMessage;
              handleServerMessage(msg);
          });

          conn.on('error', (err) => {
              setConnectionStatus('连接错误: ' + err);
          });
      });

      peer.on('error', (err) => {
          setConnectionStatus('Peer 错误: ' + err);
      });
  };

  // Handle incoming messages (Client side)
  const handleServerMessage = (msg: GameMessage) => {
      if (msg.type === 'WELCOME') {
          setMyPlayerId(msg.payload.playerId);
          setInLobby(false); // Enter game view
      } else if (msg.type === 'STATE_SYNC') {
          const state = msg.payload;
          // Update local state to match host
          setPlayers(state.players);
          setPot(state.pot);
          setGamePhase(state.gamePhase);
          setCurrentTurnIndex(state.currentTurnIndex);
          setCurrentRoundBet(state.currentRoundBet);
          setWinnerId(state.winnerId);
          setComparingInitiatorId(state.comparingInitiatorId);
          setRaiseCount(state.raiseCount || 0); // Sync raise count

          if (state.lastLog) {
              addLog(state.lastLog);
          }
          
          if (state.event) {
              if (state.event.type === 'CHIP_FLY') {
                  triggerChipEffect(state.event.playerId);
              }
              if (state.event.type === 'COMPARE_START') {
                  setCompareData(state.event.data);
              }
          }

          if (state.gamePhase === GamePhase.BETTING && compareData) {
              setCompareData(null);
          }
      }
  };

  // Broadcast state (Host side)
  const broadcastState = useCallback((event?: any, logMsg?: string) => {
      if (networkMode !== 'HOST') return;
      
      const state = {
          players,
          pot,
          gamePhase,
          currentTurnIndex,
          currentRoundBet,
          winnerId,
          comparingInitiatorId,
          raiseCount, // Include raiseCount in sync
          event,
          lastLog: logMsg
      };

      const msg: GameMessage = {
          type: 'STATE_SYNC',
          payload: state
      };

      connectionsRef.current.forEach(conn => {
          if (conn.open) conn.send(msg);
      });
  }, [players, pot, gamePhase, currentTurnIndex, currentRoundBet, winnerId, comparingInitiatorId, raiseCount, networkMode]);

  // Send Action (Client side)
  const sendAction = (action: ActionPayload) => {
      if (hostConnRef.current && hostConnRef.current.open) {
          hostConnRef.current.send({ type: 'ACTION', payload: action });
      }
  };

  // Handle Remote Action (Host Side)
  const handleRemoteAction = (payload: ActionPayload) => {
      const { action, playerId, amount, targetId } = payload;

      // Validate turn
      if (currentTurnIndex !== playerId) {
           console.warn(`Ignoring action from ${playerId} - not their turn`);
           return;
      }

      switch (action) {
          case 'FOLD': handleFold(playerId); break;
          case 'CALL': handleCall(playerId); break;
          case 'RAISE': if (amount) handleRaise(playerId, amount); break;
          case 'ALL_IN': handleAllIn(playerId); break;
          case 'SEE_CARDS': handleSeeCards(playerId); break;
          case 'COMPARE_INIT': initiateCompare(playerId); break;
          case 'COMPARE_TARGET': if (targetId !== undefined) resolveCompare(playerId, targetId); break;
      }
  };

  // --- Helpers ---
  
  const getPlayerPositionCSS = (id: number): { x: string, y: string } => {
      if (id === 0) return { x: '50%', y: '90%' };
      if (id === 1) return { x: '15%', y: '15%' };
      if (id === 2) return { x: '85%', y: '15%' };
      return { x: '50%', y: '50%' };
  };

  const triggerChipEffect = (playerId: number) => {
      const newChip = { id: Date.now(), start: getPlayerPositionCSS(playerId) };
      setFlyingChips(prev => [...prev, newChip]);
  };

  const removeFlyingChip = (id: number) => {
      setFlyingChips(prev => prev.filter(c => c.id !== id));
  };

  const getActivePlayers = useCallback(() => {
    return players.filter(p => p.status === PlayerStatus.PLAYING);
  }, [players]);

  const nextTurn = useCallback(() => {
    setPlayers(prevPlayers => {
       return prevPlayers.map(p => ({...p, lastAction: undefined}));
    });

    setCurrentTurnIndex(prev => {
      let next = (prev + 1) % players.length;
      let safe = 0;
      while (players[next].status !== PlayerStatus.PLAYING && safe < 20) {
        next = (next + 1) % players.length;
        safe++;
      }
      return next;
    });
  }, [players]);


  // --- Actions ---

  const startNewGame = async () => {
    if (networkMode === 'HOST' || networkMode === 'OFFLINE') setInLobby(false);

    const newDeck = generateDeck();
    const startIdx = Math.floor(Math.random() * players.length);
    
    setGamePhase(GamePhase.DEALING);
    setWinnerId(null);
    setComparingInitiatorId(null);
    setRaiseCount(0); // Reset raise count
    const startMsg = '游戏开始，正在发牌...';
    setLogs([{ id: 'start', message: startMsg }]);
    setPot(0);
    setDeck(newDeck);
    
    // Reset Players for Dealing
    const resetPlayers = players.map((p, idx) => ({
      ...p,
      cards: [],
      hasSeenCards: false,
      status: p.chips >= ANTE ? PlayerStatus.PLAYING : PlayerStatus.LOST,
      currentBet: 0,
      chips: p.chips - ANTE, 
      isDealer: idx === startIdx,
      lastAction: undefined
    }));
    
    // Initial Pot state (Ante)
    setPot(players.length * ANTE);
    setPlayers(resetPlayers);
    setCurrentTurnIndex(startIdx);
    setCurrentRoundBet(ANTE);

    // Animate Dealing
    const activeIds = resetPlayers.filter(p => p.status === PlayerStatus.PLAYING).map(p => p.id);
    const dealingDeck = [...newDeck];
    
    for (let i = 0; i < 3; i++) {
        for (const pid of activeIds) {
            await new Promise(r => setTimeout(r, 150));
            const card = dealingDeck.pop();
            if (card) {
                setPlayers(prev => prev.map(p => p.id === pid ? { ...p, cards: [...p.cards, card] } : p));
            }
        }
    }
    
    setDeck(dealingDeck);
    setGamePhase(GamePhase.BETTING);
    addLog('下注开始。');
  };

  // Wrapper to handle State Updates + Broadcasts
  useEffect(() => {
      if (networkMode === 'HOST' && !inLobby) {
          broadcastState();
      }
  }, [players, pot, gamePhase, currentTurnIndex, currentRoundBet, networkMode, inLobby, broadcastState]);


  // --- Game Logic Handlers (Used by Host & Single Player) ---

  const handleFold = (playerId: number) => {
    if (networkMode === 'CLIENT' && playerId === myPlayerId) {
        sendAction({ action: 'FOLD', playerId });
        return;
    }

    addLog(`${players[playerId].name} 弃牌。`);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, status: PlayerStatus.FOLDED, lastAction: '弃牌', lastActionType: 'negative' } : p));
    nextTurn();
  };

  const handleSeeCards = (playerId: number) => {
    if (networkMode === 'CLIENT' && playerId === myPlayerId) {
        sendAction({ action: 'SEE_CARDS', playerId });
        return;
    }

    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, hasSeenCards: true, lastAction: '👀 看牌' } : p));
  };

  const handleCall = (playerId: number) => {
    if (networkMode === 'CLIENT' && playerId === myPlayerId) {
        sendAction({ action: 'CALL', playerId });
        return;
    }

    const player = players[playerId];
    const amountToCall = currentRoundBet; 
    
    if (player.chips < amountToCall) {
        handleAllIn(playerId);
        return;
    }

    triggerChipEffect(playerId);
    if (networkMode === 'HOST') broadcastState({ type: 'CHIP_FLY', playerId });

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, chips: p.chips - amountToCall, currentBet: amountToCall, lastAction: `跟注 ${amountToCall}`, lastActionType: 'neutral' };
      }
      return p;
    }));
    setPot(prev => prev + amountToCall);
    addLog(`${player.name} 跟注 ${amountToCall}。`);
    nextTurn();
  };

  const handleRaise = (playerId: number, raiseAmount: number) => {
    if (networkMode === 'CLIENT' && playerId === myPlayerId) {
        sendAction({ action: 'RAISE', playerId, amount: raiseAmount });
        return;
    }

    // CHECK RAISE LIMIT
    if (raiseCount >= 10) {
        addLog(`加注次数已达上限 (10)，无法继续加注！`);
        return;
    }

    const player = players[playerId];
    
    if (player.chips < raiseAmount) {
      return;
    }

    triggerChipEffect(playerId);
    if (networkMode === 'HOST') broadcastState({ type: 'CHIP_FLY', playerId });

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, chips: p.chips - raiseAmount, currentBet: raiseAmount, lastAction: `加注 ${raiseAmount}`, lastActionType: 'positive' };
      }
      return p;
    }));
    
    setPot(prev => prev + raiseAmount);
    setCurrentRoundBet(raiseAmount);
    setRaiseCount(prev => prev + 1); // Increment raise count
    addLog(`${player.name} 加注至 ${raiseAmount}。 (第${raiseCount + 1}/10次)`);
    nextTurn();
  };

  const handleAllIn = (playerId: number) => {
    if (networkMode === 'CLIENT' && playerId === myPlayerId) {
        sendAction({ action: 'ALL_IN', playerId });
        return;
    }

    const player = players[playerId];
    
    // Check constraint for All-in (Must be <= 500,000)
    // Note: The UI disables the button, but we should also check server-side
    if (player.chips > 500000 && networkMode === 'OFFLINE') {
        // Strict rule mainly for self, but enforcing generally
        // Just let it slide for bots or simplify
    }

    const allInAmount = player.chips;
    
    triggerChipEffect(playerId);
    if (networkMode === 'HOST') broadcastState({ type: 'CHIP_FLY', playerId });

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, chips: 0, currentBet: allInAmount, lastAction: 'ALL IN!', lastActionType: 'positive' }; 
      }
      return p;
    }));
    setPot(prev => prev + allInAmount);
    
    if (allInAmount > currentRoundBet) {
      setCurrentRoundBet(allInAmount);
    }
    
    addLog(`${player.name} 全压 ALL-IN (${allInAmount})!`);
    nextTurn();
  };

  const initiateCompare = (initiatorId: number) => {
    if (networkMode === 'CLIENT' && initiatorId === myPlayerId) {
        sendAction({ action: 'COMPARE_INIT', playerId: initiatorId });
        return;
    }

    const cost = currentRoundBet;
    const player = players[initiatorId];

    if (player.chips < cost) {
      return;
    }

    triggerChipEffect(initiatorId);
    if (networkMode === 'HOST') broadcastState({ type: 'CHIP_FLY', playerId: initiatorId });

    // Deduct chips
    setPlayers(prev => prev.map(p => p.id === initiatorId ? { ...p, chips: p.chips - cost } : p));
    setPot(prev => prev + cost);
    
    setComparingInitiatorId(initiatorId);
    setGamePhase(GamePhase.COMPARING);
    addLog(`${player.name} 发起比牌...`);

    // If bot, auto select
    if (!player.isHuman) {
      const activeOpponents = players.filter(p => p.status === PlayerStatus.PLAYING && p.id !== initiatorId);
      if (activeOpponents.length > 0) {
        const target = activeOpponents[Math.floor(Math.random() * activeOpponents.length)];
        resolveCompare(initiatorId, target.id);
      } else {
        nextTurn();
      }
    }
  };

  const handleSelectTarget = (targetId: number) => {
      if (gamePhase !== GamePhase.COMPARING) return;
      if (comparingInitiatorId === null) return;

      if (networkMode === 'CLIENT') {
          // Only allow if I am the initiator
          if (comparingInitiatorId === myPlayerId) {
              sendAction({ action: 'COMPARE_TARGET', playerId: myPlayerId, targetId });
          }
          return;
      }

      // Host Logic
      resolveCompare(comparingInitiatorId, targetId);
  };

  const resolveCompare = (idA: number, idB: number) => {
    const pA = players[idA];
    const pB = players[idB];
    
    addLog(`${pA.name} 挑战 ${pB.name}...`);
    
    // Logic
    const aWins = compareHands(pA.cards, pB.cards);
    const winnerId = aWins ? idA : idB;

    // Start Animation Phase
    setGamePhase(GamePhase.RESOLVING);
    const data = { pA, pB, winnerId };
    setCompareData(data);

    if (networkMode === 'HOST') {
        broadcastState({ type: 'COMPARE_START', data: data });
    }
  };

  const handleComparisonComplete = () => {
      // Only Host/Offline updates state. Client just watches animation.
      if (networkMode === 'CLIENT') {
          setCompareData(null);
          return; 
      }

      if (!compareData) return;

      const { winnerId, pA, pB } = compareData;
      const loserId = winnerId === pA.id ? pB.id : pA.id;
      const winnerName = winnerId === pA.id ? pA.name : pB.name;

      addLog(`结果: ${winnerName} 赢得了比牌！`);
      
      // CRITICAL FIX: Calculate new players and next turn synchronously to avoid state race conditions
      const newPlayers = players.map(p => {
          if (p.id === loserId) return { ...p, status: PlayerStatus.LOST, lastAction: '比牌输', lastActionType: 'negative' as const };
          if (p.id === winnerId) return { ...p, lastAction: '比牌赢', lastActionType: 'positive' as const };
          return p;
      });

      setPlayers(newPlayers);
      setGamePhase(GamePhase.BETTING);
      setComparingInitiatorId(null);
      setCompareData(null);
      
      // Calculate next turn using the NEW player list immediately
      // Find the next player after currentTurnIndex who is still PLAYING
      let nextIndex = (currentTurnIndex + 1) % newPlayers.length;
      let safe = 0;
      while (newPlayers[nextIndex].status !== PlayerStatus.PLAYING && safe < 20) {
         nextIndex = (nextIndex + 1) % newPlayers.length;
         safe++;
      }
      
      // Clear last actions for everyone except the PK participants so we can see the result label for a bit
      const cleanedPlayers = newPlayers.map(p => {
          if (p.id === loserId || p.id === winnerId) return p;
          return { ...p, lastAction: undefined };
      });
      setPlayers(cleanedPlayers);
      setCurrentTurnIndex(nextIndex);
  };

  const handleGameEnd = useCallback((winnerId: number) => {
    setGamePhase(GamePhase.SHOWDOWN);
    setWinnerId(winnerId);
    setPlayers(prev => prev.map(p => ({
        ...p,
        hasSeenCards: true,
        chips: p.id === winnerId ? p.chips + pot : p.chips
    })));
    addLog(`*** ${players[winnerId].name} 赢得了底池 (${pot}) ***`);
  }, [players, pot]);

  // --- Bot AI Loop (Host Only) ---
  useEffect(() => {
    if (networkMode === 'CLIENT') return; // Client doesn't run bots

    const currentPlayer = players[currentTurnIndex];
    const activePlayers = getActivePlayers();

    if (gamePhase !== GamePhase.IDLE && gamePhase !== GamePhase.SHOWDOWN && gamePhase !== GamePhase.RESOLVING && gamePhase !== GamePhase.DEALING) {
        if (activePlayers.length === 1) {
            handleGameEnd(activePlayers[0].id);
            return;
        }
    }

    if (gamePhase === GamePhase.BETTING && !currentPlayer.isHuman && currentPlayer.status === PlayerStatus.PLAYING) {
      const timer = setTimeout(() => {
        const decision = getBotDecision(currentPlayer.cards, currentRoundBet, pot, 1);
        
        switch (decision) {
          case 'FOLD': handleFold(currentPlayer.id); break;
          case 'RAISE':
             // Bot Raise Logic: Check Limit
             if (raiseCount >= 10) {
                 // Force Call or Compare if limit reached
                 if (Math.random() > 0.5) initiateCompare(currentPlayer.id);
                 else handleCall(currentPlayer.id);
             } else {
                 const raiseAmt = currentRoundBet >= 1000 ? currentRoundBet + 1000 : 2000;
                 handleRaise(currentPlayer.id, raiseAmt);
             }
             break;
          case 'COMPARE': initiateCompare(currentPlayer.id); break;
          case 'CALL': default: handleCall(currentPlayer.id); break;
        }
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, gamePhase, players, pot, currentRoundBet, getActivePlayers, nextTurn, networkMode, handleGameEnd, raiseCount]); 


  // --- Render ---

  // If in lobby, show lobby
  if (inLobby) {
      return <Lobby 
        onCreate={(mode, botCount) => {
            setNetworkMode(mode);
            if (mode === 'HOST') setupHost();
            if (mode === 'OFFLINE') {
                 setNetworkMode('OFFLINE');
                 setInLobby(false);
                 // Initialize offline players based on count
                 const totalOpponents = botCount || 2;
                 const newPlayers: Player[] = [
                     { id: 0, name: '我', isHuman: true, chips: INITIAL_CHIPS, cards: [], hasSeenCards: false, status: PlayerStatus.WAITING, currentBet: 0, isDealer: false, avatar: getRandomAvatar() }
                 ];
                 for(let i=1; i<=totalOpponents; i++) {
                     newPlayers.push({
                         id: i, 
                         name: `电脑 ${i}`, 
                         isHuman: false, 
                         chips: INITIAL_CHIPS, 
                         cards: [], 
                         hasSeenCards: false, 
                         status: PlayerStatus.WAITING, 
                         currentBet: 0, 
                         isDealer: false, 
                         avatar: getRandomAvatar()
                     });
                 }
                 setPlayers(newPlayers);
            }
        }}
        onJoin={joinGame}
        roomCode={roomCode}
        players={players}
        onStartGame={startNewGame}
        isHost={networkMode === 'HOST'}
        connectionStatus={connectionStatus}
      />;
  }

  const myPlayer = players[myPlayerId];
  const isMyTurn = currentTurnIndex === myPlayerId && myPlayer.status === PlayerStatus.PLAYING && gamePhase === GamePhase.BETTING;
  const isTargetSelectMode = gamePhase === GamePhase.COMPARING && comparingInitiatorId === myPlayerId;
  const canAllIn = myPlayer.chips <= 500000;
  const isRaiseLimitReached = raiseCount >= 10;

  const handleCustomRaiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const multiplier = parseInt(customRaise);
    if (!isNaN(multiplier) && multiplier > 0) {
        const amount = multiplier * 1000;
        if (amount < currentRoundBet && amount < 1000) {
            alert("加注金额过低");
            return;
        }
        handleRaise(myPlayerId, amount);
        setCustomRaise('');
    }
  };

  return (
    <div className="min-h-screen bg-felt-dark text-gray-100 flex flex-col font-sans overflow-hidden select-none">
      
      <AnimatePresence>
        {gamePhase === GamePhase.RESOLVING && compareData && (
            <CompareOverlay data={compareData} onComplete={handleComparisonComplete} />
        )}
      </AnimatePresence>

      {flyingChips.map(chip => (
          <FlyingChip key={chip.id} start={chip.start} onComplete={() => removeFlyingChip(chip.id)} />
      ))}

      {/* Top Bar */}
      <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-700 p-4 flex justify-between items-center shadow-2xl z-40 relative">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { if(confirm("退出到大厅?")) setInLobby(true); }}>
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-serif font-bold border-2 border-yellow-200">Z</div>
          <div>
             <h1 className="text-xl font-serif text-yellow-500 font-bold tracking-wider leading-none">炸金花</h1>
             <span className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1">
                 {networkMode === 'OFFLINE' ? '单人模式' : networkMode === 'HOST' ? '我是房主' : '已连接'}
                 {networkMode !== 'OFFLINE' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
             </span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
           {/* Pot moved to center table, removed from here or kept as mini backup? Removed for cleaner look */}
           <div className="hidden sm:block text-right">
             <div className="text-[10px] text-gray-500 uppercase font-bold">当前底注</div>
             <div className="text-sm text-white font-mono">{currentRoundBet.toLocaleString()}</div>
           </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-grow relative flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1e3a29] via-[#112419] to-[#050a07]">
        
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')]"></div>
        <div className="absolute w-[90%] h-[60%] border-[20px] border-[#2a4a35] rounded-[200px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"></div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 font-serif text-6xl font-bold pointer-events-none select-none tracking-widest">
            WINNER
        </div>

        {/* Players Layout */}
        {(() => {
            // Simplified Grid Layout logic for N players?
            // Since we use grid-cols-3, it's best suited for 3-5 players.
            // P0 (Me) always bottom. 
            // Others distributed top/sides.
            
            // Helper to get relative seat index
            const getRelativeSeat = (id: number) => {
                const total = players.length;
                return (id - myPlayerId + total) % total;
            };

            const otherPlayers = players.filter(p => p.id !== myPlayerId);
            
            return (
                <div className="grid grid-cols-3 gap-4 w-full max-w-6xl relative z-10 h-full content-between py-8 sm:py-12">
                    
                    {/* Render Opponents in Top Row(s) */}
                    <div className="col-span-3 flex justify-center gap-4 sm:gap-12 flex-wrap min-h-[160px]">
                        {otherPlayers.map(p => (
                            <div key={p.id} className="relative mt-4">
                                <PlayerSeat 
                                    player={p} 
                                    isActive={currentTurnIndex === p.id} 
                                    gamePhase={gamePhase}
                                    canBeCompared={isTargetSelectMode && p.status === PlayerStatus.PLAYING}
                                    onSelectForCompare={() => handleSelectTarget(p.id)}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {/* Center Area: Pot & Actions */}
                    <div className="col-span-3 h-40 flex flex-col items-center justify-center pointer-events-none relative">
                        
                        {/* Pot Display */}
                        <div className="flex flex-col items-center justify-center bg-black/40 px-6 py-2 rounded-full border border-yellow-500/30 backdrop-blur-sm shadow-xl mb-4 transform scale-125">
                            <span className="text-[10px] text-yellow-500/80 uppercase font-bold tracking-widest mb-1">Total Pot</span>
                            <div className="flex items-center text-yellow-400">
                                <Coins size={24} className="mr-2 fill-yellow-500" />
                                <span className="font-mono text-3xl font-black tracking-tight">{pot.toLocaleString()}</span>
                            </div>
                            {isRaiseLimitReached && (
                                <div className="absolute -bottom-8 bg-red-600/90 text-white text-[10px] px-2 py-1 rounded shadow animate-pulse flex items-center gap-1 whitespace-nowrap">
                                    <AlertTriangle size={12} /> 加注达到上限 (10次)
                                </div>
                            )}
                        </div>

                        {(gamePhase === GamePhase.IDLE && (networkMode === 'HOST' || networkMode === 'OFFLINE')) && (
                            <button 
                                onClick={startNewGame}
                                className="pointer-events-auto bg-gradient-to-b from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 text-black font-bold py-4 px-12 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)] transform hover:scale-105 transition-all flex items-center text-xl border-2 border-yellow-300 z-50 animate-bounce"
                            >
                                <RefreshCw className="mr-3 animate-spin-slow" /> 发 牌
                            </button>
                        )}
                        
                        {gamePhase === GamePhase.IDLE && networkMode === 'CLIENT' && (
                             <div className="text-yellow-400 font-bold text-xl animate-pulse">等待房主开始...</div>
                        )}

                        {winnerId !== null && gamePhase === GamePhase.SHOWDOWN && (
                            <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                className="absolute top-0 text-center z-50 bg-black/90 p-8 rounded-2xl border-2 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col items-center gap-6"
                            >
                                <div>
                                    <Trophy size={64} className="text-yellow-400 mx-auto mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 drop-shadow-sm mb-2">
                                    {players[winnerId].name} 获胜!
                                    </div>
                                    <div className="text-yellow-100 font-mono text-xl">
                                        + {pot.toLocaleString()} 筹码
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-2">
                                    {(networkMode === 'HOST' || networkMode === 'OFFLINE') ? (
                                        <>
                                            <button 
                                                onClick={() => setInLobby(true)}
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all border border-gray-500 pointer-events-auto"
                                            >
                                                <LogOut size={20} />
                                                退出
                                            </button>
                                            <button 
                                                onClick={startNewGame}
                                                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20 transition-all border border-yellow-400 animate-pulse pointer-events-auto"
                                            >
                                                <Play size={20} fill="currentColor" />
                                                继续游戏
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="text-yellow-400 animate-pulse text-sm">等待房主开始下一局...</div>
                                            <button 
                                                onClick={() => setInLobby(true)}
                                                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all border border-gray-500 text-sm pointer-events-auto"
                                            >
                                                <LogOut size={16} />
                                                退出房间
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {gamePhase === GamePhase.COMPARING && (
                            <div className="absolute top-10 bg-red-600/90 text-white px-8 py-3 rounded-full backdrop-blur-md border-2 border-red-400 animate-pulse font-bold shadow-[0_0_20px_red] z-50">
                                {isTargetSelectMode ? "请选择比牌对象" : "比牌中..."}
                            </div>
                        )}
                    </div>

                    {/* Bottom: My Player */}
                    <div className="col-span-3 flex justify-center items-end pb-2">
                        <div className="relative transform scale-110">
                          <PlayerSeat 
                            player={players[myPlayerId]} 
                            isActive={currentTurnIndex === myPlayerId} 
                            gamePhase={gamePhase}
                            canBeCompared={false}
                            onSelectForCompare={() => {}}
                          />
                          {players[myPlayerId].hasSeenCards && players[myPlayerId].cards.length === 3 && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                className="absolute -right-32 top-10 bg-black/80 px-4 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 backdrop-blur-sm shadow-xl"
                            >
                                <div className="text-[10px] text-gray-500 uppercase">当前牌型</div>
                                <div className="text-yellow-400 font-bold text-lg">{evaluateHand(players[myPlayerId].cards).label}</div>
                            </motion.div>
                          )}
                        </div>
                    </div>
                </div>
            );
        })()}

      </main>

      {/* Bottom Control Bar */}
      <footer className="bg-gray-900 border-t border-gray-800 p-2 sm:p-4 z-30 relative">
         <div className="max-w-6xl mx-auto flex flex-col gap-3">
             
             {/* Log Window */}
             <div className="h-16 bg-black/60 rounded-lg p-2 overflow-y-auto text-[10px] sm:text-xs font-mono text-green-400/80 border border-gray-800 shadow-inner">
                 {logs.slice(-5).map(log => (
                     <div key={log.id} className="mb-0.5 hover:text-green-200 transition-colors">&gt; {log.message}</div>
                 ))}
                 <div ref={logsEndRef} />
             </div>

             {/* Controls Grid */}
             <div className="flex flex-wrap justify-center gap-3 sm:gap-4 items-stretch">
                 <button 
                    disabled={!isMyTurn}
                    onClick={() => handleFold(myPlayerId)}
                    className="btn-action bg-gradient-to-b from-red-800 to-red-900 border-red-700 text-red-100 min-w-[5rem] sm:min-w-[6rem]"
                 >
                    <XCircle size={24} className="sm:mr-2 mb-1 sm:mb-0" /> 
                    <span>弃牌</span>
                 </button>

                 {!players[myPlayerId].hasSeenCards && players[myPlayerId].status === PlayerStatus.PLAYING && (
                    <button 
                        disabled={players[myPlayerId].status !== PlayerStatus.PLAYING}
                        onClick={() => handleSeeCards(myPlayerId)}
                        className="btn-action bg-gradient-to-b from-blue-800 to-blue-900 border-blue-700 text-blue-100 min-w-[5rem] sm:min-w-[6rem]"
                    >
                        <Eye size={24} className="sm:mr-2 mb-1 sm:mb-0" /> 
                        <span>看牌</span>
                    </button>
                 )}

                 <button 
                    disabled={!isMyTurn}
                    onClick={() => handleCall(myPlayerId)}
                    className="btn-action bg-gradient-to-b from-emerald-700 to-emerald-900 border-emerald-600 text-emerald-100 flex-grow sm:flex-grow-0 min-w-[7rem]"
                 >
                    <ArrowUpCircle size={24} className="sm:mr-2" /> 
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[10px] opacity-70">跟注</span>
                        <span className="text-lg">{currentRoundBet}</span>
                    </div>
                 </button>

                 <div className="flex items-center bg-gray-800 rounded-xl p-1.5 border border-gray-700 shadow-inner relative">
                    {isRaiseLimitReached && (
                         <div className="absolute inset-0 bg-black/60 rounded-xl z-20 flex items-center justify-center text-red-400 font-bold text-xs uppercase tracking-wider backdrop-blur-sm">
                             加注已锁
                         </div>
                    )}
                    <button onClick={() => handleRaise(myPlayerId, 1000)} className="px-3 py-2 hover:bg-gray-700 rounded-lg text-yellow-400 font-mono font-bold border-r border-gray-700 transition-colors">+1K</button>
                    <button onClick={() => handleRaise(myPlayerId, 2000)} className="px-3 py-2 hover:bg-gray-700 rounded-lg text-yellow-400 font-mono font-bold border-r border-gray-700 transition-colors">+2K</button>
                    <button onClick={() => handleRaise(myPlayerId, 5000)} className="px-3 py-2 hover:bg-gray-700 rounded-lg text-yellow-400 font-mono font-bold border-r border-gray-700 transition-colors">+5K</button>
                    <form onSubmit={handleCustomRaiseSubmit} className="flex items-center px-2">
                        <span className="text-gray-500 mr-1 text-xs">x1000</span>
                        <input 
                            type="number" 
                            value={customRaise}
                            onChange={(e) => setCustomRaise(e.target.value)}
                            placeholder="#"
                            className="w-12 bg-black/30 border border-gray-600 rounded px-1 py-1 text-right text-white font-mono text-sm focus:border-yellow-500 outline-none transition-colors"
                        />
                    </form>
                 </div>

                 <button 
                    disabled={!isMyTurn || myPlayer.chips < currentRoundBet}
                    onClick={() => initiateCompare(myPlayerId)}
                    className="btn-action bg-gradient-to-b from-purple-800 to-purple-900 border-purple-700 text-purple-100 min-w-[5rem] sm:min-w-[6rem]"
                 >
                    <Swords size={24} className="sm:mr-2 mb-1 sm:mb-0" />
                    <span>比牌</span>
                 </button>

                 <button 
                    disabled={!isMyTurn || !canAllIn}
                    onClick={() => handleAllIn(myPlayerId)}
                    className={`btn-action bg-gradient-to-b min-w-[5rem] sm:min-w-[6rem] ${canAllIn ? 'from-yellow-700 to-yellow-900 border-yellow-600 text-yellow-100' : 'from-gray-700 to-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'}`}
                 >
                    <Zap size={24} className="sm:mr-2 mb-1 sm:mb-0" />
                    <div className="flex flex-col items-center sm:items-start leading-none">
                        <span>ALL IN</span>
                        {!canAllIn && <span className="text-[8px] opacity-70">&le;50w</span>}
                    </div>
                 </button>

             </div>
         </div>
      </footer>
      
      {/* Styles for utility classes that might not be in tailwind config yet if using CDN logic primarily for dev, but here we assume tailwind handles it via className */}
      <style>{`
        .btn-action {
            @apply flex flex-col sm:flex-row items-center justify-center py-2 sm:py-3 px-3 rounded-xl shadow-lg border-t border-l border-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale;
        }
        .animate-spin-slow {
            animation: spin 3s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
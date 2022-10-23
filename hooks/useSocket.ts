import React from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = React.useRef<Socket>();
  // если соединения не было, то я его создаю
  if (!socketRef.current) {
    socketRef.current = typeof window !== 'undefined' && io('http://localhost:3001');
  } else {
    // следующий раз, делаю подключение, вместо создания подключения
    socketRef.current.connect();
  }

  React.useEffect(() => {
    return () => {
      // когда мы выходим из стр, то делай дисконект
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
};

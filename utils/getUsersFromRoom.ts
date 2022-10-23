import { UserData } from '../pages';

export type SocketRoom = Record<string, { roomId: string; user: UserData }>;

// создаем массив с подключенными юзерами в комнате и добавляем в объект юзера  свойства номер комнаты
export const getUsersFromRoom = (rooms: SocketRoom, roomId: string) =>
  Object.values(rooms)
    .filter((obj) => obj.roomId === roomId)
    .map((obj) => ({ ...obj.user, roomId: Number(roomId) }));

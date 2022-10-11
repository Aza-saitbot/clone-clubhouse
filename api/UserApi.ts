import { AxiosInstance } from 'axios';
import { UserData } from '../pages';

// у instance уже вшито baseUrl и токен в заголовке
export const UserApi = (instance: AxiosInstance) => {
  return {
    // возвращает информацию о пользователя
    getMe: async (): Promise<UserData> => {

      const { data } = await instance.get('/auth/me');
      return data;
    },

    getUserInfo: async (id: number): Promise<UserData> => {
      const { data } = await instance.get('/user/' + id);
      return data;
    },
  };
};

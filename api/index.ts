import Cookies from 'nookies';
import { GetServerSidePropsContext } from 'next';
import axios from 'axios';
import { UserApi } from './UserApi';
import { RoomApi } from './RoomApi';

type ApiReturnType = ReturnType<typeof UserApi> & ReturnType<typeof RoomApi>;

// при каждом запросе
export const Api = (ctx: any): ApiReturnType => {
  // возьми куки из контекста
  const cookies = Cookies.get(ctx);
  // вытащи токен
  const token = cookies.token;

  // создаю instance в этой области видимости, прикручиваю токен в заголовок
  // instance будь жить до тех пор, пока функции не вернут, то что нужно
  const instance = axios.create({
    baseURL: 'http://localhost:3001',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });

  // передаю в аргументах instance (уже с прикрученным токеном в headers и baseUrl)
  // и используй в своих фунциях
  // reduce: ...prev берет предыдщие значение: {},
  // ...f(instance) возвращает результат функции (по очереди),
  // склеивает с предыдущим в исходный объект и этот объект передаем в Api
  return [UserApi, RoomApi].reduce((prev, f) => ({ ...prev, ...f(instance) }), {} as ApiReturnType);
};

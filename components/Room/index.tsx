import clsx from 'clsx';
import Link from 'next/link';
import React from 'react';
import Peer from 'simple-peer';
import {useRouter} from 'next/router';
import {Button} from '../Button';
import {Speaker} from '../Speaker';

import styles from './Room.module.scss';
import {selectUserData} from '../../redux/selectors';
import {useSelector} from 'react-redux';
import {UserData} from '../../pages';
import {useSocket} from '../../hooks/useSocket';

interface RoomProps {
    title: string;
}

let peers = [];

export const Room: React.FC<RoomProps> = ({title}) => {
    const router = useRouter();
    const user = useSelector(selectUserData);
    const [users, setUsers] = React.useState<UserData[]>([]);
    const roomId = router.query.id;
    const socket = useSocket();

    React.useEffect(() => {
        // при монтировании компонента, проверяем мы в браузере?
        if (typeof window !== 'undefined') {

            // получаем доступ к микрофону
            // сначало мы создаем медиа поток, только потом создаем соединения и передаем поток
            navigator.mediaDevices
                .getUserMedia({
                    audio: true,
                })
                .then((stream) => {

                    // подключаемся в эту комнату
                    socket.emit('CLIENT@ROOMS:JOIN', {
                        user,
                        roomId,
                    });

                    //из сервака придет ответ, что кто-то подключился
                    socket.on('SERVER@ROOMS:JOIN', (allUsers: UserData[]) => {
                        console.log('allUsers', allUsers);
                        // список пользователей обновляется
                        setUsers(allUsers);

                        allUsers.forEach((speaker) => {

                            ///
                            /// 1. если мы звоним
                            ///

                            // если это не я и
                            // если в массиве peers, нет такого пользователя, к-й сейчас подключается (
                            // т.е. говорим если подключается 3-й пользователь, то проверь если такой пользователь в массиве,
                            // если нет, то создай новое new Peer соединения и добавь в массив peers, его айди и его данные для подключения peer2peer)
                            if (user.id !== speaker.id && !peers.find((obj) => obj.id !== speaker.id)) {

                                // создаю соединения инициатор, берем медиа поток
                                const peerIncome = new Peer({
                                    //  initiator: true - инициатор звонка
                                    initiator: true,
                                    trickle: false,
                                    stream,
                                });

                                // Получили сигнал от ICE-сервера и просим всех участников позвонить мне
                                peerIncome.on('signal', (signal) => {
                                    console.log('1. СИГНАЛ СОЗДАН: ', signal, 'далее');
                                    console.log('ПРОСИМ ЮЗЕРА ' + speaker.fullname + ' НАМ ПОЗВОНИТЬ');
                                    // говорим конкретному пользователю (targetUserId) позвонить мне (callerUserId)
                                    // звоним - targetUserId
                                    // кто должен звонить, это я - callerUserId
                                    socket.emit('CLIENT@ROOMS:CALL', {
                                        targetUserId: speaker.id,
                                        callerUserId: user.id,
                                        // звоним к этой комнате
                                        roomId,
                                        // signal/данные для p2p - передаем мой, инициатора звонка
                                        signal,
                                    });
                                    // и каждое соединения с кем я хочу созвониться
                                    // сохраняем в массив
                                    // c speaker.id этим пользователям, я создал отдельное соединения (peerIncome)
                                    // массив инициаторов соединений
                                    peers.push({
                                        peer: peerIncome,
                                        id: speaker.id,
                                    });
                                });


                                ///
                                /// 2. если нам звонят
                                ///
                                socket.on(
                                    'SERVER@ROOMS:CALL',
                                    // мы узнаем: кому звонят (targetUserId) и кто звонит (callerUserId)
                                    // и сигнал кто нам звонит (callerSignal)
                                    ({targetUserId, callerUserId, signal: callerSignal}) => {
                                        console.log('2. ЮЗЕР ' + callerUserId + ' ПОДКЛЮЧИЛСЯ, ЗВОНИМ!');

                                        // создаем слушателя, к-й будет поступать звук того, кто решил нам позвонить
                                        // дальше код получателя
                                        const peerOutcome = new Peer({
                                            // initiator: false - слушатель
                                            initiator: false,
                                            trickle: false,
                                            stream,
                                        });

                                        // Звоним пользователю
                                        // и ждём сигнал, который нам необходимо передать обратно юзеру на ответ
                                        peerOutcome.signal(callerSignal);

                                        peerOutcome
                                            // Получаем сигнал от ICE-сервера и отправляем его юзеру, чтобы он получил наш сигнал для соединения
                                            .on('signal', (outSignal) => {
                                                console.log(
                                                    '3. ПОЛУЧИЛИ СИГНАЛ НАШ, ОТПРАВЛЯЕМ В ОТВЕТ ЮЗЕРУ ' + callerUserId,
                                                );
                                                // теперь ты мне должен ответить или позвонить мне
                                                socket.emit('CLIENT@ROOMS:ANSWER', {
                                                    // твой айди (callerUserId) является целью, к-й должен ответить мне - позвони мне
                                                    targetUserId: callerUserId,
                                                    // тот кто звонить, то я (targetUserId)
                                                    callerUserId: targetUserId, // (user.id)
                                                    roomId,
                                                    // отправляем сигнал слушателя, отправляем тому, кто должен мне ответить/позвонить
                                                    signal: outSignal,
                                                });
                                            })
                                            // Когда нам ответили, воспроизводим звук
                                            .on('stream', (stream) => {
                                                document.querySelector('audio').srcObject = stream;
                                                document.querySelector('audio').play();
                                            });
                                    },
                                );


                                ///
                                /// 3. если просят кому-то позвонить/ответить
                                ///

                                // узнаем: кто звонит/просит ответить (callerUserId) и берет его сигнал
                                socket.on('SERVER@ROOMS:ANSWER', ({callerUserId, signal}) => {
                                    // найди того пользователя, с кем я хотел созвониться
                                    // и если он есть в массиве peers (инициаторов соединений)
                                    const obj = peers.find((obj) => Number(obj.id) === Number(callerUserId));
                                    if (obj) {
                                        // то позвони/ответь ему
                                        obj.peer.signal(signal);
                                    }
                                    console.log('4. МЫ ОТВЕТИЛИ ЮЗЕРУ', callerUserId);
                                });
                            }
                        });

                    });


                    // когда пользователь вышел из комнаты, фильтрую массив/ обновляю список
                    socket.on('SERVER@ROOMS:LEAVE', (leaveUser: UserData) => {
                        console.log('LEAVE = leaveUser', leaveUser)
                        setUsers((prev) =>
                            prev.filter((prevUser) => {

                                //находим peer соединения, к-й хочет выйти
                                const peerUser = peers.find((obj) => Number(obj.id) === Number(leaveUser.id));
                                if (peerUser) {
                                    // и разрываем соединения
                                    peerUser.peer.destroy();
                                }
                                // обновляем список, без пользователя к-й вышел
                                return prevUser.id !== leaveUser.id;
                            }),
                        );
                    });

                })
                .catch(() => {
                    console.error('Нет доступа к микрофону');
                });
        }

        return () => {
            peers.forEach((obj) => {
                obj.peer.destroy();
            });
        };
    }, []);

    return (
        <div className={styles.wrapper}>
            <audio controls/>
            <div className="d-flex align-items-center justify-content-between">
                <h2>{title}</h2>
                <div className={clsx('d-flex align-items-center', styles.actionButtons)}>
                    <Link href="/rooms">
                        <a>
                            <Button color="gray" className={styles.leaveButton}>
                                <img width={18} height={18} src="/static/peace.png" alt="Hand black"/>
                                Leave quietly
                            </Button>
                        </a>
                    </Link>
                </div>
            </div>

            <div className="users">
                {users.map((obj) => (
                    <Speaker
                        key={obj.id}
                        id={obj.id}
                        fullname={obj.fullname}
                        avatarUrl={obj.avatarUrl}
                    />
                ))}
            </div>
        </div>
    );
};


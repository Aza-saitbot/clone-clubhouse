import express from 'express'
import dotenv from 'dotenv'
dotenv.config({
    path: 'server/.env'
})
import socket from 'socket.io'
import {createServer} from 'http'
import cors from 'cors'
import sharp from 'sharp'
import fs from 'fs'
import '../server/core/db'
import {passport} from './core/passport';
import AuthController from "./Controllers/AuthController";
import RoomsController from "./Controllers/RoomsController";
import {uploader} from "./core/uploader";
import {getUsersFromRoom, SocketRoom} from "../utils/getUsersFromRoom";

import Sequelize from "sequelize";
const sequelize = require('./core/db').sequelize;

const Room = require('../models/room')(sequelize, Sequelize.DataTypes,
    Sequelize.Model);

const app = express()
const server=createServer(app)

// @ts-ignore
const io=socket(server,{
    cors:{
        origin:"*"
    }
})

app.use(cors());
app.use(express.json())
app.use(passport.initialize());


// подключаем middleware, к-й проверяет авторизован или нет/дать доступ к методу или нет
app.get('/rooms',passport.authenticate('jwt',{session:false}),RoomsController.index)
app.post('/rooms',passport.authenticate('jwt',{session:false}),RoomsController.create)
app.get('/rooms/:id',passport.authenticate('jwt',{session:false}),RoomsController.show)
app.delete('/rooms/:id',passport.authenticate('jwt',{session:false}),RoomsController.delete)

app.get('/user/:id',passport.authenticate('jwt',{session:false}),AuthController.getUserInfo)
app.get('/auth/me',passport.authenticate('jwt',{session:false}),AuthController.getMe)
app.post('/auth/sms/activate', passport.authenticate('jwt', { session: false }),AuthController.activate)
app.get('/auth/sms',passport.authenticate('jwt', { session: false }), AuthController.sendSMS)
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', {failureRedirect: '/login'}),AuthController.authCallback);

app.post('/upload', uploader.single('photo'), (req, res) => {
    const filePath = req.file.path
    sharp(filePath)
        .resize(150, 150)
        .toFormat('jpeg')
        .toFile(filePath.replace('.png', '.jpeg'), (err) => {
            if (err) {
                throw err;
            }
            fs.unlinkSync(filePath)
            res.json({
                url: `avatars/${req.file.filename.replace('.png', '.jpeg')}`
            })
        })
})


const rooms:SocketRoom={}

io.on('connection', (socket) => {

    // запрос-ответ
    // клиент отправил команду, подключи юзера в комнату
    socket.on('CLIENT@ROOMS:JOIN',({user,roomId})=>{

        // подкючаем юзера, делаем уникальное название комнаты/ пути
        socket.join(`room/${roomId}`)
        // как мы зашли в команту, положи в объект ключ = сокет айди, а значение его будет данные юзера и номер комнаты
        rooms[socket.id]={roomId,user}
        const speakers=getUsersFromRoom(rooms,roomId)
        // все остальные пользователи двнной комнату узнают, что user зашел в эту комнату и передаю user
        io.emit('SERVER@ROOMS:HOME',{roomId:Number(roomId),speakers})
        // сервер отвечает, отпрваляю всем в этой комнате кроме меня/ держи юзера, он подключен в комнату
        io.in(`room/${roomId}`).emit('SERVER@ROOMS:JOIN',speakers)
        Room.update({speakers},{where:{id:roomId}})

    })

// тут я звоню
    socket.on('CLIENT@ROOMS:CALL',({targetUserId,callerUserId,roomId,signal})=>{

        // targetUserId - тот кому я звною, цель
        // callerUserId - тот кто звонит
        // передаю всем пользователям, к-е есть в этой комнате
        // все пользователи в этой комнате, узнают что два человека хотят созвонится (targetUserId и callerUserId)
        // и на фронтеде они определяются, делают созвон друг с другом
        socket.broadcast.to(`room/${roomId}`).emit('SERVER@ROOMS:CALL',{
            targetUserId,
            callerUserId,
            signal
        })
    })

    // тут я отвечаю
    socket.on('CLIENT@ROOMS:ANSWER',({targetUserId,callerUserId,roomId,signal})=>{

        // всех остальных мы оповещаем, о сигнале пользователя
        socket.broadcast.to(`room/${roomId}`).emit('SERVER@ROOMS:ANSWER',{
            targetUserId,
            callerUserId,
            signal
        })
    })

    socket.on('disconnect',()=>{
        if (rooms[socket.id]){
            // когда хотим выйти из комнаты, вытаскиваем из объекта номер комнаты и данные пользователя
            const {roomId,user}=rooms[socket.id]

            // и отправляем всем кто находится в этой комнате, данные юзера с событием что мы вышли
            socket.broadcast.to(`room/${roomId}`).emit('SERVER@ROOMS:LEAVE',user)
            // затем удаляем юзера
            delete rooms[socket.id]
            //когда уходит юзер из комнаты, возвращаем новый список/обновленный список юезров в комнате
            const speakers=getUsersFromRoom(rooms,roomId)
            io.emit('SERVER@ROOMS:HOME',{roomId:Number(roomId),speakers})
            Room.update({speakers},{where:{id:roomId}})
        }
    })

});


server.listen(3001, () => console.log('SERVER RUNNED!'))

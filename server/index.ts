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

const io=socket(server,{
    cors:{
        origin:"*"
    }
})

app.use(cors());
app.use(express.json())
app.use(passport.initialize());

app.get('/rooms',passport.authenticate('jwt',{session:false}),RoomsController.index)
app.post('/rooms',passport.authenticate('jwt',{session:false}),RoomsController.create)
app.get('/rooms/:id',passport.authenticate('jwt',{session:false}),RoomsController.show)
app.delete('/rooms/:id',passport.authenticate('jwt',{session:false}),RoomsController.delete)

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
    console.log('К СОКЕТАМ ПОДКЛЮЧИЛИСЬ!!!',socket.id);

    socket.on('CLIENT@ROOMS:JOIN',({user,roomId})=>{

        socket.join(`room/${roomId}`)
        rooms[socket.id]={roomId,user}
        const speakers=getUsersFromRoom(rooms,roomId)
        io.emit('SERVER@ROOMS:HOME',{roomId:Number(roomId),speakers})
        io.in(`room/${roomId}`).emit('SERVER@ROOMS:JOIN',speakers)
        Room.update({speakers},{where:{id:roomId}})

    })

    socket.on('disconnect',()=>{
        if (rooms[socket.id]){

            const {roomId,user}=rooms[socket.id]
            socket.broadcast.to(`room/${roomId}`).emit('SERVER@ROOMS:LEAVE',user)
            delete rooms[socket.id]
            const speakers=getUsersFromRoom(rooms,roomId)
            io.emit('SERVER@ROOMS:HOME',{roomId:Number(roomId),speakers})
            Room.update({speakers},{where:{id:roomId}})
        }
    })

});

server.listen(3001, () => console.log('SERVER RUNNED!'))

import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import multer from 'multer'
import {nanoid} from 'nanoid'
import sharp from 'sharp'
import fs from 'fs'

dotenv.config({
    path:'server/.env'
})

import '../server/core/db'

import { passport } from './core/passport';

const app=express()

const uploader=multer({
    storage:multer.diskStorage({
        destination:function (_, __, cb) {
            cb(null,'public/avatars')
        },
        filename:function (_,file,cb){
            cb(null,file.fieldname + '-'+nanoid(6) + "."+ file.mimetype.split('/').pop())
        }
    })
})

app.use(cors());
app.use(passport.initialize());

app.post('/upload', uploader.single('photo'),(req,res)=>{
    const filePath=req.file.path
    sharp(filePath)
        .resize(150,150)
        .toFormat('jpeg')
        .toFile(filePath.replace('.png','.jpeg'),(err)=>{
        if (err){
            throw err;
        }
        fs.unlinkSync(filePath)
        res.json({
            url:`avatars/${req.file.filename.replace('.png','.jpeg')}`
        })
    })
})

app.get('/auth/github',
    passport.authenticate('github'));

app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res)=> {
        res.send(`<script>window.opener.postMessage('${JSON.stringify(req.user,)}',"*");window.close()</script>`)
    });




app.listen(3001,()=>console.log('SERVER RUNNED!'))
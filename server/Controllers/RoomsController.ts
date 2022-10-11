import express from "express";
import rooms from "../../pages/rooms";

const Sequelize = require('sequelize');
const sequelize = require('../core/db').sequelize;

const Room = require('../../models/room')(sequelize, Sequelize.DataTypes,
    Sequelize.Model);



class RoomsController {

    async index(req: express.Request, res: express.Response) {
        try {
            // get all rooms
            const items = await Room.findAll()
            res.json(items)

        } catch (e) {
            res.status(500).json({message: 'Error', e})
        }
    }
    async create(req: express.Request, res: express.Response) {
        try {
            const data={
                title:req.body.title,
                type:req.body.type
            }
            if (!data.title && !data.type){
                res.status(400).json({message:"Отсутсвует заголовок или тип комнаты"})
            }

            // create room
            const room = await Room.create(data)
            // return on client obj = room
            res.status(201).json(room)

        } catch (e) {
            res.status(500).json({message: 'Error', e})
        }
    }
    async show(req: express.Request, res: express.Response) {
        try {
            const roomId=req.params.id

            if (isNaN(Number(roomId))){
                res.status(404).json({message: 'Не верный айди комнаты'})
            }

            const room =await Room.findByPk(roomId)

            if (!room){
                res.status(404).json({message: 'Комната не найдено'})
            }
            res.json(room)

        } catch (e) {
            res.status(500).json({message: 'Error', e})
        }
    }
    async delete(req: express.Request, res: express.Response) {
        try {
            const roomId=req.params.id

            if (isNaN(Number(roomId))){
                res.status(404).json({message: 'Не верный айди комнаты'})
            }

            await Room.destroy({
                where:{ id:roomId }
            })

            res.json()

        } catch (e) {
            res.status(500).json({message: 'Error', e})
        }
    }


}

export default new RoomsController()



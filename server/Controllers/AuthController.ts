import express from "express";
const Sequelize = require('sequelize');
const sequelize = require('../core/db').sequelize;

const User = require('../../models/user')(sequelize, Sequelize.DataTypes,
    Sequelize.Model);

const Code = require('../../models/code')(sequelize, Sequelize.DataTypes,
    Sequelize.Model);
import {generateRandomCode} from "../../utils/generateRandomCode";


class AuthController {

    getMe(req: express.Request, res: express.Response) {
        res.json(req.user)
    }

    authCallback(req: express.Request, res: express.Response) {
        res.send(`<script>window.opener.postMessage('${JSON.stringify(req.user,)}',"*");window.close()</script>`)
    }

    async activate(req: express.Request, res: express.Response) {

        const userId = req.user.id;
        const {code, user} = req.body;

        if (!code) {
            return res.status(400).json({message: 'Введите код активации'});
        }

        const whereQuery = {code, user_id: userId};

        try {
            // если код введен, то мы его находим в бд
            const findCode = await Code.findOne({
                where: whereQuery,
            });

            if (findCode) {
                //если нашли, то удаляем/означает что пользователя активировали
                await Code.destroy({
                    where: whereQuery,
                });

                // обновляем пользователя, что мы его активировали
                await User.update({...user, isActive: 1}, {where: {id: userId}});
                return res.send();
            } else {
                res.status(400).json({
                    message: 'Код не найден',
                });
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({
                message: 'Ошибка при активации аккаунта',
            });
        }
    }

    async getUserInfo(req: express.Request, res: express.Response) {
        const userId = req.params.id;

        try {
            const findUser = await User.findByPk(userId);
            if (findUser) {
                res.json( await findUser);
            } else {
                res.status(500).json({
                    message: 'Пользователь не найден',
                });
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({
                message: 'Ошибка при активации аккаунта',
            });
        }
    }

    async sendSMS(req: express.Request, res: express.Response) {

        const phone = req.query.phone
        const userId = req.user.id
        // const smsCode = generateRandomCode()
        const smsCode = 1234


        if (!phone) {
            return res.status(400).send({
                message:"Номер телефона не указан"
            })
        }

        try {

            // await Axios.get(`https://sms.ru/sms/send?api_id=${process.env.SMS_API_KEY}&to=79659451635&msg=${smsCode}`)

            await Code.create({
                code: smsCode,
                user_id: userId,
            })

            res.status(201).send()

        } catch (e) {
            res.status(500).json({
                message: 'Ошибка при отправке SMS-кода'
            })

        }

    }
}

export default new AuthController()



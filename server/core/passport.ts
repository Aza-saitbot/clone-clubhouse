import passport from 'passport'
import {Strategy as GitHubStrategy} from 'passport-github'
import {Strategy as JwtStrategy,ExtractJwt} from 'passport-jwt'

const Sequelize = require('sequelize');
const sequelize = require('../core/db').sequelize;


const User = require('../../models/user')(sequelize, Sequelize.DataTypes,
    Sequelize.Model);
import {createJwtToken} from "../../utils/createJwtToken";
import {UserData} from "../../pages";

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET_KEY,
};

passport.use(
    'jwt',
    new JwtStrategy(opts, (jwt_payload, done) => {
        done(null, jwt_payload.data);
    }),
);

passport.use('github',
    <passport.Strategy>new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: "http://localhost:3001/auth/github/callback"
        },
        async (_: unknown, __: unknown, profile, done) => {
            try {
                let userData: UserData;

                const obj: Omit<UserData, 'id'> = {
                    fullname: profile.displayName,
                    avatarUrl: profile.photos?.[0].value,
                    isActive: 0,
                    username: profile.username,
                    phone: '',
                };

                const findUser = await User.findOne({
                    where: {
                        username: obj.username,
                    },
                });

                if (!findUser) {
                    const user = await User.create(obj);

                    userData = user.toJSON();
                } else {
                    userData = await findUser.toJSON();
                }

                done(null, {
                    ...userData,
                    token: createJwtToken(userData),
                });
            } catch (error) {
                done(error);
            }
        }
    ));


// used to serialize the user for the session
passport.serializeUser(function(user, done) {
    done(null, user.id);
    // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        err? done(err):done(null, user);
    });
});

export { passport }

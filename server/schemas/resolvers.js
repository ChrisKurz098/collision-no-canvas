const { AuthenticationError } = require('apollo-server-express');
const { User, Leaderboard } = require('../models');
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id }).select(
          '-__v -password'
        );
        return userData;
      }
      throw new AuthenticationError('🛸 Not logged in');
    },
    users: async () => {
      return User.find();
    },
    leaderboard: async () => {
      return Leaderboard.findOne();
    },
  },

  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);
      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError('🛸 Incorrect credentials');
      }
      const correctPw = await user.isCorrectPassword(password);
      if (!correctPw) {
        throw new AuthenticationError('🛸 Incorrect credentials');
      }
      const token = signToken(user);
      return { token, user };
    },
    addUserHighscore: async (parent, { score }, context) => {
      if (context.user) {
        console.log('score', score);
        const highscore = {
          score: score,
          user: context.user.username,
          date: new Date().toLocaleDateString('en-US'),
        };

        const user = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $push: { highscores: highscore } },
          { new: true }
        );

        return user;
      }
    },
    deleteUserScore: async (parent, args, context) => {
      if (context.user) {
        const user = await User.findOne({ _id: context.user._id });

        const scores = user.highscores.map((highscore) => highscore.score);
        const lowestScore = Math.min(...scores);
        const index = scores.indexOf(lowestScore);
        console.log(user.highscores[index]);

        const removeScore = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $pull: { highscores: user.highscores[index] } }
        );
        return removeScore;
      } else {
        console.log('need to be logged in!');
      }
    },
    addLeaderboardHighscore: async (parent, { score }, context) => {
      //query all leaderboards
      const all = await Leaderboard.findOne();

      // construct highscore object
      const highscore = {
        score: score,
        user: context.user.username,
        date: new Date().toLocaleDateString('en-US'),
      };

      // If a leaderboard doesn't already exist and logged in, create leaderboard
      if (all instanceof Leaderboard == false && context.user) {
        //create new board with highscore object info
        const newBoard = Leaderboard.create(highscore);
        return newBoard;
      }
      //else update existing board
      else if (context.user) {
        //add new score
        const updatedLeaderboard = await Leaderboard.findOneAndUpdate(
          { _id: all._id },
          { $push: { highscores: highscore } }
        );

        //how many entries in updatedLeaderboard?
        const shortLeaderboard = () => {
          if (updatedLeaderboard.length > 10) {
            //remove last entry
            updatedLeaderboard.pop();
          }
        };

        //sort descending
        const leaderboardSort = shortLeaderboard.highscores.sort(
          (a, b) => parseFloat(b.score) - parseFloat(a.score)
        );

        return leaderboardSort;
      } else console.log('Something went wrong!');
    },
    deleteLeaderboardHighscore: async (parent, args, context) => {
      //query all leaderboards
      const all = await Leaderboard.findOne();

      //find lowest score index
      const scores = all.highscores.map((highscore) => highscore.score);
      const lowestScore = Math.min(...scores);
      const index = scores.indexOf(lowestScore);

      // If a leaderboard doesn't exist, throw error
      if (all instanceof Leaderboard == false && context.user) {
        console.log('No leaderboard yet!');
      }
      //else update existing board
      else if (context.user) {
        const updatedLeaderboard = await Leaderboard.findOneAndUpdate(
          { _id: all._id },
          { $pull: { highscores: all.highscores[index] } }
        );
        return updatedLeaderboard;
      }
    },
    addUserXP: async (parent, { XP }, context) => {
      if (context.user) {
        console.log('user', context.user);
        console.log('XP', XP);

        const user = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $inc: { XP: XP } },
          { new: true, runValidators: true }
        );
        return user;
      }
    },
  },
};

module.exports = resolvers;

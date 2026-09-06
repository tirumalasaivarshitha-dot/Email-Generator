import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { userRepository } from '../repositories/user.repository';
import { senderRepository } from '../repositories/sender.repository';

export const configurePassport = () => {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userRepository.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Real Google OAuth Strategy
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== 'mock_google_client_id') {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@google.com`;
            const name = profile.displayName || 'Google User';
            const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : undefined;

            const user = await userRepository.upsertGoogleUser({
              googleId: profile.id,
              email,
              name,
              avatarUrl
            });

            // Ensure a default sender exists for this user
            await senderRepository.ensureDefaultSender(user.id, user.email, user.name);

            return done(null, user);
          } catch (err) {
            return done(err as Error, undefined);
          }
        }
      )
    );
  }
};
